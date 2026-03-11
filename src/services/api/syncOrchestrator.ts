import { synchronize, type SyncPullArgs } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { waitForDatabaseReady } from '../../database/ready';
import { handleError } from '../../utils/errors';
import { storage } from '../../utils/storage-adapter';
import { config } from '../../constants/config';
import { useSyncStore } from '../../store/syncStore';
import { useUIStore } from '../../store/uiStore';
import { requireSupabaseClient } from '../supabaseClient';
import { syncQueueManager } from '../sync/queueManager';
import { SyncPuller } from './syncPuller';
import { SyncPusher } from './syncPusher';
import { SyncScheduler } from './syncScheduler';
import { SYNC_LAST_SYNC_STORAGE_KEY, countChanges } from './syncShared';

const isMissingAuthSessionError = (errorMessage: string): boolean => {
    const normalized = errorMessage.toLowerCase();
    return (
        normalized.includes('auth session missing') ||
        normalized.includes('supabase auth session is required to sync') ||
        normalized.includes('invalid or expired session') ||
        normalized.includes('invalid jwt') ||
        normalized.includes('jwt expired') ||
        normalized.includes('not authenticated')
    );
};

export enum SyncStatus {
    IDLE = 'idle',
    SYNCING = 'syncing',
    SUCCESS = 'success',
    ERROR = 'error',
}

export interface SyncQueueItem {
    id: string;
    table: string;
    recordId: string;
    operation: 'create' | 'update' | 'delete';
    data?: any;
    timestamp: number;
    retryCount: number;
    synced: boolean;
}

export interface SyncResult {
    success: boolean;
    syncedItems: number;
    failedItems: number;
    errors: Array<{ item: SyncQueueItem; error: string }>;
}

const createSyncErrorItem = (): SyncQueueItem => ({
    id: `sync-error-${Date.now()}`,
    table: 'sync',
    recordId: 'n/a',
    operation: 'update',
    timestamp: Date.now(),
    retryCount: 0,
    synced: false,
});

export class SyncOrchestrator {
    private status: SyncStatus = SyncStatus.IDLE;
    private lastSyncTime = 0;
    private queuedItemsCount = 0;

    private readonly puller = new SyncPuller();
    private readonly scheduler = new SyncScheduler(async () => {
        await this.performSync();
    });
    private readonly pusher = new SyncPusher(this.executeWithRetry.bind(this));

    async initialize(): Promise<void> {
        await this.restoreState();
        await this.restoreQueueCount();
        if (config.features.enableSync) {
            this.enableAutoSync();
        }
    }

    async queueSync(): Promise<void> {
        console.warn('[sync] queueSync is deprecated. Local changes are captured by WatermelonDB synchronize().');
    }

    async performSync(): Promise<SyncResult> {
        if (this.status === SyncStatus.SYNCING) {
            return { success: false, syncedItems: 0, failedItems: 0, errors: [] };
        }

        if (!config.features.enableSync) {
            return { success: true, syncedItems: 0, failedItems: 0, errors: [] };
        }

        this.status = SyncStatus.SYNCING;
        useSyncStore.getState().startSync();

        const result: SyncResult = { success: true, syncedItems: 0, failedItems: 0, errors: [] };

        try {
            await waitForDatabaseReady();

            const supabase = requireSupabaseClient();
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                const authMessage = userError?.message || 'Supabase auth session is required to sync.';
                if (isMissingAuthSessionError(authMessage)) {
                    this.status = SyncStatus.IDLE;
                    this.scheduler.resetRetry();
                    useSyncStore.getState().completeSync();
                    return result;
                }
                throw new Error(authMessage);
            }

            let pushedItems = 0;
            let pulledItems = 0;

            await synchronize({
                database,
                pullChanges: async ({ lastPulledAt }: SyncPullArgs) => {
                    const since = typeof lastPulledAt === 'number' && Number.isFinite(lastPulledAt) ? lastPulledAt : 0;
                    const changes = await this.puller.pullChangesFromSupabase(since, user.id);
                    pulledItems += countChanges(changes);
                    return { changes, timestamp: Date.now() };
                },
                pushChanges: async ({ changes }) => {
                    pushedItems += await this.pusher.pushChangesToSupabase(changes, user.id);
                },
                migrationsEnabledAtVersion: 1,
            });

            this.lastSyncTime = Date.now();
            result.syncedItems = pushedItems + pulledItems;
            this.status = SyncStatus.SUCCESS;
            this.scheduler.resetRetry();
            useSyncStore.getState().completeSync();
            await syncQueueManager.clear();
            this.queuedItemsCount = 0;
            await this.persistLastSyncTime();
        } catch (error) {
            handleError(error, 'sync.performSync');
            this.status = SyncStatus.ERROR;
            result.success = false;
            result.failedItems = 1;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({ item: createSyncErrorItem(), error: errorMessage });

            useSyncStore.getState().failSync(errorMessage);
            await syncQueueManager.enqueue(errorMessage);
            this.queuedItemsCount = await syncQueueManager.getCount();

            if (errorMessage.includes('exceeded') && errorMessage.includes('batches')) {
                useUIStore
                    .getState()
                    .showToast(
                        'warning',
                        'Sync dataset is too large for incremental pull. Please run a full re-sync.',
                        5000,
                    );
            }

            if (SyncPusher.shouldRetry(errorMessage)) {
                this.scheduler.scheduleRetry();
            }
        }

        return result;
    }

    async pullChanges(): Promise<void> {
        await this.performSync();
    }

    getStatus(): SyncStatus {
        return this.status;
    }

    getLastSyncTime(): number {
        return this.lastSyncTime;
    }

    getQueuedItemsCount(): number {
        return this.queuedItemsCount;
    }

    clearQueue(): void {
        syncQueueManager
            .clear()
            .then(() => {
                this.queuedItemsCount = 0;
            })
            .catch((error) => {
                handleError(error, 'sync.clearQueue');
            });
    }

    enableAutoSync(interval?: number): void {
        this.scheduler.enableAutoSync(interval);
    }

    disableAutoSync(): void {
        this.scheduler.disableAutoSync();
    }

    private async executeWithRetry<T>(
        operation: string,
        fn: () => Promise<T>,
        maxRetries: number = config.sync.maxRetries,
    ): Promise<T> {
        let attempt = 0;

        while (true) {
            try {
                return await fn();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const shouldRetry = attempt < maxRetries && SyncPusher.shouldRetry(errorMessage);

                if (!shouldRetry) {
                    throw error;
                }

                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                console.warn(`[sync] retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                attempt += 1;
            }
        }
    }

    private async restoreState(): Promise<void> {
        try {
            const lastSync = await storage.getItem(SYNC_LAST_SYNC_STORAGE_KEY);
            if (lastSync) {
                const parsedTimestamp = Number(lastSync);
                if (Number.isFinite(parsedTimestamp) && parsedTimestamp > 0) {
                    this.lastSyncTime = parsedTimestamp;
                    useSyncStore.getState().setLastSyncTime(parsedTimestamp);
                }
            }
        } catch (error) {
            handleError(error, 'sync.restoreState');
        }
    }

    private async restoreQueueCount(): Promise<void> {
        try {
            this.queuedItemsCount = await syncQueueManager.getCount();
        } catch (error) {
            handleError(error, 'sync.restoreQueueCount');
            this.queuedItemsCount = 0;
        }
    }

    private async persistLastSyncTime(): Promise<void> {
        try {
            await storage.setItem(SYNC_LAST_SYNC_STORAGE_KEY, String(this.lastSyncTime));
        } catch (error) {
            handleError(error, 'sync.persistLastSyncTime');
        }
    }
}

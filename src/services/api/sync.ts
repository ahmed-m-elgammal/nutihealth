import {
    synchronize,
    type SyncDatabaseChangeSet,
    type SyncPullArgs,
    type SyncTableChangeSet,
} from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { waitForDatabaseReady } from '../../database/ready';
import { handleError } from '../../utils/errors';
import { storage } from '../../utils/storage-adapter';
import { config } from '../../constants/config';
import { useSyncStore } from '../../store/syncStore';
import { useUIStore } from '../../store/uiStore';
import { requireSupabaseClient } from '../supabaseClient';
import { resolveRemoteRecordApplication } from '../sync/conflictResolver';
import { syncQueueManager } from '../sync/queueManager';

const SYNC_LAST_SYNC_STORAGE_KEY = 'sync_last_sync_v2';
const SUPABASE_PULL_LIMIT = 1000;
const SYNC_RETRY_BASE_DELAY_MS = 1000;
const SYNC_RETRY_MAX_DELAY_MS = 30000;
const CONFLICT_TOAST_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Sync status enum
 */
export enum SyncStatus {
    IDLE = 'idle',
    SYNCING = 'syncing',
    SUCCESS = 'success',
    ERROR = 'error',
}

/**
 * Sync queue item (legacy shape kept for compatibility)
 */
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

/**
 * Sync result
 */
export interface SyncResult {
    success: boolean;
    syncedItems: number;
    failedItems: number;
    errors: Array<{ item: SyncQueueItem; error: string }>;
}

/**
 * Tables synced with Supabase.
 */
const SYNCABLE_TABLES = [
    'meals',
    'foods',
    'custom_foods',
    'water_logs',
    'water_targets',
    'workouts',
    'workout_exercises',
    'exercise_sets',
    'recipes',
    'meal_plans',
    'habits',
    'habit_logs',
    'weight_logs',
    'users',
] as const;

const USER_SCOPED_TABLES = new Set([
    'meals',
    'custom_foods',
    'water_logs',
    'water_targets',
    'workouts',
    'recipes',
    'meal_plans',
    'habits',
    'weight_logs',
    'users',
]);

type SyncableTable = (typeof SYNCABLE_TABLES)[number];
type RecordShape = Record<string, unknown>;

const isRetriableSyncError = (errorMessage: string): boolean => {
    const normalized = errorMessage.toLowerCase();

    return (
        normalized.includes('network') ||
        normalized.includes('timeout') ||
        normalized.includes('fetch') ||
        normalized.includes('connection') ||
        normalized.includes('429') ||
        normalized.includes('503') ||
        normalized.includes('504')
    );
};

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

const createSyncErrorItem = (): SyncQueueItem => ({
    id: `sync-error-${Date.now()}`,
    table: 'sync',
    recordId: 'n/a',
    operation: 'update',
    timestamp: Date.now(),
    retryCount: 0,
    synced: false,
});

const toTimestamp = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber)) {
            return asNumber;
        }

        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return 0;
};

const sanitizeRecordForPush = (table: SyncableTable, record: RecordShape, userId: string): RecordShape => {
    const normalized: RecordShape = {};

    Object.entries(record).forEach(([key, value]) => {
        if (key === '_status' || key === '_changed') {
            return;
        }

        normalized[key] = value;
    });

    if (normalized.id !== undefined && normalized.id !== null) {
        normalized.id = String(normalized.id);
    }

    if (normalized.updated_at === undefined || normalized.updated_at === null) {
        normalized.updated_at = Date.now();
    }

    if (normalized.created_at === undefined || normalized.created_at === null) {
        normalized.created_at = Date.now();
    }

    if (USER_SCOPED_TABLES.has(table) && (normalized.user_id === undefined || normalized.user_id === null)) {
        normalized.user_id = userId;
    }

    if (table === 'users' && (normalized.user_id === undefined || normalized.user_id === null)) {
        normalized.user_id = userId;
    }

    return normalized;
};

const sanitizeRecordForPull = (table: SyncableTable, record: RecordShape): RecordShape => {
    const normalized: RecordShape = { ...record };

    if (normalized.id !== undefined && normalized.id !== null) {
        normalized.id = String(normalized.id);
    }

    if (normalized.created_at !== undefined && normalized.created_at !== null) {
        normalized.created_at = toTimestamp(normalized.created_at);
    }

    if (normalized.updated_at !== undefined && normalized.updated_at !== null) {
        normalized.updated_at = toTimestamp(normalized.updated_at);
    }

    if (table === 'users' && Object.prototype.hasOwnProperty.call(normalized, 'user_id')) {
        delete normalized.user_id;
    }

    return normalized;
};

class SyncService {
    private status: SyncStatus = SyncStatus.IDLE;
    private lastSyncTime = 0;
    private syncIntervalMs = config.sync.intervalMinutes * 60 * 1000;
    private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private retryAttempt = 0;
    private queuedItemsCount = 0;
    private lastConflictToastAt = 0;

    /**
     * Initialize sync service
     */
    async initialize(): Promise<void> {
        await this.restoreState();
        await this.restoreQueueCount();
        if (config.features.enableSync) {
            this.enableAutoSync(this.syncIntervalMs);
        }
    }

    /**
     * Legacy queue API kept for compatibility. WatermelonDB synchronize() now detects local changes directly.
     */
    async queueSync(
        table: string,
        _recordId: string,
        _operation: SyncQueueItem['operation'],
        _data?: any,
    ): Promise<void> {
        if (!SYNCABLE_TABLES.includes(table as SyncableTable)) {
            console.warn(`Table ${table} is not configured for sync`);
            return;
        }

        console.warn('[sync] queueSync is deprecated. Local changes are captured by WatermelonDB synchronize().');
    }

    /**
     * Perform full bi-directional sync directly with Supabase.
     */
    async performSync(): Promise<SyncResult> {
        if (this.status === SyncStatus.SYNCING) {
            return {
                success: false,
                syncedItems: 0,
                failedItems: 0,
                errors: [],
            };
        }

        if (!config.features.enableSync) {
            return {
                success: true,
                syncedItems: 0,
                failedItems: 0,
                errors: [],
            };
        }

        this.status = SyncStatus.SYNCING;
        useSyncStore.getState().startSync();

        const result: SyncResult = {
            success: true,
            syncedItems: 0,
            failedItems: 0,
            errors: [],
        };

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
                    // Local-first mode can run without Supabase auth; skip sync quietly.
                    this.status = SyncStatus.IDLE;
                    this.retryAttempt = 0;
                    this.clearRetryTimer();
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
                    const changes = await this.pullChangesFromSupabase(since, user.id);
                    pulledItems += this.countChanges(changes);

                    return {
                        changes,
                        timestamp: Date.now(),
                    };
                },
                pushChanges: async ({ changes }) => {
                    pushedItems += await this.pushChangesToSupabase(changes, user.id);
                },
                migrationsEnabledAtVersion: 1,
            });

            this.lastSyncTime = Date.now();
            result.syncedItems = pushedItems + pulledItems;
            this.status = SyncStatus.SUCCESS;
            this.retryAttempt = 0;
            this.clearRetryTimer();
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
            result.errors.push({
                item: createSyncErrorItem(),
                error: errorMessage,
            });

            useSyncStore.getState().failSync(errorMessage);
            await syncQueueManager.enqueue(errorMessage);
            this.queuedItemsCount = await syncQueueManager.getCount();

            if (isRetriableSyncError(errorMessage)) {
                this.scheduleRetry();
            }
        }

        return result;
    }

    /**
     * Pull remote changes by running a full sync cycle.
     */
    async pullChanges(_since?: number): Promise<void> {
        await this.performSync();
    }

    /**
     * Get sync status
     */
    getStatus(): SyncStatus {
        return this.status;
    }

    /**
     * Get last sync time
     */
    getLastSyncTime(): number {
        return this.lastSyncTime;
    }

    /**
     * Queue count is always zero with direct synchronize().
     */
    getQueuedItemsCount(): number {
        return this.queuedItemsCount;
    }

    /**
     * Clear queue (no-op)
     */
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

    /**
     * Enable automatic sync
     */
    enableAutoSync(interval?: number): void {
        if (interval) {
            this.syncIntervalMs = interval;
        }

        this.disableAutoSync();

        if (!config.features.enableSync) {
            return;
        }

        this.autoSyncTimer = setInterval(() => {
            this.performSync().catch((error) => {
                handleError(error, 'sync.autoSync');
            });
        }, this.syncIntervalMs);
    }

    /**
     * Disable automatic sync
     */
    disableAutoSync(): void {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
        this.clearRetryTimer();
    }

    private scheduleRetry(): void {
        if (this.retryTimer) {
            return;
        }

        if (this.retryAttempt >= config.sync.maxRetries) {
            return;
        }

        const delay = Math.min(
            SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, this.retryAttempt),
            SYNC_RETRY_MAX_DELAY_MS,
        );

        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.retryAttempt += 1;
            syncQueueManager.incrementRetryCount().catch(() => undefined);
            this.performSync().catch((error) => {
                handleError(error, 'sync.retry.performSync');
            });
        }, delay);
    }

    private clearRetryTimer(): void {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
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
                const shouldRetry = attempt < maxRetries && isRetriableSyncError(errorMessage);

                if (!shouldRetry) {
                    throw error;
                }

                const delay = Math.min(
                    SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt),
                    SYNC_RETRY_MAX_DELAY_MS,
                );

                console.warn(`[sync] retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                attempt += 1;
            }
        }
    }

    private async pullChangesFromSupabase(lastPulledAt: number, userId: string): Promise<SyncDatabaseChangeSet> {
        const pulledChanges: SyncDatabaseChangeSet = {};
        const changesRecord = pulledChanges as Record<string, SyncTableChangeSet>;
        let serverOverwriteConflicts = 0;

        for (const table of SYNCABLE_TABLES) {
            const records = await this.fetchRemoteRows(table, lastPulledAt, userId);

            const tableChanges: SyncTableChangeSet = {
                created: [],
                updated: [],
                // Remote delete pull requires tombstone/deleted_at support server-side.
                deleted: [],
            };

            for (const record of records) {
                const normalized = sanitizeRecordForPull(table, record);
                const decision = await resolveRemoteRecordApplication(table, normalized);
                if (!decision.shouldApplyRemote) {
                    continue;
                }

                if (decision.remoteOverwroteLocal) {
                    serverOverwriteConflicts += 1;
                }

                const createdAt = toTimestamp(normalized.created_at);

                if (lastPulledAt === 0 || (createdAt > 0 && createdAt > lastPulledAt)) {
                    tableChanges.created.push(normalized as any);
                } else {
                    tableChanges.updated.push(normalized as any);
                }
            }

            changesRecord[table] = tableChanges;
        }

        if (
            serverOverwriteConflicts > 0 &&
            Date.now() - this.lastConflictToastAt > CONFLICT_TOAST_COOLDOWN_MS
        ) {
            this.lastConflictToastAt = Date.now();
            useUIStore
                .getState()
                .showToast(
                    'warning',
                    `${serverOverwriteConflicts} sync conflict${serverOverwriteConflicts === 1 ? '' : 's'} resolved using server changes.`,
                    4500,
                );
        }

        return pulledChanges;
    }

    private async pushChangesToSupabase(changes: SyncDatabaseChangeSet, userId: string): Promise<number> {
        let pushedCount = 0;
        const changeMap = changes as Record<string, SyncTableChangeSet>;

        for (const table of SYNCABLE_TABLES) {
            const tableChanges = changeMap[table];
            if (!tableChanges) {
                continue;
            }

            pushedCount += await this.pushTableChanges(table, tableChanges, userId);
        }

        return pushedCount;
    }

    private async pushTableChanges(
        table: SyncableTable,
        tableChanges: SyncTableChangeSet,
        userId: string,
    ): Promise<number> {
        const supabase = requireSupabaseClient();

        const upserts = [...tableChanges.created, ...tableChanges.updated].map((record) =>
            sanitizeRecordForPush(table, (record || {}) as RecordShape, userId),
        );

        if (upserts.length > 0) {
            await this.executeWithRetry(`upsert:${table}`, async () => {
                const { error } = await supabase.from(table).upsert(upserts as any[], {
                    onConflict: 'id',
                    ignoreDuplicates: false,
                });

                if (error) {
                    throw new Error(`Failed to upsert ${table}: ${error.message}`);
                }
            });
        }

        const deletedIds = tableChanges.deleted.map((id) => String(id));
        if (deletedIds.length > 0) {
            await this.executeWithRetry(`delete:${table}`, async () => {
                const { error } = await supabase.from(table).delete().in('id', deletedIds);

                if (error) {
                    throw new Error(`Failed to delete ${table}: ${error.message}`);
                }
            });
        }

        return upserts.length + deletedIds.length;
    }

    private async fetchRemoteRows(table: SyncableTable, lastPulledAt: number, userId: string): Promise<RecordShape[]> {
        const supabase = requireSupabaseClient();

        const runQuery = async (useIsoDateForFilter: boolean) => {
            let query = supabase
                .from(table)
                .select('*')
                .order('updated_at', { ascending: true })
                .limit(SUPABASE_PULL_LIMIT);

            if (USER_SCOPED_TABLES.has(table)) {
                query = query.eq('user_id', userId);
            }

            if (lastPulledAt > 0) {
                query = query.gt(
                    'updated_at',
                    useIsoDateForFilter ? new Date(lastPulledAt).toISOString() : lastPulledAt,
                );
            }

            return await query;
        };

        const numericFilterResult = await runQuery(false);
        if (!numericFilterResult.error) {
            return (numericFilterResult.data || []) as RecordShape[];
        }

        if (lastPulledAt <= 0) {
            throw new Error(`Failed to pull ${table}: ${numericFilterResult.error.message}`);
        }

        const isoFilterResult = await runQuery(true);
        if (!isoFilterResult.error) {
            return (isoFilterResult.data || []) as RecordShape[];
        }

        throw new Error(
            `Failed to pull ${table}: ${isoFilterResult.error.message} (numeric filter error: ${numericFilterResult.error.message})`,
        );
    }

    private countChanges(changes: SyncDatabaseChangeSet): number {
        const changeMap = changes as Record<string, SyncTableChangeSet>;

        return Object.values(changeMap).reduce((count, tableChanges) => {
            const tableCount = tableChanges.created.length + tableChanges.updated.length + tableChanges.deleted.length;
            return count + tableCount;
        }, 0);
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

// Export singleton instance
export const syncService = new SyncService();
export default syncService;

import { apiClient } from './client';
import { handleError } from '../../utils/errors';
import { storage } from '../../utils/storage-adapter';
import { config } from '../../constants/config';

/**
 * Data Synchronization Service
 *
 * OFFLINE-FIRST ARCHITECTURE:
 * This service implements a sync engine to backup local WatermelonDB data
 * to a remote server when online.
 */

const SYNC_QUEUE_STORAGE_KEY = 'sync_queue_v1';
const SYNC_LAST_SYNC_STORAGE_KEY = 'sync_last_sync_v1';

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
 * Sync queue item
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
 * Tables to sync
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
];

/**
 * Sync state
 */
class SyncService {
    private status: SyncStatus = SyncStatus.IDLE;
    private syncQueue: SyncQueueItem[] = [];
    private lastSyncTime = 0;
    private syncIntervalMs = config.sync.intervalMinutes * 60 * 1000;
    private autoSyncTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * Initialize sync service
     */
    async initialize(): Promise<void> {
        await this.restoreState();
        if (config.features.enableSync) {
            this.enableAutoSync(this.syncIntervalMs);
        }
    }

    /**
     * Add item to sync queue
     */
    async queueSync(
        table: string,
        recordId: string,
        operation: SyncQueueItem['operation'],
        data?: any
    ): Promise<void> {
        if (!SYNCABLE_TABLES.includes(table)) {
            console.warn(`Table ${table} is not configured for sync`);
            return;
        }

        const queueItem: SyncQueueItem = {
            id: `${Date.now()}-${Math.random()}`,
            table,
            recordId,
            operation,
            data,
            timestamp: Date.now(),
            retryCount: 0,
            synced: false,
        };

        this.syncQueue.push(queueItem);
        await this.persistQueue();
    }

    /**
     * Perform full sync
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

        const result: SyncResult = {
            success: true,
            syncedItems: 0,
            failedItems: 0,
            errors: [],
        };

        try {
            const queue = [...this.syncQueue];

            for (const item of queue) {
                try {
                    await this.syncItem(item);
                    result.syncedItems++;
                    this.syncQueue = this.syncQueue.filter((queuedItem) => queuedItem.id !== item.id);
                } catch (error) {
                    result.failedItems++;
                    result.errors.push({
                        item,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });

                    if (item.retryCount < config.sync.maxRetries) {
                        item.retryCount++;
                    } else {
                        this.syncQueue = this.syncQueue.filter((queuedItem) => queuedItem.id !== item.id);
                        console.error(`Max retries reached for sync item ${item.id}`);
                    }
                }
            }

            this.lastSyncTime = Date.now();
            this.status = result.failedItems === 0 ? SyncStatus.SUCCESS : SyncStatus.ERROR;
            await this.persistLastSyncTime();
        } catch (error) {
            handleError(error, 'sync.performSync');
            this.status = SyncStatus.ERROR;
            result.success = false;
        } finally {
            await this.persistQueue();
        }

        return result;
    }

    /**
     * Sync individual item to server
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        const endpoint = `/sync/${item.table}`;
        let response;

        switch (item.operation) {
            case 'create':
            case 'update':
                response = await apiClient.post(endpoint, {
                    recordId: item.recordId,
                    operation: item.operation,
                    data: item.data,
                    timestamp: item.timestamp,
                });
                break;

            case 'delete':
                response = await apiClient.delete(`${endpoint}/${item.recordId}`);
                break;
        }

        if (!response || !response.success) {
            throw new Error(response?.error?.message || 'Remote sync request failed');
        }
    }

    /**
     * Pull changes from server
     */
    async pullChanges(since?: number): Promise<void> {
        if (!config.features.enableSync) {
            return;
        }

        try {
            const timestamp = since || this.lastSyncTime || 0;
            const response = await apiClient.get<{
                changes?: unknown;
            }>(`/sync/changes?since=${timestamp}`);

            if (response.success && response.data?.changes !== undefined) {
                await this.applyRemoteChanges(response.data.changes);
            }
        } catch (error) {
            handleError(error, 'sync.pullChanges');
        }
    }

    /**
     * Apply remote changes to local database.
     * Current behavior is a guarded no-op until schema-level merge rules are finalized.
     */
    private async applyRemoteChanges(changes: unknown): Promise<void> {
        if (changes == null) {
            return;
        }

        const changeCount = Array.isArray(changes)
            ? changes.length
            : typeof changes === 'object'
                ? Object.keys(changes as Record<string, unknown>).length
                : 0;

        if (changeCount > 0) {
            console.log(`[sync] Received ${changeCount} remote change(s); local apply is deferred.`);
        }
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
     * Get queued items count
     */
    getQueuedItemsCount(): number {
        return this.syncQueue.length;
    }

    /**
     * Clear sync queue
     */
    clearQueue(): void {
        this.syncQueue = [];
        void this.persistQueue();
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
            void this.performSync();
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
    }

    private async restoreState(): Promise<void> {
        try {
            const queueJson = await storage.getItem(SYNC_QUEUE_STORAGE_KEY);
            if (queueJson) {
                const parsedQueue: unknown = JSON.parse(queueJson);
                if (Array.isArray(parsedQueue)) {
                    this.syncQueue = parsedQueue.filter(this.isValidQueueItem);
                }
            }

            const lastSync = await storage.getItem(SYNC_LAST_SYNC_STORAGE_KEY);
            if (lastSync) {
                const parsedTimestamp = Number(lastSync);
                if (Number.isFinite(parsedTimestamp) && parsedTimestamp > 0) {
                    this.lastSyncTime = parsedTimestamp;
                }
            }
        } catch (error) {
            handleError(error, 'sync.restoreState');
        }
    }

    private async persistQueue(): Promise<void> {
        try {
            await storage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(this.syncQueue));
        } catch (error) {
            handleError(error, 'sync.persistQueue');
        }
    }

    private async persistLastSyncTime(): Promise<void> {
        try {
            await storage.setItem(SYNC_LAST_SYNC_STORAGE_KEY, String(this.lastSyncTime));
        } catch (error) {
            handleError(error, 'sync.persistLastSyncTime');
        }
    }

    private isValidQueueItem(item: unknown): item is SyncQueueItem {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<SyncQueueItem>;
        return Boolean(
            candidate.id &&
            candidate.table &&
            candidate.recordId &&
            candidate.operation &&
            typeof candidate.timestamp === 'number' &&
            typeof candidate.retryCount === 'number' &&
            typeof candidate.synced === 'boolean'
        );
    }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;

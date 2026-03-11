import { syncService, SyncStatus, type SyncResult } from '../api/sync';

/**
 * Lightweight sync manager facade for app-layer consumption.
 * Keeps sync orchestration in one place while delegating to syncService.
 */
class SyncManager {
    startAutoSync(intervalMs?: number): void {
        syncService.enableAutoSync(intervalMs);
    }

    stopAutoSync(): void {
        syncService.disableAutoSync();
    }

    async syncNow(): Promise<SyncResult> {
        return await syncService.performSync();
    }

    getStatus(): SyncStatus {
        return syncService.getStatus();
    }

    getLastSyncTime(): number {
        return syncService.getLastSyncTime();
    }
}

export const syncManager = new SyncManager();
export { SyncStatus };
export type { SyncResult };
export default syncManager;

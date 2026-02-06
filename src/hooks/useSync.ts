import { useSyncStore } from '../store/syncStore';
import { config } from '../constants/config';

/**
 * Hook for managing sync state and operations
 * @returns Sync utilities
 */
export function useSync() {
    const isSyncing = useSyncStore((state) => state.isSyncing);
    const lastSyncTime = useSyncStore((state) => state.lastSyncTime);
    const syncError = useSyncStore((state) => state.syncError);
    const pendingChanges = useSyncStore((state) => state.pendingChanges);
    const startSync = useSyncStore((state) => state.startSync);
    const completeSync = useSyncStore((state) => state.completeSync);
    const failSync = useSyncStore((state) => state.failSync);

    /**
     * Check if sync is enabled in config
     */
    const isSyncEnabled = config.features.enableSync;

    /**
     * Trigger a manual sync
     */
    const triggerSync = async () => {
        if (!isSyncEnabled) {
            console.warn('Sync is not enabled in configuration');
            return;
        }

        if (isSyncing) {
            console.warn('Sync is already in progress');
            return;
        }

        try {
            startSync();

            // TODO: Implement actual sync logic when backend is ready
            // This would include:
            // 1. Fetch pending changes from local sync queue
            // 2. Send changes to server
            // 3. Receive server changes
            // 4. Apply server changes to local database
            // 5. Handle conflicts

            // Simulated sync
            await new Promise(resolve => setTimeout(resolve, 1000));

            completeSync(Date.now());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sync failed';
            failSync(errorMessage);
        }
    };

    /**
     * Get time since last sync in minutes
     */
    const getTimeSinceLastSync = (): number | null => {
        if (!lastSyncTime) return null;
        return Math.floor((Date.now() - lastSyncTime) / 60000); // Convert to minutes
    };

    /**
     * Check if sync is needed based on interval
     */
    const isSyncNeeded = (): boolean => {
        const timeSinceSync = getTimeSinceLastSync();
        if (timeSinceSync === null) return true; // Never synced
        return timeSinceSync >= config.sync.intervalMinutes;
    };

    /**
     * Get human-readable sync status
     */
    const getSyncStatus = (): string => {
        if (!isSyncEnabled) return 'Sync disabled';
        if (isSyncing) return 'Syncing...';
        if (syncError) return `Sync error: ${syncError}`;
        if (!lastSyncTime) return 'Never synced';

        const timeSince = getTimeSinceLastSync();
        if (timeSince === null) return 'Unknown';
        if (timeSince < 1) return 'Just now';
        if (timeSince < 60) return `${timeSince}m ago`;

        const hours = Math.floor(timeSince / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return {
        isSyncing,
        isSyncEnabled,
        lastSyncTime,
        syncError,
        pendingChanges,
        triggerSync,
        getTimeSinceLastSync,
        isSyncNeeded,
        getSyncStatus,
    };
}

export default useSync;

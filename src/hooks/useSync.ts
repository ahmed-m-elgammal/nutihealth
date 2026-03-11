import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSyncStore } from '../store/syncStore';
import { config } from '../constants/config';
import syncService, { type SyncResult } from '../services/api/sync';

/**
 * Hook for sync status + resilient reconnect behavior.
 */
export function useSync() {
    const isSyncing = useSyncStore((state) => state.isSyncing);
    const lastSyncTime = useSyncStore((state) => state.lastSyncTime);
    const syncError = useSyncStore((state) => state.syncError);
    const [isOnline, setIsOnline] = useState(true);
    const wasOnlineRef = useRef(true);
    const bootstrappedSyncRef = useRef(false);

    const isSyncEnabled = config.features.enableSync;

    const triggerSync = useCallback(async (): Promise<SyncResult | null> => {
        if (!isSyncEnabled || isSyncing || !isOnline) {
            return null;
        }

        return await syncService.performSync();
    }, [isOnline, isSyncEnabled, isSyncing]);

    const getTimeSinceLastSync = useCallback((): number | null => {
        if (!lastSyncTime) return null;
        return Math.floor((Date.now() - lastSyncTime) / 60000);
    }, [lastSyncTime]);

    const isSyncNeeded = useCallback((): boolean => {
        const timeSinceSync = getTimeSinceLastSync();
        if (timeSinceSync === null) return true;
        return timeSinceSync >= config.sync.intervalMinutes;
    }, [getTimeSinceLastSync]);

    useEffect(() => {
        if (!isSyncEnabled) {
            return;
        }

        const unsubscribe = NetInfo.addEventListener((state) => {
            const onlineNow = Boolean(state.isConnected && state.isInternetReachable !== false);
            setIsOnline(onlineNow);

            if (!wasOnlineRef.current && onlineNow && isSyncNeeded()) {
                triggerSync().catch(() => undefined);
            }

            wasOnlineRef.current = onlineNow;
        });

        return unsubscribe;
    }, [isSyncEnabled, isSyncNeeded, triggerSync]);

    useEffect(() => {
        if (!isSyncEnabled || !isOnline || bootstrappedSyncRef.current) {
            return;
        }

        bootstrappedSyncRef.current = true;
        if (isSyncNeeded()) {
            triggerSync().catch(() => undefined);
        }
    }, [isOnline, isSyncEnabled, isSyncNeeded, triggerSync]);

    const syncStatus = useMemo(() => {
        if (!isSyncEnabled) return 'Sync disabled';
        if (!isOnline) return 'Offline';
        if (isSyncing) return 'Syncing...';
        if (syncError) return `Sync error: ${syncError}`;
        if (!lastSyncTime) return 'Never synced';

        const minutes = getTimeSinceLastSync();
        if (minutes === null || minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }, [getTimeSinceLastSync, isOnline, isSyncEnabled, isSyncing, lastSyncTime, syncError]);

    return {
        isOnline,
        isSyncing,
        isSyncEnabled,
        lastSyncTime,
        syncError,
        syncStatus,
        triggerSync,
        getTimeSinceLastSync,
        isSyncNeeded,
    };
}

export default useSync;

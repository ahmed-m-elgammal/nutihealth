import { create } from 'zustand';

interface SyncState {
    isSyncing: boolean;
    lastSyncTime: number | null;
    syncError: string | null;
    startSync: () => void;
    completeSync: () => void;
    failSync: (error: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,

    startSync: () => set({ isSyncing: true, syncError: null }),

    completeSync: () => set({
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncError: null,
    }),

    failSync: (error) => set({
        isSyncing: false,
        syncError: error,
    }),
}));

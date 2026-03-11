const mockEnableAutoSync = jest.fn();
const mockDisableAutoSync = jest.fn();
const mockPerformSync = jest.fn();
const mockGetStatus = jest.fn();
const mockGetLastSyncTime = jest.fn();

jest.mock('../../api/sync', () => ({
    SyncStatus: {
        IDLE: 'idle',
        SYNCING: 'syncing',
        SUCCESS: 'success',
        ERROR: 'error',
    },
    syncService: {
        enableAutoSync: (...args: unknown[]) => mockEnableAutoSync(...args),
        disableAutoSync: (...args: unknown[]) => mockDisableAutoSync(...args),
        performSync: (...args: unknown[]) => mockPerformSync(...args),
        getStatus: (...args: unknown[]) => mockGetStatus(...args),
        getLastSyncTime: (...args: unknown[]) => mockGetLastSyncTime(...args),
    },
}));

import syncManager, { SyncStatus } from '../syncManager';

describe('syncManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('starts auto sync with an optional custom interval', () => {
        syncManager.startAutoSync(30000);

        expect(mockEnableAutoSync).toHaveBeenCalledWith(30000);
    });

    test('stops auto sync', () => {
        syncManager.stopAutoSync();

        expect(mockDisableAutoSync).toHaveBeenCalledTimes(1);
    });

    test('runs manual sync and returns service result', async () => {
        const syncResult = {
            success: true,
            syncedItems: 4,
            failedItems: 0,
            errors: [],
        };
        mockPerformSync.mockResolvedValue(syncResult);

        await expect(syncManager.syncNow()).resolves.toEqual(syncResult);
    });

    test('returns current status from sync service', () => {
        mockGetStatus.mockReturnValue(SyncStatus.SYNCING);

        expect(syncManager.getStatus()).toBe(SyncStatus.SYNCING);
    });

    test('returns last sync timestamp from sync service', () => {
        mockGetLastSyncTime.mockReturnValue(1700000000000);

        expect(syncManager.getLastSyncTime()).toBe(1700000000000);
    });
});

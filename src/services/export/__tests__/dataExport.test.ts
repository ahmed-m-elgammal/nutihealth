const mockGetDocumentAsync = jest.fn();
const mockFileWrite = jest.fn();
const mockFileText = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockAlert = jest.fn();
const mockDatabaseGet = jest.fn();
const mockDatabaseWrite = jest.fn();
const mockDatabaseBatch = jest.fn();
const mockUnsafeResetDatabase = jest.fn();
const mockStorageGetItem = jest.fn();
const mockStorageSetItem = jest.fn();
const mockStorageRemoveItem = jest.fn();
const mockHandleError = jest.fn();

jest.mock('expo-document-picker', () => ({
    getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock('expo-file-system', () => {
    class MockDirectory {
        public uri: string;
        public exists: boolean;

        constructor(...segments: unknown[]) {
            const normalizedSegments = segments.map((segment) => String(segment));
            this.uri = normalizedSegments.join('/');
            this.exists = true;
        }

        create() {
            mockDirectoryCreate();
            this.exists = true;
        }
    }

    class MockFile {
        public uri: string;

        constructor(...segments: unknown[]) {
            if (segments.length === 1 && typeof segments[0] === 'string' && String(segments[0]).startsWith('file://')) {
                this.uri = String(segments[0]);
                return;
            }

            const normalizedSegments = segments.map((segment) =>
                typeof segment === 'object' && segment !== null && 'uri' in (segment as Record<string, unknown>)
                    ? String((segment as { uri: string }).uri)
                    : String(segment),
            );

            this.uri = normalizedSegments.join('/');
        }

        write(...args: unknown[]) {
            return mockFileWrite(...args);
        }

        text(...args: unknown[]) {
            return mockFileText(...args);
        }
    }

    return {
        File: MockFile,
        Directory: MockDirectory,
        Paths: {
            document: new MockDirectory('/documents'),
            cache: new MockDirectory('/cache'),
        },
    };
});

jest.mock('expo-sharing', () => ({
    isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
    shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('react-native', () => ({
    Alert: {
        alert: (...args: unknown[]) => mockAlert(...args),
    },
}));

jest.mock('../../../database', () => ({
    database: {
        get: (...args: unknown[]) => mockDatabaseGet(...args),
        write: (...args: unknown[]) => mockDatabaseWrite(...args),
        batch: (...args: unknown[]) => mockDatabaseBatch(...args),
        unsafeResetDatabase: (...args: unknown[]) => mockUnsafeResetDatabase(...args),
    },
}));

jest.mock('../../../utils/storage-adapter', () => ({
    storage: {
        getItem: (...args: unknown[]) => mockStorageGetItem(...args),
        setItem: (...args: unknown[]) => mockStorageSetItem(...args),
        removeItem: (...args: unknown[]) => mockStorageRemoveItem(...args),
    },
}));

jest.mock('../../../utils/errors', () => ({
    handleError: (...args: unknown[]) => mockHandleError(...args),
}));

import { config } from '../../../constants/config';
import { DATABASE_SCHEMA_VERSION } from '../../../database/schemaVersion';
import { exportBackupAndShare, exportBackupToFile, restoreBackupFromFilePicker } from '../dataExport';

const BACKUP_TABLES = [
    'users',
    'meals',
    'foods',
    'custom_foods',
    'water_logs',
    'water_targets',
    'workouts',
    'workout_exercises',
    'exercise_sets',
    'exercises',
    'workout_templates',
    'training_programs',
    'template_exercises',
    'workout_schedules',
    'workout_sessions',
    'recipes',
    'meal_plans',
    'habits',
    'habit_logs',
    'weight_logs',
    'diets',
    'user_diets',
    'meal_templates',
    'weekly_goal_plans',
    'cookpad_recipe_cache',
    'smart_cooker_suggestions',
    'pantry_items',
] as const;

const createValidBackupPayload = () => ({
    version: 1,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    createdAt: '2026-02-22T18:00:00.000Z',
    app: {
        name: config.app.name,
        version: config.app.version,
        schemaVersion: DATABASE_SCHEMA_VERSION,
    },
    tables: Object.fromEntries(
        BACKUP_TABLES.map((tableName) => [
            tableName,
            [
                {
                    id: `${tableName}-1`,
                    created_at: 1700000000000,
                    updated_at: 1700000000000,
                },
            ],
        ]),
    ),
    storage: {
        [config.storageKeys.theme]: 'dark',
        [config.storageKeys.language]: 'en',
        [config.storageKeys.onboardingComplete]: null,
    },
});

const setAlertDecision = (action: 'Restore' | 'Cancel') => {
    mockAlert.mockImplementation(
        (_title: string, _message: string, buttons: Array<{ text: string; onPress?: () => void }>) => {
            const selected = buttons.find((button) => button.text === action);
            if (!selected) {
                throw new Error(`Missing alert button: ${action}`);
            }
            selected.onPress?.();
        },
    );
};

describe('dataExport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAlert.mockImplementation(() => undefined);

        mockFileWrite.mockReturnValue(undefined);
        mockFileText.mockResolvedValue('{}');
        mockDatabaseBatch.mockResolvedValue(undefined);
        mockUnsafeResetDatabase.mockResolvedValue(undefined);
        mockDatabaseWrite.mockImplementation(async (work: () => Promise<void>) => {
            await work();
        });

        mockStorageGetItem.mockImplementation(async (key: string) => {
            const values: Record<string, string | null> = {
                [config.storageKeys.theme]: 'dark',
                [config.storageKeys.language]: 'en',
                [config.storageKeys.onboardingComplete]: 'true',
            };
            return values[key] ?? null;
        });
    });

    test('exports backup payload to file and returns summary stats', async () => {
        mockDatabaseGet.mockImplementation((tableName: string) => ({
            query: () => ({
                fetch: async () => [
                    { _raw: { id: `${tableName}-1`, title: 'keep-me' } },
                    { _raw: { id: `${tableName}-deleted`, _status: 'deleted' } },
                    { _raw: { title: 'missing-id' } },
                ],
            }),
        }));

        const result = await exportBackupToFile();

        expect(result.tableCount).toBe(BACKUP_TABLES.length);
        expect(result.recordCount).toBe(BACKUP_TABLES.length);
        expect(result.fileName).toMatch(/^nutrihealth-backup-.*\.json$/);
        expect(result.fileUri).toBe(`/documents/${result.fileName}`);
        expect(mockFileWrite).toHaveBeenCalledTimes(1);
        expect(mockFileWrite).toHaveBeenCalledWith(expect.any(String));

        const writtenJson = mockFileWrite.mock.calls[0][0] as string;
        const payload = JSON.parse(writtenJson);
        expect(payload.tables.meals).toHaveLength(1);
        expect(payload.tables.meals[0]._status).toBe('synced');
        expect(payload.storage[config.storageKeys.theme]).toBe('dark');
        expect(payload.storage[config.storageKeys.language]).toBe('en');
    });

    test('shares exported backup when OS sharing is available', async () => {
        mockDatabaseGet.mockImplementation((tableName: string) => ({
            query: () => ({
                fetch: async () => [{ _raw: { id: `${tableName}-1` } }],
            }),
        }));
        mockIsAvailableAsync.mockResolvedValue(true);

        const result = await exportBackupAndShare();

        expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1);
        expect(mockShareAsync).toHaveBeenCalledWith(
            result.fileUri,
            expect.objectContaining({
                mimeType: 'application/json',
                dialogTitle: 'Back up NutriHealth data',
            }),
        );
    });

    test('restores backup from picker after confirmation', async () => {
        const payload = createValidBackupPayload();
        mockGetDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///backups/backup.json', name: 'backup.json' }],
        });
        mockFileText.mockResolvedValue(JSON.stringify(payload));
        setAlertDecision('Restore');
        mockDatabaseGet.mockImplementation(() => ({
            prepareCreateFromDirtyRaw: jest.fn((row: unknown) => ({ row })),
        }));

        const result = await restoreBackupFromFilePicker();

        expect(result).toEqual({
            fileName: 'backup.json',
            tableCount: BACKUP_TABLES.length,
            recordCount: BACKUP_TABLES.length,
        });
        expect(mockUnsafeResetDatabase).toHaveBeenCalledTimes(1);
        expect(mockDatabaseBatch).toHaveBeenCalledTimes(1);
        expect(mockStorageSetItem).toHaveBeenCalledWith(config.storageKeys.theme, 'dark');
        expect(mockStorageSetItem).toHaveBeenCalledWith(config.storageKeys.language, 'en');
        expect(mockStorageRemoveItem).toHaveBeenCalledWith(config.storageKeys.onboardingComplete);
    });

    test('returns null when restore confirmation is cancelled', async () => {
        const payload = createValidBackupPayload();
        mockGetDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///backups/backup.json', name: 'backup.json' }],
        });
        mockFileText.mockResolvedValue(JSON.stringify(payload));
        setAlertDecision('Cancel');

        await expect(restoreBackupFromFilePicker()).resolves.toBeNull();
        expect(mockUnsafeResetDatabase).not.toHaveBeenCalled();
    });

    test('returns null when picker has no file selection', async () => {
        mockGetDocumentAsync.mockResolvedValue({
            canceled: true,
            assets: [],
        });

        await expect(restoreBackupFromFilePicker()).resolves.toBeNull();
    });

    test('returns null when picker throws a cancellation error', async () => {
        mockGetDocumentAsync.mockRejectedValue(new Error('User cancelled picker'));

        await expect(restoreBackupFromFilePicker()).resolves.toBeNull();
        expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('returns null with warning when backup schema is incompatible', async () => {
        const payload = {
            ...createValidBackupPayload(),
            schemaVersion: Math.max(1, DATABASE_SCHEMA_VERSION - 1),
            app: {
                name: config.app.name,
                version: config.app.version,
                schemaVersion: Math.max(1, DATABASE_SCHEMA_VERSION - 1),
            },
        };

        mockGetDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///backups/backup.json', name: 'backup.json' }],
        });
        mockFileText.mockResolvedValue(JSON.stringify(payload));

        await expect(restoreBackupFromFilePicker()).resolves.toBeNull();
        expect(mockUnsafeResetDatabase).not.toHaveBeenCalled();
        expect(mockHandleError).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith('Backup Not Compatible', expect.stringContaining('not compatible'));
    });

    test('throws and reports non-cancellation restore errors', async () => {
        mockGetDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///backups/backup.json', name: 'backup.json' }],
        });
        mockFileText.mockResolvedValue('not-json');

        await expect(restoreBackupFromFilePicker()).rejects.toThrow('Backup file is not valid JSON.');
        expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'dataExport.restoreBackupFromFilePicker');
    });
});

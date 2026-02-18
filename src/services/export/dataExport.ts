import type { Model } from '@nozbe/watermelondb';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { database } from '../../database';
import { config } from '../../constants/config';
import { storage } from '../../utils/storage-adapter';
import { handleError } from '../../utils/errors';

const BACKUP_VERSION = 1;
const RESTORE_BATCH_SIZE = 400;
const BACKUP_STORAGE_KEYS = [
    config.storageKeys.theme,
    config.storageKeys.language,
    config.storageKeys.onboardingComplete,
] as const;

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
    'recipes',
    'meal_plans',
    'habits',
    'habit_logs',
    'weight_logs',
    'diets',
    'user_diets',
    'meal_templates',
    'weekly_goal_plans',
] as const;

type BackupTableName = (typeof BACKUP_TABLES)[number];
type BackupStorageKey = (typeof BACKUP_STORAGE_KEYS)[number];

interface RawRecord {
    id: string;
    _status?: string;
    _changed?: string;
    [key: string]: unknown;
}

interface BackupPayload {
    version: number;
    createdAt: string;
    app: {
        name: string;
        version: string;
    };
    tables: Record<BackupTableName, RawRecord[]>;
    storage: Partial<Record<BackupStorageKey, string | null>>;
}

export interface BackupStats {
    tableCount: number;
    recordCount: number;
}

export interface ExportBackupResult extends BackupStats {
    fileUri: string;
    fileName: string;
}

export interface RestoreBackupResult extends BackupStats {
    fileName: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toSafeRawRecord = (raw: unknown): RawRecord | null => {
    if (!isObjectRecord(raw)) {
        return null;
    }

    const id = raw.id;
    if (typeof id !== 'string' || id.trim().length === 0) {
        return null;
    }

    const normalized: RawRecord = {
        ...raw,
        id,
        _status: 'synced',
        _changed: '',
    };

    if (normalized._status === 'deleted') {
        return null;
    }

    return normalized;
};

const getFileTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

const getWritableDirectory = (): string => {
    const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!directory) {
        throw new Error('No writable directory available for backup export.');
    }
    return directory;
};

const countRecords = (payload: BackupPayload): number =>
    BACKUP_TABLES.reduce((total, tableName) => total + payload.tables[tableName].length, 0);

async function collectTableData(tableName: BackupTableName): Promise<RawRecord[]> {
    const collection = database.get<Model>(tableName);
    const records = await collection.query().fetch();

    return records
        .map((record) => {
            const rawCandidate = (record as unknown as { _raw?: unknown })._raw;
            return toSafeRawRecord(rawCandidate);
        })
        .filter((row): row is RawRecord => row !== null);
}

async function collectStorageData(): Promise<Partial<Record<BackupStorageKey, string | null>>> {
    const entries = await Promise.all(
        BACKUP_STORAGE_KEYS.map(async (key) => [key, await storage.getItem(key)] as const),
    );

    return entries.reduce<Partial<Record<BackupStorageKey, string | null>>>((accumulator, [key, value]) => {
        accumulator[key] = value;
        return accumulator;
    }, {});
}

async function buildBackupPayload(): Promise<BackupPayload> {
    const tableEntries = await Promise.all(
        BACKUP_TABLES.map(async (tableName) => [tableName, await collectTableData(tableName)] as const),
    );

    const tables = tableEntries.reduce<Record<BackupTableName, RawRecord[]>>(
        (accumulator, [tableName, rows]) => {
            accumulator[tableName] = rows;
            return accumulator;
        },
        {} as Record<BackupTableName, RawRecord[]>,
    );

    return {
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        app: {
            name: config.app.name,
            version: config.app.version,
        },
        tables,
        storage: await collectStorageData(),
    };
}

function parseBackupPayload(json: string): BackupPayload {
    let parsed: unknown;

    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('Backup file is not valid JSON.');
    }

    if (!isObjectRecord(parsed)) {
        throw new Error('Backup file format is invalid.');
    }

    if (parsed.version !== BACKUP_VERSION) {
        throw new Error(`Unsupported backup version: ${String(parsed.version)}.`);
    }

    if (!isObjectRecord(parsed.tables)) {
        throw new Error('Backup tables are missing or invalid.');
    }

    const tables = {} as Record<BackupTableName, RawRecord[]>;
    for (const tableName of BACKUP_TABLES) {
        const rows = parsed.tables[tableName];
        if (rows == null) {
            tables[tableName] = [];
            continue;
        }

        if (!Array.isArray(rows)) {
            throw new Error(`Backup table "${tableName}" is invalid.`);
        }

        tables[tableName] = rows.map((row) => toSafeRawRecord(row)).filter((row): row is RawRecord => row !== null);
    }

    const storageSnapshot = isObjectRecord(parsed.storage) ? parsed.storage : {};
    const storageData: Partial<Record<BackupStorageKey, string | null>> = {};

    for (const key of BACKUP_STORAGE_KEYS) {
        const value = storageSnapshot[key];
        storageData[key] = typeof value === 'string' ? value : null;
    }

    const parsedApp = isObjectRecord(parsed.app) ? parsed.app : {};

    return {
        version: BACKUP_VERSION,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        app: {
            name: typeof parsedApp.name === 'string' ? parsedApp.name : config.app.name,
            version: typeof parsedApp.version === 'string' ? parsedApp.version : config.app.version,
        },
        tables,
        storage: storageData,
    };
}

async function applyBackupPayload(payload: BackupPayload): Promise<BackupStats> {
    await database.unsafeResetDatabase();

    let recordCount = 0;

    await database.write(async () => {
        const operations: any[] = [];

        for (const tableName of BACKUP_TABLES) {
            const rows = payload.tables[tableName] || [];
            const collection = database.get<Model>(tableName);

            for (const row of rows) {
                operations.push(collection.prepareCreateFromDirtyRaw(row as never) as never);
                recordCount++;

                if (operations.length >= RESTORE_BATCH_SIZE) {
                    await database.batch(...operations);
                    operations.length = 0;
                }
            }
        }

        if (operations.length > 0) {
            await database.batch(...operations);
        }
    });

    for (const key of BACKUP_STORAGE_KEYS) {
        const value = payload.storage[key];
        if (typeof value === 'string') {
            await storage.setItem(key, value);
        } else {
            await storage.removeItem(key);
        }
    }

    return {
        tableCount: BACKUP_TABLES.length,
        recordCount,
    };
}

export async function exportBackupToFile(): Promise<ExportBackupResult> {
    try {
        const payload = await buildBackupPayload();
        const backupJson = JSON.stringify(payload, null, 2);
        const fileName = `nutrihealth-backup-${getFileTimestamp()}.json`;
        const fileUri = `${getWritableDirectory()}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, backupJson, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        return {
            fileUri,
            fileName,
            tableCount: BACKUP_TABLES.length,
            recordCount: countRecords(payload),
        };
    } catch (error) {
        handleError(error, 'dataExport.exportBackupToFile');
        throw error;
    }
}

export async function exportBackupAndShare(): Promise<ExportBackupResult> {
    const result = await exportBackupToFile();
    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
        await Sharing.shareAsync(result.fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Back up NutriHealth data',
            UTI: 'public.json',
        });
    }

    return result;
}

export async function restoreBackupFromFilePicker(): Promise<RestoreBackupResult | null> {
    try {
        const picked = await File.pickFileAsync(undefined, 'application/json');
        const selectedFile = Array.isArray(picked) ? picked[0] : picked;

        if (!selectedFile) {
            return null;
        }

        const backupJson = await selectedFile.text();

        const payload = parseBackupPayload(backupJson);
        const stats = await applyBackupPayload(payload);
        const fileNameFromUri = selectedFile.uri.split('/').pop();

        return {
            ...stats,
            fileName: fileNameFromUri || 'backup.json',
        };
    } catch (error) {
        if (error instanceof Error && /cancel/i.test(error.message)) {
            return null;
        }
        handleError(error, 'dataExport.restoreBackupFromFilePicker');
        throw error;
    }
}

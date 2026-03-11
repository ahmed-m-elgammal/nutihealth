import type { Model } from '@nozbe/watermelondb';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { database } from '../../database';
import { DATABASE_SCHEMA_VERSION } from '../../database/schemaVersion';
import { config } from '../../constants/config';
import { storage } from '../../utils/storage-adapter';
import { handleError } from '../../utils/errors';

const BACKUP_VERSION = 1;
const CURRENT_SCHEMA_VERSION = DATABASE_SCHEMA_VERSION;
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
    'pantry_items',
    'smart_cooker_suggestions',
    'cookpad_recipe_cache',
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
    schemaVersion: number | null;
    createdAt: string;
    app: {
        name: string;
        version: string;
        schemaVersion?: number;
    };
    tables: Record<BackupTableName, RawRecord[]>;
    storage: Partial<Record<BackupStorageKey, string | null>>;
}

interface BackupStats {
    tableCount: number;
    recordCount: number;
}

interface ExportBackupResult extends BackupStats {
    fileUri: string;
    fileName: string;
}

interface RestoreBackupResult extends BackupStats {
    fileName: string;
}

class BackupCompatibilityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BackupCompatibilityError';
    }
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
        id,
        ...raw,
    };

    if (normalized._status === 'deleted') {
        return null;
    }

    normalized._status = 'synced';
    normalized._changed = '';

    return normalized;
};

const getFileTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

const getWritableDirectory = (): Directory => {
    try {
        return Paths.document;
    } catch {
        // Fallback below.
    }

    try {
        return Paths.cache;
    } catch {
        // Fallback below.
    }

    throw new Error('No writable directory available for backup export.');
};

type PickedBackupFile = {
    name: string;
    uri?: string;
    readText: () => Promise<string>;
};

const pickBackupFile = async (): Promise<PickedBackupFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'public.json'],
        multiple: false,
        copyToCacheDirectory: true,
    });

    if (result.canceled) {
        return null;
    }

    const selected = result.assets?.[0];
    if (!selected) {
        return null;
    }

    const selectedFile = selected as typeof selected & { file?: { text?: () => Promise<string> } };
    const fileName = selected.name || selected.uri?.split('/').pop() || 'backup.json';

    if (selectedFile.file && typeof selectedFile.file.text === 'function') {
        return {
            name: fileName,
            uri: selected.uri,
            readText: () => selectedFile.file!.text!(),
        };
    }

    if (!selected.uri) {
        throw new Error('Selected file has no readable URI.');
    }

    return {
        name: fileName,
        uri: selected.uri,
        readText: () => new File(selected.uri).text(),
    };
};

const countRecords = (payload: BackupPayload): number =>
    BACKUP_TABLES.reduce((total, tableName) => total + payload.tables[tableName].length, 0);

const hasOwnKey = (record: Record<string, unknown>, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, key);

const formatBackupDate = (value: string): string => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleString();
};

function validateBackupPayloadForRestore(payload: BackupPayload): BackupStats {
    if (payload.schemaVersion == null) {
        throw new BackupCompatibilityError(
            `Backup schema metadata is missing. Current app schema is v${CURRENT_SCHEMA_VERSION}. Please migrate this backup before restoring.`,
        );
    }

    if (payload.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        throw new BackupCompatibilityError(
            `Backup schema v${payload.schemaVersion} is not compatible with current app schema v${CURRENT_SCHEMA_VERSION}. Please update and migrate this backup before restoring.`,
        );
    }

    if (!isObjectRecord(payload.tables)) {
        throw new Error('Backup tables are missing or invalid.');
    }

    const missingTables = BACKUP_TABLES.filter((tableName) => {
        const tableValue = payload.tables[tableName];
        return !hasOwnKey(payload.tables as Record<string, unknown>, tableName) || !Array.isArray(tableValue);
    });

    if (missingTables.length > 0) {
        throw new Error(`Backup file is missing required tables: ${missingTables.join(', ')}`);
    }

    const recordCount = countRecords(payload);
    if (recordCount <= 0) {
        throw new Error('Backup file contains no records to restore.');
    }

    return {
        tableCount: BACKUP_TABLES.length,
        recordCount,
    };
}

async function confirmRestoreBackup(payload: BackupPayload, stats: BackupStats, fileName: string): Promise<boolean> {
    return new Promise((resolve) => {
        let isSettled = false;
        const settle = (value: boolean) => {
            if (isSettled) {
                return;
            }
            isSettled = true;
            resolve(value);
        };

        Alert.alert(
            'Restore Backup',
            [
                `File: ${fileName}`,
                `Created: ${formatBackupDate(payload.createdAt)}`,
                `Schema: backup v${payload.schemaVersion ?? 'unknown'} • app v${CURRENT_SCHEMA_VERSION}`,
                `Records: ${stats.recordCount}`,
                `Tables: ${stats.tableCount}`,
                '',
                'Restoring will replace current local data on this device.',
            ].join('\n'),
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => settle(false),
                },
                {
                    text: 'Restore',
                    style: 'destructive',
                    onPress: () => settle(true),
                },
            ],
            {
                cancelable: true,
                onDismiss: () => settle(false),
            },
        );
    });
}

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
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        app: {
            name: config.app.name,
            version: config.app.version,
            schemaVersion: CURRENT_SCHEMA_VERSION,
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
        throw new BackupCompatibilityError(`Unsupported backup version: ${String(parsed.version)}.`);
    }

    if (!isObjectRecord(parsed.tables)) {
        throw new Error('Backup tables are missing or invalid.');
    }

    const tables = {} as Record<BackupTableName, RawRecord[]>;
    for (const tableName of BACKUP_TABLES) {
        const rows = parsed.tables[tableName];
        if (rows == null) {
            throw new Error(`Backup table "${tableName}" is missing.`);
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
    const parsedSchemaVersion =
        typeof parsed.schemaVersion === 'number'
            ? parsed.schemaVersion
            : typeof parsedApp.schemaVersion === 'number'
              ? parsedApp.schemaVersion
              : null;
    const normalizedSchemaVersion =
        typeof parsedSchemaVersion === 'number' && Number.isFinite(parsedSchemaVersion) ? parsedSchemaVersion : null;

    return {
        version: BACKUP_VERSION,
        schemaVersion: normalizedSchemaVersion,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        app: {
            name: typeof parsedApp.name === 'string' ? parsedApp.name : config.app.name,
            version: typeof parsedApp.version === 'string' ? parsedApp.version : config.app.version,
            schemaVersion: normalizedSchemaVersion ?? undefined,
        },
        tables,
        storage: storageData,
    };
}

async function applyBackupPayload(payload: BackupPayload): Promise<BackupStats> {
    const validationStats = validateBackupPayloadForRestore(payload);

    await database.unsafeResetDatabase();

    let recordCount = 0;

    await database.write(async () => {
        const operations: Model[] = [];

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
        tableCount: validationStats.tableCount,
        recordCount,
    };
}

export async function exportBackupToFile(): Promise<ExportBackupResult> {
    try {
        const payload = await buildBackupPayload();
        const backupJson = JSON.stringify(payload, null, 2);
        const fileName = `nutrihealth-backup-${getFileTimestamp()}.json`;
        const writableDirectory = getWritableDirectory();
        if (!writableDirectory.exists) {
            writableDirectory.create({ idempotent: true, intermediates: true });
        }

        const backupFile = new File(writableDirectory, fileName);
        backupFile.write(backupJson);
        const fileUri = backupFile.uri;

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
    } else {
        Alert.alert('Backup exported', `Sharing is unavailable on this device.\nSaved to:\n${result.fileUri}`);
    }

    return result;
}

export async function restoreBackupFromFilePicker(): Promise<RestoreBackupResult | null> {
    try {
        const selectedFile = await pickBackupFile();

        if (!selectedFile) {
            return null;
        }

        const backupJson = await selectedFile.readText();

        const payload = parseBackupPayload(backupJson);
        const validationStats = validateBackupPayloadForRestore(payload);
        const fileName = selectedFile.name || selectedFile.uri?.split('/').pop() || 'backup.json';

        const confirmed = await confirmRestoreBackup(payload, validationStats, fileName);
        if (!confirmed) {
            return null;
        }

        const stats = await applyBackupPayload(payload);

        return {
            ...stats,
            fileName,
        };
    } catch (error) {
        if (error instanceof Error && /cancel/i.test(error.message)) {
            return null;
        }
        if (error instanceof BackupCompatibilityError) {
            Alert.alert('Backup Not Compatible', error.message);
            return null;
        }
        handleError(error, 'dataExport.restoreBackupFromFilePicker');
        throw error;
    }
}

export type DataExportFormat = 'csv' | 'json';
export type DataExportRange = '30d' | '90d' | 'all';

const USER_EXPORT_TABLES = ['meals', 'water_logs', 'weight_logs', 'workouts'] as const;
type UserExportTable = (typeof USER_EXPORT_TABLES)[number];

const TABLE_TIME_FIELD: Record<UserExportTable, string> = {
    meals: 'consumed_at',
    water_logs: 'logged_at',
    weight_logs: 'logged_at',
    workouts: 'started_at',
};

const rangeToStartTimestamp = (range: DataExportRange): number | null => {
    if (range === 'all') {
        return null;
    }

    const days = range === '30d' ? 30 : 90;
    return Date.now() - days * 24 * 60 * 60 * 1000;
};

const getRawRowsForTable = async (table: UserExportTable, userId: string): Promise<RawRecord[]> => {
    const collection = database.get<Model>(table);
    const records = await collection.query().fetch();

    return records.reduce<RawRecord[]>((acc, record) => {
        const rawRecord = (record as unknown as { _raw?: RawRecord })._raw;
        if (rawRecord && String(rawRecord.user_id || '') === userId) {
            acc.push(rawRecord);
        }
        return acc;
    }, []);
};

const filterRowsByRange = (rows: RawRecord[], table: UserExportTable, range: DataExportRange): RawRecord[] => {
    const startTimestamp = rangeToStartTimestamp(range);
    if (!startTimestamp) {
        return rows;
    }

    const timeField = TABLE_TIME_FIELD[table];
    return rows.filter((row) => {
        const rawTime = row[timeField];
        const timestamp = typeof rawTime === 'number' ? rawTime : Number(rawTime || 0);
        return Number.isFinite(timestamp) && timestamp >= startTimestamp;
    });
};

const toCsv = (rows: Array<Record<string, unknown>>): string => {
    if (!rows.length) {
        return '';
    }

    const headers = Array.from(
        rows.reduce((acc, row) => {
            Object.keys(row).forEach((key) => acc.add(key));
            return acc;
        }, new Set<string>()),
    );

    const escape = (value: unknown) => {
        const stringified = typeof value === 'string' ? value : JSON.stringify(value ?? '');
        const normalized = stringified == null ? '' : String(stringified);
        if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
            return `"${normalized.replace(/"/g, '""')}"`;
        }
        return normalized;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map((header) => escape(row[header])).join(','));
    }

    return lines.join('\n');
};

export async function exportUserDataAndShare(options: {
    userId: string;
    format: DataExportFormat;
    range: DataExportRange;
}): Promise<{ fileUri: string; fileName: string; recordCount: number }> {
    const { userId, format, range } = options;

    try {
        const tableEntries = await Promise.all(
            USER_EXPORT_TABLES.map(async (table) => {
                const rows = await getRawRowsForTable(table, userId);
                return [table, filterRowsByRange(rows, table, range)] as const;
            }),
        );

        const payload = tableEntries.reduce<Record<UserExportTable, RawRecord[]>>(
            (acc, [table, rows]) => {
                acc[table] = rows;
                return acc;
            },
            {} as Record<UserExportTable, RawRecord[]>,
        );

        const recordCount = Object.values(payload).reduce((sum, rows) => sum + rows.length, 0);

        const writableDirectory = getWritableDirectory();
        if (!writableDirectory.exists) {
            writableDirectory.create({ idempotent: true, intermediates: true });
        }

        const extension = format === 'json' ? 'json' : 'csv';
        const fileName = `nutrihealth-data-export-${range}-${getFileTimestamp()}.${extension}`;
        const outputFile = new File(writableDirectory, fileName);

        if (format === 'json') {
            outputFile.write(
                JSON.stringify(
                    {
                        exportedAt: new Date().toISOString(),
                        range,
                        includedData: ['meals', 'water_logs', 'weight_logs', 'workouts'],
                        tables: payload,
                    },
                    null,
                    2,
                ),
            );
        } else {
            const rows: Array<Record<string, unknown>> = [];
            for (const table of USER_EXPORT_TABLES) {
                for (const row of payload[table]) {
                    rows.push({ table, ...row });
                }
            }
            outputFile.write(toCsv(rows));
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(outputFile.uri, {
                dialogTitle: 'Export NutriHealth data',
                mimeType: format === 'json' ? 'application/json' : 'text/csv',
            });
        } else {
            Alert.alert('Data exported', `Sharing is unavailable on this device.\nSaved to:\n${outputFile.uri}`);
        }

        return {
            fileUri: outputFile.uri,
            fileName,
            recordCount,
        };
    } catch (error) {
        handleError(error, 'dataExport.exportUserDataAndShare');
        throw error;
    }
}

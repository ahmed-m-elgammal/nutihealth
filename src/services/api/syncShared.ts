import type { SyncDatabaseChangeSet, SyncTableChangeSet } from '@nozbe/watermelondb/sync';

export const SYNC_LAST_SYNC_STORAGE_KEY = 'sync_last_sync_v2';
export const SUPABASE_PULL_LIMIT = 1000;
export const SUPABASE_PULL_MAX_BATCHES = 50;
export const SYNC_RETRY_BASE_DELAY_MS = 1000;
export const SYNC_RETRY_MAX_DELAY_MS = 30000;

export const SYNCABLE_TABLES = [
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

export const USER_SCOPED_TABLES = new Set([
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

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];
export type RecordShape = Record<string, unknown>;

export const toTimestamp = (value: unknown): number => {
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

export const sanitizeRecordForPush = (table: SyncableTable, record: RecordShape, userId: string): RecordShape => {
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

export const sanitizeRecordForPull = (table: SyncableTable, record: RecordShape): RecordShape => {
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

export const countChanges = (changes: SyncDatabaseChangeSet): number => {
    const changeMap = changes as Record<string, SyncTableChangeSet>;

    return Object.values(changeMap).reduce((count, tableChanges) => {
        const tableCount = tableChanges.created.length + tableChanges.updated.length + tableChanges.deleted.length;
        return count + tableCount;
    }, 0);
};

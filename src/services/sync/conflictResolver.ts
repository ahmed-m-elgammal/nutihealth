import { database } from '../../database';

type RecordShape = Record<string, unknown>;

type ConflictStrategy = 'server_wins' | 'most_recent_wins';

interface ConflictResolutionDecision {
    shouldApplyRemote: boolean;
    remoteOverwroteLocal: boolean;
    localWonConflict: boolean;
    localUpdatedAt: number;
    remoteUpdatedAt: number;
    strategy: ConflictStrategy;
}

const SERVER_WINS_TABLES = new Set(['users']);

const toTimestamp = (value: unknown): number => {
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

const getLocalUpdatedAt = (record: any): number => {
    const explicitUpdatedAt = toTimestamp(record?.updatedAt);
    if (explicitUpdatedAt > 0) {
        return explicitUpdatedAt;
    }

    const rawUpdatedAt = toTimestamp(record?._raw?.updated_at);
    if (rawUpdatedAt > 0) {
        return rawUpdatedAt;
    }

    return 0;
};

const getConflictStrategy = (table: string): ConflictStrategy => {
    if (SERVER_WINS_TABLES.has(table)) {
        return 'server_wins';
    }

    return 'most_recent_wins';
};

export async function resolveRemoteRecordApplication(
    table: string,
    remoteRecord: RecordShape,
): Promise<ConflictResolutionDecision> {
    const strategy = getConflictStrategy(table);
    const remoteId = remoteRecord.id;

    if (remoteId === undefined || remoteId === null) {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localWonConflict: false,
            localUpdatedAt: 0,
            remoteUpdatedAt: 0,
            strategy,
        };
    }

    const remoteUpdatedAt = toTimestamp(remoteRecord.updated_at);

    if (strategy === 'server_wins') {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localWonConflict: false,
            localUpdatedAt: 0,
            remoteUpdatedAt,
            strategy,
        };
    }

    if (remoteUpdatedAt <= 0) {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localWonConflict: false,
            localUpdatedAt: 0,
            remoteUpdatedAt,
            strategy,
        };
    }

    try {
        const collection = database.get<any>(table);
        const localRecord = await collection.find(String(remoteId));
        const localUpdatedAt = getLocalUpdatedAt(localRecord);
        const shouldApplyRemote = remoteUpdatedAt >= localUpdatedAt;

        return {
            shouldApplyRemote,
            remoteOverwroteLocal: localUpdatedAt > 0 && remoteUpdatedAt > localUpdatedAt,
            localWonConflict: localUpdatedAt > remoteUpdatedAt,
            localUpdatedAt,
            remoteUpdatedAt,
            strategy,
        };
    } catch {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localWonConflict: false,
            localUpdatedAt: 0,
            remoteUpdatedAt,
            strategy,
        };
    }
}

export async function shouldApplyRemoteRecord(table: string, remoteRecord: RecordShape): Promise<boolean> {
    const decision = await resolveRemoteRecordApplication(table, remoteRecord);
    return decision.shouldApplyRemote;
}

import { database } from '../../database';

type RecordShape = Record<string, unknown>;

interface ConflictResolutionDecision {
    shouldApplyRemote: boolean;
    remoteOverwroteLocal: boolean;
    localUpdatedAt: number;
    remoteUpdatedAt: number;
}

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

/**
 * Last-write-wins strategy:
 * apply remote record only when it is newer than (or equal to) local updated_at.
 */
export async function resolveRemoteRecordApplication(
    table: string,
    remoteRecord: RecordShape,
): Promise<ConflictResolutionDecision> {
    const remoteId = remoteRecord.id;
    if (remoteId === undefined || remoteId === null) {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localUpdatedAt: 0,
            remoteUpdatedAt: 0,
        };
    }

    const remoteUpdatedAt = toTimestamp(remoteRecord.updated_at);
    if (remoteUpdatedAt <= 0) {
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localUpdatedAt: 0,
            remoteUpdatedAt,
        };
    }

    try {
        const collection = database.get<any>(table);
        const localRecord = await collection.find(String(remoteId));
        const localUpdatedAt = getLocalUpdatedAt(localRecord);

        return {
            shouldApplyRemote: remoteUpdatedAt >= localUpdatedAt,
            remoteOverwroteLocal: localUpdatedAt > 0 && remoteUpdatedAt > localUpdatedAt,
            localUpdatedAt,
            remoteUpdatedAt,
        };
    } catch {
        // Local record missing or unreadable -> apply remote.
        return {
            shouldApplyRemote: true,
            remoteOverwroteLocal: false,
            localUpdatedAt: 0,
            remoteUpdatedAt,
        };
    }
}

export async function shouldApplyRemoteRecord(table: string, remoteRecord: RecordShape): Promise<boolean> {
    const decision = await resolveRemoteRecordApplication(table, remoteRecord);
    return decision.shouldApplyRemote;
}

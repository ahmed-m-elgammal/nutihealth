import type { SyncDatabaseChangeSet, SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import { useUIStore } from '../../store/uiStore';
import { requireSupabaseClient } from '../supabaseClient';
import { resolveRemoteRecordApplication } from '../sync/conflictResolver';
import {
    type RecordShape,
    type SyncableTable,
    SUPABASE_PULL_LIMIT,
    SUPABASE_PULL_MAX_BATCHES,
    SYNCABLE_TABLES,
    USER_SCOPED_TABLES,
    sanitizeRecordForPull,
    toTimestamp,
} from './syncShared';

export class SyncPuller {
    private lastConflictToastAt = 0;
    private readonly conflictToastCooldownMs = 5 * 60 * 1000;

    async pullChangesFromSupabase(lastPulledAt: number, userId: string): Promise<SyncDatabaseChangeSet> {
        const pulledChanges: SyncDatabaseChangeSet = {};
        const changesRecord = pulledChanges as Record<string, SyncTableChangeSet>;
        let serverOverwriteConflicts = 0;
        let localPreservedConflicts = 0;

        for (const table of SYNCABLE_TABLES) {
            const records = await this.fetchRemoteRows(table, lastPulledAt, userId);

            const tableChanges: SyncTableChangeSet = {
                created: [],
                updated: [],
                deleted: [],
            };

            for (const record of records) {
                const normalized = sanitizeRecordForPull(table, record);
                const decision = await resolveRemoteRecordApplication(table, normalized);
                if (!decision.shouldApplyRemote) {
                    continue;
                }

                if (decision.remoteOverwroteLocal) {
                    serverOverwriteConflicts += 1;
                }

                if (decision.localWonConflict) {
                    localPreservedConflicts += 1;
                }

                const createdAt = toTimestamp(normalized.created_at);
                if (lastPulledAt === 0 || (createdAt > 0 && createdAt > lastPulledAt)) {
                    tableChanges.created.push(normalized as never);
                } else {
                    tableChanges.updated.push(normalized as never);
                }
            }

            changesRecord[table] = tableChanges;
        }

        const totalResolvedConflicts = serverOverwriteConflicts + localPreservedConflicts;
        if (totalResolvedConflicts > 0) {
            console.info('[sync] conflict resolution summary', {
                serverWins: serverOverwriteConflicts,
                localWins: localPreservedConflicts,
            });
        }

        if (serverOverwriteConflicts > 0 && Date.now() - this.lastConflictToastAt > this.conflictToastCooldownMs) {
            this.lastConflictToastAt = Date.now();
            useUIStore
                .getState()
                .showToast(
                    'warning',
                    `${serverOverwriteConflicts} sync conflict${serverOverwriteConflicts === 1 ? '' : 's'} resolved using server changes.`,
                    4500,
                );
        }

        return pulledChanges;
    }

    private async fetchRemoteRows(table: SyncableTable, lastPulledAt: number, userId: string): Promise<RecordShape[]> {
        const supabase = requireSupabaseClient();

        const runQuery = async (useIsoDateForFilter: boolean, offset: number) => {
            let query = supabase
                .from(table)
                .select('*')
                .order('updated_at', { ascending: true })
                .order('id', { ascending: true })
                .range(offset, offset + SUPABASE_PULL_LIMIT - 1);

            if (USER_SCOPED_TABLES.has(table)) {
                query = query.eq('user_id', userId);
            }

            if (lastPulledAt > 0) {
                query = query.gt(
                    'updated_at',
                    useIsoDateForFilter ? new Date(lastPulledAt).toISOString() : lastPulledAt,
                );
            }

            return await query;
        };

        const fetchAllBatches = async (useIsoDateForFilter: boolean): Promise<RecordShape[]> => {
            const allRows: RecordShape[] = [];

            for (let batchIndex = 0; batchIndex < SUPABASE_PULL_MAX_BATCHES; batchIndex += 1) {
                const offset = batchIndex * SUPABASE_PULL_LIMIT;
                const result = await runQuery(useIsoDateForFilter, offset);
                if (result.error) {
                    throw result.error;
                }

                const rows = (result.data || []) as RecordShape[];
                allRows.push(...rows);

                if (rows.length < SUPABASE_PULL_LIMIT) {
                    return allRows;
                }
            }

            throw new Error(
                `Sync pull aborted for ${table}: exceeded ${SUPABASE_PULL_MAX_BATCHES} batches. Please run a full re-sync.`,
            );
        };

        try {
            return await fetchAllBatches(false);
        } catch (numericFilterError) {
            if (lastPulledAt <= 0) {
                throw new Error(`Failed to pull ${table}: ${(numericFilterError as Error).message}`);
            }

            try {
                return await fetchAllBatches(true);
            } catch (isoFilterError) {
                throw new Error(
                    `Failed to pull ${table}: ${(isoFilterError as Error).message} (numeric filter error: ${(numericFilterError as Error).message})`,
                );
            }
        }
    }
}

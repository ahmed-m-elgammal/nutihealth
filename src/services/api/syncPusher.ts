import type { SyncDatabaseChangeSet, SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import { config } from '../../constants/config';
import { requireSupabaseClient } from '../supabaseClient';
import { type SyncableTable, SYNCABLE_TABLES, sanitizeRecordForPush } from './syncShared';

const isRetriableSyncError = (errorMessage: string): boolean => {
    const normalized = errorMessage.toLowerCase();

    return (
        normalized.includes('network') ||
        normalized.includes('timeout') ||
        normalized.includes('fetch') ||
        normalized.includes('connection') ||
        normalized.includes('429') ||
        normalized.includes('503') ||
        normalized.includes('504')
    );
};

export class SyncPusher {
    constructor(
        private readonly executeWithRetry: <T>(
            operation: string,
            fn: () => Promise<T>,
            maxRetries?: number,
        ) => Promise<T>,
    ) {}

    async pushChangesToSupabase(changes: SyncDatabaseChangeSet, userId: string): Promise<number> {
        let pushedCount = 0;
        const changeMap = changes as Record<string, SyncTableChangeSet>;

        for (const table of SYNCABLE_TABLES) {
            const tableChanges = changeMap[table];
            if (!tableChanges) {
                continue;
            }

            pushedCount += await this.pushTableChanges(table, tableChanges, userId);
        }

        return pushedCount;
    }

    private async pushTableChanges(
        table: SyncableTable,
        tableChanges: SyncTableChangeSet,
        userId: string,
    ): Promise<number> {
        const supabase = requireSupabaseClient();

        const upserts = [...tableChanges.created, ...tableChanges.updated].map((record) =>
            sanitizeRecordForPush(table, (record || {}) as Record<string, unknown>, userId),
        );

        if (upserts.length > 0) {
            await this.executeWithRetry(`upsert:${table}`, async () => {
                const { error } = await supabase.from(table).upsert(upserts as never[], {
                    onConflict: 'id',
                    ignoreDuplicates: false,
                });

                if (error) {
                    throw new Error(`Failed to upsert ${table}: ${error.message}`);
                }
            });
        }

        const deletedIds = tableChanges.deleted.map((id) => String(id));
        if (deletedIds.length > 0) {
            await this.executeWithRetry(`delete:${table}`, async () => {
                const { error } = await supabase.from(table).delete().in('id', deletedIds);

                if (error) {
                    throw new Error(`Failed to delete ${table}: ${error.message}`);
                }
            });
        }

        return upserts.length + deletedIds.length;
    }

    static shouldRetry(errorMessage: string): boolean {
        return isRetriableSyncError(errorMessage);
    }

    static maxRetries(): number {
        return config.sync.maxRetries;
    }
}

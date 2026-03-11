import { storage } from '../../utils/storage-adapter';

const SYNC_QUEUE_STORAGE_KEY = 'sync_queue_v1';

export interface SyncQueueTask {
    id: string;
    reason: string;
    createdAt: number;
    retryCount: number;
}

const readQueue = async (): Promise<SyncQueueTask[]> => {
    try {
        const rawValue = await storage.getItem(SYNC_QUEUE_STORAGE_KEY);
        if (!rawValue) {
            return [];
        }

        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (item): item is SyncQueueTask =>
                item &&
                typeof item.id === 'string' &&
                typeof item.reason === 'string' &&
                typeof item.createdAt === 'number',
        );
    } catch {
        return [];
    }
};

const writeQueue = async (queue: SyncQueueTask[]): Promise<void> => {
    await storage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

class SyncQueueManager {
    async enqueue(reason: string): Promise<void> {
        const queue = await readQueue();
        const nextItem: SyncQueueTask = {
            id: `sync-task-${Date.now()}-${Math.round(Math.random() * 10000)}`,
            reason,
            createdAt: Date.now(),
            retryCount: 0,
        };

        await writeQueue([...queue, nextItem].slice(-100));
    }

    async incrementRetryCount(): Promise<void> {
        const queue = await readQueue();
        if (!queue.length) {
            return;
        }

        const updated = queue.map((item) => ({
            ...item,
            retryCount: item.retryCount + 1,
        }));

        await writeQueue(updated);
    }

    async clear(): Promise<void> {
        await storage.removeItem(SYNC_QUEUE_STORAGE_KEY);
    }

    async getCount(): Promise<number> {
        const queue = await readQueue();
        return queue.length;
    }
}

export const syncQueueManager = new SyncQueueManager();

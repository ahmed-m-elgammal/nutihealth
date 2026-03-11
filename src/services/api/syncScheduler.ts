import { config } from '../../constants/config';
import { SYNC_RETRY_BASE_DELAY_MS, SYNC_RETRY_MAX_DELAY_MS } from './syncShared';

export class SyncScheduler {
    private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private retryAttempt = 0;
    private syncIntervalMs = config.sync.intervalMinutes * 60 * 1000;

    constructor(private readonly performSync: () => Promise<void>) {}

    enableAutoSync(interval?: number): void {
        if (interval) {
            this.syncIntervalMs = interval;
        }

        this.disableAutoSync();

        if (!config.features.enableSync) {
            return;
        }

        this.autoSyncTimer = setInterval(() => {
            this.performSync().catch(() => undefined);
        }, this.syncIntervalMs);
    }

    disableAutoSync(): void {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
        this.clearRetryTimer();
    }

    scheduleRetry(): void {
        if (this.retryTimer || this.retryAttempt >= config.sync.maxRetries) {
            return;
        }

        const delay = Math.min(SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, this.retryAttempt), SYNC_RETRY_MAX_DELAY_MS);

        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.retryAttempt += 1;
            this.performSync().catch(() => undefined);
        }, delay);
    }

    resetRetry(): void {
        this.retryAttempt = 0;
        this.clearRetryTimer();
    }

    private clearRetryTimer(): void {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }
}

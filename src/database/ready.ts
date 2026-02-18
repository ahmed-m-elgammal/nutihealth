import { database } from './index';
import User from './models/User';

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_RETRY_DELAY_MS = 150;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDriverNotReadyError = (error: unknown): boolean => {
    const message = (error as Error)?.message || '';
    return message.toLowerCase().includes('driver is not set up');
};

/**
 * Waits for WatermelonDB driver setup to complete.
 * Retries only on "driver is not set up" errors.
 */
export async function waitForDatabaseReady(
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    retryDelayMs: number = DEFAULT_RETRY_DELAY_MS
): Promise<void> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await database.get<User>('users').query().fetchCount();
            return;
        } catch (error) {
            lastError = error;
            if (!isDriverNotReadyError(error)) {
                throw error;
            }

            if (attempt < maxAttempts) {
                await delay(retryDelayMs);
            }
        }
    }

    if (lastError) {
        throw lastError;
    }
}


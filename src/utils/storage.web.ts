import { config } from '../constants/config';

/**
 * Initialize storage for web (no-op since localStorage is always available)
 */
export async function initializeStorage(): Promise<any> {
    console.log('[Storage] ✓ Using localStorage backend (web)');
    return storageInstance;
}

/**
 * Storage wrapper class for Web (using localStorage with async API for consistency)
 */
class Storage {
    /**
     * Set a string value
     */
    async setString(key: string, value: string): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
        }
    }

    /**
     * Get a string value
     */
    async getString(key: string): Promise<string | undefined> {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key) || undefined;
        }
        return undefined;
    }

    /**
     * Set a number value
     */
    async setNumber(key: string, value: number): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value.toString());
        }
    }

    /**
     * Get a number value
     */
    async getNumber(key: string): Promise<number | undefined> {
        if (typeof window !== 'undefined') {
            const value = window.localStorage.getItem(key);
            if (value) {
                return Number(value);
            }
        }
        return undefined;
    }

    /**
     * Set a boolean value
     */
    async setBoolean(key: string, value: boolean): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value.toString());
        }
    }

    /**
     * Get a boolean value
     */
    async getBoolean(key: string): Promise<boolean | undefined> {
        if (typeof window !== 'undefined') {
            const value = window.localStorage.getItem(key);
            if (value === 'true') return true;
            if (value === 'false') return false;
        }
        return undefined;
    }

    /**
     * Set an object value (will be JSON stringified)
     */
    async setObject<T>(key: string, value: T): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    }

    /**
     * Get an object value (will be JSON parsed)
     */
    async getObject<T>(key: string): Promise<T | undefined> {
        if (typeof window !== 'undefined') {
            const jsonString = window.localStorage.getItem(key);
            if (!jsonString) return undefined;

            try {
                return JSON.parse(jsonString) as T;
            } catch (error) {
                console.error(`Error parsing JSON for key "${key}":`, error);
                return undefined;
            }
        }
        return undefined;
    }

    /**
     * Delete a specific key
     */
    async delete(key: string): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
        }
    }

    /**
     * Check if a key exists
     */
    async contains(key: string): Promise<boolean> {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key) !== null;
        }
        return false;
    }

    /**
     * Clear all storage
     */
    async clearAll(): Promise<void> {
        if (typeof window !== 'undefined') {
            window.localStorage.clear();
        }
    }

    /**
     * Get all keys
     */
    async getAllKeys(): Promise<string[]> {
        if (typeof window !== 'undefined') {
            return Object.keys(window.localStorage);
        }
        return [];
    }
}

// Create singleton instance
export const storageInstance = new Storage();

// Convenience functions for common operations

/**
 * Get auth token
 */
export async function getAuthToken(): Promise<string | undefined> {
    return await storageInstance.getString(config.storageKeys.authToken);
}

/**
 * Set auth token
 */
export async function setAuthToken(token: string): Promise<void> {
    await storageInstance.setString(config.storageKeys.authToken, token);
}

/**
 * Clear auth token
 */
export async function clearAuthToken(): Promise<void> {
    await storageInstance.delete(config.storageKeys.authToken);
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | undefined> {
    return await storageInstance.getString(config.storageKeys.refreshToken);
}

/**
 * Set refresh token
 */
export async function setRefreshToken(token: string): Promise<void> {
    await storageInstance.setString(config.storageKeys.refreshToken, token);
}

/**
 * Get user ID
 */
export async function getUserId(): Promise<string | undefined> {
    return await storageInstance.getString(config.storageKeys.userId);
}

/**
 * Set user ID
 */
export async function setUserId(userId: string): Promise<void> {
    await storageInstance.setString(config.storageKeys.userId, userId);
}

/**
 * Get theme preference
 */
export async function getTheme(): Promise<'light' | 'dark' | 'auto' | undefined> {
    return (await storageInstance.getString(config.storageKeys.theme)) as 'light' | 'dark' | 'auto' | undefined;
}

/**
 * Set theme preference
 */
export async function setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await storageInstance.setString(config.storageKeys.theme, theme);
}

/**
 * Get language preference
 */
export async function getLanguage(): Promise<string | undefined> {
    return await storageInstance.getString(config.storageKeys.language);
}

/**
 * Set language preference
 */
export async function setLanguage(language: string): Promise<void> {
    await storageInstance.setString(config.storageKeys.language, language);
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(): Promise<boolean> {
    return (await storageInstance.getBoolean(config.storageKeys.onboardingComplete)) || false;
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete(complete: boolean): Promise<void> {
    await storageInstance.setBoolean(config.storageKeys.onboardingComplete, complete);
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<number | undefined> {
    return await storageInstance.getNumber(config.storageKeys.lastSync);
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncTimestamp(timestamp: number): Promise<void> {
    await storageInstance.setNumber(config.storageKeys.lastSync, timestamp);
}

/**
 * Clear all auth data
 */
export async function clearAuthData(): Promise<void> {
    await clearAuthToken();
    await storageInstance.delete(config.storageKeys.refreshToken);
    await storageInstance.delete(config.storageKeys.userId);
}

export default storageInstance;

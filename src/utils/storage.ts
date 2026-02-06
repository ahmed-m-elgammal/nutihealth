import { MMKV } from 'react-native-mmkv';
import { config } from '../constants/config';

// Initialize MMKV storage
const storage = new MMKV({
    id: 'nutrihealth-storage',
    encryptionKey: 'nutrihealth-secure-key-2024', // In production, use a proper key
});

/**
 * Storage wrapper class for MMKV
 */
class Storage {
    /**
     * Set a string value
     * @param key - Storage key
     * @param value - String value to store
     */
    setString(key: string, value: string): void {
        storage.set(key, value);
    }

    /**
     * Get a string value
     * @param key - Storage key
     * @returns String value or undefined
     */
    getString(key: string): string | undefined {
        return storage.getString(key);
    }

    /**
     * Set a number value
     * @param key - Storage key
     * @param value - Number value to store
     */
    setNumber(key: string, value: number): void {
        storage.set(key, value);
    }

    /**
     * Get a number value
     * @param key - Storage key
     * @returns Number value or undefined
     */
    getNumber(key: string): number | undefined {
        return storage.getNumber(key);
    }

    /**
     * Set a boolean value
     * @param key - Storage key
     * @param value - Boolean value to store
     */
    setBoolean(key: string, value: boolean): void {
        storage.set(key, value);
    }

    /**
     * Get a boolean value
     * @param key - Storage key
     * @returns Boolean value or undefined
     */
    getBoolean(key: string): boolean | undefined {
        return storage.getBoolean(key);
    }

    /**
     * Set an object value (will be JSON stringified)
     * @param key - Storage key
     * @param value - Object to store
     */
    setObject<T>(key: string, value: T): void {
        storage.set(key, JSON.stringify(value));
    }

    /**
     * Get an object value (will be JSON parsed)
     * @param key - Storage key
     * @returns Object or undefined
     */
    getObject<T>(key: string): T | undefined {
        const jsonString = storage.getString(key);
        if (!jsonString) return undefined;

        try {
            return JSON.parse(jsonString) as T;
        } catch (error) {
            console.error(`Error parsing JSON for key "${key}":`, error);
            return undefined;
        }
    }

    /**
     * Delete a specific key
     * @param key - Storage key to delete
     */
    delete(key: string): void {
        storage.delete(key);
    }

    /**
     * Check if a key exists
     * @param key - Storage key to check
     * @returns True if key exists
     */
    contains(key: string): boolean {
        return storage.contains(key);
    }

    /**
     * Clear all storage
     */
    clearAll(): void {
        storage.clearAll();
    }

    /**
     * Get all keys
     * @returns Array of all storage keys
     */
    getAllKeys(): string[] {
        return storage.getAllKeys();
    }
}

// Create singleton instance
export const storageInstance = new Storage();

// Convenience functions for common operations

/**
 * Get auth token
 */
export function getAuthToken(): string | undefined {
    return storageInstance.getString(config.storageKeys.authToken);
}

/**
 * Set auth token
 */
export function setAuthToken(token: string): void {
    storageInstance.setString(config.storageKeys.authToken, token);
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
    storageInstance.delete(config.storageKeys.authToken);
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | undefined {
    return storageInstance.getString(config.storageKeys.refreshToken);
}

/**
 * Set refresh token
 */
export function setRefreshToken(token: string): void {
    storageInstance.setString(config.storageKeys.refreshToken, token);
}

/**
 * Get user ID
 */
export function getUserId(): string | undefined {
    return storageInstance.getString(config.storageKeys.userId);
}

/**
 * Set user ID
 */
export function setUserId(userId: string): void {
    storageInstance.setString(config.storageKeys.userId, userId);
}

/**
 * Get theme preference
 */
export function getTheme(): 'light' | 'dark' | 'auto' | undefined {
    return storageInstance.getString(config.storageKeys.theme) as 'light' | 'dark' | 'auto' | undefined;
}

/**
 * Set theme preference
 */
export function setTheme(theme: 'light' | 'dark' | 'auto'): void {
    storageInstance.setString(config.storageKeys.theme, theme);
}

/**
 * Get language preference
 */
export function getLanguage(): string | undefined {
    return storageInstance.getString(config.storageKeys.language);
}

/**
 * Set language preference
 */
export function setLanguage(language: string): void {
    storageInstance.setString(config.storageKeys.language, language);
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(): boolean {
    return storageInstance.getBoolean(config.storageKeys.onboardingComplete) || false;
}

/**
 * Mark onboarding as complete
 */
export function setOnboardingComplete(complete: boolean): void {
    storageInstance.setBoolean(config.storageKeys.onboardingComplete, complete);
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTimestamp(): number | undefined {
    return storageInstance.getNumber(config.storageKeys.lastSync);
}

/**
 * Set last sync timestamp
 */
export function setLastSyncTimestamp(timestamp: number): void {
    storageInstance.setNumber(config.storageKeys.lastSync, timestamp);
}

/**
 * Clear all auth data
 */
export function clearAuthData(): void {
    clearAuthToken();
    storageInstance.delete(config.storageKeys.refreshToken);
    storageInstance.delete(config.storageKeys.userId);
}

export default storageInstance;

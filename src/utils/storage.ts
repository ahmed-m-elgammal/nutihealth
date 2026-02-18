import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';

// CRITICAL: This is the NATIVE storage module
// Web should use storage.web.ts (Metro will resolve .web.ts automatically)
// This guard prevents accidental usage on web if platform resolution fails
if (typeof window !== 'undefined' && (window as any).localStorage) {
    console.error('[Storage] ERROR: Native storage.ts loaded on web platform!');
    console.error('[Storage] Please ensure Metro is resolving storage.web.ts for web builds');
    throw new Error('Native storage module loaded on web. This indicates a bundler configuration issue.');
}

// Storage backend type
type StorageBackend = 'mmkv' | 'asyncstorage';

// MMKV instance - initialized lazily with secure encryption key
let storage: any | null = null;
let storageBackend: StorageBackend = 'asyncstorage'; // Default to AsyncStorage
let initializationPromise: Promise<any> | null = null;

const ENCRYPTION_KEY_ID = 'nutrihealth_mmkv_encryption_key';

/**
 * Generate a random encryption key
 * Note: For cryptographically secure keys in production, add expo-crypto
 */
function generateEncryptionKey(): string {
    // Generate a 64-character hex string (256 bits)
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

/**
 * Get or create the MMKV encryption key
 * Key is stored securely in iOS Keychain / Android Keystore
 */
async function getOrCreateEncryptionKey(): Promise<string> {
    try {
        // Try to retrieve existing key from SecureStore
        let encryptionKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);

        if (!encryptionKey) {
            // Generate new key on first launch
            encryptionKey = await generateEncryptionKey();
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, encryptionKey, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
        }

        return encryptionKey;
    } catch (error) {
        // Fallback for environments where SecureStore is unavailable
        // This should only happen in development/testing
        console.warn('SecureStore unavailable, using fallback key');
        return 'development-fallback-key-do-not-use-in-production';
    }
}

/**
 * Initialize storage with MMKV or AsyncStorage fallback
 * Call this at app startup before accessing storage
 */
export async function initializeStorage(): Promise<any> {
    if (storage) {
        return storage;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            // Check if we can use MMKV (try to require it first safely)
            // This is critical because on Expo Go the native module might not be linked,
            // or if the JSI binding fails.

            try {
                // Try to initialize MMKV
                const { MMKV } = await import('react-native-mmkv');

                // Extra check for web environment even though this file is usually native only
                // to prevent bundling issues if platform splitting fails
                if (typeof window !== 'undefined' && (window as any).localStorage) {
                    throw new Error('Web environment detected, forcing AsyncStorage fallback for safety');
                }

                const encryptionKey = await getOrCreateEncryptionKey();

                storage = new MMKV({
                    id: 'nutrihealth-storage',
                    encryptionKey,
                });

                storageBackend = 'mmkv';
                console.log('[Storage] ✓ Using MMKV backend');
                return storage;
            } catch (innerError) {
                // Throw to outer block to handle fallback
                throw innerError;
            }
        } catch (error) {
            // MMKV failed (likely due to new architecture requirement or Expo Go limitation)
            // Fall back to AsyncStorage
            console.warn('[Storage] MMKV initialization failed, falling back to AsyncStorage:', error);
            console.warn('[Storage] This is expected on Expo Go or if New Architecture is disabled.');

            storage = AsyncStorage;
            storageBackend = 'asyncstorage';
            console.log('[Storage] ✓ Using AsyncStorage backend');
            return storage;
        }
    })();

    return initializationPromise;
}

/**
 * Get the storage instance (synchronous after initialization)
 * Throws if storage hasn't been initialized
 */
function getStorage(): any {
    if (!storage) {
        throw new Error(
            'Storage not initialized. Call initializeStorage() at app startup.'
        );
    }
    return storage;
}

/**
 * Storage wrapper class that works with both MMKV and AsyncStorage
 */
class Storage {
    /**
     * Set a string value
     * @param key - Storage key
     * @param value - String value to store
     */
    async setString(key: string, value: string): Promise<void> {
        if (storageBackend === 'mmkv') {
            getStorage().set(key, value);
        } else {
            await getStorage().setItem(key, value);
        }
    }

    /**
     * Get a string value
     * @param key - Storage key
     * @returns String value or undefined
     */
    async getString(key: string): Promise<string | undefined> {
        if (storageBackend === 'mmkv') {
            return getStorage().getString(key);
        } else {
            const value = await getStorage().getItem(key);
            return value || undefined;
        }
    }

    /**
     * Set a number value
     * @param key - Storage key
     * @param value - Number value to store
     */
    async setNumber(key: string, value: number): Promise<void> {
        if (storageBackend === 'mmkv') {
            getStorage().set(key, value);
        } else {
            await getStorage().setItem(key, value.toString());
        }
    }

    /**
     * Get a number value
     * @param key - Storage key
     * @returns Number value or undefined
     */
    async getNumber(key: string): Promise<number | undefined> {
        if (storageBackend === 'mmkv') {
            return getStorage().getNumber(key);
        } else {
            const value = await getStorage().getItem(key);
            return value ? parseFloat(value) : undefined;
        }
    }

    /**
     * Set a boolean value
     * @param key - Storage key
     * @param value - Boolean value to store
     */
    async setBoolean(key: string, value: boolean): Promise<void> {
        if (storageBackend === 'mmkv') {
            getStorage().set(key, value);
        } else {
            await getStorage().setItem(key, value.toString());
        }
    }

    /**
     * Get a boolean value
     * @param key - Storage key
     * @returns Boolean value or undefined
     */
    async getBoolean(key: string): Promise<boolean | undefined> {
        if (storageBackend === 'mmkv') {
            return getStorage().getBoolean(key);
        } else {
            const value = await getStorage().getItem(key);
            return value ? value === 'true' : undefined;
        }
    }

    /**
     * Set an object value (will be JSON stringified)
     * @param key - Storage key
     * @param value - Object to store
     */
    async setObject<T>(key: string, value: T): Promise<void> {
        const jsonString = JSON.stringify(value);
        if (storageBackend === 'mmkv') {
            getStorage().set(key, jsonString);
        } else {
            await getStorage().setItem(key, jsonString);
        }
    }

    /**
     * Get an object value (will be JSON parsed)
     * @param key - Storage key
     * @returns Object or undefined
     */
    async getObject<T>(key: string): Promise<T | undefined> {
        let jsonString: string | undefined;

        if (storageBackend === 'mmkv') {
            jsonString = getStorage().getString(key);
        } else {
            const value = await getStorage().getItem(key);
            jsonString = value || undefined;
        }

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
    async delete(key: string): Promise<void> {
        if (storageBackend === 'mmkv') {
            getStorage().delete(key);
        } else {
            await getStorage().removeItem(key);
        }
    }

    /**
     * Check if a key exists
     * @param key - Storage key to check
     * @returns True if key exists
     */
    async contains(key: string): Promise<boolean> {
        if (storageBackend === 'mmkv') {
            return getStorage().contains(key);
        } else {
            const value = await getStorage().getItem(key);
            return value !== null;
        }
    }

    /**
     * Clear all storage
     */
    async clearAll(): Promise<void> {
        if (storageBackend === 'mmkv') {
            getStorage().clearAll();
        } else {
            await getStorage().clear();
        }
    }

    /**
     * Get all keys
     * @returns Array of all storage keys
     */
    async getAllKeys(): Promise<string[]> {
        if (storageBackend === 'mmkv') {
            return getStorage().getAllKeys();
        } else {
            return await getStorage().getAllKeys();
        }
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

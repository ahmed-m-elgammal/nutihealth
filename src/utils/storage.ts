import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
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
const STORAGE_DOWNGRADED_FLAG = '_storage_downgraded';
const STORAGE_DOWNGRADE_DISMISSED_FLAG = '_storage_downgrade_notice_dismissed';
const SENSITIVE_STORAGE_KEYS: ReadonlySet<string> = new Set([
    config.storageKeys.authToken,
    config.storageKeys.refreshToken,
    config.storageKeys.userId,
]);

const isSensitiveStorageKey = (key: string): boolean => {
    if (SENSITIVE_STORAGE_KEYS.has(key)) {
        return true;
    }

    // Supabase stores session artifacts with sb- prefixed keys.
    return key.startsWith('sb-');
};

/**
 * Generate a random encryption key
 */
async function generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function markStorageDowngraded(): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_DOWNGRADED_FLAG, '1');
    } catch (error) {
        console.warn('[Storage] Failed to persist downgrade flag:', error);
    }
}

async function clearStorageDowngradedFlag(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_DOWNGRADED_FLAG);
        await AsyncStorage.removeItem(STORAGE_DOWNGRADE_DISMISSED_FLAG);
    } catch (error) {
        console.warn('[Storage] Failed to clear downgrade flag:', error);
    }
}

async function migrateDowngradedDataToMMKV(mmkvStorage: any): Promise<void> {
    try {
        const downgraded = await AsyncStorage.getItem(STORAGE_DOWNGRADED_FLAG);
        if (downgraded !== '1') {
            return;
        }

        const allKeys = await AsyncStorage.getAllKeys();
        const keysToMigrate = allKeys.filter((key) => key !== STORAGE_DOWNGRADED_FLAG && isSensitiveStorageKey(key));

        if (keysToMigrate.length === 0) {
            await clearStorageDowngradedFlag();
            return;
        }

        const entries = await AsyncStorage.multiGet(keysToMigrate);
        for (const [key, value] of entries) {
            if (value != null) {
                mmkvStorage.set(key, value);
            }
        }

        await AsyncStorage.multiRemove([...keysToMigrate, STORAGE_DOWNGRADED_FLAG]);
        console.log(`[Storage] Migrated ${keysToMigrate.length} sensitive key(s) from AsyncStorage to MMKV`);
    } catch (error) {
        console.warn('[Storage] Failed to migrate downgraded sensitive data:', error);
    }
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

                // MMKV 3.x: encryptionKey is no longer accepted in the constructor.
                // Encryption must be applied via recrypt() after construction.
                // NOTE: MMKV 3.x encryption format is incompatible with 2.x.
                // On first launch after this upgrade, any existing 2.x encrypted store
                // will fail to read, the catch block below will trigger, and the user
                // will fall back to AsyncStorage and be prompted to log in again.
                storage = new MMKV({ id: 'nutrihealth-storage' });
                storage.recrypt(encryptionKey);

                await migrateDowngradedDataToMMKV(storage);
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
            await markStorageDowngraded();

            storage = AsyncStorage;
            storageBackend = 'asyncstorage';
            console.log('[Storage] ✓ Using AsyncStorage backend');
            return storage;
        }
    })();

    return initializationPromise;
}

export async function shouldShowStorageDowngradeWarning(): Promise<boolean> {
    try {
        const [isDowngraded, isDismissed] = await Promise.all([
            AsyncStorage.getItem(STORAGE_DOWNGRADED_FLAG),
            AsyncStorage.getItem(STORAGE_DOWNGRADE_DISMISSED_FLAG),
        ]);

        return isDowngraded === '1' && isDismissed !== '1';
    } catch {
        return false;
    }
}

export async function dismissStorageDowngradeWarning(): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_DOWNGRADE_DISMISSED_FLAG, '1');
    } catch (error) {
        console.warn('[Storage] Failed to persist downgrade warning dismissal:', error);
    }
}

/**
 * Get the storage instance (synchronous after initialization)
 * Throws if storage hasn't been initialized
 */
function getStorage(): any {
    if (!storage) {
        throw new Error('Storage not initialized. Call initializeStorage() at app startup.');
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
async function clearAuthToken(): Promise<void> {
    await storageInstance.delete(config.storageKeys.authToken);
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
 * Clear all auth data
 */
export async function clearAuthData(): Promise<void> {
    await clearAuthToken();
    await storageInstance.delete(config.storageKeys.refreshToken);
    await storageInstance.delete(config.storageKeys.userId);
}

export default storageInstance;

import { Platform } from 'react-native';
import { initializeStorage } from './storage';

const getWebKeys = (): string[] => {
    if (typeof localStorage === 'undefined') {
        return [];
    }

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key) {
            keys.push(key);
        }
    }

    return keys;
};

/**
 * Lazily resolves the encrypted MMKV instance from storage.ts.
 * This ensures that the encryption key is loaded from SecureStore
 * before any reads/writes happen.
 */
let _nativeStorage: any | null = null;
async function getNativeStorage() {
    if (_nativeStorage) return _nativeStorage;
    _nativeStorage = await initializeStorage();
    return _nativeStorage;
}

/**
 * Platform-agnostic storage adapter for Supabase auth.
 *
 * On native, delegates to the encrypted MMKV instance created
 * in storage.ts (id: 'nutrihealth-storage', SecureStore-backed key).
 * On web, uses localStorage.
 *
 * Implements Supabase's SupportedStorage interface:
 *   getItem(key): Promise<string | null>
 *   setItem(key, value): Promise<void>
 *   removeItem(key): Promise<void>
 */
export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.error('[StorageAdapter] Error getting item from localStorage:', error);
                return null;
            }
        }

        const store = await getNativeStorage();
        // MMKV returns undefined for missing keys; Supabase expects null
        return store?.getString?.(key) ?? (await store?.getItem?.(key)) ?? null;
    },

    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.error('[StorageAdapter] Error setting item in localStorage:', error);
            }
            return;
        }

        const store = await getNativeStorage();
        // MMKV uses .set(); AsyncStorage uses .setItem()
        if (store?.set) {
            store.set(key, value);
        } else {
            await store?.setItem?.(key, value);
        }
    },

    removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('[StorageAdapter] Error removing item from localStorage:', error);
            }
            return;
        }

        const store = await getNativeStorage();
        // MMKV uses .delete(); AsyncStorage uses .removeItem()
        if (store?.delete) {
            store.delete(key);
        } else {
            await store?.removeItem?.(key);
        }
    },

    getAllKeys: async (): Promise<string[]> => {
        if (Platform.OS === 'web') {
            try {
                return getWebKeys();
            } catch {
                return [];
            }
        }

        const store = await getNativeStorage();
        return store?.getAllKeys?.() ?? [];
    },

    multiRemove: async (keys: string[]): Promise<void> => {
        if (!keys.length) {
            return;
        }

        if (Platform.OS === 'web') {
            keys.forEach((key) => {
                try {
                    localStorage.removeItem(key);
                } catch {
                    // no-op
                }
            });
            return;
        }

        const store = await getNativeStorage();
        if (store?.delete) {
            keys.forEach((key) => store.delete(key));
        } else {
            await store?.multiRemove?.(keys);
        }
    },
};

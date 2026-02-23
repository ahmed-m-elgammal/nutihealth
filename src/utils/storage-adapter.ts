import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

const MMKV_STORAGE_ID = 'nutrihealth-kv';
const mmkv = Platform.OS === 'web' ? null : new MMKV({ id: MMKV_STORAGE_ID });

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
 * Platform-agnostic storage adapter.
 * Uses localStorage on web and MMKV on native platforms.
 */
export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.error('[Storage] Error getting item from localStorage:', error);
                return null;
            }
        }

        return mmkv?.getString(key) ?? null;
    },

    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.error('[Storage] Error setting item in localStorage:', error);
            }
            return;
        }

        mmkv?.set(key, value);
    },

    removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('[Storage] Error removing item from localStorage:', error);
            }
            return;
        }

        mmkv?.delete(key);
    },

    getAllKeys: async (): Promise<string[]> => {
        if (Platform.OS === 'web') {
            try {
                return getWebKeys();
            } catch {
                return [];
            }
        }

        return mmkv?.getAllKeys() ?? [];
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

        keys.forEach((key) => mmkv?.delete(key));
    },
};

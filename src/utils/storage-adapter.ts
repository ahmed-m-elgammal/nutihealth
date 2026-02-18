import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Platform-agnostic storage adapter
 * Uses localStorage on web and AsyncStorage on native platforms
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
        return AsyncStorage.getItem(key);
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
        return AsyncStorage.setItem(key, value);
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
        return AsyncStorage.removeItem(key);
    },
};

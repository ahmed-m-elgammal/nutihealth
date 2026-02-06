import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage for OpenFoodFacts cache
const storage = new MMKV({
    id: 'openfoodfacts-cache',
});

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData<T> {
    data: T;
    timestamp: number;
}

/**
 * Store data in cache with timestamp
 */
export function setCacheItem<T>(key: string, data: T): void {
    const cachedItem: CachedData<T> = {
        data,
        timestamp: Date.now(),
    };
    storage.set(key, JSON.stringify(cachedItem));
}

/**
 * Retrieve data from cache if not expired
 */
export function getCacheItem<T>(key: string): T | null {
    const cached = storage.getString(key);

    if (!cached) {
        return null;
    }

    try {
        const cachedItem: CachedData<T> = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - cachedItem.timestamp > CACHE_EXPIRY_MS) {
            storage.delete(key);
            return null;
        }

        return cachedItem.data;
    } catch (error) {
        // Invalid cached data, remove it
        storage.delete(key);
        return null;
    }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    storage.clearAll();
}

/**
 * Remove a specific cache entry
 */
export function removeCacheItem(key: string): void {
    storage.delete(key);
}

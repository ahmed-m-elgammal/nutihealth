const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = 'openfoodfacts-cache-';

interface CachedData<T> {
    data: T;
    timestamp: number;
}

/**
 * Store data in cache with timestamp
 */
export function setCacheItem<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;

    const cachedItem: CachedData<T> = {
        data,
        timestamp: Date.now(),
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cachedItem));
}

/**
 * Retrieve data from cache if not expired
 */
export function getCacheItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    const cached = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);

    if (!cached) {
        return null;
    }

    try {
        const cachedItem: CachedData<T> = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - cachedItem.timestamp > CACHE_EXPIRY_MS) {
            window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
            return null;
        }

        return cachedItem.data;
    } catch (error) {
        // Invalid cached data, remove it
        window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
    }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    if (typeof window === 'undefined') return;

    // Remove only items starting with CACHE_PREFIX
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => window.localStorage.removeItem(key));
}

/**
 * Remove a specific cache entry
 */
export function removeCacheItem(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

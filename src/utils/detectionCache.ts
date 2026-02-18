import { storage } from './storage-adapter';

const CACHE_KEY = 'ai_food_detection_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry<T> {
    result: T;
    timestamp: number;
}

/**
 * Simple hash function for base64 images
 * Uses first 50 + last 50 chars + length as fingerprint
 */
export function hashBase64(base64: string): string {
    if (!base64 || base64.length < 100) {
        return base64;
    }
    return `${base64.slice(0, 50)}${base64.slice(-50)}_${base64.length}`;
}

/**
 * Retrieves a cached result if it exists and hasn't expired
 * Optimized to avoid blocking UI thread
 */
export async function getCachedResult<T>(imageHash: string): Promise<T | null> {
    try {
        const cacheStr = await storage.getItem(CACHE_KEY);
        if (!cacheStr) return null;

        const cache: Record<string, CacheEntry<T>> = JSON.parse(cacheStr);
        const entry = cache[imageHash];

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
            // Delete asynchronously to avoid blocking
            cleanupExpiredEntry(imageHash).catch(err =>
                console.warn('Background cleanup failed:', err)
            );
            return null;
        }

        return entry.result;
    } catch (error) {
        console.warn('Cache retrieval failed:', error);
        return null;
    }
}

/**
 * Caches a result with timestamp
 * Non-blocking - runs in background
 */
export function setCachedResult<T>(imageHash: string, result: T): void {
    // Run cache write in background to avoid blocking UI
    _setCachedResultAsync(imageHash, result).catch(err =>
        console.warn('Background cache write failed:', err)
    );
}

/**
 * Internal async implementation
 */
async function _setCachedResultAsync<T>(imageHash: string, result: T): Promise<void> {
    try {
        const cacheStr = await storage.getItem(CACHE_KEY);
        const cache: Record<string, CacheEntry<T>> = cacheStr ? JSON.parse(cacheStr) : {};

        cache[imageHash] = {
            result,
            timestamp: Date.now()
        };

        // Optimized trimming - only check count, don't sort unless needed
        const cacheSize = Object.keys(cache).length;
        if (cacheSize > 50) {
            // Sort only when trimming needed
            const entries = Object.entries(cache);
            entries.sort((a, b) => (b[1] as CacheEntry<T>).timestamp - (a[1] as CacheEntry<T>).timestamp);
            const trimmed = Object.fromEntries(entries.slice(0, 50));
            await storage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        } else {
            await storage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
    } catch (error) {
        // Silent fail - caching is not critical
        console.warn('Cache storage failed:', error);
    }
}

/**
 * Background cleanup of expired entry
 */
async function cleanupExpiredEntry(imageHash: string): Promise<void> {
    const cacheStr = await storage.getItem(CACHE_KEY);
    if (!cacheStr) return;

    const cache = JSON.parse(cacheStr);
    delete cache[imageHash];
    await storage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Clears all cached AI detection results
 */
export async function clearDetectionCache(): Promise<void> {
    try {
        await storage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}

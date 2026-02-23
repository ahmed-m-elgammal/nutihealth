import { useUIStore } from '../store/uiStore';
import { API_BASE_URL } from '../constants/api';
import { API_KEY_HEADER, APP_API_KEY } from '../constants/security';

/**
 * API Call Options
 */
export interface ApiCallOptions extends RequestInit {
    body?: any;
    params?: Record<string, string>;
    suppress404?: boolean; // Suppress toast for 404 errors
    suppressErrors?: boolean; // Suppress all error toasts
    retryCount?: number; // Number of retries on network failure
    timeout?: number; // Request timeout in ms
}

/**
 * Default timeout for API requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Default retry count for failed requests
 */
const DEFAULT_RETRY_COUNT = 2;
const inFlightGetRequests = new Map<string, Promise<unknown>>();

export function resetInFlightGetRequests() {
    inFlightGetRequests.clear();
}

/**
 * Unified API wrapper for all HTTP requests
 *
 * Features:
 * - Type-safe responses with TypeScript generics
 * - Automatic error handling with user-friendly toast notifications
 * - Request retry logic for network failures
 * - Query parameter support
 * - Token management integration with SecureStore
 * - Timeout handling
 *
 * Inspired by SparkyFitness's api.ts but adapted for React Native/Expo
 */
export async function apiCall<T = any>(endpoint: string, options?: ApiCallOptions): Promise<T> {
    const method = (options?.method || 'GET').toUpperCase();
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    // Add query parameters if provided
    if (options?.params) {
        const queryParams = new URLSearchParams(options.params).toString();
        url = `${url}?${queryParams}`;
    }

    // Setup headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {}),
    };

    if (APP_API_KEY) {
        headers[API_KEY_HEADER] = APP_API_KEY;
    }

    // Get auth token from SecureStore (if available)
    // Note: SecureStore is async, but we'll load token in interceptor pattern later
    // For now, assume token is managed separately or passed in headers

    // Setup fetch config
    const config: RequestInit = {
        ...options,
        headers,
        method,
    };

    // Stringify body if it's an object
    if (options?.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    const dedupeKey = method === 'GET' ? `${method}:${url}` : null;
    const existingRequest = dedupeKey ? inFlightGetRequests.get(dedupeKey) : null;
    if (existingRequest) {
        return existingRequest as Promise<T>;
    }

    const requestPromise = (async () => {
        const timeout = options?.timeout || DEFAULT_TIMEOUT;
        const retryCount = options?.retryCount ?? DEFAULT_RETRY_COUNT;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                const response = await new Promise<Response>((resolve, reject) => {
                    const timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeout);

                    fetch(url, config)
                        .then((res) => {
                            clearTimeout(timeoutId);
                            resolve(res);
                        })
                        .catch((error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                        });
                });

                if (!response.ok) {
                    let errorData: any;
                    const contentType = response.headers.get('content-type');

                    if (contentType?.includes('application/json')) {
                        try {
                            errorData = await response.json();
                        } catch {
                            errorData = { message: response.statusText };
                        }
                    } else {
                        errorData = { message: await response.text() };
                    }

                    const errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;

                    if (response.status === 404 && options?.suppress404) {
                        return null as T;
                    }

                    if (!options?.suppressErrors) {
                        useUIStore.getState().showToast('error', errorMessage);
                    }

                    throw new Error(errorMessage);
                }

                const text = await response.text();
                const jsonResponse = text ? JSON.parse(text) : {};
                return jsonResponse as T;
            } catch (err: any) {
                lastError = err as Error;

                const isNetworkError =
                    err?.name?.includes('AbortError') ||
                    err?.message?.includes('fetch') ||
                    err?.message?.includes('Network request failed') ||
                    err?.message?.includes('timeout') ||
                    err?.message?.includes('Network error') ||
                    err?.message?.includes('Request timeout');

                if (!isNetworkError) {
                    throw err;
                }

                if (attempt < retryCount) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        const networkErrorMessage = 'Network error. Please check your connection and try again.';

        if (!options?.suppressErrors) {
            useUIStore.getState().showToast('error', networkErrorMessage);
        }

        throw lastError || new Error(networkErrorMessage);
    })();

    if (dedupeKey) {
        inFlightGetRequests.set(dedupeKey, requestPromise);
        requestPromise
            .finally(() => {
                inFlightGetRequests.delete(dedupeKey);
            })
            .catch(() => undefined);
    }

    return requestPromise;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T = any>(endpoint: string, options?: ApiCallOptions) => apiCall<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
        apiCall<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
        apiCall<T>(endpoint, { ...options, method: 'PUT', body }),

    delete: <T = any>(endpoint: string, options?: ApiCallOptions) =>
        apiCall<T>(endpoint, { ...options, method: 'DELETE' }),

    patch: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
        apiCall<T>(endpoint, { ...options, method: 'PATCH', body }),
};

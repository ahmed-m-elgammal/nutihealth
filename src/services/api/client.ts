import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { handleError } from '../../utils/errors';

/**
 * API Client for Backend Communication
 * 
 * OFFLINE-FIRST MODE:
 * This client is structured and ready for backend integration,
 * but currently inactive. The app operates in offline-first mode
 * using WatermelonDB for local storage.
 * 
 * TO ENABLE:
 * 1. Set API_BASE_URL to your backend endpoint
 * 2. Implement authentication flow in auth.ts
 * 3. Enable sync service to push local data
 */

// Base URL for API requests - currently inactive
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Request queue item for offline requests
 */
export interface QueuedRequest {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    data?: any;
    timestamp: number;
    retryCount: number;
}

class APIClient {
    private axiosInstance: AxiosInstance;
    private requestQueue: QueuedRequest[] = [];
    private isOnline: boolean = true;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            timeout: API_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    /**
     * Setup request and response interceptors
     */
    private setupInterceptors(): void {
        // Request interceptor - add auth token
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                try {
                    const token = await SecureStore.getItemAsync('auth_token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.error('Failed to get auth token:', error);
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor - handle common errors
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Token expired, refresh it
                    // TODO: Implement token refresh logic
                    await SecureStore.deleteItemAsync('auth_token');
                }

                if (error.response?.status === 403) {
                    // Forbidden - user doesn't have permission
                    console.error('Permission denied');
                }

                if (!error.response) {
                    // Network error - add to queue for offline sync
                    this.isOnline = false;
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * Generic GET request
     */
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
            return { success: true, data: response.data };
        } catch (error) {
            handleError(error, `APIClient.get: ${url}`);
            return this.handleError(error);
        }
    }

    /**
     * Generic POST request
     */
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
            return { success: true, data: response.data };
        } catch (error) {
            handleError(error, `APIClient.post: ${url}`);
            // Queue request if offline
            if (!this.isOnline) {
                this.queueRequest('POST', url, data);
            }
            return this.handleError(error);
        }
    }

    /**
     * Generic PUT request
     */
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
            return { success: true, data: response.data };
        } catch (error) {
            handleError(error, `APIClient.put: ${url}`);
            if (!this.isOnline) {
                this.queueRequest('PUT', url, data);
            }
            return this.handleError(error);
        }
    }

    /**
     * Generic DELETE request
     */
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
            return { success: true, data: response.data };
        } catch (error) {
            handleError(error, `APIClient.delete: ${url}`);
            if (!this.isOnline) {
                this.queueRequest('DELETE', url);
            }
            return this.handleError(error);
        }
    }

    /**
     * Generic PATCH request
     */
    async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
            return { success: true, data: response.data };
        } catch (error) {
            handleError(error, `APIClient.patch: ${url}`);
            if (!this.isOnline) {
                this.queueRequest('PATCH', url, data);
            }
            return this.handleError(error);
        }
    }

    /**
     * Queue request for offline sync
     */
    private queueRequest(method: QueuedRequest['method'], url: string, data?: any): void {
        const queuedRequest: QueuedRequest = {
            id: `${Date.now()}-${Math.random()}`,
            method,
            url,
            data,
            timestamp: Date.now(),
            retryCount: 0,
        };

        this.requestQueue.push(queuedRequest);
        console.log('Request queued for offline sync:', queuedRequest);
    }

    /**
     * Process queued requests when back online
     */
    async processQueue(): Promise<void> {
        if (!this.isOnline || this.requestQueue.length === 0) {
            return;
        }

        console.log(`Processing ${this.requestQueue.length} queued requests...`);

        const queue = [...this.requestQueue];
        this.requestQueue = [];

        for (const request of queue) {
            try {
                switch (request.method) {
                    case 'POST':
                        await this.post(request.url, request.data);
                        break;
                    case 'PUT':
                        await this.put(request.url, request.data);
                        break;
                    case 'DELETE':
                        await this.delete(request.url);
                        break;
                    case 'PATCH':
                        await this.patch(request.url, request.data);
                        break;
                }
                console.log('Successfully processed queued request:', request.id);
            } catch (error) {
                // Re-queue failed requests
                if (request.retryCount < 3) {
                    request.retryCount++;
                    this.requestQueue.push(request);
                }
            }
        }
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): ApiResponse {
        if (axios.isAxiosError(error)) {
            return {
                success: false,
                error: {
                    code: error.code || 'UNKNOWN_ERROR',
                    message: error.message,
                    details: error.response?.data,
                },
            };
        }

        return {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
            },
        };
    }

    /**
     * Set online status
     */
    setOnlineStatus(isOnline: boolean): void {
        this.isOnline = isOnline;
        if (isOnline) {
            this.processQueue();
        }
    }

    /**
     * Get queued requests count
     */
    getQueuedRequestsCount(): number {
        return this.requestQueue.length;
    }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;

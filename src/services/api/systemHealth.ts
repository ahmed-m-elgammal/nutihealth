import { api } from '../apiWrapper';

export interface SystemHealthResponse {
    status: 'ok' | 'degraded';
    service: string;
    timestamp: string;
    security: {
        cors: boolean;
        rateLimit: boolean;
    };
}

export const getSystemHealth = async (): Promise<SystemHealthResponse | null> => {
    try {
        return await api.get<SystemHealthResponse>('/healthz', {
            suppressErrors: true,
            retryCount: 0,
            timeout: 5000,
        });
    } catch {
        return null;
    }
};

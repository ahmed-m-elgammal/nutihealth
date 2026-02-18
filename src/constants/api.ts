const DEV_API_BASE_URL = 'http://localhost:3000/api';

const ensureTrailingSlashRemoved = (value: string): string =>
    value.replace(/\/+$/, '');

const isProductionBuild = process.env.NODE_ENV === 'production';

export const resolveApiBaseUrl = (): string => {
    const rawValue = process.env.EXPO_PUBLIC_API_URL?.trim();

    if (!rawValue) {
        if (isProductionBuild) {
            throw new Error('[Config] EXPO_PUBLIC_API_URL is required in production.');
        }
        return DEV_API_BASE_URL;
    }

    const normalized = ensureTrailingSlashRemoved(rawValue);
    const isHttp = /^https?:\/\//i.test(normalized);
    if (!isHttp) {
        throw new Error('[Config] EXPO_PUBLIC_API_URL must include http:// or https://');
    }

    const isLocalhost = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(normalized);
    if (isProductionBuild && isLocalhost) {
        throw new Error('[Config] EXPO_PUBLIC_API_URL cannot point to localhost in production.');
    }

    return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl();

import { EXPO_PUBLIC_API_URL, IS_PRODUCTION_BUILD, NODE_ENV } from './env';

const TEST_API_BASE_URL = 'http://example.test/api';

const ensureTrailingSlashRemoved = (value: string): string =>
    value.replace(/\/+$/, '');

export const resolveApiBaseUrl = (): string => {
    const rawValue = EXPO_PUBLIC_API_URL;

    if (!rawValue) {
        if (NODE_ENV === 'test') {
            return TEST_API_BASE_URL;
        }

        throw new Error(
            '[Config] EXPO_PUBLIC_API_URL is required. Set it to your backend URL (for example: https://staging-api.example.com/api).',
        );
    }

    const normalized = ensureTrailingSlashRemoved(rawValue);
    const isHttp = /^https?:\/\//i.test(normalized);
    if (!isHttp) {
        throw new Error('[Config] EXPO_PUBLIC_API_URL must include http:// or https://');
    }

    const isLocalhost = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(normalized);
    if (IS_PRODUCTION_BUILD && isLocalhost) {
        throw new Error('[Config] EXPO_PUBLIC_API_URL cannot point to localhost in production.');
    }

    return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl();

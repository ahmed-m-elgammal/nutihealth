type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const shouldLog = () => __DEV__;

const print = (level: LogLevel, scope: string, message: string, payload?: unknown) => {
    if (!shouldLog()) {
        return;
    }

    const prefix = `[${scope}] ${message}`;

    if (level === 'error') {
        console.error(prefix, payload ?? '');
        return;
    }

    if (level === 'warn') {
        console.warn(prefix, payload ?? '');
        return;
    }

    if (level === 'info') {
        console.log(prefix, payload ?? '');
        return;
    }

    console.log(prefix, payload ?? '');
};

const sanitizeHeaders = (headers?: Record<string, string>): Record<string, string> | undefined => {
    if (!headers) {
        return undefined;
    }

    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === 'authorization') {
            redacted[key] = '[redacted]';
            continue;
        }

        redacted[key] = value;
    }

    return redacted;
};

export const logger = {
    debug: (scope: string, message: string, payload?: unknown) => print('debug', scope, message, payload),
    info: (scope: string, message: string, payload?: unknown) => print('info', scope, message, payload),
    warn: (scope: string, message: string, payload?: unknown) => print('warn', scope, message, payload),
    error: (scope: string, message: string, payload?: unknown) => print('error', scope, message, payload),
    apiRequest: (context: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: unknown;
        params?: Record<string, string>;
        attempt?: number;
    }) => {
        print('debug', 'API', 'Request', {
            ...context,
            headers: sanitizeHeaders(context.headers),
        });
    },
    apiResponse: (context: {
        method: string;
        url: string;
        status: number;
        durationMs: number;
        attempt?: number;
    }) => {
        print('debug', 'API', 'Response', context);
    },
    apiError: (context: {
        method: string;
        url: string;
        error: string;
        durationMs?: number;
        status?: number;
        attempt?: number;
    }) => {
        print('error', 'API', 'Error', context);
    },
};

export default logger;

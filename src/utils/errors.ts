/**
 * Centralized error handling utility
 */

export class AppError extends Error {
    constructor(
        public message: string,
        public code: string = 'UNKNOWN_ERROR',
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Logs errors in a consistent format.
 * In production, this would send errors to a service like Sentry.
 */
export const handleError = (error: unknown, context?: string) => {
    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN';
    let details: Record<string, unknown> | undefined;

    if (error instanceof AppError) {
        message = error.message;
        code = error.code;
        details = error.details;
    } else if (error instanceof Error) {
        message = error.message;
    }

    // Log to console with context
    console.error(`[${context || 'App'}] Error (${code}):`, message, details || error);

    // Return structured error for UI handling potentially
    return { message, code, details };
};

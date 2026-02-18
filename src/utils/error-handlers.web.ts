/**
 * Web-specific global error handlers
 * Must be initialized BEFORE any other imports in the app entry point
 */

let errorReporter: ((error: unknown, source: string) => void) | null = null;

export function setWebErrorReporter(
    reporter: ((error: unknown, source: string) => void) | null
): void {
    errorReporter = reporter;
}

function reportError(error: unknown, source: string): void {
    if (!errorReporter) return;

    try {
        errorReporter(error, source);
    } catch (reportingError) {
        console.error('[ErrorHandlers] Reporter failed', reportingError);
    }
}

/**
 * Initialize global error handlers for web platform
 * Captures unhandled errors and promise rejections
 */
export function initializeWebErrorHandlers(): void {
    if (typeof window === 'undefined') {
        console.warn('[ErrorHandlers] Not a web platform, skipping web error handlers');
        return;
    }

    console.log('[ErrorHandlers] Initializing web global error handlers...');

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
        const message = event.message || '';
        // Suppress Chrome extension errors
        if (message.includes('Could not establish connection') ||
            message.includes('Receiving end does not exist') ||
            message.includes('chrome-extension://')) {
            event.stopImmediatePropagation();
            return;
        }

        console.error('[Global Error]', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            stack: event.error?.stack,
        });
        reportError(event.error ?? event.message, 'window.error');
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[Unhandled Promise Rejection]', {
            reason: event.reason,
            promise: event.promise,
            stack: event.reason?.stack,
        });
        reportError(event.reason, 'window.unhandledrejection');
    });

    console.log('[ErrorHandlers] ✓ Web error handlers initialized');
}

/**
 * Log a detailed error with context
 */
export function logError(context: string, error: unknown): void {
    const errorObj = error as Error;
    console.error(`[${context}]`, {
        name: errorObj?.name,
        message: errorObj?.message,
        stack: errorObj?.stack,
        raw: error,
    });
}

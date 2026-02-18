/**
 * Native platform error handlers (no-op for now)
 * Native platforms have their own crash reporting mechanisms
 */

export function initializeWebErrorHandlers(): void {
    // No-op on native platforms
    // React Native has built-in error handling (RedBox, error boundaries)
    console.log('[ErrorHandlers] Native platform, using built-in error handling');
}

export function logError(context: string, error: unknown): void {
    const errorObj = error as Error;
    console.error(`[${context}]`, {
        name: errorObj?.name,
        message: errorObj?.message,
        stack: errorObj?.stack,
        raw: error,
    });
}

import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const isPostHogConfigured = Boolean(apiKey && apiKey !== 'phc_your_api_key_here');

if (__DEV__) {
    console.log('[PostHog] config:', {
        apiKey: apiKey ? 'SET' : 'NOT SET',
        host,
        isConfigured: isPostHogConfigured,
    });
}

if (!isPostHogConfigured) {
    console.warn(
        '[PostHog] API key not configured. Analytics will be disabled. ' +
        'Set EXPO_PUBLIC_POSTHOG_API_KEY in your .env file to enable analytics.',
    );
}

/**
 * PostHog client instance for NutriHealth (Expo)
 *
 * Configuration loaded from EXPO_PUBLIC_ environment variables.
 * Required peer dependencies: react-native-device-info, react-native-localize,
 * expo-file-system, expo-application
 *
 * The constructor is wrapped in try/catch to prevent an unhandled JS exception
 * at module-load time (which occurs BEFORE RootErrorBoundary mounts and therefore
 * cannot be caught by any React Error Boundary).
 *
 * @see https://posthog.com/docs/libraries/react-native
 */
let posthog: PostHog;
try {
    posthog = new PostHog(apiKey || 'placeholder_key', {
        host,
        disabled: !isPostHogConfigured,
        captureAppLifecycleEvents: true,
        flushAt: 20,
        flushInterval: 10000,
        maxBatchSize: 100,
        maxQueueSize: 1000,
        preloadFeatureFlags: true,
        sendFeatureFlagEvent: true,
        featureFlagsRequestTimeoutMs: 10000,
        requestTimeout: 10000,
        fetchRetryCount: 3,
        fetchRetryDelay: 3000,
    });
} catch (initError) {
    console.error(
        '[PostHog] Initialization failed (missing native peer deps or other error):',
        initError,
    );
    // Create a disabled stub so the rest of the app does not crash.
    // posthog.screen(), posthog.capture() etc. will be no-ops.
    posthog = new PostHog('disabled', { disabled: true, host });
}

export { posthog };
export const isPostHogEnabled = isPostHogConfigured;

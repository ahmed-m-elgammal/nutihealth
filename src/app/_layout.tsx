import 'react-native-url-polyfill/auto';

// CRITICAL: Initialize web error handlers FIRST, before any other imports
// This ensures we can capture errors during module initialization
import { initializeWebErrorHandlers } from '../utils/error-handlers';
if (typeof window !== 'undefined') {
    initializeWebErrorHandlers();
}

import { Stack, useRouter, useSegments, usePathname, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, Text, Platform, Pressable, InteractionManager } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '../query/queryClient';
import { useUserStore } from '../store/userStore';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useAuthSessionStore } from '../store/authSessionStore';
import {
    clearAuthData,
    dismissStorageDowngradeWarning,
    initializeStorage,
    setUserId,
    shouldShowStorageDowngradeWarning,
} from '../utils/storage';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '../database';
import { initializeI18n } from '../i18n';
import '../../global.css';
import { registerForPushNotificationsAsync, scheduleAdaptiveReminders } from '../services/notifications';
import RootErrorBoundary from '../components/errors/RootErrorBoundary';
import { SkeletonAnimationProvider } from '../components/ui/Skeleton';
import { ThemeProvider } from '../theme/ThemeProvider';
import ToastContainer from '../components/ui/Toast';
import { HomeSkeleton } from '../components/skeletons/ScreenSkeletons';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import { syncService } from '../services/api/sync';
import { useUIStore } from '../store/uiStore';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '../config/posthog';
import { supabase } from '../services/supabaseClient';
import { config } from '../constants/config';

// Keep the splash screen visible until we explicitly hide it after initialization
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const SENSITIVE_PARAM_KEY_PATTERN = /(user|email|phone|token|session|auth|id|uuid|code)/i;
const MAX_TRACKED_PARAM_KEYS = 12;

const buildSafeScreenTrackingProps = (params: ReturnType<typeof useGlobalSearchParams>) => {
    const keys = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
        .map(([key]) => key);

    const safeKeys: string[] = [];
    let redactedParamCount = 0;

    for (const key of keys) {
        if (SENSITIVE_PARAM_KEY_PATTERN.test(key)) {
            redactedParamCount += 1;
            continue;
        }
        safeKeys.push(key);
    }

    return {
        params_count: keys.length,
        safe_params_count: safeKeys.length,
        redacted_params_count: redactedParamCount,
        has_query_params: keys.length > 0,
        param_keys: safeKeys.slice(0, MAX_TRACKED_PARAM_KEYS).join(',') || null,
    };
};

const devLog = (...messages: unknown[]) => {
    if (__DEV__) {
        console.log(...messages);
    }
};

const resetWebApplicationData = async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return;
    }

    const webWindow = window;

    try {
        try {
            webWindow.localStorage?.clear();
        } catch {
            // Ignore localStorage access errors and continue clearing IndexedDB.
        }

        const webIndexedDb = webWindow.indexedDB;
        if (typeof webIndexedDb !== 'undefined') {
            const deleteDb = (name: string) =>
                new Promise<void>((resolve) => {
                    try {
                        const request = webIndexedDb.deleteDatabase(name);
                        request.onsuccess = () => resolve();
                        request.onerror = () => resolve();
                        request.onblocked = () => resolve();
                    } catch {
                        resolve();
                    }
                });

            const indexedDbApi = webIndexedDb as IDBFactory & {
                databases?: () => Promise<Array<{ name?: string }>>;
            };

            if (typeof indexedDbApi.databases === 'function') {
                const databases = await indexedDbApi.databases();
                await Promise.all(
                    databases
                        .map((db) => db.name)
                        .filter((name): name is string => Boolean(name))
                        .map((name) => deleteDb(name)),
                );
            } else {
                await Promise.all([
                    deleteDb('watermelon'),
                    deleteDb('nutrihealth-fallback'),
                    deleteDb('nutrihealth-web'),
                ]);
            }
        }
    } finally {
        webWindow.location.reload();
    }
};

function RootNavigation() {
    const { isLoading, loadUser, error } = useUserStore();
    const { user, isLoading: isUserLoading } = useCurrentUser();
    const sessionUserId = useAuthSessionStore((state) => state.userId);
    const setSession = useAuthSessionStore((state) => state.setSession);
    const clearSession = useAuthSessionStore((state) => state.clearSession);
    const segments = useSegments();
    const router = useRouter();
    const pathname = usePathname();
    const params = useGlobalSearchParams();
    const previousPathname = useRef<string | undefined>(undefined);
    const isHandlingSignOutRef = useRef(false);
    const isSyncingAuthStateRef = useRef(false);
    const hasQueuedSeedsRef = useRef(false);
    const [isInitialized, setIsInitialized] = React.useState(false);

    // Manual screen tracking for Expo Router
    useEffect(() => {
        if (previousPathname.current !== pathname) {
            posthog.screen(pathname, {
                previous_screen: previousPathname.current ?? null,
                ...buildSafeScreenTrackingProps(params),
            });
            previousPathname.current = pathname;
        }
    }, [pathname, params]);

    useEffect(() => {
        const init = async () => {
            try {
                devLog('[App] Starting initialization...');
                devLog('[App] Platform:', Platform.OS);

                // Initialize secure storage first
                devLog('[App] Initializing storage...');
                try {
                    await initializeStorage();
                    devLog('[App] ✓ Storage initialized');

                    const shouldWarnStorageDowngrade = await shouldShowStorageDowngradeWarning();
                    if (shouldWarnStorageDowngrade) {
                        useUIStore
                            .getState()
                            .showToast(
                                'warning',
                                'Secure storage unavailable; your data may be less secure. Please restart the app.',
                                0,
                                {
                                    label: 'Dismiss',
                                    onPress: () => {
                                        dismissStorageDowngradeWarning().catch(() => undefined);
                                    },
                                },
                            );
                    }
                } catch (storageError) {
                    console.error('[App] Storage initialization failed (non-fatal):', storageError);
                }

                devLog('[App] Initializing i18n...');
                try {
                    await initializeI18n();
                    devLog('[App] ✓ i18n initialized');
                } catch (i18nError) {
                    console.warn('[App] ⚠ i18n initialization fallback to English:', i18nError);
                }

                devLog('[App] Loading auth session + user data...');
                try {
                    if (supabase) {
                        const {
                            data: { session },
                        } = await supabase.auth.getSession();

                        const currentSessionUserId = session?.user?.id ?? null;
                        setSession(session ?? null);

                        if (currentSessionUserId) {
                            await setUserId(currentSessionUserId);
                            await loadUser();
                        }

                        devLog('[App] Registering push notifications...');
                        try {
                            const permissionGranted = await registerForPushNotificationsAsync();
                            if (permissionGranted) {
                                await scheduleAdaptiveReminders(currentSessionUserId || undefined);
                                devLog('[App] ✓ Adaptive reminders scheduled');
                            } else {
                                devLog('[App] Push permission not granted');
                            }
                        } catch (notificationError) {
                            console.warn('[App] ⚠ Notification setup failed:', notificationError);
                        }
                    }
                    devLog('[App] ✓ Session and user loaded');
                } catch (userError) {
                    console.error('[App] User loading failed:', userError);
                }

                devLog('[App] Initializing sync service...');
                try {
                    await syncService.initialize();
                    devLog('[App] ✓ Sync service initialized');
                } catch (syncInitError) {
                    console.warn('[App] ⚠ Sync service init failed:', syncInitError);
                }
            } catch (err) {
                const initError = err as Error;
                console.error('[App] ✗ Critical Initialization error:', initError);

                // On web, some errors are caused by corrupted localStorage or IndexedDB
                if (Platform.OS === 'web') {
                    console.error('[App] Web Error Details:', {
                        name: initError.name,
                        message: initError.message,
                        stack: initError.stack,
                    });
                }
            } finally {
                setIsInitialized(true);
                // Hide the native splash screen now that everything is ready
                SplashScreen.hideAsync().catch(() => undefined);
            }
        };
        init();
    }, [loadUser, setSession]);

    useEffect(() => {
        if (!isInitialized || hasQueuedSeedsRef.current) {
            return;
        }

        hasQueuedSeedsRef.current = true;
        // Wait for the UI to be fully rendered and all interactions to settle
        // before writing 1,400+ seed records to SQLite. The old 750ms delay
        // frequently triggered Android ANR on emulators and slow devices.
        // InteractionManager ensures we don't touch the DB while animations
        // or navigation transitions are in progress.
        const seedTimeout = setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                const runSeedsInBackground = async () => {
                    devLog('[App] Running database seeds in background...');
                    try {
                        const { runSeeds } = await import('../database/seeds');
                        await runSeeds();
                        devLog('[App] ✓ Background seeds completed');
                    } catch (seedError) {
                        // Seeds failing should not impact app startup.
                        console.warn('[App] ⚠ Background seed error (non-critical):', seedError);
                    }
                };

                runSeedsInBackground().catch(() => undefined);
            });
        }, 3000); // 3s not 750ms — give the app time to render its first frame

        return () => clearTimeout(seedTimeout);
    }, [isInitialized]);

    useEffect(() => {
        if (!supabase) {
            return;
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                if (isHandlingSignOutRef.current) {
                    return;
                }

                isHandlingSignOutRef.current = true;
                const syncSignedOutState = async () => {
                    try {
                        clearSession();
                        await clearAuthData();
                        useUserStore.setState({ error: null, isLoading: false });
                    } finally {
                        isHandlingSignOutRef.current = false;
                    }
                };
                syncSignedOutState().catch(() => undefined);
                return;
            }

            if (!session?.user?.id) {
                return;
            }

            if (isSyncingAuthStateRef.current) {
                return;
            }

            if (
                event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'USER_UPDATED' ||
                event === 'PASSWORD_RECOVERY' ||
                event === 'INITIAL_SESSION'
            ) {
                isSyncingAuthStateRef.current = true;
                const syncSignedInState = async () => {
                    try {
                        setSession(session);
                        await setUserId(session.user.id);
                        await loadUser();
                    } catch (authStateError) {
                        console.warn('[Auth] Failed to synchronize auth state:', authStateError);
                    } finally {
                        isSyncingAuthStateRef.current = false;
                    }
                };
                syncSignedInState().catch(() => undefined);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [clearSession, loadUser, setSession]);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as {
                action?: string;
                mealType?: string;
            };

            if (data?.action === 'open_smart_cooker') {
                router.push('/(modals)/smart-cooker');
            }
        });

        return () => {
            subscription.remove();
        };
    }, [router]);

    useEffect(() => {
        if (!isInitialized || isLoading || isUserLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = segments[0] === 'onboarding';
        const inTabsGroup = segments[0] === '(tabs)';
        const inModalsGroup = segments[0] === '(modals)';
        const inWorkoutGroup = segments[0] === 'workout';
        const inProfileGroup = segments[0] === 'profile';

        // No authenticated Supabase session - redirect to onboarding
        if (!sessionUserId && !inOnboarding) {
            if (!inAuthGroup) {
                router.replace('/onboarding/welcome');
            }
        }
        // Authenticated user but onboarding not complete - stay on onboarding
        else if (sessionUserId && user && !user.onboardingCompleted && !inOnboarding) {
            router.replace('/onboarding/welcome');
        }
        // User complete - go to main app
        else if (
            sessionUserId &&
            user &&
            user.onboardingCompleted &&
            !inTabsGroup &&
            !inOnboarding &&
            !inModalsGroup &&
            !inWorkoutGroup &&
            !inProfileGroup
        ) {
            router.replace('/(tabs)');
        }
    }, [sessionUserId, user, segments, isInitialized, isLoading, isUserLoading, router]);

    if (!isInitialized || isLoading || isUserLoading) {
        return (
            <View className="flex-1 bg-white pt-12">
                <HomeSkeleton />
            </View>
        );
    }

    // Show error screen if there's a critical error
    if (error && isInitialized && !user) {
        return (
            <View className="flex-1 items-center justify-center bg-white p-6">
                <Text className="mb-4 text-2xl font-bold text-red-500">Launch Error</Text>
                <Text className="mb-6 text-center leading-6 text-gray-600">
                    {error ||
                        'We encountered a problem while starting NutriHealth. This might be due to a connection issue or corrupted local data.'}
                </Text>

                <View className="w-full max-w-xs space-y-4">
                    <Pressable
                        className="items-center rounded-xl bg-blue-500 py-4"
                        onPress={() => {
                            devLog('[App] Retry initialization pressed');
                            setIsInitialized(false);
                        }}
                    >
                        <Text className="text-lg font-bold text-white">Retry Initialization</Text>
                    </Pressable>

                    {Platform.OS === 'web' && (
                        <Text
                            className="mt-4 text-center text-gray-400 underline"
                            onPress={() => {
                                void resetWebApplicationData();
                            }}
                        >
                            Reset Application Data (Web)
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationMatchesGesture: true,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
            }}
        >
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="(modals)/add-meal"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/food-search"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/barcode-scanner"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            {config.features.enableAI ? (
                <Stack.Screen
                    name="(modals)/ai-food-detect"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
                />
            ) : null}
            <Stack.Screen
                name="(modals)/recipe-import"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/recipe-preview"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/smart-cooker"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/cookpad-ingredient-search"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/complete-profile"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/meal-prep-planner"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/log-weight"
                options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <RootErrorBoundary
                onClearCache={Platform.OS === 'web' ? () => void resetWebApplicationData() : undefined}
                supportEmail="support@nutrihealth.app"
            >
                <DatabaseProvider database={database}>
                    <QueryClientProvider client={queryClient}>
                        <PostHogProvider
                            client={posthog}
                            autocapture={{
                                captureScreens: false,
                                captureTouches: true,
                                propsToCapture: ['testID'],
                                maxElementsCaptured: 20,
                            }}
                        >
                            <ThemeProvider>
                                <SkeletonAnimationProvider>
                                    <SyncStatusIndicator />
                                    <ToastContainer />
                                    <RootNavigation />
                                </SkeletonAnimationProvider>
                            </ThemeProvider>
                        </PostHogProvider>
                    </QueryClientProvider>
                </DatabaseProvider>
            </RootErrorBoundary>
        </GestureHandlerRootView>
    );
}

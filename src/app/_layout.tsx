// CRITICAL: Initialize web error handlers FIRST, before any other imports
// This ensures we can capture errors during module initialization
import { initializeWebErrorHandlers } from '../utils/error-handlers';
if (typeof window !== 'undefined') {
    initializeWebErrorHandlers();
}

import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '../query/queryClient';
import { useUserStore } from '../store/userStore';
import { initializeStorage } from '../utils/storage';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '../database';
import '../i18n';
import '../../global.css';
import { registerForPushNotificationsAsync, scheduleAdaptiveReminders } from '../services/notifications';
import RootErrorBoundary from '../components/errors/RootErrorBoundary';
import OfflineIndicator from '../components/common/OfflineIndicator';

const devLog = (...messages: unknown[]) => {
    if (__DEV__) {
        console.log(...messages);
    }
};

const resetWebApplicationData = async () => {
    try {
        localStorage.clear();

        if (typeof indexedDB !== 'undefined') {
            const deleteDb = (name: string) =>
                new Promise<void>((resolve) => {
                    try {
                        const request = indexedDB.deleteDatabase(name);
                        request.onsuccess = () => resolve();
                        request.onerror = () => resolve();
                        request.onblocked = () => resolve();
                    } catch {
                        resolve();
                    }
                });

            const indexedDbApi = indexedDB as IDBFactory & {
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
        window.location.reload();
    }
};

function RootNavigation() {
    const { user, isLoading, loadUser, error } = useUserStore();
    const segments = useSegments();
    const router = useRouter();
    const [isInitialized, setIsInitialized] = React.useState(false);

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
                } catch (storageError) {
                    console.error('[App] Storage initialization failed (non-fatal):', storageError);
                }

                devLog('[App] Loading user data...');
                try {
                    await loadUser();
                    devLog('[App] ✓ User loaded');
                } catch (userError) {
                    console.error('[App] User loading failed:', userError);
                }

                // Seed database on first launch
                // Use dynamic import to defer database module loading until after storage is ready
                // This prevents synchronous initialization crashes on web
                devLog('[App] Running database seeds...');
                try {
                    const { runSeeds } = await import('../database/seeds');
                    await runSeeds();
                    devLog('[App] ✓ Seeds completed');
                } catch (seedError) {
                    // Seeds failing shouldn't crash the app
                    console.warn('[App] ⚠ Seed error (non-critical):', seedError);
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
            }
        };
        init();
    }, [loadUser]);

    useEffect(() => {
        registerForPushNotificationsAsync().then((permissionGranted) => {
            if (permissionGranted) {
                scheduleAdaptiveReminders(useUserStore.getState().user?.id).catch(() => undefined);
            }
        });
    }, []);

    useEffect(() => {
        if (!isInitialized || isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = segments[0] === 'onboarding';
        const inTabsGroup = segments[0] === '(tabs)';
        const inModalsGroup = segments[0] === '(modals)';
        const inWorkoutGroup = segments[0] === 'workout';

        // No user - redirect to onboarding
        if (!user && !inOnboarding) {
            // Check if we are already in auth flow to avoid loops
            if (!inAuthGroup) {
                router.replace('/onboarding');
            }
        }
        // User exists but onboarding not complete - stay on onboarding
        else if (user && !user.onboardingCompleted && !inOnboarding) {
            router.replace('/onboarding');
        }
        // User complete - go to main app
        else if (
            user &&
            user.onboardingCompleted &&
            !inTabsGroup &&
            !inOnboarding &&
            !inModalsGroup &&
            !inWorkoutGroup
        ) {
            router.replace('/(tabs)');
        }
    }, [user, segments, isInitialized, isLoading, router]);

    if (!isInitialized || isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
                <Text className="mt-4 text-gray-500">Loading NutriHealth...</Text>
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
                    <View
                        className="items-center rounded-xl bg-blue-500 py-4"
                        onTouchEnd={() => setIsInitialized(false)}
                    >
                        <Text className="text-lg font-bold text-white">Retry Initialization</Text>
                    </View>

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
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(modals)/add-meal" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/food-search" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/barcode-scanner" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/ai-food-detect" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/recipe-import" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/recipe-preview" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/complete-profile" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="(modals)/meal-prep-planner" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <RootErrorBoundary onClearCache={Platform.OS === 'web' ? () => void resetWebApplicationData() : undefined}>
                <DatabaseProvider database={database}>
                    <QueryClientProvider client={queryClient}>
                        <OfflineIndicator />
                        <RootNavigation />
                    </QueryClientProvider>
                </DatabaseProvider>
            </RootErrorBoundary>
        </GestureHandlerRootView>
    );
}

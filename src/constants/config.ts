import { API_BASE_URL } from './api';
import {
    EXPO_PUBLIC_SUPABASE_KEY,
    EXPO_PUBLIC_SUPABASE_URL,
    NODE_ENV,
    EXPO_PUBLIC_ENABLE_AI,
    EXPO_PUBLIC_ENABLE_ANALYTICS,
    EXPO_PUBLIC_ENABLE_BARCODE,
    EXPO_PUBLIC_ENABLE_CAMERA,
    EXPO_PUBLIC_ENABLE_NOTIFICATIONS,
} from './env';

// App configuration constants
const isSupabaseConfigured = Boolean(EXPO_PUBLIC_SUPABASE_URL && EXPO_PUBLIC_SUPABASE_KEY);

export const config = {
    // API Configuration
    api: {
        baseUrl: API_BASE_URL,
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
    },

    // Feature Flags
    features: {
        enableSync: isSupabaseConfigured,
        enableAI: EXPO_PUBLIC_ENABLE_AI,
        enableBarcode: EXPO_PUBLIC_ENABLE_BARCODE,
        enableCamera: EXPO_PUBLIC_ENABLE_CAMERA,
        enableNotifications: EXPO_PUBLIC_ENABLE_NOTIFICATIONS,
        enableAnalytics: EXPO_PUBLIC_ENABLE_ANALYTICS,
    },

    // App Metadata
    app: {
        name: 'NutriHealth',
        version: '1.0.0',
        environment: NODE_ENV,
    },

    // Database
    database: {
        name: 'nutrihealth',
        batchSize: 100,
    },

    // Sync Configuration
    sync: {
        intervalMinutes: 15,
        batchSize: 50,
        maxRetries: 3,
    },

    // Supabase
    supabase: {
        url: EXPO_PUBLIC_SUPABASE_URL,
        configured: isSupabaseConfigured,
    },

    // AI Services
    ai: {
        groqModel: 'llama3-8b-8192',
    },

    // Storage Keys
    storageKeys: {
        authToken: 'auth_token',
        refreshToken: 'refresh_token',
        userId: 'user_id',
        lastSync: 'last_sync',
        theme: 'theme_preference',
        language: 'language',
        onboardingComplete: 'onboarding_complete',
    },

    // Limits
    limits: {
        maxMealPhotos: 5,
        maxRecipeIngredients: 50,
        maxWorkoutExercises: 20,
        maxCustomFoods: 500,
    },
} as const;

export type Config = typeof config;

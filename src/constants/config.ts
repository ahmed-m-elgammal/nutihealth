import { API_BASE_URL } from './api';

// App configuration constants

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
        enableSync: false, // Enable when backend is ready
        enableAI: false, // Enable when AI service is configured
        enableBarcode: true,
        enableCamera: true,
        enableNotifications: true,
        enableAnalytics: false,
    },

    // App Metadata
    app: {
        name: 'NutriHealth',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
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

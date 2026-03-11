const readEnv = (key: string): string => process.env[key]?.trim() || '';
const readBooleanEnv = (key: string, fallback: boolean = false): boolean => {
    const value = readEnv(key).toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes') {
        return true;
    }
    if (value === 'false' || value === '0' || value === 'no') {
        return false;
    }
    return fallback;
};

export const NODE_ENV = readEnv('NODE_ENV') || 'development';
export const IS_PRODUCTION_BUILD = NODE_ENV === 'production';

export const EXPO_PUBLIC_API_URL = readEnv('EXPO_PUBLIC_API_URL');
export const EXPO_PUBLIC_SUPABASE_URL = readEnv('EXPO_PUBLIC_SUPABASE_URL');
export const EXPO_PUBLIC_SUPABASE_ANON_KEY = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
export const EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = readEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
export const EXPO_PUBLIC_USDA_API_KEY = readEnv('EXPO_PUBLIC_USDA_API_KEY');
export const EXPO_PUBLIC_ENABLE_REMOTE_PUSH = readBooleanEnv('EXPO_PUBLIC_ENABLE_REMOTE_PUSH', false);
export const EXPO_PUBLIC_PUSH_TOKEN_PATH = readEnv('EXPO_PUBLIC_PUSH_TOKEN_PATH') || '/notifications/expo-token';
export const EXPO_PUBLIC_N8N_MEAL_PLANNER_URL = readEnv('EXPO_PUBLIC_N8N_MEAL_PLANNER_URL');
export const EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL = readEnv('EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL');
export const EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL = readEnv('EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL');

export const EXPO_PUBLIC_SUPABASE_KEY = EXPO_PUBLIC_SUPABASE_ANON_KEY || EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (IS_PRODUCTION_BUILD) {
    if (!EXPO_PUBLIC_API_URL) {
        throw new Error('[Config] EXPO_PUBLIC_API_URL is required in production.');
    }

    if (
        (EXPO_PUBLIC_SUPABASE_URL && !EXPO_PUBLIC_SUPABASE_KEY) ||
        (!EXPO_PUBLIC_SUPABASE_URL && EXPO_PUBLIC_SUPABASE_KEY)
    ) {
        throw new Error(
            '[Config] Supabase env must include both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
        );
    }
}

export const env = {
    nodeEnv: NODE_ENV,
    isProductionBuild: IS_PRODUCTION_BUILD,
    apiUrl: EXPO_PUBLIC_API_URL,
    supabaseUrl: EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: EXPO_PUBLIC_SUPABASE_KEY,
    usdaApiKey: EXPO_PUBLIC_USDA_API_KEY,
    enableRemotePush: EXPO_PUBLIC_ENABLE_REMOTE_PUSH,
    pushTokenPath: EXPO_PUBLIC_PUSH_TOKEN_PATH,
    n8nMealPlannerUrl: EXPO_PUBLIC_N8N_MEAL_PLANNER_URL,
    n8nFitnessAdviceUrl: EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL,
    n8nVoiceToTextUrl: EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL,
} as const;

export default env;

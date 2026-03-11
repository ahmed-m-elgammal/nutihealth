import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { storage } from '../utils/storage-adapter';
import { EXPO_PUBLIC_SUPABASE_KEY, EXPO_PUBLIC_SUPABASE_URL } from '../constants/env';

const SUPABASE_URL = EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_OR_PUBLISHABLE_KEY = EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_OR_PUBLISHABLE_KEY);

const createSupabase = () => {
    if (!isSupabaseConfigured) {
        return null;
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_OR_PUBLISHABLE_KEY, {
        auth: {
            storage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
};

export const supabase = createSupabase();

/**
 * AppState-driven token auto-refresh.
 *
 * When the app returns to the foreground, we immediately kick off a
 * token refresh so the user never hits an expired-JWT error after
 * the app has been backgrounded for a while.
 */
if (supabase) {
    AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
            supabase.auth.startAutoRefresh();
        } else {
            supabase.auth.stopAutoRefresh();
        }
    });
}

export const requireSupabaseClient = () => {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
        );
    }

    return supabase;
};

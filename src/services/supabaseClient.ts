import { createClient } from '@supabase/supabase-js';
import { storage } from '../utils/storage-adapter';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_OR_PUBLISHABLE_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

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

export const requireSupabaseClient = () => {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
        );
    }

    return supabase;
};

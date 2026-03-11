import * as SecureStore from 'expo-secure-store';
import { database } from '../database';
import { queryClient } from '../query/queryClient';
import { syncService } from './api/sync';
import { api, resetInFlightGetRequests } from './apiWrapper';
import { requireSupabaseClient } from './supabaseClient';
import { clearWeatherCache } from './weather';
import storageInstance, { getAuthToken as getStoredAuthToken } from '../utils/storage';
import { storage as supabaseStorage } from '../utils/storage-adapter';

const ACCOUNT_DELETE_ENDPOINT = '/account';
const SECURE_STORE_KEYS = ['auth_token', 'refresh_token', 'user_id'] as const;

const getAccessToken = async (): Promise<string> => {
    const supabase = requireSupabaseClient();
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message || 'Unable to verify your session.');
    }

    const accessToken = session?.access_token || (await getStoredAuthToken());
    if (!accessToken) {
        throw new Error('No active session found. Please sign in again.');
    }

    return accessToken;
};

const isLocalOnlyDeleteFallback = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    return message.includes('no active session') || message.includes('unable to verify your session');
};

const clearSupabaseStorageKeys = async (): Promise<void> => {
    const keys = await supabaseStorage.getAllKeys();
    if (!keys.length) {
        return;
    }

    await supabaseStorage.multiRemove(keys);
};

const clearSecureStoreTokens = async (): Promise<void> => {
    await Promise.all(SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
};

const wipeLocalData = async (): Promise<void> => {
    syncService.disableAutoSync();
    resetInFlightGetRequests();
    queryClient.clear();
    clearWeatherCache();

    try {
        const supabase = requireSupabaseClient();
        await supabase.auth.signOut({ scope: 'local' });
    } catch {
        // Best effort. Storage reset below is the source of truth.
    }

    await Promise.allSettled([
        database.unsafeResetDatabase(),
        storageInstance.clearAll(),
        clearSupabaseStorageKeys(),
        clearSecureStoreTokens(),
    ]);
};

export async function deleteAccountAndWipeLocalData(): Promise<void> {
    let accessToken: string | null = null;
    try {
        accessToken = await getAccessToken();
    } catch (error) {
        if (!isLocalOnlyDeleteFallback(error)) {
            throw error;
        }
    }

    if (accessToken) {
        await api.delete(ACCOUNT_DELETE_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
    }

    await wipeLocalData();
}

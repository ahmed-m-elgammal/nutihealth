import { getAuthToken, getUserId, clearAuthData } from '../utils/storage';
import { supabase } from '../services/supabaseClient';

/**
 * Hook for managing authentication state
 * @returns Auth utilities
 */
export function useAuth() {
    /**
     * Check if user is authenticated
     */
    const isAuthenticated = async (): Promise<boolean> => {
        const token = await getAuthToken();
        const userId = await getUserId();
        return Boolean(token && userId);
    };

    /**
     * Get current auth token
     */
    const getToken = async (): Promise<string | undefined> => {
        return await getAuthToken();
    };

    /**
     * Get current user ID
     */
    const getCurrentUserId = async (): Promise<string | undefined> => {
        return await getUserId();
    };

    /**
     * Logout user (clear auth data and redirect to login)
     */
    const logout = async () => {
        try {
            // Invalidate the server-side session when possible.
            // If offline/unreachable, continue with local logout.
            if (supabase) {
                try {
                    const { error } = await supabase.auth.signOut({ scope: 'global' });
                    if (error) {
                        console.warn('Supabase signOut failed, continuing with local logout:', error.message);
                    }
                } catch (error) {
                    console.warn('Supabase signOut failed, continuing with local logout:', error);
                }
            }

            // Clear auth storage
            await clearAuthData();

            // Clear user store
            // Note: Implementing a reset function in userStore would be ideal

            // In a full implementation, you would also:
            // - Clear WatermelonDB database
            // - Navigate to login screen
            // - Cancel any pending API requests
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return {
        isAuthenticated,
        getToken,
        getCurrentUserId,
        logout,
    };
}

export default useAuth;

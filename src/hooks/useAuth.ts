import { getAuthToken, getUserId, clearAuthData } from '../utils/storage';


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
            // Clear auth storage
            clearAuthData();

            // Clear user store
            // Note: Implementing a reset function in userStore would be ideal

            // In a full implementation, you would also:
            // - Clear WatermelonDB database
            // - Navigate to login screen
            // - Cancel any pending API requests

            console.log('User logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
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

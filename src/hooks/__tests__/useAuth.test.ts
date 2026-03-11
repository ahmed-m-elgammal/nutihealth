const mockGetAuthToken = jest.fn();
const mockGetUserId = jest.fn();
const mockClearAuthData = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../utils/storage', () => ({
    getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
    getUserId: (...args: unknown[]) => mockGetUserId(...args),
    clearAuthData: (...args: unknown[]) => mockClearAuthData(...args),
}));

jest.mock('../../services/supabaseClient', () => ({
    supabase: {
        auth: {
            signOut: (...args: unknown[]) => mockSignOut(...args),
        },
    },
}));

import { useAuth } from '../useAuth';

describe('useAuth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSignOut.mockResolvedValue({ error: null });
        mockClearAuthData.mockResolvedValue(undefined);
    });

    test('returns true from isAuthenticated when both token and user id exist', async () => {
        mockGetAuthToken.mockResolvedValue('auth-token');
        mockGetUserId.mockResolvedValue('user-id');
        const auth = useAuth();

        await expect(auth.isAuthenticated()).resolves.toBe(true);
    });

    test('returns false from isAuthenticated when token or user id is missing', async () => {
        mockGetAuthToken.mockResolvedValue(undefined);
        mockGetUserId.mockResolvedValue('user-id');
        const auth = useAuth();

        await expect(auth.isAuthenticated()).resolves.toBe(false);
    });

    test('returns token and user id from storage helpers', async () => {
        mockGetAuthToken.mockResolvedValue('auth-token');
        mockGetUserId.mockResolvedValue('user-id');
        const auth = useAuth();

        await expect(auth.getToken()).resolves.toBe('auth-token');
        await expect(auth.getCurrentUserId()).resolves.toBe('user-id');
    });

    test('logout signs out from Supabase and clears local auth data', async () => {
        const auth = useAuth();
        await auth.logout();

        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
        expect(mockClearAuthData).toHaveBeenCalledTimes(1);
    });

    test('logout continues with local cleanup when Supabase signOut returns an error', async () => {
        mockSignOut.mockResolvedValue({
            error: {
                message: 'Session already expired',
            },
        });
        const auth = useAuth();

        await auth.logout();

        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(mockClearAuthData).toHaveBeenCalledTimes(1);
    });

    test('logout swallows signOut exceptions and still clears auth data', async () => {
        mockSignOut.mockRejectedValue(new Error('Network unavailable'));
        const auth = useAuth();

        await auth.logout();

        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(mockClearAuthData).toHaveBeenCalledTimes(1);
    });
});

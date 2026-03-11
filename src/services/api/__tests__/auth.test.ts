/**
 * Tests for src/services/api/auth.ts
 *
 * Covers: login, signup, refreshToken, requestPasswordReset, getAuthToken
 * Auth uses the Supabase JS SDK – not the custom apiWrapper.
 */

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../../supabaseClient', () => ({
    requireSupabaseClient: () => ({
        auth: {
            signInWithPassword: mockSignInWithPassword,
            signUp: mockSignUp,
            getSession: mockGetSession,
            refreshSession: mockRefreshSession,
            resetPasswordForEmail: mockResetPasswordForEmail,
            getUser: mockGetUser,
        },
    }),
}));

jest.mock('../../../utils/storage', () => ({
    setAuthToken: jest.fn(),
    setRefreshToken: jest.fn(),
    setUserId: jest.fn(),
    getAuthToken: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../utils/errors', () => ({ handleError: jest.fn() }));

import { login, signup, refreshToken, requestPasswordReset } from '../auth';

const MOCK_USER = { id: 'user-1', email: 'test@example.com', user_metadata: { name: 'Test User' } };
const MOCK_SESSION = { access_token: 'token-abc', refresh_token: 'refresh-xyz', expires_in: 3600 };

describe('auth – login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns success with AuthResponse on valid credentials', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null });

        const result = await login({ email: ' Test@Example.com ', password: 'secret' });

        expect(result.success).toBe(true);
        expect(result.data?.user.email).toBe('test@example.com');
        expect(result.data?.token).toBe('token-abc');
    });

    it('normalises email to lowercase before sending', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null });

        await login({ email: ' CAPS@EXAMPLE.COM ', password: 'p' });

        expect(mockSignInWithPassword).toHaveBeenCalledWith(expect.objectContaining({ email: 'caps@example.com' }));
    });

    it('returns error when email or password is empty', async () => {
        const result = await login({ email: '', password: '' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('INVALID_CREDENTIALS');
        expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('returns error when Supabase auth fails', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
        });

        const result = await login({ email: 'a@b.com', password: 'wrong' });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Invalid login credentials');
    });
});

describe('auth – signup', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns error when passwords do not match', async () => {
        const result = await signup({ name: 'Ali', email: 'a@b.com', password: 'abc', confirmPassword: 'xyz' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PASSWORD_MISMATCH');
        expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('returns EMAIL_VERIFICATION_REQUIRED when session is absent after signup', async () => {
        mockSignUp.mockResolvedValueOnce({ data: { user: MOCK_USER, session: null }, error: null });

        const result = await signup({ name: 'Ali', email: 'a@b.com', password: 'pass', confirmPassword: 'pass' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('EMAIL_VERIFICATION_REQUIRED');
    });
});

describe('auth – refreshToken', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns NO_REFRESH_TOKEN error when session is absent', async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

        const result = await refreshToken();

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NO_REFRESH_TOKEN');
    });

    it('returns new tokens on success', async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: { refresh_token: 'old-refresh' } }, error: null });
        mockRefreshSession.mockResolvedValueOnce({ data: { user: MOCK_USER, session: MOCK_SESSION }, error: null });

        const result = await refreshToken();

        expect(result.success).toBe(true);
        expect(result.data?.token).toBe('token-abc');
    });
});

describe('auth – requestPasswordReset', () => {
    it('returns error for empty email', async () => {
        const result = await requestPasswordReset('');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('INVALID_EMAIL');
    });

    it('calls resetPasswordForEmail with the correct redirect URL', async () => {
        mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

        await requestPasswordReset('user@example.com');

        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
            'user@example.com',
            expect.objectContaining({ redirectTo: expect.stringContaining('nutrihealth://callback') }),
        );
    });
});

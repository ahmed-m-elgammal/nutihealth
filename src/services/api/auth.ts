import type { ApiResponse } from './types';
import { handleError } from '../../utils/errors';
import {
    clearAuthData,
    getAuthToken as getStoredAuthToken,
    setAuthToken,
    setRefreshToken,
    setUserId,
} from '../../utils/storage';
import { requireSupabaseClient } from '../supabaseClient';

/**
 * Authentication request interfaces
 */
interface LoginRequest {
    email: string;
    password: string;
}

interface SignupRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface AuthResponse {
    user: {
        id: string;
        name: string;
        email: string;
    };
    token: string;
    refreshToken: string;
    expiresIn: number; // seconds
}

const toAuthResponse = (
    user: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
    },
    session: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
    },
): AuthResponse => {
    const metadataName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null;
    const metadataFullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;

    return {
        user: {
            id: user.id,
            name: metadataName || metadataFullName || user.email || 'User',
            email: user.email || '',
        },
        token: session.access_token,
        refreshToken: session.refresh_token || '',
        expiresIn: session.expires_in || 0,
    };
};

const persistAuthResponse = async (authData: AuthResponse): Promise<void> => {
    await setAuthToken(authData.token);
    await setRefreshToken(authData.refreshToken);
    await setUserId(authData.user.id);
};

/**
 * Login user with email and password
 */
export async function login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
        const normalizedEmail = credentials.email.trim().toLowerCase();
        if (!normalizedEmail || !credentials.password) {
            return {
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email and password are required',
                },
            };
        }

        const supabase = requireSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: credentials.password,
        });

        if (error || !data.session || !data.user) {
            return {
                success: false,
                error: {
                    code: error?.code || 'LOGIN_FAILED',
                    message: error?.message || 'Failed to login. Please verify your credentials.',
                },
            };
        }

        const authData = toAuthResponse(data.user, data.session);
        await persistAuthResponse(authData);

        return {
            success: true,
            data: authData,
        };
    } catch (error) {
        handleError(error, 'auth.login');
        return {
            success: false,
            error: {
                code: 'LOGIN_FAILED',
                message: 'Failed to login. Please try again.',
            },
        };
    }
}

/**
 * Sign up new user
 */
export async function signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    try {
        if (data.password !== data.confirmPassword) {
            return {
                success: false,
                error: {
                    code: 'PASSWORD_MISMATCH',
                    message: 'Passwords do not match',
                },
            };
        }

        const normalizedEmail = data.email.trim().toLowerCase();
        if (!normalizedEmail || !data.password.trim()) {
            return {
                success: false,
                error: {
                    code: 'INVALID_SIGNUP_DATA',
                    message: 'Email and password are required',
                },
            };
        }

        const supabase = requireSupabaseClient();
        const { data: signupResult, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: data.password,
            options: {
                data: {
                    name: data.name.trim(),
                },
            },
        });

        if (error) {
            return {
                success: false,
                error: {
                    code: error.code || 'SIGNUP_FAILED',
                    message: error.message,
                },
            };
        }

        if (!signupResult.user || !signupResult.session) {
            return {
                success: false,
                error: {
                    code: 'EMAIL_VERIFICATION_REQUIRED',
                    message: 'Account created. Please verify your email before signing in.',
                },
            };
        }

        const authData = toAuthResponse(signupResult.user, signupResult.session);
        await persistAuthResponse(authData);

        return {
            success: true,
            data: authData,
        };
    } catch (error) {
        handleError(error, 'auth.signup');
        return {
            success: false,
            error: {
                code: 'SIGNUP_FAILED',
                message: 'Failed to create account. Please try again.',
            },
        };
    }
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
    try {
        const supabase = requireSupabaseClient();
        await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
        handleError(error, 'auth.logout');
    } finally {
        await clearAuthData();
    }
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<ApiResponse<AuthResponse>> {
    try {
        const supabase = requireSupabaseClient();
        const {
            data: { session: existingSession },
        } = await supabase.auth.getSession();

        const existingRefreshToken = existingSession?.refresh_token;
        if (!existingRefreshToken) {
            return {
                success: false,
                error: {
                    code: 'NO_REFRESH_TOKEN',
                    message: 'No refresh token available',
                },
            };
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: existingRefreshToken,
        });

        if (error || !data.session || !data.user) {
            return {
                success: false,
                error: {
                    code: error?.code || 'REFRESH_FAILED',
                    message: error?.message || 'Failed to refresh token',
                },
            };
        }

        const authData = toAuthResponse(data.user, data.session);
        await persistAuthResponse(authData);

        return {
            success: true,
            data: authData,
        };
    } catch (error) {
        handleError(error, 'auth.refreshToken');
        return {
            success: false,
            error: {
                code: 'REFRESH_FAILED',
                message: 'Failed to refresh token',
            },
        };
    }
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            return {
                success: false,
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'Email is required',
                },
            };
        }

        const supabase = requireSupabaseClient();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            // Route password recovery links back into the native app.
            redirectTo: 'nutrihealth://callback?type=recovery',
        });

        if (error) {
            return {
                success: false,
                error: {
                    code: error.code || 'REQUEST_FAILED',
                    message: error.message,
                },
            };
        }

        return { success: true };
    } catch (error) {
        handleError(error, 'auth.requestPasswordReset');
        return {
            success: false,
            error: {
                code: 'REQUEST_FAILED',
                message: 'Failed to request password reset',
            },
        };
    }
}

/**
 * Get current auth token
 */
export async function getAuthToken(): Promise<string | null> {
    try {
        const supabase = requireSupabaseClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token || (await getStoredAuthToken());
        return token ?? null;
    } catch (error) {
        handleError(error, 'auth.getAuthToken');
        return null;
    }
}

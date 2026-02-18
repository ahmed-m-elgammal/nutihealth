import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from './client';
import { handleError } from '../../utils/errors';

/**
 * Authentication Service
 * 
 * OFFLINE-FIRST MODE:
 * This service is structured and ready for backend integration,
 * but currently inactive. The app operates in offline-first mode
 * without user authentication.
 * 
 * TO ENABLE:
 * 1. Implement backend authentication endpoints
 * 2. Uncomment and configure API calls
 * 3. Add proper error handling and validation
 */

// Secure storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'user_id';

/**
 * Authentication request interfaces
 */
export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface AuthResponse {
    user: {
        id: string;
        name: string;
        email: string;
    };
    token: string;
    refreshToken: string;
    expiresIn: number; // seconds
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface VerifyEmailRequest {
    email: string;
    code: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
}

/**
 * Login user with email and password
 * 
 * @param credentials - Email and password
 * @returns Authentication response with user data and tokens
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

        // OFFLINE-FIRST: backend auth is intentionally disabled.
        return {
            success: false,
            error: {
                code: 'OFFLINE_MODE',
                message: 'Authentication is disabled in offline-first mode',
            },
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
 * 
 * @param data - User registration data
 * @returns Authentication response with user data and tokens
 */
export async function signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    try {
        // Validate password match
        if (data.password !== data.confirmPassword) {
            return {
                success: false,
                error: {
                    code: 'PASSWORD_MISMATCH',
                    message: 'Passwords do not match',
                },
            };
        }

        // OFFLINE-FIRST: backend auth is intentionally disabled.
        return {
            success: false,
            error: {
                code: 'OFFLINE_MODE',
                message: 'Authentication is disabled in offline-first mode',
            },
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
        // Clear tokens from secure storage
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_ID_KEY);
    } catch (error) {
        handleError(error, 'auth.logout');
    }
}

/**
 * Refresh authentication token
 * 
 * @returns New authentication tokens
 */
export async function refreshToken(): Promise<ApiResponse<AuthResponse>> {
    try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
            return {
                success: false,
                error: {
                    code: 'NO_REFRESH_TOKEN',
                    message: 'No refresh token available',
                },
            };
        }

        // OFFLINE-FIRST: backend auth is intentionally disabled.
        return {
            success: false,
            error: {
                code: 'OFFLINE_MODE',
                message: 'Token refresh is disabled in offline-first mode',
            },
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
 * 
 * @param email - User email
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    try {
        if (!email.trim()) {
            return {
                success: false,
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'Email is required',
                },
            };
        }

        return {
            success: false,
            error: {
                code: 'OFFLINE_MODE',
                message: 'Password reset is disabled in offline-first mode',
            },
        };
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
 * Reset password with code from email
 * 
 * @param data - Reset password data
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<void>> {
    try {
        if (!data.code.trim() || !data.newPassword.trim()) {
            return {
                success: false,
                error: {
                    code: 'INVALID_RESET_DATA',
                    message: 'Reset code and new password are required',
                },
            };
        }

        return {
            success: false,
            error: {
                code: 'OFFLINE_MODE',
                message: 'Password reset is disabled in offline-first mode',
            },
        };
    } catch (error) {
        handleError(error, 'auth.resetPassword');
        return {
            success: false,
            error: {
                code: 'RESET_FAILED',
                message: 'Failed to reset password',
            },
        };
    }
}

/**
 * Get current auth token
 * 
 * @returns Auth token or null
 */
export async function getAuthToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
        handleError(error, 'auth.getAuthToken');
        return null;
    }
}

/**
 * Check if user is authenticated
 * 
 * @returns True if user has valid token
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const token = await getAuthToken();
        return token !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Store authentication tokens securely
 * 
 * @param authData - Authentication response data
 */
export async function storeAuthTokens(authData: AuthResponse): Promise<void> {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, authData.token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, authData.refreshToken);
        await SecureStore.setItemAsync(USER_ID_KEY, authData.user.id);
    } catch (error) {
        handleError(error, 'auth.storeAuthTokens');
        throw new Error('Failed to store authentication tokens');
    }
}

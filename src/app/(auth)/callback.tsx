import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { requireSupabaseClient } from '../../services/supabaseClient';
import { setAuthToken, setRefreshToken, setUserId } from '../../utils/storage';
import { useUserStore } from '../../store/userStore';

type CallbackParams = {
    type?: string | string[];
    code?: string | string[];
    token_hash?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
};

const asSingle = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
        return value[0] || '';
    }

    return value || '';
};

const decodeQueryValue = (value: string): string => {
    try {
        return decodeURIComponent(value.replace(/\+/g, '%20'));
    } catch {
        return value;
    }
};

const parseParamsFromDeepLink = (url: string): Record<string, string> => {
    const parsed = Linking.parse(url);
    const result: Record<string, string> = {};
    const queryParams = parsed.queryParams || {};

    for (const [key, rawValue] of Object.entries(queryParams)) {
        if (typeof rawValue === 'string' && rawValue) {
            result[key] = rawValue;
        }
    }

    const hashIndex = url.indexOf('#');
    if (hashIndex >= 0) {
        const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
        hashParams.forEach((value, key) => {
            if (value) {
                result[key] = value;
            }
        });
    }

    return result;
};

export default function AuthCallbackScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<CallbackParams>();
    const { error: showErrorToast, success: showSuccessToast } = useToast();
    const loadUser = useUserStore((state) => state.loadUser);

    const [isVerifyingLink, setIsVerifyingLink] = useState(true);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const typeParam = asSingle(params.type);
    const codeParam = asSingle(params.code);
    const tokenHashParam = asSingle(params.token_hash);
    const accessTokenParam = asSingle(params.access_token);
    const refreshTokenParam = asSingle(params.refresh_token);
    const errorParam = asSingle(params.error);
    const errorDescriptionParam = asSingle(params.error_description);

    useEffect(() => {
        let isMounted = true;

        const initializeRecoverySession = async () => {
            setIsVerifyingLink(true);
            setErrorMessage(null);

            try {
                const supabase = requireSupabaseClient();
                const routeParams: Record<string, string> = {};

                if (typeParam) routeParams.type = typeParam;
                if (codeParam) routeParams.code = codeParam;
                if (tokenHashParam) routeParams.token_hash = tokenHashParam;
                if (accessTokenParam) routeParams.access_token = accessTokenParam;
                if (refreshTokenParam) routeParams.refresh_token = refreshTokenParam;
                if (errorParam) routeParams.error = errorParam;
                if (errorDescriptionParam) routeParams.error_description = errorDescriptionParam;

                const initialUrl = await Linking.getInitialURL();
                const deepLinkParams = initialUrl ? parseParamsFromDeepLink(initialUrl) : {};
                const mergedParams = { ...deepLinkParams, ...routeParams };

                const callbackError = mergedParams.error_description || mergedParams.error;
                if (callbackError) {
                    throw new Error(decodeQueryValue(callbackError));
                }

                const callbackType = mergedParams.type || 'recovery';
                if (callbackType !== 'recovery') {
                    throw new Error('Unsupported auth callback type.');
                }

                if (mergedParams.code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(mergedParams.code);
                    if (error) {
                        throw new Error(error.message);
                    }
                } else if (mergedParams.token_hash) {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: mergedParams.token_hash,
                        type: 'recovery',
                    });
                    if (error) {
                        throw new Error(error.message);
                    }
                } else if (mergedParams.access_token && mergedParams.refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token: mergedParams.access_token,
                        refresh_token: mergedParams.refresh_token,
                    });
                    if (error) {
                        throw new Error(error.message);
                    }
                } else {
                    throw new Error('Invalid or expired recovery link. Request a new password reset email.');
                }

                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError || !session?.user) {
                    throw new Error(sessionError?.message || 'Could not establish a password recovery session.');
                }

                await Promise.all([
                    setAuthToken(session.access_token),
                    setRefreshToken(session.refresh_token),
                    setUserId(session.user.id),
                ]);
                await loadUser();

                if (!isMounted) return;
                setIsRecoverySessionReady(true);
                showSuccessToast('Recovery link verified. Enter your new password.');
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'We could not verify the reset link. Please request a new password reset email.';
                if (!isMounted) return;
                setErrorMessage(message);
                showErrorToast(message);
            } finally {
                if (!isMounted) return;
                setIsVerifyingLink(false);
            }
        };

        initializeRecoverySession().catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [
        accessTokenParam,
        codeParam,
        errorDescriptionParam,
        errorParam,
        loadUser,
        refreshTokenParam,
        showErrorToast,
        showSuccessToast,
        tokenHashParam,
        typeParam,
    ]);

    const handleSetNewPassword = async () => {
        if (isSubmittingPassword || !isRecoverySessionReady) return;

        const trimmedPassword = newPassword.trim();
        const trimmedConfirmation = confirmPassword.trim();

        if (!trimmedPassword || trimmedPassword.length < 8) {
            setErrorMessage('Password must be at least 8 characters.');
            return;
        }

        if (trimmedPassword !== trimmedConfirmation) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setErrorMessage(null);
        setIsSubmittingPassword(true);

        try {
            const supabase = requireSupabaseClient();
            const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
            if (error) {
                throw new Error(error.message);
            }

            showSuccessToast('Password updated successfully.');
            router.replace('/(tabs)');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update your password right now.';
            setErrorMessage(message);
            showErrorToast(message);
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    if (isVerifyingLink) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
                <ActivityIndicator size="large" color="#22c55e" />
                <Text className="mt-4 text-center text-base text-neutral-600">Verifying reset link...</Text>
            </SafeAreaView>
        );
    }

    if (!isRecoverySessionReady) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
                <Text className="mb-3 text-center text-2xl font-bold text-neutral-900">Reset Link Error</Text>
                <Text className="mb-6 text-center text-base text-neutral-600">
                    {errorMessage || 'This recovery link is invalid or expired.'}
                </Text>
                <TouchableOpacity
                    className="rounded-xl bg-[#22c55e] px-5 py-3"
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text className="font-bold text-white">Back to Login</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 justify-center bg-white px-6">
            <View>
                <Text className="mb-2 text-3xl font-bold text-neutral-900">Set New Password</Text>
                <Text className="mb-8 text-neutral-500">Choose a strong password to secure your account.</Text>

                <TextInput
                    placeholder="New Password"
                    secureTextEntry
                    className="mb-4 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={newPassword}
                    onChangeText={setNewPassword}
                />
                <TextInput
                    placeholder="Confirm New Password"
                    secureTextEntry
                    className="mb-6 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                    className="mb-4 items-center rounded-xl bg-[#22c55e] p-4"
                    onPress={() => {
                        handleSetNewPassword().catch(() => undefined);
                    }}
                    disabled={isSubmittingPassword}
                >
                    {isSubmittingPassword ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text className="text-lg font-bold text-white">Update Password</Text>
                    )}
                </TouchableOpacity>

                {errorMessage ? <Text className="text-sm text-red-500">{errorMessage}</Text> : null}
            </View>
        </SafeAreaView>
    );
}

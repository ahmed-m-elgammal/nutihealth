import React from 'react';
import {
    Alert,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, CheckCircle2 } from 'lucide-react-native';
import { login, requestPasswordReset } from '../../services/api/auth';
import { useToast } from '../../hooks/useToast';
import { usePostHog } from 'posthog-react-native';

export default function LoginScreen() {
    const router = useRouter();
    const { error: showErrorToast, success: showSuccessToast } = useToast();
    const posthog = usePostHog();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isResettingPassword, setIsResettingPassword] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleLogin = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            const response = await login({ email, password });
            if (!response.success) {
                const message = response.error?.message || 'Unable to sign in.';
                setErrorMessage(message);
                showErrorToast(message);
                posthog.capture('login_failed', { error_message: message });
                return;
            }

            const userId = response.data?.user.id;
            if (userId) {
                const setProps: Record<string, string> = {};
                if (response.data?.user.email) {
                    setProps.email = response.data.user.email;
                }
                if (response.data?.user.name) {
                    setProps.name = response.data.user.name;
                }

                posthog.identify(userId, {
                    $set: setProps,
                    $set_once: { first_login_date: new Date().toISOString() },
                });
            }
            posthog.capture('user_logged_in', { method: 'email' });
            router.replace('/(tabs)');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to sign in right now.';
            setErrorMessage(message);
            showErrorToast(message);
            posthog.capture('login_failed', { error_message: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async () => {
        if (isResettingPassword) {
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setErrorMessage('Enter your email first, then tap Forgot Password.');
            return;
        }

        if (__DEV__) {
            // Temporary interaction audit log for touch verification.
            // eslint-disable-next-line no-console
            console.log('[Login] Forgot password pressed', { email: normalizedEmail });
        }

        setErrorMessage(null);
        setIsResettingPassword(true);

        try {
            const response = await requestPasswordReset(normalizedEmail);
            if (!response.success) {
                const message = response.error?.message || 'Unable to request password reset right now.';
                setErrorMessage(message);
                showErrorToast(message);
                return;
            }

            posthog.capture('password_reset_requested', { email: normalizedEmail });
            showSuccessToast('Password reset email sent.');
            Alert.alert('Check your email', `Password reset instructions were sent to ${normalizedEmail}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to request password reset right now.';
            setErrorMessage(message);
            showErrorToast(message);
        } finally {
            setIsResettingPassword(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-8"
            >
                {/* Branding */}
                <View className="mb-10 items-center">
                    <View className="mb-4 h-20 w-20 rotate-3 items-center justify-center rounded-3xl bg-primary-50">
                        <CheckCircle2 size={40} color="#22c55e" />
                    </View>
                    <Text className="text-3xl font-bold text-neutral-900">Welcome Back</Text>
                    <Text className="mt-2 text-center text-neutral-500">
                        Sign in to continue your healthy journey with NutriHealth
                    </Text>
                </View>

                {/* Form */}
                <View className="space-y-4">
                    <View className="flex-row items-center rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                        <Mail size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Email Address"
                            className="ml-3 flex-1 text-base text-neutral-900"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View className="mb-2 flex-row items-center rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                        <Lock size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Password"
                            secureTextEntry
                            className="ml-3 flex-1 text-base text-neutral-900"
                            placeholderTextColor="#9ca3af"
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        className="mb-4 self-end"
                        onPress={() => {
                            handleForgotPassword().catch(() => undefined);
                        }}
                        disabled={isResettingPassword}
                    >
                        <Text className="text-sm font-medium text-primary-600">
                            {isResettingPassword ? 'Sending reset email...' : 'Forgot Password?'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="items-center rounded-2xl bg-primary-500 p-4 shadow-md shadow-primary-500/20"
                        onPress={handleLogin}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-lg font-bold text-white">Log In</Text>
                        )}
                    </TouchableOpacity>

                    {errorMessage ? <Text className="text-sm text-red-500">{errorMessage}</Text> : null}
                </View>

                {/* Footer */}
                <TouchableOpacity onPress={() => router.push('/(auth)/register')} className="mt-8 items-center">
                    <Text className="text-neutral-500">
                        Don't have an account? <Text className="font-bold text-primary-600">Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signup } from '../../services/api/auth';
import { useToast } from '../../hooks/useToast';
import { usePostHog } from 'posthog-react-native';

export default function RegisterScreen() {
    const router = useRouter();
    const { error: showErrorToast, success: showSuccessToast } = useToast();
    const posthog = usePostHog();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleRegister = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage(null);

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
            const message = 'Name, email, password, and confirmation are required.';
            setErrorMessage(message);
            showErrorToast(message);
            return;
        }

        if (password !== confirmPassword) {
            const message = 'Passwords do not match.';
            setErrorMessage(message);
            showErrorToast(message);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await signup({
                name: trimmedName,
                email: trimmedEmail,
                password,
                confirmPassword,
            });

            if (!response.success) {
                const message = response.error?.message || 'Unable to create account.';
                setErrorMessage(message);
                showErrorToast(message);
                return;
            }

            const userId = response.data?.user.id;
            if (userId) {
                posthog.identify(userId, {
                    $set: { email: trimmedEmail, name: trimmedName },
                    $set_once: { signup_date: new Date().toISOString() },
                });
            }
            posthog.capture('user_signed_up', { method: 'email' });
            showSuccessToast('Account created successfully.');
            router.replace('/onboarding/welcome');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to create account.';
            setErrorMessage(message);
            showErrorToast(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 justify-center bg-white p-6">
            <View>
                <Text className="mb-2 text-3xl font-bold text-gray-900">Create Account</Text>
                <Text className="mb-8 text-gray-500">Start your journey to a better you</Text>

                <TextInput
                    placeholder="Full Name"
                    className="mb-4 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    placeholder="Email"
                    className="mb-4 rounded-xl bg-gray-100 p-4 text-gray-900"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    className="mb-4 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={password}
                    onChangeText={setPassword}
                />
                <TextInput
                    placeholder="Confirm Password"
                    secureTextEntry
                    className="mb-6 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                    className="mb-4 items-center rounded-xl bg-[#22c55e] p-4"
                    onPress={handleRegister}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text className="text-lg font-bold text-white">Sign Up</Text>
                    )}
                </TouchableOpacity>

                {errorMessage ? <Text className="mb-4 text-sm text-red-500">{errorMessage}</Text> : null}

                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-center text-gray-500">
                        Already have an account? <Text className="font-bold text-[#22c55e]">Log In</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

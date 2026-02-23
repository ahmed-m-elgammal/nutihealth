import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signup } from '../../services/api/auth';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleRegister = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            const response = await signup({
                name,
                email,
                password,
                confirmPassword: password,
            });

            if (!response.success) {
                setErrorMessage(response.error?.message || 'Unable to create account.');
                return;
            }

            router.replace('/onboarding/welcome');
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
                    className="mb-6 rounded-xl bg-gray-100 p-4 text-gray-900"
                    value={password}
                    onChangeText={setPassword}
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

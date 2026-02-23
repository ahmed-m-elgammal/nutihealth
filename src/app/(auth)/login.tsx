import React from 'react';
import {
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
import { login } from '../../services/api/auth';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
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
                setErrorMessage(response.error?.message || 'Unable to sign in.');
                return;
            }

            router.replace('/(tabs)');
        } finally {
            setIsSubmitting(false);
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

                    <TouchableOpacity className="mb-4 self-end">
                        <Text className="text-sm font-medium text-primary-600">Forgot Password?</Text>
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

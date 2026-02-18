import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, CheckCircle2 } from 'lucide-react-native';

export default function LoginScreen() {
    const router = useRouter();

    const handleLogin = () => {
        // Navigate to tabs
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-8"
            >
                {/* Branding */}
                <View className="items-center mb-10">
                    <View className="w-20 h-20 bg-primary-50 rounded-3xl items-center justify-center mb-4 rotate-3">
                        <CheckCircle2 size={40} color="#22c55e" />
                    </View>
                    <Text className="text-3xl font-bold text-neutral-900">Welcome Back</Text>
                    <Text className="text-neutral-500 mt-2 text-center">Sign in to continue your healthy journey with NutriHealth</Text>
                </View>

                {/* Form */}
                <View className="space-y-4">
                    <View className="bg-neutral-50 rounded-2xl px-4 py-3 flex-row items-center border border-neutral-100">
                        <Mail size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Email Address"
                            className="flex-1 ml-3 text-neutral-900 text-base"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                        />
                    </View>

                    <View className="bg-neutral-50 rounded-2xl px-4 py-3 flex-row items-center border border-neutral-100 mb-2">
                        <Lock size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Password"
                            secureTextEntry
                            className="flex-1 ml-3 text-neutral-900 text-base"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <TouchableOpacity className="self-end mb-4">
                        <Text className="text-primary-600 font-medium text-sm">Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-primary-500 p-4 rounded-2xl items-center shadow-md shadow-primary-500/20"
                        onPress={handleLogin}
                    >
                        <Text className="text-white font-bold text-lg">Log In</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.push('/(auth)/register')}
                    className="mt-8 items-center"
                >
                    <Text className="text-neutral-500">
                        Don't have an account? <Text className="text-primary-600 font-bold">Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

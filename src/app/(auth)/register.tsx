import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white p-6 justify-center">
            <View>
                <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
                <Text className="text-gray-500 mb-8">Start your journey to a better you</Text>

                <TextInput placeholder="Full Name" className="bg-gray-100 p-4 rounded-xl mb-4 text-gray-900" />
                <TextInput placeholder="Email" className="bg-gray-100 p-4 rounded-xl mb-4 text-gray-900" />
                <TextInput placeholder="Password" secureTextEntry className="bg-gray-100 p-4 rounded-xl mb-6 text-gray-900" />

                <TouchableOpacity
                    className="bg-[#22c55e] p-4 rounded-xl items-center mb-4"
                    onPress={() => router.replace('/onboarding/welcome')}
                >
                    <Text className="text-white font-bold text-lg">Sign Up</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-center text-gray-500">
                        Already have an account? <Text className="text-[#22c55e] font-bold">Log In</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">Let's get to know you</Text>
                <Text className="text-gray-500 text-center mb-8">We need some details to personalize your plan.</Text>

                <View className="space-y-4">
                    {/* Placeholders for inputs */}
                    <View className="bg-gray-100 p-4 rounded-xl">
                        <Text className="text-gray-400">Your Goal</Text>
                    </View>
                    <View className="bg-gray-100 p-4 rounded-xl">
                        <Text className="text-gray-400">Activity Level</Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-[#22c55e] p-4 rounded-xl items-center mt-8"
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text className="text-white font-bold text-lg">Finish Setup</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

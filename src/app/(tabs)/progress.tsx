import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProgressScreen() {
    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
            <Text className="text-2xl font-bold">Your Progress</Text>
            <Text className="text-gray-500 mt-2">Charts and stats will appear here.</Text>
        </SafeAreaView>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';

export default function FoodSearchScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="p-4 border-b border-gray-100 flex-row items-center gap-3">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <View className="flex-1 bg-gray-100 rounded-full flex-row items-center px-4 py-2">
                    <Search size={20} color="gray" />
                    <TextInput
                        placeholder="Search for food..."
                        className="flex-1 ml-2 text-base"
                        autoFocus
                    />
                </View>
            </View>

            <View className="p-4 items-center justify-center flex-1">
                <Text className="text-gray-400">Start typing to search...</Text>
            </View>
        </SafeAreaView>
    );
}

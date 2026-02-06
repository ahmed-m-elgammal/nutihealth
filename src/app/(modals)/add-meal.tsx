import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

export default function AddMealModal() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-4">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold">Add Meal</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X size={24} color="black" />
                </TouchableOpacity>
            </View>

            <Text className="text-gray-500">Search or scan food to add to your diary.</Text>

            {/* Options */}
            <View className="mt-8 space-y-4">
                <TouchableOpacity
                    className="flex-row items-center bg-gray-50 p-4 rounded-xl"
                    onPress={() => router.push('/(modals)/food-search')}
                >
                    <Text className="font-semibold text-lg">Search Food</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center bg-gray-50 p-4 rounded-xl"
                    onPress={() => router.push('/(modals)/barcode-scanner')}
                >
                    <Text className="font-semibold text-lg">Scan Barcode</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center bg-gray-50 p-4 rounded-xl"
                    onPress={() => router.push('/(modals)/ai-food-detect')}
                >
                    <Text className="font-semibold text-lg">AI Food Detection</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

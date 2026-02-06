import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Camera } from 'lucide-react-native';

export default function AIFoodDetectScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-4">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold">AI Food Detection</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X size={24} color="black" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl m-4 bg-gray-50">
                <Camera size={64} color="#9CA3AF" />
                <Text className="text-gray-400 mt-4 text-center">Take a photo of your meal</Text>
            </View>

            <TouchableOpacity className="bg-[#22c55e] p-4 rounded-xl items-center mb-8">
                <Text className="text-white font-bold text-lg">Take Photo</Text>
            </TouchableOpacity>
        </View>
    );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Plus, TrendingUp } from 'lucide-react-native';
import CalorieCircle from '../../components/charts/CalorieCircle';
import ProgressBar from '../../components/charts/ProgressBar';

export default function WaterScreen() {
    const [currentIntake, setCurrentIntake] = useState(1500); // ml
    const targetIntake = 2500; // ml
    const glassSize = 250; // ml

    const addWater = (amount: number) => {
        setCurrentIntake(prev => Math.min(prev + amount, targetIntake + 1000));
    };

    const waterPercentage = Math.round((currentIntake / targetIntake) * 100);
    const glassesConsumed = Math.floor(currentIntake / glassSize);
    const totalGlasses = Math.ceil(targetIntake / glassSize);

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="px-6 pt-4 pb-6">
                    <Text className="text-3xl font-bold text-neutral-900">Hydration</Text>
                    <Text className="text-neutral-500 mt-1">Stay healthy, drink water 💧</Text>
                </View>

                {/* Water Intake Card */}
                <View className="mx-6 bg-teal-600 rounded-3xl p-6 mb-8 shadow-xl items-center">
                    <Text className="text-white/90 font-medium mb-4">Today's Water Intake</Text>
                    <CalorieCircle
                        current={currentIntake}
                        target={targetIntake}
                        size={180}
                    />
                    <View className="mt-4 items-center">
                        <Text className="text-white text-2xl font-bold">{currentIntake}ml</Text>
                        <Text className="text-white/80 text-sm">of {targetIntake}ml goal</Text>
                    </View>
                </View>

                {/* Quick Add Water */}
                <View className="mx-6 mb-8">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Quick Add</Text>
                    <View className="flex-row justify-between gap-3">
                        <TouchableOpacity
                            onPress={() => addWater(250)}
                            className="flex-1 bg-teal-500 rounded-2xl p-4 items-center shadow-md active:opacity-80"
                        >
                            <Droplets size={28} color="white" />
                            <Text className="text-white font-bold text-lg mt-2">250ml</Text>
                            <Text className="text-white/80 text-xs">Glass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => addWater(500)}
                            className="flex-1 bg-teal-600 rounded-2xl p-4 items-center shadow-md active:opacity-80"
                        >
                            <Droplets size={28} color="white" />
                            <Text className="text-white font-bold text-lg mt-2">500ml</Text>
                            <Text className="text-white/80 text-xs">Bottle</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => addWater(1000)}
                            className="flex-1 bg-teal-700 rounded-2xl p-4 items-center shadow-md active:opacity-80"
                        >
                            <Droplets size={28} color="white" />
                            <Text className="text-white font-bold text-lg mt-2">1L</Text>
                            <Text className="text-white/80 text-xs">Large</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress Details */}
                <View className="mx-6 bg-white rounded-3xl p-6 mb-8 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Progress Details</Text>

                    <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-neutral-100">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-3">
                                <Droplets size={20} color="#0d9488" />
                            </View>
                            <View>
                                <Text className="text-neutral-900 font-semibold">Glasses Today</Text>
                                <Text className="text-neutral-500 text-sm">{glassesConsumed} of {totalGlasses} glasses</Text>
                            </View>
                        </View>
                        <Text className="text-teal-600 font-bold text-xl">{glassesConsumed}</Text>
                    </View>

                    <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-neutral-100">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <TrendingUp size={20} color="#3b82f6" />
                            </View>
                            <View>
                                <Text className="text-neutral-900 font-semibold">Completion</Text>
                                <Text className="text-neutral-500 text-sm">Daily goal progress</Text>
                            </View>
                        </View>
                        <Text className="text-blue-600 font-bold text-xl">{waterPercentage}%</Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
                                <Plus size={20} color="#059669" />
                            </View>
                            <View>
                                <Text className="text-neutral-900 font-semibold">Remaining</Text>
                                <Text className="text-neutral-500 text-sm">To reach your goal</Text>
                            </View>
                        </View>
                        <Text className="text-emerald-600 font-bold text-xl">
                            {Math.max(0, targetIntake - currentIntake)}ml
                        </Text>
                    </View>
                </View>

                {/* Hydration Tips */}
                <View className="mx-6 bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-100">
                    <Text className="text-blue-900 font-bold text-base mb-2">💡 Hydration Tip</Text>
                    <Text className="text-blue-700 text-sm leading-5">
                        Drinking water regularly throughout the day helps maintain energy levels and supports overall health.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

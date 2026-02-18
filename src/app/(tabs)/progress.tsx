import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingDown, Camera, Target, Award, Flame, Droplet, Activity } from 'lucide-react-native';
import { format } from 'date-fns';
import { useWeightHistory, useCalorieHistory } from '../../query/queries/useProgress';
import { useUserStore } from '../../store/userStore';

export default function ProgressScreen() {
    const { user } = useUserStore();
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

    // Real data hooks
    const { data: weightHistory = [] } = useWeightHistory(user?.id);
    const { data: calorieHistory = [] } = useCalorieHistory(user?.id);

    const currentWeight = user?.weight || 0;
    const goalWeight = user?.targetWeight || currentWeight;

    // Calculate stats
    const startWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : currentWeight;
    const weightChange = currentWeight - startWeight;
    const totalToLose = startWeight - goalWeight;
    const progressPercentage = totalToLose !== 0 ? ((startWeight - currentWeight) / totalToLose) * 100 : 0;

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            {/* Header */}
            <View className="bg-white px-6 py-4 border-b border-neutral-100 shadow-sm">
                <Text className="text-2xl font-bold text-neutral-900">Your Progress</Text>
                <Text className="text-neutral-500 text-sm mt-1">Track your wellness journey</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {/* Weight Progress Card */}
                <View className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-6 mb-6 shadow-xl">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white font-bold text-lg">Weight Progress</Text>
                        <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center gap-1">
                            <TrendingDown size={14} color="white" />
                            <Text className="text-white text-xs font-medium">{Math.abs(weightChange).toFixed(1)} kg</Text>
                        </View>
                    </View>

                    <View className="flex-row items-end justify-between mb-6">
                        <View>
                            <Text className="text-white/70 text-sm mb-1">Current</Text>
                            <Text className="text-white font-bold text-4xl">{currentWeight}</Text>
                            <Text className="text-white/70 text-sm">kg</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-white/70 text-xs mb-1">Goal</Text>
                            <Text className="text-white font-semibold text-xl">{goalWeight} kg</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="bg-white/20 rounded-full h-3 overflow-hidden mb-2">
                        <View
                            className="bg-white h-full rounded-full"
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                    </View>
                    <Text className="text-white/80 text-xs text-center">
                        {progressPercentage.toFixed(1)}% to goal • {(goalWeight - currentWeight).toFixed(1)} kg to go
                    </Text>
                </View>

                {/* Period Selector */}
                <View className="flex-row gap-2 mb-6">
                    {(['week', 'month', 'year'] as const).map((period) => (
                        <TouchableOpacity
                            key={period}
                            onPress={() => setSelectedPeriod(period)}
                            className={`flex-1 py-2 rounded-xl ${selectedPeriod === period ? 'bg-neutral-900' : 'bg-white border border-neutral-200'
                                }`}
                        >
                            <Text
                                className={`text-center font-semibold text-sm capitalize ${selectedPeriod === period ? 'text-white' : 'text-neutral-600'
                                    }`}
                            >
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Weight Trend Chart */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Weight Trend</Text>

                    {/* Simple line chart visualization using real history */}
                    {weightHistory.length > 0 ? (
                        <View className="h-40 flex-row items-end justify-between mb-4">
                            {weightHistory.slice(0, 7).reverse().map((data: any, index: number) => {
                                const maxWeight = Math.max(...weightHistory.map((d: any) => d.weight));
                                const minWeight = Math.min(...weightHistory.map((d: any) => d.weight));
                                const range = maxWeight - minWeight || 1;
                                const heightPercentage = ((data.weight - minWeight) / range) * 100;

                                return (
                                    <View key={index} className="flex-1 items-center">
                                        <View
                                            className="bg-primary-600 w-6 rounded-t-lg"
                                            style={{ height: `${Math.max(heightPercentage, 10)}%` }}
                                        />
                                        <Text className="text-neutral-900 font-semibold text-xs mt-2">
                                            {data.weight}
                                        </Text>
                                        <Text className="text-neutral-400 text-xs">{format(data.date, 'MMM d')}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="h-40 items-center justify-center">
                            <Text className="text-neutral-400">No weight history yet</Text>
                        </View>
                    )}

                    <View className="border-t border-neutral-100 pt-4 flex-row justify-between">
                        <View>
                            <Text className="text-neutral-500 text-xs mb-1">Average</Text>
                            <Text className="text-neutral-900 font-bold">
                                {weightHistory.length > 0
                                    ? (weightHistory.reduce((sum, d) => sum + d.weight, 0) / weightHistory.length).toFixed(1)
                                    : currentWeight} kg
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-neutral-500 text-xs mb-1">Last 30 Days</Text>
                            <Text className="text-primary-600 font-bold">{Math.abs(weightChange).toFixed(1)} kg lost</Text>
                        </View>
                    </View>
                </View>

                {/* Weekly Calorie Intake */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Weekly Calories</Text>

                    {calorieHistory.length > 0 ? (
                        <View className="h-40 flex-row items-end justify-between mb-4 gap-1">
                            {calorieHistory.map((data, index) => {
                                const maxCalories = 2500;
                                const heightPercentage = (data.calories / maxCalories) * 100;
                                const targetHeightPercentage = (data.target / maxCalories) * 100;
                                const isOverTarget = data.calories > data.target;

                                return (
                                    <View key={index} className="flex-1 items-center relative">
                                        {/* Target line */}
                                        <View
                                            className="absolute w-full border-t-2 border-dashed border-neutral-300"
                                            style={{ bottom: `${targetHeightPercentage}%` }}
                                        />

                                        {/* Actual bar */}
                                        <View
                                            className={`w-full rounded-t-lg ${isOverTarget ? 'bg-orange-500' : 'bg-blue-500'
                                                }`}
                                            style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                                        />
                                        <Text className="text-neutral-900 font-medium text-xs mt-2">{format(data.date, 'EEE')}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="h-40 items-center justify-center">
                            <Text className="text-neutral-400">No calorie data yet</Text>
                        </View>
                    )}

                    <View className="flex-row gap-4">
                        <View className="flex-row items-center gap-2">
                            <View className="w-3 h-3 bg-blue-500 rounded-full" />
                            <Text className="text-neutral-600 text-xs">Under Target</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="w-3 h-3 bg-orange-500 rounded-full" />
                            <Text className="text-neutral-600 text-xs">Over Target</Text>
                        </View>
                    </View>
                </View>

                {/* Nutrition Stats */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Nutrition Stats</Text>

                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1 bg-blue-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="w-2 h-2 bg-blue-500 rounded-full" />
                                <Text className="text-blue-600 text-xs font-medium">Protein</Text>
                            </View>
                            <Text className="text-blue-900 font-bold text-2xl mb-1">128g</Text>
                            <Text className="text-blue-600 text-xs">avg/day</Text>
                        </View>
                        <View className="flex-1 bg-orange-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="w-2 h-2 bg-orange-500 rounded-full" />
                                <Text className="text-orange-600 text-xs font-medium">Carbs</Text>
                            </View>
                            <Text className="text-orange-900 font-bold text-2xl mb-1">185g</Text>
                            <Text className="text-orange-600 text-xs">avg/day</Text>
                        </View>
                        <View className="flex-1 bg-purple-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="w-2 h-2 bg-purple-500 rounded-full" />
                                <Text className="text-purple-600 text-xs font-medium">Fats</Text>
                            </View>
                            <Text className="text-purple-900 font-bold text-2xl mb-1">62g</Text>
                            <Text className="text-purple-600 text-xs">avg/day</Text>
                        </View>
                    </View>

                    {/* Adherence Score */}
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-green-500 p-2 rounded-full">
                                    <Target size={20} color="white" />
                                </View>
                                <View>
                                    <Text className="text-neutral-900 font-bold text-lg">92%</Text>
                                    <Text className="text-neutral-600 text-xs">Adherence Score</Text>
                                </View>
                            </View>
                            <View className="bg-green-500 px-4 py-2 rounded-full">
                                <Text className="text-white font-bold">Excellent!</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tracking Consistency */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Tracking Consistency</Text>

                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-neutral-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-3">
                                <Flame size={20} color="#f97316" />
                                <Text className="text-neutral-900 font-bold">14 Days</Text>
                            </View>
                            <Text className="text-neutral-500 text-xs">Current Streak</Text>
                        </View>
                        <View className="flex-1 bg-neutral-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-3">
                                <Droplet size={20} color="#3b82f6" />
                                <Text className="text-neutral-900 font-bold">85%</Text>
                            </View>
                            <Text className="text-neutral-500 text-xs">Hydration Goal</Text>
                        </View>
                        <View className="flex-1 bg-neutral-50 rounded-2xl p-4">
                            <View className="flex-row items-center gap-2 mb-3">
                                <Activity size={20} color="#10b981" />
                                <Text className="text-neutral-900 font-bold">4/7</Text>
                            </View>
                            <Text className="text-neutral-500 text-xs">Workouts</Text>
                        </View>
                    </View>
                </View>

                {/* Body Measurements */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-neutral-900 font-bold text-lg">Body Measurements</Text>
                        <TouchableOpacity className="flex-row items-center gap-1">
                            <Camera size={16} color="#10b981" />
                            <Text className="text-primary-600 font-semibold text-sm">Add Photo</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-3">
                        <View className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                            <Text className="text-neutral-600">Waist</Text>
                            <Text className="text-neutral-900 font-bold">82 cm</Text>
                        </View>
                        <View className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                            <Text className="text-neutral-600">Chest</Text>
                            <Text className="text-neutral-900 font-bold">98 cm</Text>
                        </View>
                        <View className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                            <Text className="text-neutral-600">Arms</Text>
                            <Text className="text-neutral-900 font-bold">35 cm</Text>
                        </View>
                        <View className="flex-row items-center justify-between py-3">
                            <Text className="text-neutral-600">Body Fat</Text>
                            <Text className="text-neutral-900 font-bold">18.5%</Text>
                        </View>
                    </View>

                    <TouchableOpacity className="bg-neutral-900 rounded-xl py-3 mt-4">
                        <Text className="text-white font-semibold text-center">Update Measurements</Text>
                    </TouchableOpacity>
                </View>

                {/* Achievements */}
                <View className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Award size={24} color="white" />
                        <Text className="text-white font-bold text-lg">Recent Achievements</Text>
                    </View>

                    <View className="space-y-3">
                        <View className="bg-white/20 rounded-2xl p-4">
                            <Text className="text-white font-bold mb-1">🔥 2-Week Streak</Text>
                            <Text className="text-white/80 text-xs">Logged meals for 14 days straight!</Text>
                        </View>
                        <View className="bg-white/20 rounded-2xl p-4">
                            <Text className="text-white font-bold mb-1">💪 Weight Milestone</Text>
                            <Text className="text-white/80 text-xs">Lost 2.2 kg this month</Text>
                        </View>
                        <View className="bg-white/20 rounded-2xl p-4">
                            <Text className="text-white font-bold mb-1">🎯 Perfect Week</Text>
                            <Text className="text-white/80 text-xs">Met your calorie goal 7/7 days</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

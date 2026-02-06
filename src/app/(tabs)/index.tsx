import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Scan, Search, Droplets, Calendar as CalendarIcon } from 'lucide-react-native';
import CalorieCircle from '../../components/charts/CalorieCircle';
import ProgressBar from '../../components/charts/ProgressBar';
import QuickAction from '../../components/dashboard/QuickAction';
import MealCard from '../../components/dashboard/MealCard';
import { format } from 'date-fns';

interface MealData {
    id: string;
    title: string;
    calories: number;
    time: string;
    type: string;
}

export default function HomeScreen() {
    const router = useRouter();

    // Mock data for UI development
    const currentCalories = 1250;
    const targetCalories = 2200;
    const userName = "Alex";

    // Mock macro data
    const macros = {
        protein: { current: 86, target: 140 },
        carbs: { current: 120, target: 250 },
        fats: { current: 45, target: 70 },
    };

    const recentMeals: MealData[] = [
        { id: '1', title: 'Oatmeal with Blueberries', calories: 350, time: '8:30 AM', type: 'Breakfast' },
        { id: '2', title: 'Grilled Chicken Salad', calories: 450, time: '1:15 PM', type: 'Lunch' },
        { id: '3', title: 'Apple & Peanut Butter', calories: 200, time: '4:00 PM', type: 'Snack' },
    ];

    const today = format(new Date(), 'EEEE, MMM d');

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header with Date */}
                <View className="px-6 pt-4 pb-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-neutral-500 font-medium text-sm">Good Morning,</Text>
                        <Text className="text-neutral-900 font-bold text-2xl">{userName}</Text>
                        <View className="flex-row items-center mt-1">
                            <CalendarIcon size={12} color="#737373" />
                            <Text className="text-neutral-500 text-xs ml-1">{today}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                        <View className="w-12 h-12 bg-primary-600 rounded-full items-center justify-center border-2 border-primary-200">
                            <Text className="text-white font-bold text-lg">{userName[0]}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Calorie Card */}
                <View className="mx-6 bg-white rounded-3xl p-6 shadow-lg border border-neutral-100 items-center mb-8">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Today's Calories</Text>
                    <CalorieCircle current={currentCalories} target={targetCalories} size={180} />
                    <Text className="text-neutral-400 text-sm mt-4">
                        {targetCalories - currentCalories} kcal remaining
                    </Text>

                    {/* Macros with Progress Bars */}
                    <View className="w-full mt-6 space-y-4">
                        <ProgressBar
                            current={macros.protein.current}
                            target={macros.protein.target}
                            color="bg-blue-500"
                            label="Protein"
                        />
                        <ProgressBar
                            current={macros.carbs.current}
                            target={macros.carbs.target}
                            color="bg-orange-500"
                            label="Carbs"
                        />
                        <ProgressBar
                            current={macros.fats.current}
                            target={macros.fats.target}
                            color="bg-purple-500"
                            label="Fats"
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="px-6 mb-8">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Quick Add</Text>
                    <View className="flex-row justify-between">
                        <QuickAction
                            icon={<Plus size={26} color="#10b981" />}
                            label="Meal"
                            onPress={() => router.push('/(modals)/add-meal')}
                        />
                        <QuickAction
                            icon={<Scan size={26} color="#3b82f6" />}
                            label="Scan"
                            onPress={() => router.push('/(modals)/barcode-scanner')}
                        />
                        <QuickAction
                            icon={<Search size={26} color="#f59e0b" />}
                            label="Search"
                            onPress={() => router.push('/(modals)/food-search')}
                        />
                        <QuickAction
                            icon={<Droplets size={26} color="#14b8a6" />}
                            label="Water"
                            onPress={() => router.push('/(tabs)/water')}
                        />
                    </View>
                </View>

                {/* Recent Activity */}
                <View className="px-6 mb-8">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-neutral-900 font-bold text-lg">Recent Meals</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/meals')}>
                            <Text className="text-primary-600 font-semibold text-sm">See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ minHeight: 250 }}>
                        <FlashList
                            data={recentMeals}
                            renderItem={({ item }) => (
                                <View className="mb-3">
                                    <MealCard
                                        title={item.title}
                                        calories={item.calories}
                                        time={item.time}
                                        type={item.type}
                                        onPress={() => console.log('Meal pressed:', item.id)}
                                    />
                                </View>
                            )}
                            keyExtractor={(item) => item.id}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

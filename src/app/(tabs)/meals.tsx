import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Calendar as CalendarIcon, Utensils, Scan, Search } from 'lucide-react-native';
import { format } from 'date-fns';
import CalorieCircle from '../../components/charts/CalorieCircle';
import ProgressBar from '../../components/charts/ProgressBar';
import MealSection from '../../components/meal/MealSection';
import Header from '../../components/common/Header';

export default function MealsScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const userName = "Alex";
    const currentCalories = 490;
    const targetCalories = 2200;

    // Mock macro data
    const macros = {
        protein: { current: 13, target: 140 },
        carbs: { current: 72, target: 250 },
        fats: { current: 9, target: 70 },
    };

    // Mock data
    const loggedMeals = {
        breakfast: [
            { id: 1, name: 'Oatmeal with Blueberries', calories: 350, protein: 12, carbs: 45, fats: 6 },
            { id: 2, name: 'Coffee with Almond Milk', calories: 45, protein: 1, carbs: 2, fats: 3 }
        ],
        lunch: [],
        dinner: [],
        snack: [
            { id: 3, name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 }
        ]
    };

    const today = format(selectedDate, 'EEE, MMM d');

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            {/* Header */}
            <View className="bg-white px-6 py-4 flex-row justify-between items-center border-b border-neutral-100 shadow-sm z-10">
                <View>
                    <Text className="text-2xl font-bold text-neutral-900">Today's Meals</Text>
                    <Text className="text-neutral-500 font-medium">{today}</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 bg-neutral-100 rounded-full items-center justify-center">
                    <CalendarIcon size={20} color="#525252" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {/* Enhanced Calorie Card */}
                <View className="bg-primary-600 rounded-3xl p-6 mb-8 shadow-xl items-center">
                    <Text className="text-white/90 font-medium mb-4">Calories Today</Text>
                    <CalorieCircle current={currentCalories} target={targetCalories} size={160} />
                    <Text className="text-white/80 text-sm mt-4">
                        {targetCalories - currentCalories} kcal remaining
                    </Text>
                </View>

                {/* Macro Breakdown with Progress Bars */}
                <View className="bg-white rounded-3xl p-6 mb-8 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Macronutrients</Text>
                    <View className="space-y-4">
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

                {/* Quick Add Section with Large Colorful Buttons */}
                <View className="mb-8">
                    <Text className="text-neutral-900 font-bold text-lg mb-4">Quick Add</Text>
                    <View className="space-y-3">
                        <TouchableOpacity
                            onPress={() => router.push('/(modals)/add-meal')}
                            className="bg-primary-600 rounded-2xl p-4 flex-row items-center shadow-md active:opacity-80"
                        >
                            <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-4">
                                <Utensils size={24} color="white" />
                            </View>
                            <Text className="text-white font-bold text-lg flex-1">Add Meal</Text>
                            <Plus size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(modals)/barcode-scanner')}
                            className="bg-blue-500 rounded-2xl p-4 flex-row items-center shadow-md active:opacity-80"
                        >
                            <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-4">
                                <Scan size={24} color="white" />
                            </View>
                            <Text className="text-white font-bold text-lg flex-1">Scan Barcode</Text>
                            <Plus size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(modals)/food-search')}
                            className="bg-amber-500 rounded-2xl p-4 flex-row items-center shadow-md active:opacity-80"
                        >
                            <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-4">
                                <Search size={24} color="white" />
                            </View>
                            <Text className="text-white font-bold text-lg flex-1">Search Food</Text>
                            <Plus size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Meal Sections */}
                <View>
                    <MealSection
                        type="breakfast"
                        meals={loggedMeals.breakfast}
                        recommendedCalories="400-600 kcal"
                        onAddPress={() => router.push('/(modals)/add-meal')}
                    />
                    <MealSection
                        type="lunch"
                        meals={loggedMeals.lunch}
                        recommendedCalories="500-700 kcal"
                        onAddPress={() => router.push('/(modals)/add-meal')}
                    />
                    <MealSection
                        type="dinner"
                        meals={loggedMeals.dinner}
                        recommendedCalories="600-800 kcal"
                        onAddPress={() => router.push('/(modals)/add-meal')}
                    />
                    <MealSection
                        type="snack"
                        meals={loggedMeals.snack}
                        recommendedCalories="100-300 kcal"
                        onAddPress={() => router.push('/(modals)/add-meal')}
                    />
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                className="absolute bottom-6 right-6 w-16 h-16 bg-primary-600 rounded-full items-center justify-center shadow-2xl active:scale-95"
                onPress={() => router.push('/(modals)/add-meal')}
            >
                <Plus size={32} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

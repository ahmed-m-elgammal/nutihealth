import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Save, Copy } from 'lucide-react-native';
import {
    createWeeklyPlan,
    CreateWeeklyPlanData,
} from '../../services/api/weeklyGoals';
import { useUIStore } from '../../store/uiStore';
import { useUserStore } from '../../store/userStore';
import { DEFAULT_TARGETS, DEFAULT_WEEKLY_PLAN_PROTEIN } from '../../constants/nutritionDefaults';

interface DayMacros {
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
}

const DAYS = [
    { key: 'monday', label: 'Monday', emoji: '📅' },
    { key: 'tuesday', label: 'Tuesday', emoji: '📅' },
    { key: 'wednesday', label: 'Wednesday', emoji: '📅' },
    { key: 'thursday', label: 'Thursday', emoji: '📅' },
    { key: 'friday', label: 'Friday', emoji: '📅' },
    { key: 'saturday', label: 'Saturday', emoji: '🎉' },
    { key: 'sunday', label: 'Sunday', emoji: '🎉' },
] as const;

export default function CreateWeeklyPlanScreen() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const user = useUserStore((state) => state.user);

    const [planName, setPlanName] = useState('');
    const [selectedDay, setSelectedDay] = useState<string>('monday');
    const [isLoading, setIsLoading] = useState(false);

    // Initialize with user's current targets
    const defaultMacros: DayMacros = {
        calories: user?.calorieTarget?.toString() || String(DEFAULT_TARGETS.calories),
        protein: user?.proteinTarget?.toString() || String(DEFAULT_WEEKLY_PLAN_PROTEIN),
        carbs: user?.carbsTarget?.toString() || String(DEFAULT_TARGETS.carbs),
        fats: user?.fatsTarget?.toString() || String(DEFAULT_TARGETS.fats),
    };

    const [macrosByDay, setMacrosByDay] = useState<Record<string, DayMacros>>({
        monday: { ...defaultMacros },
        tuesday: { ...defaultMacros },
        wednesday: { ...defaultMacros },
        thursday: { ...defaultMacros },
        friday: { ...defaultMacros },
        saturday: { ...defaultMacros },
        sunday: { ...defaultMacros },
    });

    const updateDayMacro = (day: string, field: keyof DayMacros, value: string) => {
        setMacrosByDay((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value,
            },
        }));
    };

    const copyToAllDays = () => {
        const currentDayMacros = macrosByDay[selectedDay];
        const newMacros = { ...macrosByDay };
        DAYS.forEach((day) => {
            newMacros[day.key] = { ...currentDayMacros };
        });
        setMacrosByDay(newMacros);
        showToast('success', 'Macros copied to all days');
    };

    const applyPreset = (preset: 'uniform' | 'carbCycling' | 'weekendCheat') => {
        const baseCalories = parseInt(defaultMacros.calories, 10) || DEFAULT_TARGETS.calories;
        const baseProtein = parseInt(defaultMacros.protein, 10) || DEFAULT_WEEKLY_PLAN_PROTEIN;

        let newMacros = { ...macrosByDay };

        switch (preset) {
            case 'uniform':
                DAYS.forEach((day) => {
                    newMacros[day.key] = { ...defaultMacros };
                });
                break;

            case 'carbCycling':
                // High carb Mon-Fri (workout days), low carb Sat-Sun (rest days)
                const highCarbDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                const lowCarbDays = ['saturday', 'sunday'];

                highCarbDays.forEach((day) => {
                    newMacros[day] = {
                        calories: baseCalories.toString(),
                        protein: baseProtein.toString(),
                        carbs: '250',
                        fats: '70',
                    };
                });

                lowCarbDays.forEach((day) => {
                    newMacros[day] = {
                        calories: (baseCalories - 300).toString(),
                        protein: baseProtein.toString(),
                        carbs: '100',
                        fats: '110',
                    };
                });
                break;

            case 'weekendCheat':
                // Normal Mon-Fri, +500 cal Sat-Sun
                const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                const weekend = ['saturday', 'sunday'];

                weekdays.forEach((day) => {
                    newMacros[day] = { ...defaultMacros };
                });

                weekend.forEach((day) => {
                    newMacros[day] = {
                        calories: (baseCalories + 500).toString(),
                        protein: baseProtein.toString(),
                        carbs: (parseInt(defaultMacros.carbs, 10) + 50).toString(),
                        fats: (parseInt(defaultMacros.fats, 10) + 20).toString(),
                    };
                });
                break;
        }

        setMacrosByDay(newMacros);
        showToast('success', 'Preset applied');
    };

    const handleSavePlan = async () => {
        if (!planName.trim()) {
            showToast('error', 'Please enter a plan name');
            return;
        }

        try {
            setIsLoading(true);

            const planData: CreateWeeklyPlanData = {
                planName: planName.trim(),
                mondayCalories: parseInt(macrosByDay.monday.calories, 10) || 0,
                mondayProtein: parseInt(macrosByDay.monday.protein, 10) || 0,
                mondayCarbs: parseInt(macrosByDay.monday.carbs, 10) || 0,
                mondayFats: parseInt(macrosByDay.monday.fats, 10) || 0,

                tuesdayCalories: parseInt(macrosByDay.tuesday.calories, 10) || 0,
                tuesdayProtein: parseInt(macrosByDay.tuesday.protein, 10) || 0,
                tuesdayCarbs: parseInt(macrosByDay.tuesday.carbs, 10) || 0,
                tuesdayFats: parseInt(macrosByDay.tuesday.fats, 10) || 0,

                wednesdayCalories: parseInt(macrosByDay.wednesday.calories, 10) || 0,
                wednesdayProtein: parseInt(macrosByDay.wednesday.protein, 10) || 0,
                wednesdayCarbs: parseInt(macrosByDay.wednesday.carbs, 10) || 0,
                wednesdayFats: parseInt(macrosByDay.wednesday.fats, 10) || 0,

                thursdayCalories: parseInt(macrosByDay.thursday.calories, 10) || 0,
                thursdayProtein: parseInt(macrosByDay.thursday.protein, 10) || 0,
                thursdayCarbs: parseInt(macrosByDay.thursday.carbs, 10) || 0,
                thursdayFats: parseInt(macrosByDay.thursday.fats, 10) || 0,

                fridayCalories: parseInt(macrosByDay.friday.calories, 10) || 0,
                fridayProtein: parseInt(macrosByDay.friday.protein, 10) || 0,
                fridayCarbs: parseInt(macrosByDay.friday.carbs, 10) || 0,
                fridayFats: parseInt(macrosByDay.friday.fats, 10) || 0,

                saturdayCalories: parseInt(macrosByDay.saturday.calories, 10) || 0,
                saturdayProtein: parseInt(macrosByDay.saturday.protein, 10) || 0,
                saturdayCarbs: parseInt(macrosByDay.saturday.carbs, 10) || 0,
                saturdayFats: parseInt(macrosByDay.saturday.fats, 10) || 0,

                sundayCalories: parseInt(macrosByDay.sunday.calories, 10) || 0,
                sundayProtein: parseInt(macrosByDay.sunday.protein, 10) || 0,
                sundayCarbs: parseInt(macrosByDay.sunday.carbs, 10) || 0,
                sundayFats: parseInt(macrosByDay.sunday.fats, 10) || 0,
            };

            await createWeeklyPlan(planData);
            showToast('success', 'Weekly plan created');
            router.back();
        } catch (error) {
            showToast('error', 'Failed to create plan');
        } finally {
            setIsLoading(false);
        }
    };

    const currentDayMacros = macrosByDay[selectedDay];

    return (
        <View className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="bg-primary-600 px-6 pt-12 pb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-white">
                        Create Weekly Plan
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-white/20 p-2 rounded-full"
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-white/80 text-sm">
                    Set different macro goals for each day
                </Text>
            </View>

            <ScrollView className="flex-1">
                {/* Plan Name */}
                <View className="bg-white px-6 py-4 mb-2">
                    <Text className="text-neutral-700 font-semibold mb-2">Plan Name</Text>
                    <TextInput
                        placeholder="e.g., Carb Cycling, Weekly Split"
                        value={planName}
                        onChangeText={setPlanName}
                        className="bg-neutral-100 rounded-xl px-4 py-3 text-neutral-900"
                        placeholderTextColor="#a3a3a3"
                    />
                </View>

                {/* Presets */}
                <View className="bg-white px-6 py-4 mb-2">
                    <Text className="text-neutral-700 font-semibold mb-3">Quick Presets</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => applyPreset('uniform')}
                            className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3"
                        >
                            <Text className="text-blue-800 font-semibold text-center text-sm">
                                📊 Uniform
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyPreset('carbCycling')}
                            className="flex-1 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3"
                        >
                            <Text className="text-purple-800 font-semibold text-center text-sm">
                                🔄 Carb Cycle
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyPreset('weekendCheat')}
                            className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
                        >
                            <Text className="text-amber-800 font-semibold text-center text-sm">
                                🍕 Weekend+
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Day Selector */}
                <View className="bg-white px-6 py-4 mb-2">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-neutral-700 font-semibold">Select Day</Text>
                        <TouchableOpacity
                            onPress={copyToAllDays}
                            className="flex-row items-center bg-neutral-100 px-3 py-2 rounded-lg"
                        >
                            <Copy size={14} color="#525252" />
                            <Text className="text-neutral-600 text-xs ml-1 font-medium">
                                Copy to All
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row gap-2"
                    >
                        {DAYS.map((day) => (
                            <TouchableOpacity
                                key={day.key}
                                onPress={() => setSelectedDay(day.key)}
                                className={`px-4 py-3 rounded-xl min-w-[90px] ${selectedDay === day.key
                                        ? 'bg-primary-600'
                                        : 'bg-neutral-100'
                                    }`}
                            >
                                <Text
                                    className={`font-semibold text-center ${selectedDay === day.key
                                            ? 'text-white'
                                            : 'text-neutral-700'
                                        }`}
                                >
                                    {day.emoji}
                                </Text>
                                <Text
                                    className={`text-xs text-center mt-1 ${selectedDay === day.key
                                            ? 'text-white'
                                            : 'text-neutral-500'
                                        }`}
                                >
                                    {day.label.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Macro Inputs */}
                <View className="bg-white px-6 py-4 mb-2">
                    <Text className="text-neutral-700 font-semibold mb-4">
                        {DAYS.find((d) => d.key === selectedDay)?.label} Macros
                    </Text>

                    {/* Calories */}
                    <View className="mb-4">
                        <Text className="text-neutral-600 font-medium mb-2">
                            Calories (kcal)
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.calories}
                            onChangeText={(val) =>
                                updateDayMacro(selectedDay, 'calories', val)
                            }
                            className="bg-neutral-100 rounded-xl px-4 py-3 text-neutral-900 font-semibold text-lg"
                            placeholder={String(DEFAULT_TARGETS.calories)}
                        />
                    </View>

                    {/* Protein */}
                    <View className="mb-4">
                        <Text className="text-neutral-600 font-medium mb-2">
                            Protein (g)
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.protein}
                            onChangeText={(val) =>
                                updateDayMacro(selectedDay, 'protein', val)
                            }
                            className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-900 font-semibold text-lg"
                            placeholder={String(DEFAULT_WEEKLY_PLAN_PROTEIN)}
                        />
                    </View>

                    {/* Carbs */}
                    <View className="mb-4">
                        <Text className="text-neutral-600 font-medium mb-2">
                            Carbohydrates (g)
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.carbs}
                            onChangeText={(val) =>
                                updateDayMacro(selectedDay, 'carbs', val)
                            }
                            className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-orange-900 font-semibold text-lg"
                            placeholder={String(DEFAULT_TARGETS.carbs)}
                        />
                    </View>

                    {/* Fats */}
                    <View className="mb-4">
                        <Text className="text-neutral-600 font-medium mb-2">
                            Fats (g)
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.fats}
                            onChangeText={(val) =>
                                updateDayMacro(selectedDay, 'fats', val)
                            }
                            className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-purple-900 font-semibold text-lg"
                            placeholder={String(DEFAULT_TARGETS.fats)}
                        />
                    </View>
                </View>

                {/* Summary */}
                <View className="bg-blue-50 border border-blue-200 mx-6 mb-6 p-4 rounded-2xl">
                    <Text className="text-blue-900 font-semibold mb-2">
                        📊 Weekly Overview
                    </Text>
                    <Text className="text-blue-700 text-sm">
                        {DAYS.map((day) => {
                            const cals = parseInt(macrosByDay[day.key].calories, 10) || 0;
                            return `${day.label.substring(0, 3)}: ${cals} kcal`;
                        }).join(' • ')}
                    </Text>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View className="px-6 py-4 bg-white border-t border-neutral-100">
                <TouchableOpacity
                    onPress={handleSavePlan}
                    disabled={isLoading}
                    className={`bg-primary-600 rounded-2xl py-4 flex-row items-center justify-center ${isLoading ? 'opacity-50' : ''
                        }`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-2">
                                Save Plan
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

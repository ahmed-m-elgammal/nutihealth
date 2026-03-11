import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Save, Copy } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import WeeklyGoalPlan from '../../database/models/WeeklyGoalPlan';
import {
    activatePlan,
    createWeeklyPlan,
    CreateWeeklyPlanData,
    getWeeklyPlanById,
    updateWeeklyPlan,
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
    { key: 'monday', label: 'Monday', emoji: 'M' },
    { key: 'tuesday', label: 'Tuesday', emoji: 'T' },
    { key: 'wednesday', label: 'Wednesday', emoji: 'W' },
    { key: 'thursday', label: 'Thursday', emoji: 'T' },
    { key: 'friday', label: 'Friday', emoji: 'F' },
    { key: 'saturday', label: 'Saturday', emoji: 'S' },
    { key: 'sunday', label: 'Sunday', emoji: 'S' },
] as const;

function parseRouteNumber(value: string | string[] | undefined, fallback: number): number {
    if (typeof value !== 'string') {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeNumericInput(value: string): string {
    return value.replace(/[^0-9]/g, '');
}

function toNumber(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function createDayMacros(calories: number, protein: number, carbs: number, fats: number): DayMacros {
    return {
        calories: String(calories),
        protein: String(protein),
        carbs: String(carbs),
        fats: String(fats),
    };
}

function createUniformWeek(dayMacros: DayMacros): Record<string, DayMacros> {
    return {
        monday: { ...dayMacros },
        tuesday: { ...dayMacros },
        wednesday: { ...dayMacros },
        thursday: { ...dayMacros },
        friday: { ...dayMacros },
        saturday: { ...dayMacros },
        sunday: { ...dayMacros },
    };
}

function mapPlanToMacrosByDay(plan: WeeklyGoalPlan): Record<string, DayMacros> {
    return {
        monday: createDayMacros(plan.mondayCalories, plan.mondayProtein, plan.mondayCarbs, plan.mondayFats),
        tuesday: createDayMacros(plan.tuesdayCalories, plan.tuesdayProtein, plan.tuesdayCarbs, plan.tuesdayFats),
        wednesday: createDayMacros(
            plan.wednesdayCalories,
            plan.wednesdayProtein,
            plan.wednesdayCarbs,
            plan.wednesdayFats,
        ),
        thursday: createDayMacros(plan.thursdayCalories, plan.thursdayProtein, plan.thursdayCarbs, plan.thursdayFats),
        friday: createDayMacros(plan.fridayCalories, plan.fridayProtein, plan.fridayCarbs, plan.fridayFats),
        saturday: createDayMacros(plan.saturdayCalories, plan.saturdayProtein, plan.saturdayCarbs, plan.saturdayFats),
        sunday: createDayMacros(plan.sundayCalories, plan.sundayProtein, plan.sundayCarbs, plan.sundayFats),
    };
}

export default function CreateWeeklyPlanScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const showToast = useUIStore((state) => state.showToast);
    const user = useUserStore((state) => state.user);
    const params = useLocalSearchParams<{
        planId?: string;
        prefillName?: string;
        prefillCalories?: string;
        prefillProtein?: string;
        prefillCarbs?: string;
        prefillFats?: string;
    }>();

    const editingPlanId = typeof params.planId === 'string' && params.planId.trim().length > 0 ? params.planId : null;
    const isEditing = Boolean(editingPlanId);

    const defaultDayMacros = useMemo(() => {
        const calories = parseRouteNumber(params.prefillCalories, user?.calorieTarget ?? DEFAULT_TARGETS.calories);
        const protein = parseRouteNumber(params.prefillProtein, user?.proteinTarget ?? DEFAULT_WEEKLY_PLAN_PROTEIN);
        const carbs = parseRouteNumber(params.prefillCarbs, user?.carbsTarget ?? DEFAULT_TARGETS.carbs);
        const fats = parseRouteNumber(params.prefillFats, user?.fatsTarget ?? DEFAULT_TARGETS.fats);
        return createDayMacros(calories, protein, carbs, fats);
    }, [
        params.prefillCalories,
        params.prefillProtein,
        params.prefillCarbs,
        params.prefillFats,
        user?.calorieTarget,
        user?.carbsTarget,
        user?.fatsTarget,
        user?.proteinTarget,
    ]);

    const [planName, setPlanName] = useState(() => {
        if (typeof params.prefillName === 'string' && params.prefillName.trim().length > 0) {
            return `${params.prefillName} (Custom)`;
        }

        return '';
    });
    const [selectedDay, setSelectedDay] = useState<string>('monday');
    const [isSaving, setIsSaving] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(isEditing);
    const [macrosByDay, setMacrosByDay] = useState<Record<string, DayMacros>>(() =>
        createUniformWeek(defaultDayMacros),
    );

    useEffect(() => {
        if (!editingPlanId) {
            setIsBootstrapping(false);
            return;
        }

        let isMounted = true;
        setIsBootstrapping(true);

        getWeeklyPlanById(editingPlanId)
            .then((plan) => {
                if (!isMounted) {
                    return;
                }

                if (!plan) {
                    showToast('error', 'Plan not found');
                    router.back();
                    return;
                }

                setPlanName(plan.planName);
                setMacrosByDay(mapPlanToMacrosByDay(plan));
            })
            .catch(() => {
                if (!isMounted) {
                    return;
                }
                showToast('error', 'Failed to load plan');
                router.back();
            })
            .finally(() => {
                if (isMounted) {
                    setIsBootstrapping(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [editingPlanId, router, showToast]);

    const updateDayMacro = (day: string, field: keyof DayMacros, value: string) => {
        const sanitized = sanitizeNumericInput(value);
        setMacrosByDay((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: sanitized,
            },
        }));
    };

    const copyToAllDays = () => {
        const currentDayMacros = macrosByDay[selectedDay];
        setMacrosByDay(createUniformWeek(currentDayMacros));
        showToast('success', 'Macros copied to all days');
    };

    const applyPreset = (preset: 'uniform' | 'carbCycling' | 'weekendCheat') => {
        const currentDay = macrosByDay[selectedDay];
        const baseCalories = toNumber(currentDay?.calories || defaultDayMacros.calories) || DEFAULT_TARGETS.calories;
        const baseProtein = toNumber(currentDay?.protein || defaultDayMacros.protein) || DEFAULT_WEEKLY_PLAN_PROTEIN;
        const baseCarbs = toNumber(currentDay?.carbs || defaultDayMacros.carbs) || DEFAULT_TARGETS.carbs;
        const baseFats = toNumber(currentDay?.fats || defaultDayMacros.fats) || DEFAULT_TARGETS.fats;

        const nextMacros = { ...macrosByDay };

        switch (preset) {
            case 'uniform':
                DAYS.forEach((day) => {
                    nextMacros[day.key] = {
                        calories: String(baseCalories),
                        protein: String(baseProtein),
                        carbs: String(baseCarbs),
                        fats: String(baseFats),
                    };
                });
                break;

            case 'carbCycling':
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
                    nextMacros[day] = {
                        calories: String(baseCalories),
                        protein: String(baseProtein),
                        carbs: String(Math.max(80, baseCarbs + 35)),
                        fats: String(Math.max(30, baseFats - 10)),
                    };
                });

                ['saturday', 'sunday'].forEach((day) => {
                    nextMacros[day] = {
                        calories: String(Math.max(1200, baseCalories - 250)),
                        protein: String(baseProtein),
                        carbs: String(Math.max(60, baseCarbs - 65)),
                        fats: String(Math.max(35, baseFats + 20)),
                    };
                });
                break;

            case 'weekendCheat':
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
                    nextMacros[day] = {
                        calories: String(baseCalories),
                        protein: String(baseProtein),
                        carbs: String(baseCarbs),
                        fats: String(baseFats),
                    };
                });

                ['saturday', 'sunday'].forEach((day) => {
                    nextMacros[day] = {
                        calories: String(baseCalories + 400),
                        protein: String(baseProtein),
                        carbs: String(baseCarbs + 50),
                        fats: String(baseFats + 15),
                    };
                });
                break;
        }

        setMacrosByDay(nextMacros);
        showToast('success', 'Preset applied');
    };

    const buildPlanPayload = (): CreateWeeklyPlanData => ({
        planName: planName.trim(),
        mondayCalories: toNumber(macrosByDay.monday.calories),
        mondayProtein: toNumber(macrosByDay.monday.protein),
        mondayCarbs: toNumber(macrosByDay.monday.carbs),
        mondayFats: toNumber(macrosByDay.monday.fats),
        tuesdayCalories: toNumber(macrosByDay.tuesday.calories),
        tuesdayProtein: toNumber(macrosByDay.tuesday.protein),
        tuesdayCarbs: toNumber(macrosByDay.tuesday.carbs),
        tuesdayFats: toNumber(macrosByDay.tuesday.fats),
        wednesdayCalories: toNumber(macrosByDay.wednesday.calories),
        wednesdayProtein: toNumber(macrosByDay.wednesday.protein),
        wednesdayCarbs: toNumber(macrosByDay.wednesday.carbs),
        wednesdayFats: toNumber(macrosByDay.wednesday.fats),
        thursdayCalories: toNumber(macrosByDay.thursday.calories),
        thursdayProtein: toNumber(macrosByDay.thursday.protein),
        thursdayCarbs: toNumber(macrosByDay.thursday.carbs),
        thursdayFats: toNumber(macrosByDay.thursday.fats),
        fridayCalories: toNumber(macrosByDay.friday.calories),
        fridayProtein: toNumber(macrosByDay.friday.protein),
        fridayCarbs: toNumber(macrosByDay.friday.carbs),
        fridayFats: toNumber(macrosByDay.friday.fats),
        saturdayCalories: toNumber(macrosByDay.saturday.calories),
        saturdayProtein: toNumber(macrosByDay.saturday.protein),
        saturdayCarbs: toNumber(macrosByDay.saturday.carbs),
        saturdayFats: toNumber(macrosByDay.saturday.fats),
        sundayCalories: toNumber(macrosByDay.sunday.calories),
        sundayProtein: toNumber(macrosByDay.sunday.protein),
        sundayCarbs: toNumber(macrosByDay.sunday.carbs),
        sundayFats: toNumber(macrosByDay.sunday.fats),
    });

    const handleSavePlan = async () => {
        if (!planName.trim()) {
            showToast('error', 'Please enter a plan name');
            return;
        }

        try {
            setIsSaving(true);
            const payload = buildPlanPayload();

            if (editingPlanId) {
                await updateWeeklyPlan(editingPlanId, payload);
                showToast('success', 'Weekly plan updated');
            } else {
                const createdPlan = await createWeeklyPlan(payload);
                await activatePlan(createdPlan.id);
                showToast('success', 'Weekly plan created and activated');
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['weekly-goal-plans'] }),
                queryClient.invalidateQueries({ queryKey: ['diets', 'active'] }),
                queryClient.invalidateQueries({ queryKey: ['diet-suggestions'] }),
            ]);

            router.back();
        } catch (error) {
            showToast('error', editingPlanId ? 'Failed to update plan' : 'Failed to create plan');
        } finally {
            setIsSaving(false);
        }
    };

    const currentDayMacros = macrosByDay[selectedDay];

    if (isBootstrapping) {
        return (
            <View className="flex-1 items-center justify-center bg-neutral-50">
                <ActivityIndicator size="large" color="#10b981" />
                <Text className="mt-3 text-neutral-500">Loading weekly plan...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-neutral-50">
            <View className="bg-primary-600 px-6 pb-6 pt-12">
                <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-white">
                        {isEditing ? 'Edit Weekly Plan' : 'Create Weekly Plan'}
                    </Text>
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-white/20 p-2">
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-sm text-white/80">
                    Set day-by-day macro targets and adjust them with your doctor.
                </Text>
            </View>

            <ScrollView className="flex-1">
                <View className="mb-2 bg-white px-6 py-4">
                    <Text className="mb-2 font-semibold text-neutral-700">Plan Name</Text>
                    <TextInput
                        placeholder="e.g., Doctor Adjusted Plan"
                        value={planName}
                        onChangeText={setPlanName}
                        className="rounded-xl bg-neutral-100 px-4 py-3 text-neutral-900"
                        placeholderTextColor="#a3a3a3"
                    />
                </View>

                <View className="mb-2 bg-white px-6 py-4">
                    <Text className="mb-3 font-semibold text-neutral-700">Quick Presets</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => applyPreset('uniform')}
                            className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
                        >
                            <Text className="text-center text-sm font-semibold text-blue-800">Uniform</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyPreset('carbCycling')}
                            className="flex-1 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3"
                        >
                            <Text className="text-center text-sm font-semibold text-purple-800">Carb Cycle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyPreset('weekendCheat')}
                            className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                        >
                            <Text className="text-center text-sm font-semibold text-amber-800">Weekend+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="mb-2 bg-white px-6 py-4">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="font-semibold text-neutral-700">Select Day</Text>
                        <TouchableOpacity
                            onPress={copyToAllDays}
                            className="flex-row items-center rounded-lg bg-neutral-100 px-3 py-2"
                        >
                            <Copy size={14} color="#525252" />
                            <Text className="ml-1 text-xs font-medium text-neutral-600">Copy to All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                        {DAYS.map((day) => (
                            <TouchableOpacity
                                key={day.key}
                                onPress={() => setSelectedDay(day.key)}
                                className={`min-w-[90px] rounded-xl px-4 py-3 ${
                                    selectedDay === day.key ? 'bg-primary-600' : 'bg-neutral-100'
                                }`}
                            >
                                <Text
                                    className={`text-center font-semibold ${
                                        selectedDay === day.key ? 'text-white' : 'text-neutral-700'
                                    }`}
                                >
                                    {day.emoji}
                                </Text>
                                <Text
                                    className={`mt-1 text-center text-xs ${
                                        selectedDay === day.key ? 'text-white' : 'text-neutral-500'
                                    }`}
                                >
                                    {day.label.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View className="mb-2 bg-white px-6 py-4">
                    <Text className="mb-4 font-semibold text-neutral-700">
                        {DAYS.find((d) => d.key === selectedDay)?.label} Macros
                    </Text>

                    <View className="mb-4">
                        <Text className="mb-2 font-medium text-neutral-600">Calories (kcal)</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.calories}
                            onChangeText={(value) => updateDayMacro(selectedDay, 'calories', value)}
                            className="rounded-xl bg-neutral-100 px-4 py-3 text-lg font-semibold text-neutral-900"
                            placeholder={String(DEFAULT_TARGETS.calories)}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 font-medium text-neutral-600">Protein (g)</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.protein}
                            onChangeText={(value) => updateDayMacro(selectedDay, 'protein', value)}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-lg font-semibold text-blue-900"
                            placeholder={String(DEFAULT_WEEKLY_PLAN_PROTEIN)}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 font-medium text-neutral-600">Carbohydrates (g)</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.carbs}
                            onChangeText={(value) => updateDayMacro(selectedDay, 'carbs', value)}
                            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-lg font-semibold text-orange-900"
                            placeholder={String(DEFAULT_TARGETS.carbs)}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 font-medium text-neutral-600">Fats (g)</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentDayMacros.fats}
                            onChangeText={(value) => updateDayMacro(selectedDay, 'fats', value)}
                            className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-lg font-semibold text-purple-900"
                            placeholder={String(DEFAULT_TARGETS.fats)}
                        />
                    </View>
                </View>

                <View className="mx-6 mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <Text className="mb-2 font-semibold text-blue-900">Weekly Overview</Text>
                    <Text className="text-sm text-blue-700">
                        {DAYS.map((day) => {
                            const calories = toNumber(macrosByDay[day.key].calories);
                            return `${day.label.substring(0, 3)}: ${calories} kcal`;
                        }).join(' • ')}
                    </Text>
                </View>
            </ScrollView>

            <View className="border-t border-neutral-100 bg-white px-6 py-4">
                <TouchableOpacity
                    onPress={handleSavePlan}
                    disabled={isSaving}
                    className={`flex-row items-center justify-center rounded-2xl bg-primary-600 py-4 ${
                        isSaving ? 'opacity-50' : ''
                    }`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="ml-2 text-lg font-bold text-white">
                                {isEditing ? 'Update Plan' : 'Save & Activate'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

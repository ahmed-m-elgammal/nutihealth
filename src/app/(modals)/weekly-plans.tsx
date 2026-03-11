import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { X, Plus, Radio, Trash2, Calendar, Pencil } from 'lucide-react-native';
import { getAllWeeklyPlans, activatePlan, deleteWeeklyPlan, getActivePlan } from '../../services/api/weeklyGoals';
import { useUIStore } from '../../store/uiStore';
import { useUserStore } from '../../store/userStore';
import WeeklyGoalPlan from '../../database/models/WeeklyGoalPlan';

export default function WeeklyPlansScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const showToast = useUIStore((state) => state.showToast);
    const user = useUserStore((state) => state.user);
    const [plans, setPlans] = useState<WeeklyGoalPlan[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadPlans = useCallback(async () => {
        try {
            setIsLoading(true);
            if (!user?.id) {
                setPlans([]);
                setActivePlanId(null);
                return;
            }

            const [allPlans, active] = await Promise.all([getAllWeeklyPlans(user.id), getActivePlan(user.id)]);
            setPlans(allPlans);
            setActivePlanId(active?.id || null);
        } catch (error) {
            showToast('error', 'Failed to load weekly plans');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, user?.id]);

    useEffect(() => {
        loadPlans().catch(() => undefined);
    }, [loadPlans]);

    const handleActivatePlan = async (planId: string) => {
        try {
            await activatePlan(planId);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['weekly-goal-plans'] }),
                queryClient.invalidateQueries({ queryKey: ['diet-suggestions'] }),
            ]);
            showToast('success', 'Plan activated');
            await loadPlans();
        } catch (error) {
            showToast('error', 'Failed to activate plan');
        }
    };

    const handleEditPlan = (plan: WeeklyGoalPlan) => {
        router.push({
            pathname: '/(modals)/create-weekly-plan',
            params: { planId: plan.id },
        } as any);
    };

    const handleDeletePlan = (plan: WeeklyGoalPlan) => {
        Alert.alert('Delete Plan', `Are you sure you want to delete "${plan.planName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteWeeklyPlan(plan.id);
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['weekly-goal-plans'] }),
                            queryClient.invalidateQueries({ queryKey: ['diet-suggestions'] }),
                        ]);
                        showToast('success', 'Plan deleted');
                        await loadPlans();
                    } catch (error) {
                        showToast('error', 'Failed to delete plan');
                    }
                },
            },
        ]);
    };

    return (
        <View className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="bg-primary-600 px-6 pb-6 pt-12">
                <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-white">Weekly Goal Plans</Text>
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-white/20 p-2">
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-sm text-white/80">Manage your day-specific macro targets</Text>
            </View>

            {/* Create Button */}
            <View className="border-b border-neutral-100 bg-white px-6 py-4">
                <TouchableOpacity
                    onPress={() => router.push('/(modals)/create-weekly-plan' as any)}
                    className="flex-row items-center justify-center rounded-2xl bg-primary-600 py-4"
                >
                    <Plus size={20} color="white" />
                    <Text className="ml-2 text-lg font-bold text-white">Create New Plan</Text>
                </TouchableOpacity>
            </View>

            {/* Plans List */}
            <ScrollView className="flex-1 px-6 py-4">
                {isLoading ? (
                    <View className="items-center justify-center py-12">
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : plans.length === 0 ? (
                    <View className="items-center justify-center py-12">
                        <Calendar size={48} color="#d4d4d4" />
                        <Text className="mt-4 text-center text-neutral-500">
                            No weekly plans yet.{'\n'}
                            Create your first plan to get started!
                        </Text>
                    </View>
                ) : (
                    <View className="space-y-3 pb-4">
                        {plans.map((plan) => {
                            const isActive = plan.id === activePlanId;

                            return (
                                <View
                                    key={plan.id}
                                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                                        isActive ? 'border-2 border-primary-600' : 'border-neutral-200'
                                    }`}
                                >
                                    {/* Header */}
                                    <View className="mb-3 flex-row items-start justify-between">
                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                {isActive && (
                                                    <View className="mr-2 rounded-full bg-primary-600 px-2 py-1">
                                                        <Text className="text-xs font-bold text-white">ACTIVE</Text>
                                                    </View>
                                                )}
                                                <Text className="text-lg font-bold text-neutral-900">
                                                    {plan.planName}
                                                </Text>
                                            </View>
                                            <Text className="mt-1 text-sm text-neutral-500">
                                                Created {new Date(plan.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>

                                        {/* Actions */}
                                        <View className="flex-row items-center gap-2">
                                            <TouchableOpacity onPress={() => handleEditPlan(plan)} className="p-2">
                                                <Pencil size={18} color="#2563eb" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeletePlan(plan)} className="p-2">
                                                <Trash2 size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Daily Summary */}
                                    <View className="mb-3 rounded-xl bg-neutral-50 p-3">
                                        <Text className="mb-2 text-sm font-semibold text-neutral-600">
                                            Weekly Calories
                                        </Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {[
                                                { day: 'Mon', cal: plan.mondayCalories },
                                                { day: 'Tue', cal: plan.tuesdayCalories },
                                                { day: 'Wed', cal: plan.wednesdayCalories },
                                                { day: 'Thu', cal: plan.thursdayCalories },
                                                { day: 'Fri', cal: plan.fridayCalories },
                                                { day: 'Sat', cal: plan.saturdayCalories },
                                                { day: 'Sun', cal: plan.sundayCalories },
                                            ].map((item) => (
                                                <View key={item.day} className="rounded-lg bg-white px-2 py-1">
                                                    <Text className="text-xs text-neutral-500">{item.day}</Text>
                                                    <Text className="text-sm font-bold text-neutral-900">
                                                        {item.cal}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Activate Button */}
                                    {!isActive && (
                                        <TouchableOpacity
                                            onPress={() => handleActivatePlan(plan.id)}
                                            className="flex-row items-center justify-center rounded-xl border border-primary-200 bg-primary-50 py-3"
                                        >
                                            <Radio size={16} color="#059669" />
                                            <Text className="ml-2 font-semibold text-primary-700">
                                                Activate This Plan
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

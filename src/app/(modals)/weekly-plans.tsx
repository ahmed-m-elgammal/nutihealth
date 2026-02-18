import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Radio, Trash2, Calendar } from 'lucide-react-native';
import {
    getAllWeeklyPlans,
    activatePlan,
    deleteWeeklyPlan,
    getActivePlan,
} from '../../services/api/weeklyGoals';
import { useUIStore } from '../../store/uiStore';
import WeeklyGoalPlan from '../../database/models/WeeklyGoalPlan';

export default function WeeklyPlansScreen() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const [plans, setPlans] = useState<WeeklyGoalPlan[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            setIsLoading(true);
            const [allPlans, active] = await Promise.all([
                getAllWeeklyPlans(),
                getActivePlan(),
            ]);
            setPlans(allPlans);
            setActivePlanId(active?.id || null);
        } catch (error) {
            showToast('error', 'Failed to load weekly plans');
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivatePlan = async (planId: string) => {
        try {
            await activatePlan(planId);
            showToast('success', 'Plan activated');
            loadPlans();
        } catch (error) {
            showToast('error', 'Failed to activate plan');
        }
    };

    const handleDeletePlan = (plan: WeeklyGoalPlan) => {
        Alert.alert(
            'Delete Plan',
            `Are you sure you want to delete "${plan.planName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteWeeklyPlan(plan.id);
                            showToast('success', 'Plan deleted');
                            loadPlans();
                        } catch (error) {
                            showToast('error', 'Failed to delete plan');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="bg-primary-600 px-6 pt-12 pb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-white">
                        Weekly Goal Plans
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-white/20 p-2 rounded-full"
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-white/80 text-sm">
                    Manage your day-specific macro targets
                </Text>
            </View>

            {/* Create Button */}
            <View className="px-6 py-4 bg-white border-b border-neutral-100">
                <TouchableOpacity
                    onPress={() => router.push('/(modals)/create-weekly-plan' as any)}
                    className="bg-primary-600 rounded-2xl py-4 flex-row items-center justify-center"
                >
                    <Plus size={20} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">
                        Create New Plan
                    </Text>
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
                        <Text className="text-neutral-500 text-center mt-4">
                            No weekly plans yet.{'\n'}
                            Create your first plan to get started!
                        </Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {plans.map((plan) => {
                            const isActive = plan.id === activePlanId;

                            return (
                                <View
                                    key={plan.id}
                                    className={`bg-white border rounded-2xl p-4 shadow-sm ${isActive
                                            ? 'border-primary-600 border-2'
                                            : 'border-neutral-200'
                                        }`}
                                >
                                    {/* Header */}
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                {isActive && (
                                                    <View className="bg-primary-600 px-2 py-1 rounded-full mr-2">
                                                        <Text className="text-white text-xs font-bold">
                                                            ACTIVE
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text className="text-lg font-bold text-neutral-900">
                                                    {plan.planName}
                                                </Text>
                                            </View>
                                            <Text className="text-neutral-500 text-sm mt-1">
                                                Created {new Date(plan.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>

                                        {/* Actions */}
                                        <TouchableOpacity
                                            onPress={() => handleDeletePlan(plan)}
                                            className="p-2"
                                        >
                                            <Trash2 size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Daily Summary */}
                                    <View className="bg-neutral-50 rounded-xl p-3 mb-3">
                                        <Text className="text-neutral-600 font-semibold mb-2 text-sm">
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
                                                <View
                                                    key={item.day}
                                                    className="bg-white rounded-lg px-2 py-1"
                                                >
                                                    <Text className="text-neutral-500 text-xs">
                                                        {item.day}
                                                    </Text>
                                                    <Text className="text-neutral-900 font-bold text-sm">
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
                                            className="bg-primary-50 border border-primary-200 rounded-xl py-3 flex-row items-center justify-center"
                                        >
                                            <Radio size={16} color="#059669" />
                                            <Text className="text-primary-700 font-semibold ml-2">
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

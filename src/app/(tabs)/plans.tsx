import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Sparkles, ChefHat, Loader } from 'lucide-react-native';
import { format } from 'date-fns';
import { useDietTemplates, useActiveDiet, useDietMutations } from '../../query/queries/useDiets';
import { useUserStore } from '../../store/userStore';

export default function PlansScreen() {
    const user = useUserStore((state) => state.user);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'plans' | 'templates'>('plans');

    // Real data hooks
    const { data: templates = [], isLoading: isLoadingTemplates } = useDietTemplates();
    const { data: activeUserDiet } = useActiveDiet(user?.id);
    const { activateDiet } = useDietMutations();

    // Find full diet object for active user diet
    const activeDiet = useMemo(() => {
        if (!activeUserDiet?.userDiet || !templates) return null;
        return templates.find(t => t.id === activeUserDiet.userDiet.dietId);
    }, [activeUserDiet, templates]);

    const handleActivatePlan = async (dietId: string) => {
        if (!user?.id) return;
        try {
            await activateDiet.mutateAsync({ userId: user.id, dietId });
            setActiveTab('plans');
        } catch (error) {
            Alert.alert('Unable to activate plan', 'Please try again.');
        }
    };

    if (isLoadingTemplates) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
                <Loader size={32} color="#10b981" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            {/* Header */}
            <View className="bg-white px-6 py-4 border-b border-neutral-100 shadow-sm">
                <Text className="text-2xl font-bold text-neutral-900">Meal Plans</Text>
                <Text className="text-neutral-500 text-sm mt-1">
                    {activeTab === 'plans' ? 'Your nutrition roadmap' : 'Pre-built diet templates'}
                </Text>
            </View>

            {/* Tab Switcher */}
            <View className="bg-white px-6 py-3 flex-row gap-3 border-b border-neutral-100">
                <TouchableOpacity
                    onPress={() => setActiveTab('plans')}
                    accessibilityRole="button"
                    accessibilityLabel="Show my active plans"
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'plans' ? 'bg-primary-600' : 'bg-neutral-100'
                        }`}
                >
                    <Text
                        className={`text-center font-semibold ${activeTab === 'plans' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        My Plans
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('templates')}
                    accessibilityRole="button"
                    accessibilityLabel="Show plan templates"
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'templates' ? 'bg-primary-600' : 'bg-neutral-100'
                        }`}
                >
                    <Text
                        className={`text-center font-semibold ${activeTab === 'templates' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Templates
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {activeTab === 'plans' ? (
                    <>
                        {/* Active Plan Card */}
                        {activeUserDiet?.userDiet && activeDiet ? (
                            <View className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-6 mb-8 shadow-xl">
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-2">
                                        <ChefHat size={24} color="white" />
                                        <Text className="text-white font-bold text-lg">Active Plan</Text>
                                    </View>
                                    <View className="bg-white/20 px-3 py-1 rounded-full">
                                        <Text className="text-white text-xs font-medium">Ongoing</Text>
                                    </View>
                                </View>

                                <Text className="text-white text-2xl font-bold mb-2">{activeDiet.name}</Text>
                                <Text className="text-white/80 text-sm mb-4">
                                    Started {format(new Date(activeUserDiet.userDiet.startDate), 'MMM d, yyyy')}
                                </Text>

                                <View className="flex-row gap-4">
                                    <View className="flex-1 bg-white/10 rounded-xl p-3">
                                        <Text className="text-white/70 text-xs mb-1">Daily Target</Text>
                                        <Text className="text-white font-bold text-lg">{activeDiet.calorieTarget}</Text>
                                        <Text className="text-white/70 text-xs">kcal</Text>
                                    </View>
                                    <View className="flex-1 bg-white/10 rounded-xl p-3">
                                        <Text className="text-white/70 text-xs mb-1">Type</Text>
                                        <Text className="text-white font-bold text-lg capitalize">{activeDiet.type}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-neutral-100 items-center justify-center">
                                <Text className="text-neutral-900 font-bold text-lg mb-2">No Active Plan</Text>
                                <Text className="text-neutral-500 text-center mb-6">Select a template to get started with a structured diet plan.</Text>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('templates')}
                                    className="bg-primary-600 px-6 py-3 rounded-xl"
                                >
                                    <Text className="text-white font-bold">Browse Templates</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Weekly Calendar Placeholder - To be implemented in Phase 3 with Meal Planning */}
                        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100 opacity-50">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-neutral-900 font-bold text-lg">Weekly Schedule</Text>
                                <View className="bg-neutral-100 px-2 py-1 rounded">
                                    <Text className="text-xs text-neutral-500">Coming Soon</Text>
                                </View>
                            </View>
                            <Text className="text-neutral-500 text-sm">Meal planning calendar will be available in the next update.</Text>
                        </View>

                        {/* AI Generate New Plan */}
                        <TouchableOpacity
                            className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 flex-row items-center justify-between shadow-lg active:opacity-80"
                            onPress={() => router.push('/(modals)/ai-chat')}
                            accessibilityRole="button"
                            accessibilityLabel="Open AI meal planner"
                        >
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Sparkles size={20} color="white" />
                                    <Text className="text-white font-bold text-lg">AI Meal Planner</Text>
                                </View>
                                <Text className="text-white/80 text-sm">
                                    Generate a personalized plan with AI
                                </Text>
                            </View>
                            <View className="bg-white/20 p-3 rounded-full">
                                <Plus size={24} color="white" />
                            </View>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Diet Templates */}
                        <Text className="text-neutral-900 font-bold text-lg mb-4">Popular Diet Plans</Text>
                        {templates.map((template) => (
                            <TouchableOpacity
                                key={template.id}
                                className="bg-white rounded-3xl p-6 mb-4 shadow-sm border border-neutral-100 active:opacity-80"
                                onPress={() => handleActivatePlan(template.id)}
                            >
                                <View className="flex-row items-start justify-between mb-3">
                                    <View className="flex-1">
                                        <View className="flex-row items-center gap-2 mb-1">
                                            <Text className="text-neutral-900 font-bold text-lg">{template.name}</Text>
                                        </View>
                                        <Text className="text-neutral-500 text-sm">{template.description}</Text>
                                    </View>
                                    <View
                                        className="px-3 py-1 rounded-full bg-primary-50"
                                    >
                                        <Text className="font-semibold text-xs text-primary-600">
                                            {template.calorieTarget} kcal
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row gap-3 mt-3">
                                    <View className="flex-1 bg-blue-50 rounded-xl p-3">
                                        <Text className="text-blue-600 text-xs font-medium mb-1">Protein</Text>
                                        <Text className="text-blue-900 font-bold">{template.proteinTarget}g</Text>
                                    </View>
                                    <View className="flex-1 bg-orange-50 rounded-xl p-3">
                                        <Text className="text-orange-600 text-xs font-medium mb-1">Carbs</Text>
                                        <Text className="text-orange-900 font-bold">{template.carbsTarget}g</Text>
                                    </View>
                                    <View className="flex-1 bg-purple-50 rounded-xl p-3">
                                        <Text className="text-purple-600 text-xs font-medium mb-1">Fats</Text>
                                        <Text className="text-purple-900 font-bold">{template.fatsTarget}g</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className="bg-neutral-900 rounded-xl py-3 mt-4"
                                    onPress={() => handleActivatePlan(template.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Use ${template.name} plan`}
                                >
                                    <Text className="text-white font-semibold text-center">Use This Plan</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                        {templates.length === 0 && (
                            <Text className="text-neutral-500 text-center mt-4">No templates found. Run seeds to populate.</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

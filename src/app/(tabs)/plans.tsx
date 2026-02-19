import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useDietMutations, useDietTemplates, useActiveDiet } from '../../query/queries/useDiets';
import { useUserStore } from '../../store/userStore';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import ActivePlanHero from '../../components/plans/ActivePlanHero';
import PlanFeaturesTabs from '../../components/plans/PlanFeaturesTabs';
import PlannedMealsTab from '../../components/plans/PlannedMealsTab';
import CarbCycleTab from '../../components/plans/CarbCycleTab';
import PrepTab from '../../components/plans/PrepTab';
import TemplateLibrary from '../../components/plans/TemplateLibrary';
import { useUIStore } from '../../store/uiStore';
import { ProgressSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { NoPlanIllustration } from '../../components/illustrations/EmptyStateIllustrations';

type TabType = 'Meals' | 'Carb Cycle' | 'Prep';

export default function PlansScreen() {
    const router = useRouter();
    const user = useUserStore((state) => state.user);
    const showToast = useUIStore((state) => state.showToast);

    const [activeTab, setActiveTab] = useState<TabType>('Meals');
    const [ingredients, setIngredients] = useState([
        { name: 'Chicken breast', amount: '1.2kg', checked: false },
        { name: 'Brown rice', amount: '900g', checked: false },
        { name: 'Mixed vegetables', amount: '1kg', checked: true },
        { name: 'Greek yogurt', amount: '700g', checked: false },
    ]);

    const { data: templates = [], isLoading: isLoadingTemplates } = useDietTemplates();
    const { data: activeUserDiet, isLoading: isLoadingActiveDiet } = useActiveDiet(user?.id);
    const { activateDiet } = useDietMutations();

    const activeDiet = useMemo(() => {
        if (!activeUserDiet?.userDiet) return null;
        const matched = templates.find((diet) => diet.id === activeUserDiet.userDiet.dietId);
        if (!matched) return null;

        return {
            id: matched.id,
            name: matched.name,
            isActive: activeUserDiet.userDiet.isActive,
            dailyCalories: matched.calorieTarget,
            macros: {
                protein: matched.proteinTarget,
                carbs: matched.carbsTarget,
                fats: matched.fatsTarget,
            },
            startDate: new Date(activeUserDiet.userDiet.startDate),
            endDate: activeUserDiet.userDiet.endDate ? new Date(activeUserDiet.userDiet.endDate) : undefined,
        };
    }, [activeUserDiet?.userDiet, templates]);

    const plannedMeals = useMemo(
        () => [
            {
                type: 'Breakfast',
                time: '08:00',
                targetCalories: 520,
                foods: [
                    { name: 'Overnight oats', amount: '1 bowl', macros: { protein: 28, carbs: 54, fats: 10 } },
                    { name: 'Berries', amount: '120g', macros: { protein: 1, carbs: 14, fats: 0 } },
                ],
            },
            {
                type: 'Lunch',
                time: '13:00',
                targetCalories: 680,
                foods: [
                    { name: 'Chicken rice bowl', amount: '1 plate', macros: { protein: 48, carbs: 65, fats: 16 } },
                    { name: 'Salad', amount: '1 cup', macros: { protein: 2, carbs: 6, fats: 2 } },
                ],
            },
            {
                type: 'Dinner',
                time: '19:00',
                targetCalories: 620,
                foods: [
                    { name: 'Salmon', amount: '180g', macros: { protein: 40, carbs: 0, fats: 24 } },
                    { name: 'Quinoa', amount: '150g', macros: { protein: 6, carbs: 31, fats: 3 } },
                ],
            },
        ],
        [],
    );

    const cycle = useMemo(
        () => [
            {
                day: 'Monday',
                type: 'high' as const,
                adjustedCalories: 2400,
                adjustedMacros: { protein: 170, carbs: 280, fats: 65 },
            },
            {
                day: 'Tuesday',
                type: 'low' as const,
                adjustedCalories: 2050,
                adjustedMacros: { protein: 170, carbs: 170, fats: 75 },
            },
            {
                day: 'Wednesday',
                type: 'high' as const,
                adjustedCalories: 2400,
                adjustedMacros: { protein: 170, carbs: 280, fats: 65 },
            },
            {
                day: 'Thursday',
                type: 'low' as const,
                adjustedCalories: 2050,
                adjustedMacros: { protein: 170, carbs: 170, fats: 75 },
            },
            {
                day: 'Friday',
                type: 'refeed' as const,
                adjustedCalories: 2550,
                adjustedMacros: { protein: 165, carbs: 320, fats: 60 },
            },
            {
                day: 'Saturday',
                type: 'high' as const,
                adjustedCalories: 2400,
                adjustedMacros: { protein: 170, carbs: 280, fats: 65 },
            },
            {
                day: 'Sunday',
                type: 'low' as const,
                adjustedCalories: 2000,
                adjustedMacros: { protein: 170, carbs: 160, fats: 70 },
            },
        ],
        [],
    );

    const templateCards = useMemo(
        () =>
            templates.map((template) => ({
                id: template.id,
                name: template.name,
                type: template.type,
                calories: `${template.calorieTarget} kcal target`,
                color: ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6'][template.name.length % 4],
            })),
        [templates],
    );

    const today = format(new Date(), 'EEEE');

    return (
        <ScreenErrorBoundary screenName="plans">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <View>
                                <Animated.Text
                                    entering={FadeIn.duration(220)}
                                    style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}
                                >
                                    Plans
                                </Animated.Text>
                                <Animated.Text
                                    entering={FadeIn.delay(80).duration(240)}
                                    style={{ marginTop: 4, color: '#64748b' }}
                                >
                                    Active diet, carb cycle, prep and templates
                                </Animated.Text>
                            </View>
                        </View>
                    }
                    headerHeight={120}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {isLoadingTemplates || isLoadingActiveDiet ? (
                        <ProgressSkeleton />
                    ) : (
                        <>
                            <ActivePlanHero
                                plan={activeDiet}
                                onEdit={() => router.push('/(modals)/create-weekly-plan')}
                                onDeactivate={() => {
                                    Alert.alert('Deactivate plan', 'Do you want to deactivate your current plan?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Deactivate',
                                            style: 'destructive',
                                            onPress: () => showToast('info', 'Plan deactivated'),
                                        },
                                    ]);
                                }}
                                onCreatePlan={() => router.push('/(modals)/create-weekly-plan')}
                            />

                            {!activeDiet ? (
                                <EmptyState
                                    illustration={<NoPlanIllustration />}
                                    title="No active plan"
                                    message="Activate a template or create a weekly plan to get meal and prep guidance."
                                    actionLabel="Create Plan"
                                    onAction={() => router.push('/(modals)/create-weekly-plan')}
                                />
                            ) : null}

                            <PlanFeaturesTabs
                                activeTab={activeTab}
                                onTabChange={(tab) => setActiveTab(tab as TabType)}
                            />

                            {activeTab === 'Meals' ? (
                                <Animated.View entering={FadeIn.duration(240)}>
                                    <PlannedMealsTab
                                        plannedMeals={plannedMeals}
                                        onFoodPress={(foodName) => {
                                            showToast('info', `${foodName} ready to prefill add-meal`);
                                        }}
                                    />
                                </Animated.View>
                            ) : null}

                            {activeTab === 'Carb Cycle' ? (
                                <Animated.View entering={FadeIn.duration(240)}>
                                    <CarbCycleTab cycle={cycle} today={today} />
                                </Animated.View>
                            ) : null}

                            {activeTab === 'Prep' ? (
                                <Animated.View entering={FadeIn.duration(240)}>
                                    <PrepTab
                                        ingredients={ingredients}
                                        prepTime={55}
                                        onToggleIngredient={(index) => {
                                            setIngredients((prev) =>
                                                prev.map((item, itemIndex) =>
                                                    itemIndex === index ? { ...item, checked: !item.checked } : item,
                                                ),
                                            );
                                        }}
                                    />
                                </Animated.View>
                            ) : null}

                            <TemplateLibrary
                                templates={templateCards}
                                onTemplatePress={(template) => {
                                    Alert.alert(template.name, `${template.type} • ${template.calories}`, [
                                        {
                                            text: 'Activate',
                                            onPress: () => {
                                                if (!user?.id) return;
                                                activateDiet.mutate({ userId: user.id, dietId: template.id });
                                                showToast('success', `${template.name} activated`);
                                            },
                                        },
                                        { text: 'Close', style: 'cancel' },
                                    ]);
                                }}
                                onTemplateLongPress={(template) => {
                                    if (!user?.id) return;
                                    activateDiet.mutate({ userId: user.id, dietId: template.id });
                                    showToast('success', `${template.name} activated`);
                                }}
                            />
                        </>
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

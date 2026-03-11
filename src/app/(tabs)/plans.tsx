import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import { ProgressSkeleton } from '../../components/skeletons/ScreenSkeletons';
import SmartInsightBanner from '../../components/plans/sections/SmartInsightBanner';
import PrescribedPlanSection from '../../components/plans/sections/PrescribedPlanSection';
import PlanTabsSection from '../../components/plans/sections/PlanTabsSection';
import TemplateLibrarySection from '../../components/plans/sections/TemplateLibrarySection';
import { useColors } from '../../hooks/useColors';
import { usePlansScreenData } from '../../hooks/usePlansScreenData';
import { usePlanActions } from '../../hooks/usePlanActions';
import { useUIStore } from '../../store/uiStore';

export default function PlansScreen() {
    const colors = useColors();
    const { t } = useTranslation();
    const showToast = useUIStore((state) => state.showToast);

    const data = usePlansScreenData();
    const actions = usePlanActions({
        userId: data.user?.id,
        activePlan: data.activePlan,
        activeWeeklyGoalPlanId: data.activeWeeklyGoalPlan?.id,
        activateDiet: data.activateDiet,
        refetchActiveDiet: data.refetchActiveDiet,
        refetchActiveWeeklyGoalPlan: data.refetchActiveWeeklyGoalPlan,
    });

    return (
        <ScreenErrorBoundary screenName="plans">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <View>
                                <Animated.Text
                                    entering={FadeIn.duration(220)}
                                    style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary }}
                                >
                                    {t('plans.title')}
                                </Animated.Text>
                                <Animated.Text
                                    entering={FadeIn.delay(80).duration(240)}
                                    style={{ marginTop: 4, color: colors.text.secondary }}
                                >
                                    {t('plans.subtitle')}
                                </Animated.Text>
                            </View>
                        </View>
                    }
                    headerHeight={120}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {data.loadingPlans ? (
                        <ProgressSkeleton />
                    ) : (
                        <>
                            <PrescribedPlanSection
                                activePlan={data.activePlan}
                                onEdit={actions.handleEditActivePlan}
                                onDeactivate={actions.deactivateCurrentPlan}
                            />

                            <SmartInsightBanner
                                adaptation={data.topAdaptation}
                                onApply={() => {
                                    if (!data.user?.id || !data.topAdaptation) return;
                                    data.applyAdaptation(data.topAdaptation)
                                        .then(() => showToast('success', t('plans.smartInsight.appliedSuccess')))
                                        .catch(() => showToast('error', t('plans.smartInsight.appliedError')));
                                }}
                            />

                            <PlanTabsSection
                                hasActivePlan={data.hasActivePlan}
                                activeTab={data.activeTab}
                                onTabChange={data.setActiveTab}
                                plannedMeals={data.plannedMeals}
                                cycle={data.cycle}
                                today={data.today}
                                todayCycleTarget={data.todayCycleTarget}
                                ingredients={data.ingredients}
                                prepTimeEstimate={data.prepTimeEstimate}
                                onFoodPress={(foodName) => showToast('info', t('plans.foodPrefillReady', { foodName }))}
                                onToggleIngredient={data.toggleIngredient}
                            />

                            <TemplateLibrarySection
                                templateCards={data.templateCards}
                                onActivateTemplate={actions.activateTemplate}
                                onCustomizeTemplate={(template) => {
                                    actions.openPrefilledWeeklyPlan({
                                        name: template.name,
                                        calories: template.calorieTarget,
                                        protein: template.proteinTarget,
                                        carbs: template.carbsTarget,
                                        fats: template.fatsTarget,
                                    });
                                }}
                            />
                        </>
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

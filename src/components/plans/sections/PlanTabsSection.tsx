import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import PlanFeaturesTabs from '../PlanFeaturesTabs';
import PlannedMealsTab from '../PlannedMealsTab';
import CarbCycleTab from '../CarbCycleTab';
import PrepTab from '../PrepTab';
import type { TabType } from '../../../hooks/usePlansScreenData';

type Props = {
    hasActivePlan: boolean;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    plannedMeals: any[];
    cycle: any[];
    today: string;
    todayCycleTarget: any;
    ingredients: Array<{ name: string; amount: string; checked: boolean }>;
    prepTimeEstimate: number;
    onFoodPress: (foodName: string) => void;
    onToggleIngredient: (index: number) => void;
};

export default function PlanTabsSection({
    hasActivePlan,
    activeTab,
    onTabChange,
    plannedMeals,
    cycle,
    today,
    todayCycleTarget,
    ingredients,
    prepTimeEstimate,
    onFoodPress,
    onToggleIngredient,
}: Props) {
    if (!hasActivePlan) {
        return null;
    }

    return (
        <>
            <PlanFeaturesTabs activeTab={activeTab} onTabChange={(tab) => onTabChange(tab as TabType)} />

            {activeTab === 'Meals' ? (
                <Animated.View entering={FadeIn.duration(240)}>
                    <PlannedMealsTab plannedMeals={plannedMeals} onFoodPress={onFoodPress} />
                </Animated.View>
            ) : null}

            {activeTab === 'Carb Cycle' ? (
                <Animated.View entering={FadeIn.duration(240)}>
                    <CarbCycleTab cycle={cycle} today={today} todayTarget={todayCycleTarget} />
                </Animated.View>
            ) : null}

            {activeTab === 'Prep' ? (
                <Animated.View entering={FadeIn.duration(240)}>
                    <PrepTab
                        ingredients={ingredients}
                        prepTime={prepTimeEstimate}
                        onToggleIngredient={onToggleIngredient}
                    />
                </Animated.View>
            ) : null}
        </>
    );
}

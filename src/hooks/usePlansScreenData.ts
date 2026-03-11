import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useDietTemplates, useActiveDiet } from '../query/queries/useDiets';
import { useColors } from './useColors';
import { useCurrentUser } from './useCurrentUser';
import { useDietPlanSuggestions } from './useDietPlanSuggestions';
import { getActivePlan as getActiveWeeklyGoalPlan } from '../services/api/weeklyGoals';
import { useDietMutations } from '../query/mutations/useDietMutations';
import {
    type CarbCycleDay,
    generateCarbCyclePlan,
    getStoredCarbCyclePlan,
    rankDietTemplatesForUser,
} from '../services/dietPlan';

export type TabType = 'Meals' | 'Carb Cycle' | 'Prep';

export type ActivePlanSummary = {
    id: string;
    name: string;
    source: 'template' | 'weekly';
    sourceLabel: string;
    isActive: boolean;
    dailyCalories: number;
    macros: {
        protein: number;
        carbs: number;
        fats: number;
    };
    startDate: Date;
    endDate?: Date;
};

export type PlanTemplateCard = {
    id: string;
    name: string;
    type: string;
    calories: string;
    color: string;
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    score?: number;
    insight?: string;
};

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const defaultMealFallback = [
    { name: 'Lean protein', amount: '1 serving' },
    { name: 'Complex carbs', amount: '1 serving' },
    { name: 'Vegetables', amount: '1 serving' },
];

const titleizeMealType = (type: string) => (!type.length ? 'Meal' : `${type[0].toUpperCase()}${type.slice(1)}`);

const toDateFromTimestamp = (value?: number): Date | undefined => {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
    return new Date(value);
};

const loadCarbCyclePlan = async (userId: string) => {
    const existing = await getStoredCarbCyclePlan(userId);
    if (existing && Array.isArray(existing.weekPattern) && existing.weekPattern.length === 7) {
        return existing;
    }
    return generateCarbCyclePlan(userId);
};

export function usePlansScreenData() {
    const { user } = useCurrentUser();
    const colors = useColors();
    const { activateDiet } = useDietMutations();
    const [activeTab, setActiveTab] = useState<TabType>('Meals');
    const [ingredientChecks, setIngredientChecks] = useState<Record<string, boolean>>({});

    const { data: templates = [], isLoading: isLoadingTemplates } = useDietTemplates();
    const {
        data: activeUserDiet,
        isLoading: isLoadingActiveDiet,
        refetch: refetchActiveDiet,
    } = useActiveDiet(user?.id);
    const {
        data: activeWeeklyGoalPlan,
        isLoading: isLoadingWeeklyGoalPlan,
        refetch: refetchActiveWeeklyGoalPlan,
    } = useQuery({
        queryKey: ['weekly-goal-plans', 'active', user?.id],
        enabled: Boolean(user?.id),
        staleTime: 0,
        queryFn: async () => {
            if (!user?.id) return null;
            return getActiveWeeklyGoalPlan(user.id);
        },
    });

    const {
        suggestions,
        adherenceScore,
        adaptationSuggestions,
        mealPrepPlan,
        workoutAdjustment,
        isLoading: isLoadingIntelligence,
        applyAdaptation,
    } = useDietPlanSuggestions(user?.id);

    const { data: carbCyclePlan } = useQuery({
        queryKey: [
            'carb-cycle-plan',
            user?.id,
            user?.goal,
            user?.activityLevel,
            user?.calorieTarget,
            user?.carbsTarget,
            user?.fatsTarget,
        ],
        enabled: Boolean(user?.id),
        staleTime: 60 * 60 * 1000,
        queryFn: async () => (user?.id ? loadCarbCyclePlan(user.id) : null),
    });

    const templateActivePlan = useMemo<ActivePlanSummary | null>(() => {
        if (!activeUserDiet?.userDiet) return null;
        const matchedTemplate = templates.find((diet) => diet.id === activeUserDiet.userDiet.dietId);
        const source = matchedTemplate || activeUserDiet.diet;
        if (!source) return null;

        return {
            id: source.id,
            name: source.name,
            source: 'template',
            sourceLabel: 'Template',
            isActive: activeUserDiet.userDiet.isActive,
            dailyCalories: source.calorieTarget,
            macros: {
                protein: source.proteinTarget,
                carbs: source.carbsTarget,
                fats: source.fatsTarget,
            },
            startDate: new Date(activeUserDiet.userDiet.startDate),
            endDate: activeUserDiet.userDiet.endDate ? new Date(activeUserDiet.userDiet.endDate) : undefined,
        };
    }, [activeUserDiet?.diet, activeUserDiet?.userDiet, templates]);

    const weeklyActivePlan = useMemo<ActivePlanSummary | null>(() => {
        if (!activeWeeklyGoalPlan) return null;
        const todayMacros = activeWeeklyGoalPlan.getMacrosForDate(new Date());
        return {
            id: activeWeeklyGoalPlan.id,
            name: activeWeeklyGoalPlan.planName,
            source: 'weekly',
            sourceLabel: 'Weekly',
            isActive: activeWeeklyGoalPlan.isActive,
            dailyCalories: todayMacros.calories,
            macros: { protein: todayMacros.protein, carbs: todayMacros.carbs, fats: todayMacros.fats },
            startDate: toDateFromTimestamp(activeWeeklyGoalPlan.startDate) || new Date(),
            endDate: toDateFromTimestamp(activeWeeklyGoalPlan.endDate),
        };
    }, [activeWeeklyGoalPlan]);

    const activePlan = weeklyActivePlan ?? templateActivePlan;
    const hasActivePlan = Boolean(activePlan);
    const today = format(new Date(), 'EEEE');

    const plannedMeals = useMemo(() => {
        if (suggestions.length > 0) {
            return suggestions.map((meal) => {
                const foodCount = Math.max(1, meal.foods.length);
                const macroSplit = {
                    protein: Math.max(0, Math.round(meal.targetProtein / foodCount)),
                    carbs: Math.max(0, Math.round(meal.targetCarbs / foodCount)),
                    fats: Math.max(0, Math.round(meal.targetFats / foodCount)),
                };

                return {
                    type: titleizeMealType(meal.mealType),
                    time: meal.timeWindowStart,
                    targetCalories: meal.targetCalories,
                    foods: meal.foods.map((food) => ({ name: food.name, amount: food.amount, macros: macroSplit })),
                };
            });
        }

        const fallbackCalories = activePlan?.dailyCalories ?? user?.calorieTarget ?? 2000;
        const fallbackProtein = activePlan?.macros.protein ?? user?.proteinTarget ?? 120;
        const fallbackCarbs = activePlan?.macros.carbs ?? user?.carbsTarget ?? 220;
        const fallbackFats = activePlan?.macros.fats ?? user?.fatsTarget ?? 70;
        const ratios = [
            { type: 'Breakfast', time: '08:00', ratio: 0.25 },
            { type: 'Lunch', time: '13:00', ratio: 0.35 },
            { type: 'Dinner', time: '19:00', ratio: 0.3 },
        ];

        return ratios.map((entry) => ({
            type: entry.type,
            time: entry.time,
            targetCalories: Math.round(fallbackCalories * entry.ratio),
            foods: defaultMealFallback.map((food) => ({
                ...food,
                macros: {
                    protein: Math.max(1, Math.round((fallbackProtein * entry.ratio) / defaultMealFallback.length)),
                    carbs: Math.max(1, Math.round((fallbackCarbs * entry.ratio) / defaultMealFallback.length)),
                    fats: Math.max(1, Math.round((fallbackFats * entry.ratio) / defaultMealFallback.length)),
                },
            })),
        }));
    }, [
        activePlan?.dailyCalories,
        activePlan?.macros.carbs,
        activePlan?.macros.fats,
        activePlan?.macros.protein,
        suggestions,
        user?.calorieTarget,
        user?.carbsTarget,
        user?.fatsTarget,
        user?.proteinTarget,
    ]);

    const cycle = useMemo(() => {
        const macroForType = (dayType: CarbCycleDay) => {
            if (!carbCyclePlan) return null;
            if (dayType === 'high') return carbCyclePlan.highCarbMacros;
            if (dayType === 'refeed') return carbCyclePlan.refeedMacros;
            return carbCyclePlan.lowCarbMacros;
        };

        if (carbCyclePlan && carbCyclePlan.weekPattern.length === 7) {
            return DAY_LABELS.map((day, index) => {
                const type = carbCyclePlan.weekPattern[index] || 'low';
                const dayTarget = carbCyclePlan.dayTargets?.[index] || macroForType(type);
                return {
                    day,
                    type,
                    adjustedCalories: dayTarget?.calories,
                    adjustedMacros: dayTarget
                        ? { protein: dayTarget.protein, carbs: dayTarget.carbs, fats: dayTarget.fats }
                        : undefined,
                };
            });
        }

        const baseCalories = activePlan?.dailyCalories ?? user?.calorieTarget ?? 2000;
        const protein = activePlan?.macros.protein ?? user?.proteinTarget ?? 120;
        const carbs = activePlan?.macros.carbs ?? user?.carbsTarget ?? 220;
        const fats = activePlan?.macros.fats ?? user?.fatsTarget ?? 70;
        const workoutBoost = workoutAdjustment
            ? workoutAdjustment.adjustedCalories - workoutAdjustment.baseCalories
            : 0;

        return DAY_LABELS.map((day, index) => {
            const isHighDay = index % 2 === 0;
            const type: CarbCycleDay = isHighDay ? 'high' : 'low';
            const adjustment = isHighDay ? 120 + workoutBoost : -120;
            const calories = Math.max(1200, baseCalories + adjustment);
            return {
                day,
                type,
                adjustedCalories: calories,
                adjustedMacros: {
                    protein,
                    carbs: Math.max(40, carbs + (isHighDay ? 40 : -45)),
                    fats: Math.max(20, fats + (isHighDay ? -8 : 8)),
                },
            };
        });
    }, [
        activePlan?.dailyCalories,
        activePlan?.macros.carbs,
        activePlan?.macros.fats,
        activePlan?.macros.protein,
        carbCyclePlan,
        user?.calorieTarget,
        user?.carbsTarget,
        user?.fatsTarget,
        user?.proteinTarget,
        workoutAdjustment,
    ]);

    const todayCycleTarget = useMemo(() => {
        if (carbCyclePlan && carbCyclePlan.weekPattern.length === 7) {
            const dayIndex = (new Date().getDay() + 6) % 7;
            const type = carbCyclePlan.weekPattern[dayIndex] || 'low';
            const fallbackTarget =
                type === 'high'
                    ? carbCyclePlan.highCarbMacros
                    : type === 'refeed'
                      ? carbCyclePlan.refeedMacros
                      : carbCyclePlan.lowCarbMacros;
            const target = carbCyclePlan.dayTargets?.[dayIndex] || fallbackTarget;

            if (target) {
                return {
                    type,
                    calories: target.calories,
                    macros: { protein: target.protein, carbs: target.carbs, fats: target.fats },
                    source: 'stored-plan' as const,
                };
            }
        }

        const todayEntry = cycle.find((entry) => entry.day === today);
        if (!todayEntry?.adjustedMacros) return null;

        return {
            type: todayEntry.type,
            calories: todayEntry.adjustedCalories || 0,
            macros: todayEntry.adjustedMacros,
            source: 'derived' as const,
        };
    }, [carbCyclePlan, cycle, today]);

    const ingredients = useMemo(() => {
        if (mealPrepPlan?.items?.length) {
            return mealPrepPlan.items.slice(0, 18).map((item) => ({
                name: item.foodName,
                amount: `${item.totalGrams}g`,
                checked: Boolean(ingredientChecks[item.foodName]),
            }));
        }

        return [
            { name: 'Lean protein', amount: '600g', checked: Boolean(ingredientChecks['Lean protein']) },
            { name: 'Whole grains', amount: '500g', checked: Boolean(ingredientChecks['Whole grains']) },
            { name: 'Vegetables', amount: '800g', checked: Boolean(ingredientChecks.Vegetables) },
            { name: 'Healthy fats', amount: '200g', checked: Boolean(ingredientChecks['Healthy fats']) },
        ];
    }, [ingredientChecks, mealPrepPlan?.items]);

    const rankedTemplates = useMemo(() => {
        if (!user || templates.length === 0) return [];
        return rankDietTemplatesForUser({ templates, user, adherenceScore, workoutAdjustment });
    }, [adherenceScore, templates, user, workoutAdjustment]);

    const templateScoreById = useMemo(
        () => new Map(rankedTemplates.map((item) => [item.templateId, item])),
        [rankedTemplates],
    );

    const templateCards = useMemo<PlanTemplateCard[]>(() => {
        return templates
            .map((template) => {
                const recommendation = templateScoreById.get(template.id);
                const tier = recommendation?.tier;
                return {
                    id: template.id,
                    name: template.name,
                    type: template.type,
                    calories: `${template.calorieTarget} kcal target`,
                    calorieTarget: template.calorieTarget,
                    proteinTarget: template.proteinTarget,
                    carbsTarget: template.carbsTarget,
                    fatsTarget: template.fatsTarget,
                    score: recommendation?.score,
                    insight: recommendation?.reasons?.[0],
                    color:
                        tier === 'excellent'
                            ? colors.brand.semantic.success
                            : tier === 'strong'
                              ? colors.brand.primary[500]
                              : tier === 'average'
                                ? colors.brand.semantic.warning
                                : colors.brand.accent[500],
                };
            })
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }, [
        colors.brand.accent,
        colors.brand.primary,
        colors.brand.semantic.success,
        colors.brand.semantic.warning,
        templateScoreById,
        templates,
    ]);

    const topAdaptation = hasActivePlan ? (adaptationSuggestions[0] ?? null) : null;
    const prepTimeEstimate = mealPrepPlan?.estimatedPrepTimeMinutes ?? 45;
    const loadingPlans =
        isLoadingTemplates || isLoadingActiveDiet || isLoadingWeeklyGoalPlan || (!!user?.id && isLoadingIntelligence);

    const toggleIngredient = (index: number) => {
        const ingredient = ingredients[index];
        if (!ingredient) return;
        setIngredientChecks((prev) => ({ ...prev, [ingredient.name]: !prev[ingredient.name] }));
    };

    return {
        user,
        activeTab,
        setActiveTab,
        activePlan,
        hasActivePlan,
        plannedMeals,
        cycle,
        today,
        todayCycleTarget,
        ingredients,
        prepTimeEstimate,
        templateCards,
        topAdaptation,
        loadingPlans,
        applyAdaptation,
        activateDiet,
        activeWeeklyGoalPlan,
        refetchActiveWeeklyGoalPlan,
        refetchActiveDiet,
        toggleIngredient,
    };
}

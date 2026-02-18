import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import { storage } from '../../utils/storage-adapter';
import { getActiveDietPlan, getLoggedMealsForDate, parseTimeToMinutes, safeId, SuggestedMealType } from './helpers';

export type AdaptationSuggestionType = 'timing_shift' | 'portion_adjustment' | 'food_swap' | 'remove_meal_type';

export interface AdaptationSuggestion {
    id: string;
    type: AdaptationSuggestionType;
    title: string;
    description: string;
    confidence: number;
    evidenceCount: number;
    payload: Record<string, unknown>;
}

export interface WeeklyAdaptiveAnalysisResult {
    windowStart: Date;
    windowEnd: Date;
    suggestions: AdaptationSuggestion[];
    analyzedDays: number;
}

type MealTypeMetrics = {
    occurrences: number;
    skipped: number;
    caloriesLogged: number[];
    shiftMinutes: number[];
};

const FEEDBACK_KEY = (userId: string) => `adaptive_feedback_${userId}`;
const LAST_RUN_KEY = (userId: string) => `adaptive_analysis_last_run_${userId}`;

function getPlannedStartMinutes(planMeal: { timeWindowStart: string }) {
    return parseTimeToMinutes(planMeal.timeWindowStart);
}

function toMealTypeArray(): SuggestedMealType[] {
    return ['breakfast', 'lunch', 'dinner', 'snack'];
}

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

export async function runWeeklyAdaptiveAnalysis(userId: string): Promise<WeeklyAdaptiveAnalysisResult> {
    const plan = await getActiveDietPlan(userId);
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 6);

    const suggestions: AdaptationSuggestion[] = [];

    if (!plan) {
        await storage.setItem(LAST_RUN_KEY(userId), String(Date.now()));
        return {
            windowStart,
            windowEnd,
            suggestions,
            analyzedDays: 7,
        };
    }

    const metrics = new Map<SuggestedMealType, MealTypeMetrics>(
        toMealTypeArray().map((type) => [
            type,
            {
                occurrences: 0,
                skipped: 0,
                caloriesLogged: [],
                shiftMinutes: [],
            },
        ]),
    );

    for (let i = 0; i < 7; i += 1) {
        const day = new Date(windowEnd);
        day.setDate(windowEnd.getDate() - i);
        const logged = await getLoggedMealsForDate(userId, day);

        toMealTypeArray().forEach((type) => {
            const planMeal = plan.meals.find((m) => m.mealType === type);
            if (!planMeal) {
                return;
            }

            const dayMetric = metrics.get(type)!;
            const loggedMeal = logged.find((m) => m.mealType.toLowerCase().includes(type === 'snack' ? 'snack' : type));

            if (!loggedMeal) {
                dayMetric.skipped += 1;
                return;
            }

            dayMetric.occurrences += 1;
            dayMetric.caloriesLogged.push(loggedMeal.totalCalories);

            const loggedAt = new Date(loggedMeal.consumedAt);
            const loggedMinutes = loggedAt.getHours() * 60 + loggedAt.getMinutes();
            const plannedMinutes = getPlannedStartMinutes(planMeal);
            const shift = loggedMinutes - plannedMinutes;
            dayMetric.shiftMinutes.push(shift);
        });
    }

    toMealTypeArray().forEach((type) => {
        const planMeal = plan.meals.find((m) => m.mealType === type);
        const m = metrics.get(type);
        if (!planMeal || !m) {
            return;
        }

        if (m.shiftMinutes.length >= 3) {
            const avgShift = m.shiftMinutes.reduce((a, b) => a + b, 0) / m.shiftMinutes.length;
            if (Math.abs(avgShift) >= 30) {
                const confidence = clamp01(m.shiftMinutes.length / 7);
                suggestions.push({
                    id: safeId('timing'),
                    type: 'timing_shift',
                    title: `Shift ${type} timing`,
                    description: `You log ${type} about ${Math.round(Math.abs(avgShift))} minutes ${avgShift > 0 ? 'later' : 'earlier'} than planned.`,
                    confidence,
                    evidenceCount: m.shiftMinutes.length,
                    payload: { mealType: type, shiftMinutes: Math.round(avgShift) },
                });
            }
        }

        if (m.caloriesLogged.length >= 3) {
            const avgLogged = m.caloriesLogged.reduce((a, b) => a + b, 0) / m.caloriesLogged.length;
            const ratio = avgLogged / Math.max(planMeal.targetCalories, 1);
            if (ratio > 1.15 || ratio < 0.85) {
                const confidence = clamp01(m.caloriesLogged.length / 7);
                suggestions.push({
                    id: safeId('portion'),
                    type: 'portion_adjustment',
                    title: `Adjust ${type} portion`,
                    description: `Your ${type} intake is consistently ${ratio > 1 ? 'above' : 'below'} target.`,
                    confidence,
                    evidenceCount: m.caloriesLogged.length,
                    payload: { mealType: type, ratio },
                });
            }
        }

        if (m.skipped > 5) {
            suggestions.push({
                id: safeId('remove-meal-type'),
                type: 'remove_meal_type',
                title: `Make ${type} optional`,
                description: `You skipped ${type} on ${m.skipped} out of 7 days.`,
                confidence: m.skipped >= 6 ? 0.8 : 0.7,
                evidenceCount: m.skipped,
                payload: { mealType: type },
            });
        }

        if (planMeal.foods.length > 0 && m.occurrences <= 1) {
            suggestions.push({
                id: safeId('food-swap'),
                type: 'food_swap',
                title: `Swap foods for ${type}`,
                description: `Planned foods for ${type} appear underused. Consider alternatives you log more often.`,
                confidence: 0.72,
                evidenceCount: Math.max(1, 7 - m.occurrences),
                payload: { mealType: type, plannedFoods: planMeal.foods.map((f) => f.name) },
            });
        }
    });

    await storage.setItem(LAST_RUN_KEY(userId), String(Date.now()));

    return {
        windowStart,
        windowEnd,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
        analyzedDays: 7,
    };
}

export async function applyAdaptationSuggestion(suggestion: AdaptationSuggestion, userId: string): Promise<void> {
    const plan = await getActiveDietPlan(userId);
    if (!plan) {
        return;
    }

    const mealType = String(suggestion.payload.mealType ?? '') as SuggestedMealType;

    const adjustedMeals = plan.meals.map((meal) => {
        if (meal.mealType !== mealType) {
            return meal;
        }

        if (suggestion.type === 'timing_shift') {
            const shiftMinutes = Number(suggestion.payload.shiftMinutes ?? 0);
            const base = parseTimeToMinutes(meal.timeWindowStart);
            const shifted = Math.max(0, base + shiftMinutes);
            const endShifted = shifted + 150;
            const toHm = (mins: number) =>
                `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
            return {
                ...meal,
                timeWindowStart: toHm(shifted),
                timeWindowEnd: toHm(endShifted),
            };
        }

        if (suggestion.type === 'portion_adjustment') {
            const ratio = Number(suggestion.payload.ratio ?? 1);
            return {
                ...meal,
                targetCalories: Math.max(50, Math.round(meal.targetCalories * ratio)),
            };
        }

        if (suggestion.type === 'remove_meal_type') {
            return {
                ...meal,
                name: `${meal.name} (optional)`,
            };
        }

        return meal;
    });

    await database.write(async () => {
        const records = await database
            .get<any>('meal_plans')
            .query(Q.where('user_id', userId), Q.where('is_active', true), Q.take(1))
            .fetch();
        const active = records[0];
        if (!active) {
            return;
        }

        await active.update((record: any) => {
            const current = record.planData || {};
            record.planData = {
                ...current,
                meals: adjustedMeals,
                weekDays: Array.isArray(current.weekDays)
                    ? current.weekDays.map((day: any) => ({
                          ...day,
                          meals: Array.isArray(day.meals)
                              ? day.meals.map(
                                    (meal: any) => adjustedMeals.find((m) => m.mealType === meal.mealType) || meal,
                                )
                              : adjustedMeals,
                      }))
                    : current.weekDays,
            };
        });
    });

    const key = FEEDBACK_KEY(userId);
    const raw = (await storage.getItem(key)) || '[]';
    const parsed: Array<{ suggestionId: string; accepted: boolean; respondedAt: number }> = JSON.parse(raw);
    parsed.push({ suggestionId: suggestion.id, accepted: true, respondedAt: Date.now() });
    await storage.setItem(key, JSON.stringify(parsed));
}

export async function getAdaptationFeedback(
    userId: string,
): Promise<Array<{ suggestionId: string; accepted: boolean; respondedAt: number }>> {
    const raw = await storage.getItem(FEEDBACK_KEY(userId));
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (item) =>
                item &&
                typeof item.suggestionId === 'string' &&
                typeof item.accepted === 'boolean' &&
                typeof item.respondedAt === 'number',
        );
    } catch {
        return [];
    }
}

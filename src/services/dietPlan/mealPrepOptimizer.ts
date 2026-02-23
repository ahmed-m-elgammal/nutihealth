import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import MealPlan from '../../database/models/MealPlan';
import { getActiveDietPlan, SuggestedMeal } from './helpers';

type MealPrepMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type DayLabel = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

type NormalizedMeal = {
    mealType: MealPrepMealType;
    foods: Array<{ name: string; amount: string }>;
};

type NormalizedDayMeals = {
    day: DayLabel;
    meals: NormalizedMeal[];
};

export interface MealPrepItem {
    foodName: string;
    totalGrams: number;
    mealTypes: MealPrepMealType[];
    daysUsed: string[];
    prepNotes: string;
    batchPriority?: 'high' | 'medium' | 'low';
    optimalPrepDay?: string;
}

export interface MealPrepPlan {
    weekStart: Date;
    weekEnd: Date;
    items: MealPrepItem[];
    estimatedPrepTimeMinutes: number;
    totalMealsPrepped: number;
}

const DAY_LABELS: DayLabel[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function normalizeMealType(value: unknown): MealPrepMealType {
    const normalized = String(value || '').toLowerCase();

    if (normalized.includes('break')) return 'breakfast';
    if (normalized.includes('lunch')) return 'lunch';
    if (normalized.includes('dinner') || normalized.includes('supper')) return 'dinner';
    return 'snack';
}

function parseAmountToGrams(rawAmount: string): number {
    const value = String(rawAmount || '')
        .trim()
        .toLowerCase();
    const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ''));
    const quantity = Number.isFinite(numeric) ? numeric : 1;

    if (value.includes('kg')) return quantity * 1000;
    if (value.includes('lb')) return quantity * 453.6;
    if (value.includes('oz')) return quantity * 28.35;
    if (value.includes('ml')) return quantity;
    if (value.includes('cup')) return quantity * 240;
    if (value.includes('tbsp')) return quantity * 15;
    if (value.includes('tsp')) return quantity * 5;
    if (value.includes('slice')) return quantity * 35;
    if (value.includes('piece') || value.includes('serving') || value.includes('bowl')) return quantity * 100;
    if (value.includes('g')) return quantity;

    if (!Number.isFinite(numeric)) {
        return 100;
    }

    return quantity;
}

function noteForItem(totalGrams: number, usageDays: number, mealTypeCount: number): string {
    if (totalGrams >= 800 && usageDays >= 4) {
        return 'Split into two batch-cook windows this week and refrigerate portions.';
    }

    if (totalGrams >= 500) {
        return 'Batch cook once, portion into containers, and freeze overflow for freshness.';
    }

    if (usageDays >= 4 && mealTypeCount >= 2) {
        return 'Prep versatile portions for multiple meals and re-season at serving time.';
    }

    if (totalGrams >= 220) {
        return 'Prepare in one session and store in ready-to-use portions.';
    }

    if (usageDays >= 3) {
        return 'Prep small portions every 2-3 days for better texture and flavor.';
    }

    return 'Prepare fresh or 1-2 days in advance.';
}

function determineBatchPriority(totalGrams: number, usageDays: number): 'high' | 'medium' | 'low' {
    if (totalGrams >= 550 || usageDays >= 5) return 'high';
    if (totalGrams >= 240 || usageDays >= 3) return 'medium';
    return 'low';
}

function getOptimalPrepDay(daysUsed: string[]): string {
    const usedIndexes = daysUsed
        .map((day) => DAY_LABELS.indexOf(day as DayLabel))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b);

    if (usedIndexes.length === 0) return 'Sunday';
    const firstUse = usedIndexes[0];

    if (firstUse <= 1) return 'Sunday';
    if (firstUse <= 3) return 'Tuesday';
    return 'Thursday';
}

function normalizeFoodAmount(food: any): string {
    if (typeof food?.amount === 'string' && food.amount.trim().length > 0) {
        return food.amount;
    }

    if (typeof food?.grams === 'number' && Number.isFinite(food.grams)) {
        return `${Math.round(food.grams)}g`;
    }

    return '1 serving';
}

function toFallbackWeekMeals(planMeals: SuggestedMeal[]): NormalizedDayMeals[] {
    const normalizedMeals: NormalizedMeal[] = planMeals.map((meal) => ({
        mealType: meal.mealType,
        foods: meal.foods.map((food) => ({
            name: food.name,
            amount: food.amount,
        })),
    }));

    return DAY_LABELS.map((day) => ({
        day,
        meals: normalizedMeals,
    }));
}

function toWeekMealsFromRawWeekDays(rawWeekDays: any[]): NormalizedDayMeals[] {
    return rawWeekDays.map((rawDay, index) => {
        const dayName = DAY_LABELS[index] || DAY_LABELS[0];
        const day = DAY_LABELS.includes(rawDay?.day as DayLabel) ? (rawDay.day as DayLabel) : dayName;

        const mealsRaw = Array.isArray(rawDay?.meals) ? rawDay.meals : [];
        const meals: NormalizedMeal[] = mealsRaw.map((meal: any) => {
            const mealType = normalizeMealType(meal?.mealType ?? meal?.type ?? meal?.name);
            const foodsRaw = Array.isArray(meal?.foods) ? meal.foods : [];
            const foods = foodsRaw.map((food: any) => ({
                name: String(food?.name ?? food?.foodName ?? 'Food'),
                amount: normalizeFoodAmount(food),
            }));

            return {
                mealType,
                foods,
            };
        });

        return {
            day,
            meals,
        };
    });
}

async function loadWeekMeals(userId: string, fallbackMeals: SuggestedMeal[]): Promise<NormalizedDayMeals[]> {
    const records = await database
        .get<MealPlan>('meal_plans')
        .query(Q.where('user_id', userId), Q.where('is_active', true), Q.take(1))
        .fetch();

    const active = records[0];
    const rawWeekDays = active?.planData?.weekDays;

    if (Array.isArray(rawWeekDays) && rawWeekDays.length > 0) {
        return toWeekMealsFromRawWeekDays(rawWeekDays);
    }

    return toFallbackWeekMeals(fallbackMeals);
}

export async function buildMealPrepPlan(userId: string): Promise<MealPrepPlan> {
    const plan = await getActiveDietPlan(userId);

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (!plan) {
        return {
            weekStart,
            weekEnd,
            items: [],
            estimatedPrepTimeMinutes: 15,
            totalMealsPrepped: 0,
        };
    }

    const weekMeals = await loadWeekMeals(userId, plan.meals);
    const map = new Map<string, MealPrepItem>();
    let totalMealsPrepped = 0;

    weekMeals.forEach((dayPlan) => {
        dayPlan.meals.forEach((meal) => {
            totalMealsPrepped += 1;
            meal.foods.forEach((food) => {
                const grams = parseAmountToGrams(food.amount);
                const key = food.name.trim().toLowerCase();

                const current = map.get(key);
                if (!current) {
                    map.set(key, {
                        foodName: food.name,
                        totalGrams: grams,
                        mealTypes: [meal.mealType],
                        daysUsed: [dayPlan.day],
                        prepNotes: '',
                    });
                } else {
                    current.totalGrams += grams;
                    if (!current.mealTypes.includes(meal.mealType)) {
                        current.mealTypes.push(meal.mealType);
                    }
                    if (!current.daysUsed.includes(dayPlan.day)) {
                        current.daysUsed.push(dayPlan.day);
                    }
                }
            });
        });
    });

    const items = Array.from(map.values())
        .map((item) => {
            const roundedGrams = Math.round(item.totalGrams);
            const priority = determineBatchPriority(roundedGrams, item.daysUsed.length);
            const usageScore = item.daysUsed.length * 120 + item.mealTypes.length * 50;
            const volumeScore = roundedGrams * 0.7;

            return {
                ...item,
                totalGrams: roundedGrams,
                batchPriority: priority,
                optimalPrepDay: getOptimalPrepDay(item.daysUsed),
                prepNotes: noteForItem(roundedGrams, item.daysUsed.length, item.mealTypes.length),
                __sortScore: usageScore + volumeScore,
            };
        })
        .sort((a, b) => b.__sortScore - a.__sortScore)
        .map(({ __sortScore, ...item }) => item);

    const highPriorityCount = items.filter((item) => item.batchPriority === 'high').length;
    const mediumPriorityCount = items.filter((item) => item.batchPriority === 'medium').length;
    const lowPriorityCount = items.length - highPriorityCount - mediumPriorityCount;

    const estimatedPrepTimeMinutes =
        20 +
        highPriorityCount * 16 +
        mediumPriorityCount * 10 +
        lowPriorityCount * 5 +
        Math.round(totalMealsPrepped * 1.5);

    return {
        weekStart,
        weekEnd,
        items,
        estimatedPrepTimeMinutes,
        totalMealsPrepped,
    };
}

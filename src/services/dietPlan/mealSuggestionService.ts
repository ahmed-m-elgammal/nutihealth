import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import User from '../../database/models/User';
import {
    DietPlan,
    SuggestedMeal,
    SuggestedMealType,
    getActiveDietPlan,
    getLoggedMealsForDate,
    inferMealTypeFromText,
    parseTimeToMinutes,
} from './helpers';

export type { SuggestedMealType, SuggestedMeal, DietPlan };

export function normalizeLoggedMealType(rawType: string): SuggestedMealType {
    const inferred = inferMealTypeFromText(rawType);
    return inferred ?? 'snack';
}

export function getSuggestionByMealType(plan: DietPlan, mealType: SuggestedMealType): SuggestedMeal | null {
    return plan.meals.find((meal) => meal.mealType === mealType) ?? null;
}

function genericSuggestionsFromTarget(targetCalories: number): SuggestedMeal[] {
    const base = Math.max(1200, targetCalories || 2000);

    return [
        {
            id: 'generic-lunch',
            mealType: 'lunch',
            name: 'Balanced Lunch Bowl',
            targetCalories: Math.round(base * 0.35),
            targetProtein: 35,
            targetCarbs: 50,
            targetFats: 18,
            foods: [
                { name: 'Grilled chicken', amount: '150g', calories: 250 },
                { name: 'Brown rice', amount: '120g', calories: 150 },
                { name: 'Mixed vegetables', amount: '100g', calories: 60 },
            ],
            timeWindowStart: '12:00',
            timeWindowEnd: '14:30',
            priority: 1,
        },
        {
            id: 'generic-dinner',
            mealType: 'dinner',
            name: 'Protein-Centered Dinner',
            targetCalories: Math.round(base * 0.3),
            targetProtein: 40,
            targetCarbs: 35,
            targetFats: 16,
            foods: [
                { name: 'Salmon or tofu', amount: '160g', calories: 280 },
                { name: 'Sweet potato', amount: '140g', calories: 120 },
                { name: 'Leafy salad', amount: '80g', calories: 40 },
            ],
            timeWindowStart: '18:00',
            timeWindowEnd: '21:00',
            priority: 2,
        },
    ];
}

export async function getSuggestedMealsForToday(userId: string, date: Date = new Date()): Promise<SuggestedMeal[]> {
    const plan = await getActiveDietPlan(userId);

    if (!plan) {
        const users = await database.get<User>('users').query(Q.where('id', userId), Q.take(1)).fetch();
        const user = users[0];
        return genericSuggestionsFromTarget(user?.calorieTarget || 2000);
    }

    const loggedMeals = await getLoggedMealsForDate(userId, date);
    const loggedTypes = new Set<SuggestedMealType>(
        loggedMeals.map((meal) => normalizeLoggedMealType(meal.mealType)).filter(Boolean),
    );

    return plan.meals
        .filter((meal) => !loggedTypes.has(meal.mealType))
        .sort((a, b) => parseTimeToMinutes(a.timeWindowStart) - parseTimeToMinutes(b.timeWindowStart))
        .map((meal, index) => ({ ...meal, priority: index + 1 }));
}

export async function calculateDailyAdherence(userId: string, date: Date): Promise<number> {
    const [loggedMeals, user] = await Promise.all([
        getLoggedMealsForDate(userId, date),
        database.get<User>('users').find(userId),
    ]);

    const totalCalories = loggedMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    const targetCalories = Math.max(user.calorieTarget || 0, 1);

    return Math.min(100, (totalCalories / targetCalories) * 100);
}

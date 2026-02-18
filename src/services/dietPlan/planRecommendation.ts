import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import MealPlan from '../../database/models/MealPlan';
import User from '../../database/models/User';
import { SuggestedMealType, safeId } from './helpers';

export interface GeneratedMealPlan {
    name: string;
    description: string;
    dailyCalories: number;
    weekDays: DayPlan[];
}

export interface DayPlan {
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    isRestDay: boolean;
    meals: PlannedMeal[];
}

export interface PlannedMeal {
    mealType: SuggestedMealType;
    name: string;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    timeWindow: string;
    foods: Array<{ name: string; grams: number; calories: number }>;
}

const DAYS: DayPlan['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FOOD_LIBRARY: Array<{
    name: string;
    calories: number;
    grams: number;
    tags: string[];
}> = [
    { name: 'Oats', calories: 190, grams: 50, tags: ['vegetarian', 'vegan'] },
    { name: 'Egg whites', calories: 90, grams: 120, tags: ['high-protein'] },
    { name: 'Chicken breast', calories: 240, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Salmon', calories: 280, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Tofu', calories: 180, grams: 160, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Brown rice', calories: 180, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Quinoa', calories: 170, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Greek yogurt', calories: 120, grams: 140, tags: ['vegetarian'] },
    { name: 'Mixed nuts', calories: 170, grams: 30, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Leafy greens', calories: 35, grams: 100, tags: ['vegetarian', 'vegan', 'gluten-free'] },
];

function macroAdjustmentByGoal(goal: string, protein: number, carbs: number, fats: number) {
    if (goal === 'lose') {
        return {
            protein: Math.round(protein * 1.15),
            carbs: Math.round(carbs * 0.85),
            fats: Math.max(20, Math.round(fats)),
        };
    }

    if (goal === 'gain') {
        return {
            protein: Math.round(protein),
            carbs: Math.round(carbs * 1.2),
            fats: Math.round(fats),
        };
    }

    return {
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fats: Math.round(fats),
    };
}

function getWorkoutDayPattern(activityLevel?: string): Set<DayPlan['day']> {
    if (activityLevel === 'very_active' || activityLevel === 'active') {
        return new Set(['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday']);
    }

    if (activityLevel === 'moderate') {
        return new Set(['Monday', 'Wednesday', 'Friday', 'Saturday']);
    }

    return new Set(['Tuesday', 'Thursday', 'Saturday']);
}

function getRestrictions(user: User): string[] {
    const raw = user.preferences;
    const restrictions = raw?.dietary_restrictions;
    if (Array.isArray(restrictions)) {
        return restrictions.map((r) => String(r).toLowerCase());
    }
    return [];
}

function filterFoodsByRestrictions(restrictions: string[]): typeof FOOD_LIBRARY {
    if (restrictions.length === 0) {
        return FOOD_LIBRARY;
    }

    const requireVegan = restrictions.includes('vegan');
    const requireVegetarian = restrictions.includes('vegetarian');
    const requireGlutenFree = restrictions.includes('gluten-free') || restrictions.includes('gluten_free');

    return FOOD_LIBRARY.filter((food) => {
        if (requireVegan && !food.tags.includes('vegan')) return false;
        if (requireVegetarian && !(food.tags.includes('vegetarian') || food.tags.includes('vegan'))) return false;
        if (requireGlutenFree && !food.tags.includes('gluten-free')) return false;
        return true;
    });
}

function mealNameByType(type: SuggestedMealType): string {
    switch (type) {
        case 'breakfast':
            return 'Energy Breakfast';
        case 'lunch':
            return 'Balanced Lunch';
        case 'dinner':
            return 'Recovery Dinner';
        case 'snack':
            return 'Smart Snack';
    }
}

function mealWindowByType(type: SuggestedMealType): string {
    switch (type) {
        case 'breakfast':
            return '07:00-09:30';
        case 'lunch':
            return '12:00-14:30';
        case 'dinner':
            return '18:00-21:00';
        case 'snack':
            return '15:00-17:30';
    }
}

function buildPlannedMeals(
    dailyCalories: number,
    proteinTarget: number,
    carbsTarget: number,
    fatsTarget: number,
    foods: typeof FOOD_LIBRARY,
): PlannedMeal[] {
    const ratios: Record<SuggestedMealType, number> = {
        breakfast: 0.25,
        lunch: 0.35,
        dinner: 0.3,
        snack: 0.1,
    };

    const order: SuggestedMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    return order.map((type, idx) => ({
        mealType: type,
        name: mealNameByType(type),
        targetCalories: Math.round(dailyCalories * ratios[type]),
        targetProtein: Math.max(5, Math.round(proteinTarget * ratios[type])),
        targetCarbs: Math.max(5, Math.round(carbsTarget * ratios[type])),
        targetFats: Math.max(3, Math.round(fatsTarget * ratios[type])),
        timeWindow: mealWindowByType(type),
        foods: foods.slice(idx, idx + 3).map((food) => ({
            name: food.name,
            grams: food.grams,
            calories: food.calories,
        })),
    }));
}

export async function generatePlanForUser(userId: string): Promise<GeneratedMealPlan> {
    const user = await database.get<User>('users').find(userId);

    const baseCalories = user.calorieTarget || 2000;
    const adjusted = macroAdjustmentByGoal(
        user.goal,
        user.proteinTarget || 120,
        user.carbsTarget || 220,
        user.fatsTarget || 70,
    );
    const restrictions = getRestrictions(user);
    const availableFoods = filterFoodsByRestrictions(restrictions);
    const workoutDays = getWorkoutDayPattern(user.activityLevel);

    const weekDays: DayPlan[] = DAYS.map((day) => {
        const isWorkoutDay = workoutDays.has(day);
        const dayCalories = Math.max(1200, baseCalories + (isWorkoutDay ? 150 : -100));

        return {
            day,
            isRestDay: !isWorkoutDay,
            meals: buildPlannedMeals(dayCalories, adjusted.protein, adjusted.carbs, adjusted.fats, availableFoods),
        };
    });

    return {
        name: 'Adaptive Weekly Meal Plan',
        description: 'Auto-generated plan aligned with your goal, schedule, and dietary preferences.',
        dailyCalories: baseCalories,
        weekDays,
    };
}

export async function saveGeneratedPlan(plan: GeneratedMealPlan, userId: string): Promise<void> {
    await database.write(async () => {
        const collection = database.get<MealPlan>('meal_plans');
        const activePlans = await collection.query(Q.where('user_id', userId), Q.where('is_active', true)).fetch();

        for (const existing of activePlans) {
            await existing.update((record) => {
                record.isActive = false;
            });
        }

        await collection.create((record) => {
            record.userId = userId;
            record.name = plan.name;
            record.description = plan.description;
            record.startDate = Date.now();
            record.endDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
            record.planData = {
                id: safeId('generated-plan'),
                dailyCalories: plan.dailyCalories,
                weekDays: plan.weekDays,
                meals: plan.weekDays[0]?.meals ?? [],
            };
            record.isActive = true;
            record.isAiGenerated = true;
        });
    });
}

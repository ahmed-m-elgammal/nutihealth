import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import MealPlan from '../../database/models/MealPlan';
import User from '../../database/models/User';
import { CarbCycleDay, generateCarbCyclePlan } from './carbCycling';
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
    { name: 'Oats', calories: 190, grams: 50, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Chia pudding', calories: 210, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Buckwheat groats', calories: 165, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Millet', calories: 160, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Corn tortillas', calories: 140, grams: 60, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Sweet potato', calories: 130, grams: 170, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'White potato', calories: 140, grams: 180, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Brown rice', calories: 180, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Basmati rice', calories: 185, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Quinoa', calories: 170, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Gluten-free pasta', calories: 210, grams: 130, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Whole wheat pasta', calories: 220, grams: 130, tags: ['vegetarian', 'vegan'] },
    { name: 'Whole grain bread', calories: 170, grams: 70, tags: ['vegetarian', 'vegan'] },
    { name: 'Rice cakes', calories: 105, grams: 27, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Banana', calories: 105, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Apple', calories: 95, grams: 180, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Blueberries', calories: 85, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Strawberries', calories: 50, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Dates', calories: 120, grams: 35, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Lentils', calories: 175, grams: 130, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Chickpeas', calories: 190, grams: 130, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Black beans', calories: 180, grams: 130, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Edamame', calories: 185, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free', 'high-protein'] },
    { name: 'Tofu', calories: 180, grams: 160, tags: ['vegetarian', 'vegan', 'gluten-free', 'high-protein'] },
    { name: 'Tempeh', calories: 195, grams: 120, tags: ['vegetarian', 'vegan', 'gluten-free', 'high-protein'] },
    { name: 'Seitan', calories: 170, grams: 110, tags: ['vegetarian', 'vegan', 'high-protein'] },
    {
        name: 'Pea protein shake',
        calories: 140,
        grams: 35,
        tags: ['vegetarian', 'vegan', 'gluten-free', 'high-protein'],
    },
    { name: 'Egg whites', calories: 90, grams: 120, tags: ['high-protein', 'gluten-free'] },
    { name: 'Whole eggs', calories: 155, grams: 100, tags: ['high-protein', 'gluten-free'] },
    { name: 'Chicken breast', calories: 240, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Turkey breast', calories: 220, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Lean beef', calories: 250, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Salmon', calories: 280, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Tuna', calories: 170, grams: 140, tags: ['high-protein', 'gluten-free'] },
    { name: 'Shrimp', calories: 160, grams: 150, tags: ['high-protein', 'gluten-free'] },
    { name: 'Greek yogurt', calories: 120, grams: 140, tags: ['vegetarian', 'high-protein', 'gluten-free'] },
    { name: 'Skyr yogurt', calories: 110, grams: 150, tags: ['vegetarian', 'high-protein', 'gluten-free'] },
    { name: 'Cottage cheese', calories: 130, grams: 140, tags: ['vegetarian', 'high-protein', 'gluten-free'] },
    { name: 'Halloumi', calories: 160, grams: 60, tags: ['vegetarian', 'gluten-free'] },
    { name: 'Avocado', calories: 160, grams: 100, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Olive oil', calories: 120, grams: 14, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Mixed nuts', calories: 170, grams: 30, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Almond butter', calories: 190, grams: 32, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Peanut butter', calories: 190, grams: 32, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Pumpkin seeds', calories: 170, grams: 30, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Flaxseed', calories: 110, grams: 20, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Leafy greens', calories: 35, grams: 100, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Broccoli', calories: 55, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Cauliflower', calories: 45, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Bell peppers', calories: 45, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Cucumber', calories: 25, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Zucchini', calories: 30, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Mushrooms', calories: 35, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Carrots', calories: 60, grams: 140, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Tomatoes', calories: 30, grams: 160, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Beetroot', calories: 70, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
    { name: 'Green peas', calories: 120, grams: 150, tags: ['vegetarian', 'vegan', 'gluten-free'] },
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
    if (activityLevel === 'athlete' || activityLevel === 'very_active') {
        return new Set(['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday']);
    }

    if (activityLevel === 'moderate') {
        return new Set(['Monday', 'Wednesday', 'Friday', 'Saturday']);
    }

    if (activityLevel === 'light') {
        return new Set(['Tuesday', 'Thursday', 'Saturday']);
    }

    return new Set(['Wednesday', 'Saturday']);
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

function getMealRatios(mode?: CarbCycleDay): Record<SuggestedMealType, number> {
    if (mode === 'refeed') {
        return {
            breakfast: 0.27,
            lunch: 0.36,
            dinner: 0.27,
            snack: 0.1,
        };
    }

    if (mode === 'high') {
        return {
            breakfast: 0.25,
            lunch: 0.36,
            dinner: 0.29,
            snack: 0.1,
        };
    }

    return {
        breakfast: 0.27,
        lunch: 0.33,
        dinner: 0.3,
        snack: 0.1,
    };
}

function pickRotatedFoods(foods: typeof FOOD_LIBRARY, startIndex: number, count: number) {
    if (foods.length === 0) {
        return [];
    }

    const picked: Array<{ name: string; grams: number; calories: number }> = [];
    for (let i = 0; i < count; i += 1) {
        const food = foods[(startIndex + i) % foods.length];
        picked.push({
            name: food.name,
            grams: food.grams,
            calories: food.calories,
        });
    }

    return picked;
}

function buildPlannedMeals(
    dailyCalories: number,
    proteinTarget: number,
    carbsTarget: number,
    fatsTarget: number,
    foods: typeof FOOD_LIBRARY,
    dayIndex: number,
    dayMode?: CarbCycleDay,
): PlannedMeal[] {
    const ratios = getMealRatios(dayMode);

    const order: SuggestedMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    return order.map((type, idx) => ({
        mealType: type,
        name: mealNameByType(type),
        targetCalories: Math.round(dailyCalories * ratios[type]),
        targetProtein: Math.max(5, Math.round(proteinTarget * ratios[type])),
        targetCarbs: Math.max(5, Math.round(carbsTarget * ratios[type])),
        targetFats: Math.max(3, Math.round(fatsTarget * ratios[type])),
        timeWindow: mealWindowByType(type),
        foods: pickRotatedFoods(foods, dayIndex * 2 + idx, 3),
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
    const mealFoods = availableFoods.length > 0 ? availableFoods : FOOD_LIBRARY;
    const workoutDays = getWorkoutDayPattern(user.activityLevel);

    let cyclePlan: Awaited<ReturnType<typeof generateCarbCyclePlan>> | null = null;
    try {
        cyclePlan = await generateCarbCyclePlan(userId);
    } catch {
        cyclePlan = null;
    }

    const weekDays: DayPlan[] = DAYS.map((day, dayIndex) => {
        const isWorkoutDay = workoutDays.has(day);
        const dayMode = cyclePlan?.weekPattern?.[dayIndex];

        const modeTargets =
            dayMode === 'high'
                ? cyclePlan?.highCarbMacros
                : dayMode === 'refeed'
                  ? cyclePlan?.refeedMacros
                  : cyclePlan?.lowCarbMacros;

        const daySpecificTargets = cyclePlan?.dayTargets?.[dayIndex];

        const dayCalories = Math.max(
            1200,
            daySpecificTargets?.calories ?? modeTargets?.calories ?? baseCalories + (isWorkoutDay ? 150 : -100),
        );
        const dayProtein = daySpecificTargets?.protein ?? modeTargets?.protein ?? adjusted.protein;
        const dayCarbs = daySpecificTargets?.carbs ?? modeTargets?.carbs ?? adjusted.carbs;
        const dayFats = daySpecificTargets?.fats ?? modeTargets?.fats ?? adjusted.fats;

        return {
            day,
            isRestDay: dayMode ? dayMode === 'low' : !isWorkoutDay,
            meals: buildPlannedMeals(dayCalories, dayProtein, dayCarbs, dayFats, mealFoods, dayIndex, dayMode),
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

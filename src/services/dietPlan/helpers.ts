import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import MealPlan from '../../database/models/MealPlan';
import User from '../../database/models/User';

export type SuggestedMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SuggestedMeal {
    id: string;
    mealType: SuggestedMealType;
    name: string;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    foods: Array<{ name: string; amount: string; calories: number }>;
    timeWindowStart: string;
    timeWindowEnd: string;
    priority: number;
}

export interface DietPlan {
    id: string;
    name: string;
    dailyCalories: number;
    meals: SuggestedMeal[];
}

export function getDayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
}

export function parseTimeToMinutes(value?: string): number {
    if (!value || !value.includes(':')) {
        return Number.MAX_SAFE_INTEGER;
    }

    const [h, m] = value.split(':').map((n) => Number(n));
    if (Number.isNaN(h) || Number.isNaN(m)) {
        return Number.MAX_SAFE_INTEGER;
    }

    return h * 60 + m;
}

export function inferMealTypeFromText(value: string): SuggestedMealType | null {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
        return null;
    }

    if (['breakfast', 'break fast', 'فطور', 'فطورًا', 'desayuno'].includes(normalized)) return 'breakfast';
    if (['lunch', 'غداء', 'almuerzo', 'comida'].includes(normalized)) return 'lunch';
    if (['dinner', 'عشاء', 'cena', 'supper'].includes(normalized)) return 'dinner';
    if (['snack', 'snacks', 'سناك', 'وجبة خفيفة', 'merienda', 'colación'].includes(normalized)) return 'snack';

    if (normalized.includes('break')) return 'breakfast';
    if (normalized.includes('lunch')) return 'lunch';
    if (normalized.includes('dinner') || normalized.includes('supper')) return 'dinner';
    if (normalized.includes('snack')) return 'snack';

    return null;
}

export function parseTimeWindow(window: string | undefined, fallbackStart: string, fallbackEnd: string) {
    if (!window) {
        return { start: fallbackStart, end: fallbackEnd };
    }

    const clean = window.replace(/\s/g, '');
    const parts = clean.split('-');
    if (parts.length !== 2) {
        return { start: fallbackStart, end: fallbackEnd };
    }

    return {
        start: parts[0] || fallbackStart,
        end: parts[1] || fallbackEnd,
    };
}

function defaultWindow(mealType: SuggestedMealType) {
    switch (mealType) {
        case 'breakfast':
            return { start: '07:00', end: '09:30' };
        case 'lunch':
            return { start: '12:00', end: '14:30' };
        case 'dinner':
            return { start: '18:00', end: '21:00' };
        case 'snack':
            return { start: '15:00', end: '17:30' };
    }
}

function normalizeFoods(rawFoods: any[] | undefined): Array<{ name: string; amount: string; calories: number }> {
    if (!Array.isArray(rawFoods)) {
        return [];
    }

    return rawFoods
        .map((food) => ({
            name: String(food?.name ?? food?.foodName ?? 'Food'),
            amount: String(food?.amount ?? (typeof food?.grams === 'number' ? `${food.grams}g` : '1 serving')),
            calories: Number(food?.calories ?? 0),
        }))
        .filter((food) => food.name.length > 0);
}

export function normalizePlanDataToDietPlan(rawPlan: MealPlan): DietPlan {
    const raw = (rawPlan.planData ?? {}) as any;
    const mealBuckets: any[] = [];

    if (Array.isArray(raw?.meals)) {
        mealBuckets.push(...raw.meals);
    }

    if (Array.isArray(raw?.weekDays)) {
        raw.weekDays.forEach((day: any) => {
            if (Array.isArray(day?.meals)) {
                mealBuckets.push(...day.meals);
            }
        });
    }

    if (Array.isArray(raw)) {
        mealBuckets.push(...raw);
    }

    const byType = new Map<SuggestedMealType, SuggestedMeal>();

    mealBuckets.forEach((meal, index) => {
        const inferred = inferMealTypeFromText(String(meal?.mealType ?? meal?.type ?? meal?.name ?? ''));
        if (!inferred || byType.has(inferred)) {
            return;
        }

        const windowDefaults = defaultWindow(inferred);
        const parsedWindow = parseTimeWindow(
            meal?.timeWindow ?? meal?.time_window,
            windowDefaults.start,
            windowDefaults.end,
        );

        byType.set(inferred, {
            id: String(meal?.id ?? `${rawPlan.id}-${inferred}-${index}`),
            mealType: inferred,
            name: String(meal?.name ?? `${inferred[0].toUpperCase()}${inferred.slice(1)} Meal`),
            targetCalories: Number(meal?.targetCalories ?? meal?.target_calories ?? meal?.calories ?? 0),
            targetProtein: Number(meal?.targetProtein ?? meal?.target_protein ?? meal?.protein ?? 0),
            targetCarbs: Number(meal?.targetCarbs ?? meal?.target_carbs ?? meal?.carbs ?? 0),
            targetFats: Number(meal?.targetFats ?? meal?.target_fats ?? meal?.fats ?? 0),
            foods: normalizeFoods(meal?.foods),
            timeWindowStart: parsedWindow.start,
            timeWindowEnd: parsedWindow.end,
            priority: Number(meal?.priority ?? index + 1),
        });
    });

    const meals = Array.from(byType.values()).sort(
        (a, b) => parseTimeToMinutes(a.timeWindowStart) - parseTimeToMinutes(b.timeWindowStart),
    );

    const dailyCalories = Number(
        raw?.dailyCalories ?? raw?.daily_calories ?? meals.reduce((sum, m) => sum + m.targetCalories, 0),
    );

    return {
        id: rawPlan.id,
        name: rawPlan.name,
        dailyCalories,
        meals,
    };
}

export async function getActiveDietPlan(userId: string): Promise<DietPlan | null> {
    const plans = await database
        .get<MealPlan>('meal_plans')
        .query(Q.where('user_id', userId), Q.where('is_active', true), Q.take(1))
        .fetch();

    if (plans.length === 0) {
        return null;
    }

    return normalizePlanDataToDietPlan(plans[0]);
}

export async function getLoggedMealsForDate(userId: string, date: Date): Promise<Meal[]> {
    const { start, end } = getDayRange(date);
    return database
        .get<Meal>('meals')
        .query(Q.where('user_id', userId), Q.where('consumed_at', Q.gte(start)), Q.where('consumed_at', Q.lte(end)))
        .fetch();
}

export async function getUserById(userId: string): Promise<User> {
    return database.get<User>('users').find(userId);
}

export function safeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

import { getActiveDietPlan } from './helpers';

type MealPrepMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPrepItem {
    foodName: string;
    totalGrams: number;
    mealTypes: MealPrepMealType[];
    daysUsed: string[];
    prepNotes: string;
}

export interface MealPrepPlan {
    weekStart: Date;
    weekEnd: Date;
    items: MealPrepItem[];
    estimatedPrepTimeMinutes: number;
    totalMealsPrepped: number;
}

function noteForGrams(totalGrams: number): string {
    if (totalGrams > 500) {
        return 'Cook in large batch, refrigerate for 4–5 days';
    }
    if (totalGrams >= 200) {
        return 'Prepare in one session, portion into containers';
    }
    return 'Prepare fresh or 1–2 days in advance';
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

    const map = new Map<string, MealPrepItem>();
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let totalMealsPrepped = 0;

    dayLabels.forEach((day) => {
        plan.meals.forEach((meal) => {
            totalMealsPrepped += 1;
            meal.foods.forEach((food) => {
                const grams = Number.parseFloat(food.amount.replace(/[^\d.]/g, '')) || 100;
                const key = food.name.trim().toLowerCase();

                const current = map.get(key);
                if (!current) {
                    map.set(key, {
                        foodName: food.name,
                        totalGrams: grams,
                        mealTypes: [meal.mealType],
                        daysUsed: [day],
                        prepNotes: '',
                    });
                } else {
                    current.totalGrams += grams;
                    if (!current.mealTypes.includes(meal.mealType)) {
                        current.mealTypes.push(meal.mealType);
                    }
                    if (!current.daysUsed.includes(day)) {
                        current.daysUsed.push(day);
                    }
                }
            });
        });
    });

    const items = Array.from(map.values())
        .map((item) => ({
            ...item,
            totalGrams: Math.round(item.totalGrams),
            prepNotes: noteForGrams(item.totalGrams),
        }))
        .sort((a, b) => b.totalGrams - a.totalGrams);

    const estimatedPrepTimeMinutes = 15 + items.length * 10;

    return {
        weekStart,
        weekEnd,
        items,
        estimatedPrepTimeMinutes,
        totalMealsPrepped,
    };
}

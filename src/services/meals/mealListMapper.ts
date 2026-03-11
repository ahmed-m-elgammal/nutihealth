import type Food from '../../database/models/Food';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodListItem = {
    id: string;
    mealId: string;
    mealName: string;
    mealType: MealType;
    consumedAt: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    quantity: number;
    servingUnit?: string;
    brand: string;
    note?: string;
};

export type MealsListRow =
    | {
          id: string;
          kind: 'header';
          mealType: MealType;
          calories: number;
      }
    | {
          id: string;
          kind: 'food';
          food: FoodListItem;
      };

type MealListSummary = {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
};

type MealRecord = {
    id: string;
    name: string;
    mealType?: string;
    consumedAt: number;
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const normalizeMealType = (value: string): MealType => {
    const normalized = value.toLowerCase();
    if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
        return normalized;
    }
    return 'snack';
};

export const mapFoodsForMeals = (meals: MealRecord[], foods: Food[]): FoodListItem[] => {
    const mealMap = new Map(
        meals.map((meal) => [
            meal.id,
            {
                mealName: meal.name,
                mealType: normalizeMealType(meal.mealType || 'snack'),
                consumedAt: meal.consumedAt,
            },
        ]),
    );

    const flattenedFoods = foods
        .map<FoodListItem | null>((food) => {
            const mealDetails = mealMap.get(food.mealId);
            if (!mealDetails) {
                return null;
            }

            return {
                id: food.id,
                mealId: food.mealId,
                mealName: mealDetails.mealName,
                mealType: mealDetails.mealType,
                consumedAt: mealDetails.consumedAt,
                name: food.name,
                calories: food.calories * food.quantity,
                protein: food.protein * food.quantity,
                carbs: food.carbs * food.quantity,
                fats: food.fats * food.quantity,
                quantity: food.quantity,
                servingUnit: food.servingUnit,
                brand: food.brand || 'Logged food',
                note: food.note,
            };
        })
        .filter((food): food is FoodListItem => Boolean(food));

    return flattenedFoods.sort((a, b) => b.consumedAt - a.consumedAt);
};

export const aggregateNutritionFromFoods = (foodsForDay: FoodListItem[]): MealListSummary =>
    foodsForDay.reduce(
        (acc, food) => {
            acc.calories += food.calories;
            acc.protein += food.protein;
            acc.carbs += food.carbs;
            acc.fats += food.fats;
            return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );

export const groupFoodsByMealType = (foodsForDay: FoodListItem[]): Record<MealType, FoodListItem[]> => {
    const initial: Record<MealType, FoodListItem[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
    };

    foodsForDay.forEach((food) => {
        initial[food.mealType].push(food);
    });

    return initial;
};

export const buildMealsListRows = (
    groupedFoods: Record<MealType, FoodListItem[]>,
    expandedMeals: Record<MealType, boolean>,
): MealsListRow[] => {
    const rows: MealsListRow[] = [];

    MEAL_TYPES.forEach((mealType) => {
        const items = groupedFoods[mealType];
        const calories = items.reduce((sum, item) => sum + item.calories, 0);
        rows.push({
            id: `header-${mealType}`,
            kind: 'header',
            mealType,
            calories,
        });

        if (expandedMeals[mealType]) {
            items.forEach((food) => {
                rows.push({
                    id: `food-${food.id}`,
                    kind: 'food',
                    food,
                });
            });
        }
    });

    return rows;
};


import { calculateProgressAggregates } from '../useProgressAggregates';

type MockMeal = {
    consumedAt: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
};

type MockWater = {
    loggedAt: number;
    amount: number;
};

const meal = (daysAgo: number, calories: number, protein = 20, carbs = 25, fats = 10): MockMeal => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);

    return {
        consumedAt: date.getTime(),
        totalCalories: calories,
        totalProtein: protein,
        totalCarbs: carbs,
        totalFats: fats,
    };
};

const water = (daysAgo: number, amount: number): MockWater => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);

    return {
        loggedAt: date.getTime(),
        amount,
    };
};

describe('calculateProgressAggregates', () => {
    it('returns zeros when no meal or water logs are present', () => {
        const result = calculateProgressAggregates([], [] as any);

        expect(result.totalMealsLogged).toBe(0);
        expect(result.mealsThisWeek).toBe(0);
        expect(result.currentStreak).toBe(0);
        expect(result.averageCaloriesLast7Days).toBe(0);
        expect(result.averageMacrosLast7Days).toEqual({ protein: 0, carbs: 0, fats: 0 });
        expect(result.averageWaterLast7Days).toBe(0);
    });

    it('resets streak when meals are not logged on consecutive days', () => {
        const result = calculateProgressAggregates([meal(0, 500), meal(2, 600)] as any, [] as any);

        expect(result.currentStreak).toBe(1);
    });

    it('computes 7-day averages using only days with entries', () => {
        const result = calculateProgressAggregates(
            [meal(0, 500, 30, 40, 15), meal(0, 700, 20, 60, 20), meal(2, 800, 50, 70, 25)] as any,
            [water(0, 2000), water(1, 1500)] as any,
        );

        expect(result.totalMealsLogged).toBe(3);
        expect(result.mealsThisWeek).toBe(3);
        expect(result.averageCaloriesLast7Days).toBe(1000);
        expect(result.averageMacrosLast7Days).toEqual({ protein: 50, carbs: 85, fats: 30 });
        expect(result.averageWaterLast7Days).toBe(1750);
    });
});

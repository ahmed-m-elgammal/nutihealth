import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import User from '../../database/models/User';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import { storage } from '../../utils/storage-adapter';

export type CarbCycleDay = 'high' | 'low' | 'refeed';

export interface CarbCyclePlan {
    userId: string;
    weekPattern: CarbCycleDay[];
    highCarbCalories: number;
    lowCarbCalories: number;
    refeedCalories: number;
    highCarbMacros: MacroTargets;
    lowCarbMacros: MacroTargets;
    refeedMacros: MacroTargets;
}

export interface MacroTargets {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

const PLAN_KEY = (userId: string) => `carb_cycle_plan_${userId}`;

function dayToIndex(day: string): number {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return Math.max(0, days.indexOf(day));
}

export async function generateCarbCyclePlan(userId: string): Promise<CarbCyclePlan> {
    const user = await database.get<User>('users').find(userId);
    const base: MacroTargets = {
        calories: user.calorieTarget || 2000,
        protein: user.proteinTarget || 120,
        carbs: user.carbsTarget || 220,
        fats: user.fatsTarget || 70,
    };

    const schedules = await database
        .get<WorkoutSchedule>('workout_schedules')
        .query(Q.where('user_id', userId))
        .fetch();
    const workoutIndexes = new Set(schedules.map((s) => dayToIndex(s.dayOfWeek)).filter((n) => n >= 0));

    const weekPattern: CarbCycleDay[] = Array.from({ length: 7 }).map((_, idx) =>
        workoutIndexes.has(idx) ? 'high' : 'low',
    );

    const refeedIndex = user.goal === 'lose' ? 6 : 5;
    weekPattern[refeedIndex] = 'refeed';

    const highCarbMacros: MacroTargets = {
        calories: Math.round(base.calories * 1.08),
        protein: base.protein,
        carbs: Math.round(base.carbs * 1.25),
        fats: Math.max(20, Math.round(base.fats * 0.85)),
    };

    const lowCarbMacros: MacroTargets = {
        calories: Math.round(base.calories * 0.93),
        protein: base.protein,
        carbs: Math.max(40, Math.round(base.carbs * 0.7)),
        fats: Math.round(base.fats * 1.15),
    };

    const refeedMacros: MacroTargets = {
        calories: Math.round(base.calories * 1.12),
        protein: Math.round(base.protein * 1.05),
        carbs: Math.round(base.carbs * 1.5),
        fats: Math.max(15, Math.round(base.fats * 0.7)),
    };

    const plan: CarbCyclePlan = {
        userId,
        weekPattern,
        highCarbCalories: highCarbMacros.calories,
        lowCarbCalories: lowCarbMacros.calories,
        refeedCalories: refeedMacros.calories,
        highCarbMacros,
        lowCarbMacros,
        refeedMacros,
    };

    await storage.setItem(PLAN_KEY(userId), JSON.stringify(plan));
    return plan;
}

export async function getTodayCarbCycleTargets(userId: string): Promise<MacroTargets> {
    const rawPlan = await storage.getItem(PLAN_KEY(userId));

    if (!rawPlan) {
        const user = await database.get<User>('users').find(userId);
        return {
            calories: user.calorieTarget || 2000,
            protein: user.proteinTarget || 120,
            carbs: user.carbsTarget || 220,
            fats: user.fatsTarget || 70,
        };
    }

    try {
        const parsed: CarbCyclePlan = JSON.parse(rawPlan);
        const dayIndex = (new Date().getDay() + 6) % 7;
        const mode = parsed.weekPattern[dayIndex] || 'low';

        if (mode === 'high') return parsed.highCarbMacros;
        if (mode === 'refeed') return parsed.refeedMacros;
        return parsed.lowCarbMacros;
    } catch {
        const user = await database.get<User>('users').find(userId);
        return {
            calories: user.calorieTarget || 2000,
            protein: user.proteinTarget || 120,
            carbs: user.carbsTarget || 220,
            fats: user.fatsTarget || 70,
        };
    }
}

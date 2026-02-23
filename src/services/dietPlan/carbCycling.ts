import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import User from '../../database/models/User';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import { storage } from '../../utils/storage-adapter';

export type CarbCycleDay = 'high' | 'low' | 'refeed';
export type CarbCycleWorkoutIntensity = 'rest' | 'light' | 'moderate' | 'heavy';

export interface CarbCyclePlan {
    userId: string;
    weekPattern: CarbCycleDay[];
    highCarbCalories: number;
    lowCarbCalories: number;
    refeedCalories: number;
    highCarbMacros: MacroTargets;
    lowCarbMacros: MacroTargets;
    refeedMacros: MacroTargets;
    dayTargets?: MacroTargets[];
    dayIntensities?: CarbCycleWorkoutIntensity[];
    generatedAt?: number;
    goal?: string;
}

export interface MacroTargets {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

const PLAN_KEY = (userId: string) => `carb_cycle_plan_${userId}`;

function dayToIndex(day: string): number {
    const normalized = String(day || '')
        .trim()
        .toLowerCase();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.indexOf(normalized);
}

const intensityValue: Record<CarbCycleWorkoutIntensity, number> = {
    rest: 0,
    light: 1,
    moderate: 2,
    heavy: 3,
};

function baselineTargetsFromUser(user: User): MacroTargets {
    return {
        calories: user.calorieTarget || 2000,
        protein: user.proteinTarget || 120,
        carbs: user.carbsTarget || 220,
        fats: user.fatsTarget || 70,
    };
}

function inferTemplateIntensity(
    template: {
        name?: string;
        workoutType?: string;
        description?: string;
        exercises?: unknown[];
    } | null,
): CarbCycleWorkoutIntensity {
    if (!template) {
        return 'light';
    }

    const name = String(template.name || '').toLowerCase();
    const workoutType = String(template.workoutType || '').toLowerCase();
    const description = String(template.description || '').toLowerCase();
    const descriptor = `${name} ${workoutType} ${description}`;
    const exerciseCount = Array.isArray(template.exercises) ? template.exercises.length : 0;

    const heavyKeywords = ['hiit', 'crossfit', 'interval', 'strength', 'power', 'leg day', 'sprint', 'metcon'];
    const moderateKeywords = ['upper', 'lower', 'full body', 'hypertrophy', 'push', 'pull', 'conditioning'];

    if (heavyKeywords.some((keyword) => descriptor.includes(keyword)) || exerciseCount >= 8) {
        return 'heavy';
    }

    if (moderateKeywords.some((keyword) => descriptor.includes(keyword)) || exerciseCount >= 5) {
        return 'moderate';
    }

    return 'light';
}

function fallbackIntensityPattern(activityLevel?: string): CarbCycleWorkoutIntensity[] {
    if (activityLevel === 'athlete' || activityLevel === 'very_active') {
        return ['heavy', 'moderate', 'heavy', 'moderate', 'heavy', 'light', 'rest'];
    }

    if (activityLevel === 'moderate') {
        return ['moderate', 'rest', 'moderate', 'rest', 'heavy', 'light', 'rest'];
    }

    if (activityLevel === 'light') {
        return ['light', 'rest', 'moderate', 'rest', 'light', 'rest', 'rest'];
    }

    return ['rest', 'light', 'rest', 'light', 'rest', 'light', 'rest'];
}

function profileForGoal(base: MacroTargets, goal: string, proteinFloor: number) {
    const lossProfile = {
        high: {
            calories: Math.round(base.calories * 1.04),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.05)),
            carbs: Math.max(75, Math.round(base.carbs * 1.22)),
            fats: Math.max(20, Math.round(base.fats * 0.82)),
        },
        low: {
            calories: Math.round(base.calories * 0.88),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.08)),
            carbs: Math.max(40, Math.round(base.carbs * 0.62)),
            fats: Math.max(25, Math.round(base.fats * 1.18)),
        },
        refeed: {
            calories: Math.round(base.calories * 1.1),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.03)),
            carbs: Math.max(90, Math.round(base.carbs * 1.45)),
            fats: Math.max(18, Math.round(base.fats * 0.7)),
        },
    };

    const gainProfile = {
        high: {
            calories: Math.round(base.calories * 1.14),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.03)),
            carbs: Math.max(90, Math.round(base.carbs * 1.35)),
            fats: Math.max(20, Math.round(base.fats * 0.9)),
        },
        low: {
            calories: Math.round(base.calories * 1.03),
            protein: Math.max(proteinFloor, Math.round(base.protein)),
            carbs: Math.max(75, Math.round(base.carbs * 1.05)),
            fats: Math.max(20, Math.round(base.fats * 1.05)),
        },
        refeed: {
            calories: Math.round(base.calories * 1.18),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.04)),
            carbs: Math.max(100, Math.round(base.carbs * 1.55)),
            fats: Math.max(18, Math.round(base.fats * 0.8)),
        },
    };

    const maintainProfile = {
        high: {
            calories: Math.round(base.calories * 1.08),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.02)),
            carbs: Math.max(80, Math.round(base.carbs * 1.25)),
            fats: Math.max(20, Math.round(base.fats * 0.88)),
        },
        low: {
            calories: Math.round(base.calories * 0.94),
            protein: Math.max(proteinFloor, Math.round(base.protein)),
            carbs: Math.max(55, Math.round(base.carbs * 0.72)),
            fats: Math.max(22, Math.round(base.fats * 1.1)),
        },
        refeed: {
            calories: Math.round(base.calories * 1.12),
            protein: Math.max(proteinFloor, Math.round(base.protein * 1.02)),
            carbs: Math.max(90, Math.round(base.carbs * 1.42)),
            fats: Math.max(18, Math.round(base.fats * 0.74)),
        },
    };

    if (goal === 'lose') return lossProfile;
    if (goal === 'gain') return gainProfile;
    return maintainProfile;
}

function chooseWeekPattern(goal: string, intensities: CarbCycleWorkoutIntensity[]): CarbCycleDay[] {
    return intensities.map((intensity) => {
        if (goal === 'lose') {
            return intensity === 'heavy' ? 'high' : 'low';
        }

        if (goal === 'gain') {
            return intensity === 'rest' ? 'low' : 'high';
        }

        return intensity === 'rest' ? 'low' : intensity === 'light' ? 'low' : 'high';
    });
}

function pickRefeedIndex(goal: string, intensities: CarbCycleWorkoutIntensity[]): number {
    const sortedByIntensity = intensities
        .map((value, index) => ({ index, value: intensityValue[value] }))
        .sort((a, b) => b.value - a.value);

    if (sortedByIntensity[0]?.value > 0) {
        return sortedByIntensity[0].index;
    }

    return goal === 'lose' ? 6 : 5;
}

function applyCalorieShift(target: MacroTargets, shiftCalories: number): MacroTargets {
    const nextCalories = Math.max(1200, target.calories + shiftCalories);
    const actualShift = nextCalories - target.calories;

    return {
        calories: nextCalories,
        protein: target.protein,
        carbs: Math.max(40, target.carbs + Math.round(actualShift / 4)),
        fats: target.fats,
    };
}

function rebalanceWeekCalories(
    dayTargets: MacroTargets[],
    pattern: CarbCycleDay[],
    targetWeeklyCalories: number,
): MacroTargets[] {
    const currentWeeklyCalories = dayTargets.reduce((sum, day) => sum + day.calories, 0);
    const delta = targetWeeklyCalories - currentWeeklyCalories;

    if (Math.abs(delta) < 10) {
        return dayTargets;
    }

    const adjustableIndexes = pattern
        .map((dayType, index) => ({ dayType, index }))
        .filter(({ dayType }) => dayType !== 'refeed')
        .map(({ index }) => index);

    const targets = dayTargets.map((day) => ({ ...day }));
    const indexes = adjustableIndexes.length > 0 ? adjustableIndexes : targets.map((_, index) => index);
    const sign = delta > 0 ? 1 : -1;
    const absDelta = Math.abs(delta);
    const baseShift = Math.floor(absDelta / indexes.length);
    let remainder = absDelta % indexes.length;

    indexes.forEach((index) => {
        const shift = sign * (baseShift + (remainder > 0 ? 1 : 0));
        if (remainder > 0) {
            remainder -= 1;
        }
        targets[index] = applyCalorieShift(targets[index], shift);
    });

    return targets;
}

function averageTargetsByType(
    pattern: CarbCycleDay[],
    dayTargets: MacroTargets[],
    type: CarbCycleDay,
    fallback: MacroTargets,
): MacroTargets {
    const subset = dayTargets.filter((_, index) => pattern[index] === type);
    if (subset.length === 0) {
        return fallback;
    }

    const totals = subset.reduce(
        (acc, target) => ({
            calories: acc.calories + target.calories,
            protein: acc.protein + target.protein,
            carbs: acc.carbs + target.carbs,
            fats: acc.fats + target.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );

    return {
        calories: Math.round(totals.calories / subset.length),
        protein: Math.round(totals.protein / subset.length),
        carbs: Math.round(totals.carbs / subset.length),
        fats: Math.round(totals.fats / subset.length),
    };
}

async function workoutIntensitiesForWeek(
    user: User,
    schedules: WorkoutSchedule[],
): Promise<CarbCycleWorkoutIntensity[]> {
    if (schedules.length === 0) {
        return fallbackIntensityPattern(user.activityLevel);
    }

    const intensities: CarbCycleWorkoutIntensity[] = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'];

    await Promise.all(
        schedules.map(async (schedule) => {
            const index = dayToIndex(schedule.dayOfWeek);
            if (index < 0) {
                return;
            }

            const template = await schedule.template.fetch().catch(() => null);
            const inferred = inferTemplateIntensity(template as any);
            if (intensityValue[inferred] > intensityValue[intensities[index]]) {
                intensities[index] = inferred;
            }
        }),
    );

    const hasWorkoutSignal = intensities.some((value) => value !== 'rest');
    return hasWorkoutSignal ? intensities : fallbackIntensityPattern(user.activityLevel);
}

export async function generateCarbCyclePlan(userId: string): Promise<CarbCyclePlan> {
    const user = await database.get<User>('users').find(userId);
    const base = baselineTargetsFromUser(user);
    const proteinFloor = Math.max(
        base.protein,
        Math.round(Math.max(50, user.weight || 70) * (user.goal === 'lose' ? 2 : 1.8)),
    );

    const schedules = await database
        .get<WorkoutSchedule>('workout_schedules')
        .query(Q.where('user_id', userId))
        .fetch();

    const dayIntensities = await workoutIntensitiesForWeek(user, schedules);
    const weekPattern = chooseWeekPattern(user.goal, dayIntensities);
    const refeedIndex = pickRefeedIndex(user.goal, dayIntensities);
    weekPattern[refeedIndex] = 'refeed';

    const profile = profileForGoal(base, user.goal, proteinFloor);
    let dayTargets = weekPattern.map((dayType) => {
        if (dayType === 'high') return { ...profile.high };
        if (dayType === 'refeed') return { ...profile.refeed };
        return { ...profile.low };
    });

    dayTargets = rebalanceWeekCalories(dayTargets, weekPattern, base.calories * 7);

    const highCarbMacros = averageTargetsByType(weekPattern, dayTargets, 'high', profile.high);
    const lowCarbMacros = averageTargetsByType(weekPattern, dayTargets, 'low', profile.low);
    const refeedMacros = averageTargetsByType(weekPattern, dayTargets, 'refeed', profile.refeed);

    const plan: CarbCyclePlan = {
        userId,
        weekPattern,
        highCarbCalories: highCarbMacros.calories,
        lowCarbCalories: lowCarbMacros.calories,
        refeedCalories: refeedMacros.calories,
        highCarbMacros,
        lowCarbMacros,
        refeedMacros,
        dayTargets,
        dayIntensities,
        generatedAt: Date.now(),
        goal: user.goal,
    };

    await storage.setItem(PLAN_KEY(userId), JSON.stringify(plan));
    return plan;
}

async function getFallbackTargets(userId: string): Promise<MacroTargets> {
    const user = await database.get<User>('users').find(userId);
    return baselineTargetsFromUser(user);
}

export async function getTodayCarbCycleTargets(userId: string): Promise<MacroTargets> {
    const rawPlan = await storage.getItem(PLAN_KEY(userId));

    if (!rawPlan) {
        return getFallbackTargets(userId);
    }

    try {
        const parsed: CarbCyclePlan = JSON.parse(rawPlan);
        const dayIndex = (new Date().getDay() + 6) % 7;

        if (Array.isArray(parsed.dayTargets) && parsed.dayTargets[dayIndex]) {
            return parsed.dayTargets[dayIndex];
        }

        const mode = parsed.weekPattern[dayIndex] || 'low';

        if (mode === 'high') return parsed.highCarbMacros;
        if (mode === 'refeed') return parsed.refeedMacros;
        return parsed.lowCarbMacros;
    } catch {
        return getFallbackTargets(userId);
    }
}

export async function getStoredCarbCyclePlan(userId: string): Promise<CarbCyclePlan | null> {
    const rawPlan = await storage.getItem(PLAN_KEY(userId));
    if (!rawPlan) return null;

    try {
        return JSON.parse(rawPlan) as CarbCyclePlan;
    } catch {
        return null;
    }
}

export async function getTodayCarbCycleDay(userId: string): Promise<CarbCycleDay | null> {
    const plan = await getStoredCarbCyclePlan(userId);
    if (!plan) {
        return null;
    }

    const dayIndex = (new Date().getDay() + 6) % 7;
    return plan.weekPattern[dayIndex] ?? null;
}

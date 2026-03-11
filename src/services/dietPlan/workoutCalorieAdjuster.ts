import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import User from '../../database/models/User';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';

export interface DayCalorieAdjustment {
    baseCalories: number;
    adjustedCalories: number;
    adjustedProtein: number;
    adjustedCarbs: number;
    adjustedFats: number;
    reason: string;
    workoutIntensity: 'none' | 'light' | 'moderate' | 'heavy';
}

function dayNameForDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

type WorkoutIntensity = 'light' | 'moderate' | 'heavy';

function normalizeIntensity(value: unknown): WorkoutIntensity | null {
    const normalized = String(value || '')
        .trim()
        .toLowerCase();

    if (normalized === 'heavy') return 'heavy';
    if (normalized === 'moderate') return 'moderate';
    if (normalized === 'light') return 'light';

    return null;
}

function intensityFromWorkoutType(workoutType: unknown): WorkoutIntensity | null {
    const normalized = String(workoutType || '')
        .trim()
        .toLowerCase();

    if (!normalized) {
        return null;
    }

    if (
        normalized.includes('hiit') ||
        normalized.includes('strength') ||
        normalized.includes('power') ||
        normalized.includes('crossfit') ||
        normalized.includes('metcon')
    ) {
        return 'heavy';
    }

    if (
        normalized.includes('cardio') ||
        normalized.includes('conditioning') ||
        normalized.includes('hypertrophy') ||
        normalized.includes('full body')
    ) {
        return 'moderate';
    }

    return 'light';
}

async function inferIntensity(schedule: WorkoutSchedule): Promise<WorkoutIntensity> {
    const directIntensity = normalizeIntensity(schedule.intensity);
    if (directIntensity) {
        return directIntensity;
    }

    const template = await schedule.template.fetch().catch(() => null);
    const templateDerivedIntensity = intensityFromWorkoutType(template?.workoutType);
    if (templateDerivedIntensity) {
        return templateDerivedIntensity;
    }

    const raw: any = schedule;
    const estBurn = Number(raw.estimatedCaloriesBurned ?? raw.estimated_calories_burned ?? raw.caloriesBurned ?? 0);

    if (estBurn > 500) return 'heavy';
    if (estBurn >= 200 && estBurn <= 500) return 'moderate';
    return 'light';
}

export async function getAdjustedTargetsForDate(userId: string, date: Date): Promise<DayCalorieAdjustment> {
    const user = await database.get<User>('users').find(userId);
    const baseCalories = user.calorieTarget || 2000;
    const baseProtein = user.proteinTarget || 120;
    const baseCarbs = user.carbsTarget || 220;
    const baseFats = user.fatsTarget || 70;

    const dayName = dayNameForDate(date);
    const schedules = await database
        .get<WorkoutSchedule>('workout_schedules')
        .query(Q.where('user_id', userId), Q.where('day_of_week', dayName))
        .fetch();

    if (schedules.length === 0) {
        return {
            baseCalories,
            adjustedCalories: baseCalories,
            adjustedProtein: baseProtein,
            adjustedCarbs: baseCarbs,
            adjustedFats: baseFats,
            reason: 'No workout scheduled for this day.',
            workoutIntensity: 'none',
        };
    }

    const intensity = await inferIntensity(schedules[0]);

    if (intensity === 'heavy') {
        return {
            baseCalories,
            adjustedCalories: baseCalories + 300,
            adjustedProtein: baseProtein + 20,
            adjustedCarbs: baseCarbs + 40,
            adjustedFats: baseFats,
            reason: 'Heavy training day detected. Added fuel for performance and recovery.',
            workoutIntensity: 'heavy',
        };
    }

    if (intensity === 'moderate') {
        return {
            baseCalories,
            adjustedCalories: baseCalories + 150,
            adjustedProtein: baseProtein + 10,
            adjustedCarbs: baseCarbs + 20,
            adjustedFats: baseFats,
            reason: 'Moderate workout day detected. Added a moderate energy bump.',
            workoutIntensity: 'moderate',
        };
    }

    return {
        baseCalories,
        adjustedCalories: baseCalories + 75,
        adjustedProtein: baseProtein + 5,
        adjustedCarbs: baseCarbs + 10,
        adjustedFats: baseFats,
        reason: 'Light workout day detected. Added a light energy bump.',
        workoutIntensity: 'light',
    };
}

import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';

export interface WorkoutMealWindow {
    preWorkout: {
        idealEatTime: string;
        latestEatTime: string;
        targetCalories: number;
        targetCarbs: number;
        targetProtein: number;
        suggestion: string;
    };
    postWorkout: {
        idealEatTime: string;
        windowCloses: string;
        targetCalories: number;
        targetCarbs: number;
        targetProtein: number;
        suggestion: string;
    };
    workoutStartTime: string;
    workoutEndTime: string;
}

function dayName(date: Date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function parseHm(value: string): number {
    const [h, m] = value.split(':').map((n) => Number(n));
    return h * 60 + m;
}

function toHm(minutes: number): string {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function getWorkoutMealWindows(userId: string, date: Date): Promise<WorkoutMealWindow | null> {
    const schedules = await database
        .get<WorkoutSchedule>('workout_schedules')
        .query(Q.where('user_id', userId), Q.where('day_of_week', dayName(date)), Q.take(1))
        .fetch();

    if (schedules.length === 0) {
        return null;
    }

    const schedule: any = schedules[0];
    const workoutStartTime = String(schedule.scheduledTime ?? schedule.scheduled_time ?? '18:00');
    const estimatedDurationMinutes = Number(
        schedule.estimatedDurationMinutes ?? schedule.estimated_duration_minutes ?? 60,
    );

    const startMinutes = parseHm(workoutStartTime);
    const endMinutes = startMinutes + estimatedDurationMinutes;

    const preIdeal = startMinutes - 90;
    const preLatest = startMinutes - 60;
    const postIdeal = endMinutes + 45;
    const postClose = endMinutes + 120;

    return {
        preWorkout: {
            idealEatTime: toHm(preIdeal),
            latestEatTime: toHm(preLatest),
            targetCalories: 350,
            targetCarbs: 45,
            targetProtein: 20,
            suggestion: 'Choose easily digestible carbs and lean protein before training.',
        },
        postWorkout: {
            idealEatTime: toHm(postIdeal),
            windowCloses: toHm(postClose),
            targetCalories: 450,
            targetCarbs: 45,
            targetProtein: 35,
            suggestion: 'Prioritize high-protein recovery with moderate carbs post-workout.',
        },
        workoutStartTime: toHm(startMinutes),
        workoutEndTime: toHm(endMinutes),
    };
}

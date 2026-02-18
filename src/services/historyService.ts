import { WorkoutSession, ExerciseSet } from '../types/workout';

/**
 * Get the last performance data for a specific exercise
 */
export function getLastPerformance(
    exerciseId: string,
    history: WorkoutSession[]
): ExerciseSet[] | null {
    // Sort history by date (most recent first)
    const sortedHistory = [...history].sort((a, b) => b.date - a.date);

    // Find the most recent session containing this exercise
    for (const session of sortedHistory) {
        const exercise = session.exercises.find(ex => ex.exerciseId === exerciseId);
        if (exercise && exercise.sets.length > 0) {
            return exercise.sets;
        }
    }

    return null;
}

/**
 * Get the last workout date for streak calculation
 */
export function getLastWorkoutDate(history: WorkoutSession[]): number | null {
    if (history.length === 0) return null;
    const sortedHistory = [...history].sort((a, b) => b.date - a.date);
    return sortedHistory[0].date;
}

/**
 * Calculate current streak (consecutive days with workouts)
 */
export function calculateStreak(history: WorkoutSession[]): number {
    if (history.length === 0) return 0;

    const sortedHistory = [...history].sort((a, b) => b.date - a.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    for (const session of sortedHistory) {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Workout on current check date
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (daysDiff === 1) {
            // Workout on previous day
            streak++;
            currentDate = new Date(sessionDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            // Gap found, break streak
            break;
        }
    }

    return streak;
}

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { WeeklyWorkoutPlan, WorkoutDay, WorkoutSession, UserStats } from '../types/workout';
import { storage } from '../utils/storage-adapter';

interface WorkoutState {
    currentPlan: WeeklyWorkoutPlan | null;
    activeWorkout: WorkoutDay | null;
    history: WorkoutSession[];
    stats: UserStats;
    setPlan: (plan: WeeklyWorkoutPlan) => void;
    setActiveWorkout: (day: WorkoutDay | null) => void;
    getWorkoutDay: (dayId: string) => WorkoutDay | undefined;
    addSession: (session: WorkoutSession) => void;
}

const DEFAULT_STATS: UserStats = {
    currentStreak: 0,
    longestStreak: 0,
    personalRecords: [],
    totalWorkouts: 0,
};

export const useWorkoutStore = create<WorkoutState>()(
    persist(
        (set, get) => ({
            currentPlan: null,
            activeWorkout: null,
            history: [],
            stats: DEFAULT_STATS,
            setPlan: (plan) => set({ currentPlan: plan }),
            setActiveWorkout: (day) => set({ activeWorkout: day }),
            getWorkoutDay: (dayId) => {
                const plan = get().currentPlan;
                return plan?.days.find((d) => d.id === dayId);
            },
            addSession: (session) => {
                const { history, stats } = get();
                const newHistory = [session, ...history];

                // Update basic stats
                const newStats = {
                    ...stats,
                    totalWorkouts: stats.totalWorkouts + 1,
                    lastWorkoutDate: session.date,
                    // Streak logic would go here (simplified for now)
                };

                // Personal Record Logic
                session.exercises.forEach((ex) => {
                    const maxWeight = Math.max(...ex.sets.map((s) => s.weight || 0));
                    if (maxWeight > 0) {
                        const existingPR = stats.personalRecords.find((p) => p.exerciseId === ex.exerciseId);
                        if (!existingPR || maxWeight > existingPR.weight) {
                            // Update PR
                            const prIndex = newStats.personalRecords.findIndex((p) => p.exerciseId === ex.exerciseId);
                            const newPR = {
                                exerciseId: ex.exerciseId,
                                weight: maxWeight,
                                reps: ex.sets.find((s) => s.weight === maxWeight)?.actualReps || 0,
                                date: Date.now(),
                            };

                            if (prIndex > -1) newStats.personalRecords[prIndex] = newPR;
                            else newStats.personalRecords.push(newPR);
                        }
                    }
                });

                set({ history: newHistory, stats: newStats });
            },
        }),
        {
            name: 'workout-storage-v3',
            storage: createJSONStorage(() => ({
                getItem: (key: string) => storage.getItem(key),
                setItem: (key: string, value: string) => storage.setItem(key, value),
                removeItem: (key: string) => storage.removeItem(key),
            })),
        },
    ),
);

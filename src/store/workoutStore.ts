import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { WeeklyWorkoutPlan, WorkoutDay, WorkoutSession as TrackedWorkoutSession, UserStats } from '../types/workout';
import { database } from '../database';
import WorkoutSession from '../database/models/WorkoutSession';
import { storage } from '../utils/storage-adapter';
import { getUserId } from '../utils/storage';

type PersistableWorkoutSession = TrackedWorkoutSession & {
    templateId?: string;
    endedAt?: number;
    caloriesBurned?: number;
    totalVolume?: number;
    intensity?: 'light' | 'moderate' | 'heavy';
};

interface WorkoutState {
    currentPlan: WeeklyWorkoutPlan | null;
    activeWorkout: WorkoutDay | null;
    history: TrackedWorkoutSession[];
    stats: UserStats;
    setPlan: (plan: WeeklyWorkoutPlan) => void;
    setActiveWorkout: (day: WorkoutDay | null) => void;
    getWorkoutDay: (dayId: string) => WorkoutDay | undefined;
    addSession: (session: TrackedWorkoutSession) => void;
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
                const persistableSession = session as PersistableWorkoutSession;

                // 1 — Persist to WatermelonDB so history survives reinstalls
                const persistToDB = async () => {
                    const userId = await getUserId();
                    if (!userId) return;

                    await database.write(async () => {
                        await database.get<WorkoutSession>('workout_sessions').create((record) => {
                            record.userId = userId;
                            record.planId = session.planId;
                            record.dayId = session.dayId;
                            record.templateId = persistableSession.templateId;
                            record.startedAt = session.date;
                            record.endedAt = persistableSession.endedAt;
                            record.durationMinutes = session.duration;
                            record.caloriesBurned = persistableSession.caloriesBurned;
                            record.totalVolumeKg = persistableSession.totalVolume;
                            record.intensity = persistableSession.intensity;
                            record.notes = session.notes;
                            record.exercises = session.exercises;
                        });
                    });
                };

                persistToDB().catch((err) => console.warn('[WorkoutStore] Failed to persist session to DB:', err));

                // 2 — Keep existing Zustand state for immediate UI updates
                const newHistory = [session, ...history];
                const newStats = {
                    ...stats,
                    totalWorkouts: stats.totalWorkouts + 1,
                    lastWorkoutDate: session.date,
                };

                // 3 — Personal Record logic (unchanged)
                session.exercises.forEach((ex) => {
                    const maxWeight = Math.max(...ex.sets.map((s) => s.weight || 0));
                    if (maxWeight > 0) {
                        const prIndex = newStats.personalRecords.findIndex((p) => p.exerciseId === ex.exerciseId);
                        const existingPR = newStats.personalRecords[prIndex];
                        if (!existingPR || maxWeight > existingPR.weight) {
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

import { create } from 'zustand';
import { database } from '../database';
import { handleError } from '../utils/errors';
import User from '../database/models/User';
import {
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacros,
    type ActivityLevel,
    type Goal,
} from '../utils/calculations';

interface UserState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    loadUser: () => Promise<void>;
    createUser: (userData: UserData) => Promise<void>;
    updateUser: (updates: Partial<UserData>) => Promise<void>;
    updateUserTargets: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
}

export interface UserData {
    name: string;
    email?: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    height: number;
    weight: number;
    goal: Goal;
    activityLevel: ActivityLevel;
    targetWeight?: number;
    preferences?: {
        allergies: string[];
        dietary_restrictions: string[];
        theme: 'light' | 'dark' | 'auto';
        notifications_enabled: boolean;
        language: string;
    };
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    isLoading: false,
    error: null,

    loadUser: async () => {
        try {
            set({ isLoading: true, error: null });
            const usersCollection = database.get<User>('users');
            const users = await usersCollection.query().fetch();
            set({ user: users.length > 0 ? users[0] : null, isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.loadUser');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createUser: async (userData: UserData) => {
        try {
            set({ isLoading: true, error: null });
            const bmr = calculateBMR(userData.weight, userData.height, userData.age, userData.gender);
            const tdee = calculateTDEE(bmr, userData.activityLevel);
            const calorieTarget = calculateCalorieTarget(tdee, userData.goal);
            const macros = calculateMacros(calorieTarget, userData.goal);

            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                const user = await usersCollection.create((newUser) => {
                    newUser.name = userData.name;
                    newUser.email = userData.email;
                    newUser.age = userData.age;
                    newUser.gender = userData.gender;
                    newUser.height = userData.height;
                    newUser.weight = userData.weight;
                    newUser.goal = userData.goal;
                    newUser.activityLevel = userData.activityLevel;
                    newUser.targetWeight = userData.targetWeight;
                    newUser.bmr = bmr;
                    newUser.tdee = tdee;
                    newUser.calorieTarget = calorieTarget;
                    newUser.proteinTarget = macros.protein;
                    newUser.carbsTarget = macros.carbs;
                    newUser.fatsTarget = macros.fats;
                    newUser.stats = { current_streak: 0, total_workouts: 0, total_meals_logged: 0, achievements: [] };
                    newUser.preferences = userData.preferences || {
                        allergies: [], dietary_restrictions: [], theme: 'auto', notifications_enabled: true, language: 'en',
                    };
                    newUser.onboardingCompleted = false;
                });
                set({ user, isLoading: false });
            });
        } catch (error) {
            handleError(error, 'userStore.createUser');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateUser: async (updates: Partial<UserData>) => {
        const { user } = get();
        if (!user) return;
        try {
            set({ isLoading: true, error: null });
            await database.write(async () => {
                await user.update((record) => {
                    if (updates.name) record.name = updates.name;
                    if (updates.email !== undefined) record.email = updates.email;
                    if (updates.age) record.age = updates.age;
                    if (updates.gender) record.gender = updates.gender;
                    if (updates.height) record.height = updates.height;
                    if (updates.weight) record.weight = updates.weight;
                    if (updates.goal) record.goal = updates.goal;
                    if (updates.activityLevel) record.activityLevel = updates.activityLevel;
                    if (updates.targetWeight !== undefined) record.targetWeight = updates.targetWeight;
                    if (updates.preferences) record.preferences = updates.preferences;
                });
            });
            if (updates.weight || updates.height || updates.age || updates.gender || updates.activityLevel || updates.goal) {
                await get().updateUserTargets();
            }
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.updateUser');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateUserTargets: async () => {
        const { user } = get();
        if (!user) return;
        try {
            const bmr = calculateBMR(user.weight, user.height, user.age, user.gender as 'male' | 'female' | 'other');
            const tdee = calculateTDEE(bmr, user.activityLevel as ActivityLevel);
            const calorieTarget = calculateCalorieTarget(tdee, user.goal as Goal);
            const macros = calculateMacros(calorieTarget, user.goal as Goal);
            await database.write(async () => {
                await user.update((record) => {
                    record.bmr = bmr;
                    record.tdee = tdee;
                    record.calorieTarget = calorieTarget;
                    record.proteinTarget = macros.protein;
                    record.carbsTarget = macros.carbs;
                    record.fatsTarget = macros.fats;
                });
            });
        } catch (error) {
            handleError(error, 'userStore.updateUserTargets');
            set({ error: (error as Error).message });
        }
    },

    completeOnboarding: async () => {
        const { user } = get();
        if (!user) return;
        try {
            await database.write(async () => {
                await user.update((record) => { record.onboardingCompleted = true; });
            });
        } catch (error) {
            handleError(error, 'userStore.completeOnboarding');
            set({ error: (error as Error).message });
        }
    },
}));

import { create } from 'zustand';
import { database } from '../database';
import { waitForDatabaseReady } from '../database/ready';
import { handleError } from '../utils/errors';
import User from '../database/models/User';
import {
    calculateNutritionTargets,
    type ActivityLevel,
    type Goal,
} from '../utils/calculations';
import { clearAuthData } from '../utils/storage';
import { UserWorkoutProfile } from '../types/workout';

interface UserState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    loadUser: () => Promise<void>;
    createUser: (userData: UserData) => Promise<void>;
    updateUser: (updates: Partial<UserData>) => Promise<void>;
    updateUserTargets: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    logout: () => Promise<void>;
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
        needsBodyMetrics?: boolean;
        bodyFatPercentage?: number;
        hasPCOS?: boolean;
        hasInsulinResistance?: boolean;
        onHormonalContraception?: boolean;
        isPostMenopause?: boolean;
        isAthlete?: boolean;
        week1WeightKg?: number;
        compliancePercentage?: number;
    };
    workoutPreferences?: UserWorkoutProfile;
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null, // @deprecated - components should observe DB
    isLoading: false,
    error: null,

    loadUser: async () => {
        try {
            set({ isLoading: true, error: null });
            await waitForDatabaseReady();
            const usersCollection = database.get<User>('users');
            const users = await usersCollection.query().fetch();
            // We still keep a reference for non-reactive needs, but UI should avoid it
            set({ user: users.length > 0 ? users[0] : null, isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.loadUser');
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    createUser: async (userData: UserData) => {
        try {
            set({ isLoading: true, error: null });

            const preferences = userData.preferences || {
                allergies: [],
                dietary_restrictions: [],
                theme: 'auto' as const,
                notifications_enabled: true,
                language: 'en',
                needsBodyMetrics: false,
            };

            const nutrition = calculateNutritionTargets({
                age: userData.age,
                sex: userData.gender,
                heightCm: userData.height,
                weightKg: userData.weight,
                goal: userData.goal,
                activityLevel: userData.activityLevel,
                bodyFatPercentage: preferences.bodyFatPercentage,
                isAthlete: preferences.isAthlete,
                hasPCOS: preferences.hasPCOS,
                hasInsulinResistance: preferences.hasInsulinResistance,
                onHormonalContraception: preferences.onHormonalContraception,
                isPostMenopause: preferences.isPostMenopause,
                week1WeightKg: preferences.week1WeightKg,
                currentWeightKg: userData.weight,
                compliancePercentage: preferences.compliancePercentage,
            });

            let newUser: User;

            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                newUser = await usersCollection.create((user) => {
                    user.name = userData.name;
                    user.email = userData.email;
                    user.age = userData.age;
                    user.gender = userData.gender;
                    user.height = userData.height;
                    user.weight = userData.weight;
                    user.goal = userData.goal;
                    user.activityLevel = userData.activityLevel;
                    user.targetWeight = userData.targetWeight;

                    // Initial targets
                    user.bmr = nutrition.bmr;
                    user.tdee = nutrition.tdee;
                    user.calorieTarget = nutrition.calorieTarget;
                    user.proteinTarget = nutrition.macros.protein;
                    user.carbsTarget = nutrition.macros.carbs;
                    user.fatsTarget = nutrition.macros.fats;

                    user.stats = { current_streak: 0, total_workouts: 0, total_meals_logged: 0, achievements: [] };
                    user.preferences = preferences;
                    user.workoutPreferences = userData.workoutPreferences || null;
                    user.onboardingCompleted = false;
                });
            });

            set({ user: newUser!, isLoading: false });
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
            // User model now handles recalculation internally via updateProfile
            await user.updateProfile(updates);
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.updateUser');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateUserTargets: async () => {
        // @deprecated - logic moved to User.updateProfile
        const { user } = get();
        if (!user) return;
        // Force a profile update with current values to trigger recalculation if needed
        await user.updateProfile({});
    },

    completeOnboarding: async () => {
        const { user } = get();
        if (!user) return;
        try {
            await user.updateProfile({ onboardingCompleted: true });
        } catch (error) {
            handleError(error, 'userStore.completeOnboarding');
            set({ error: (error as Error).message });
        }
    },

    logout: async () => {
        try {
            await clearAuthData();
            set({ user: null, error: null });
        } catch (error) {
            handleError(error, 'userStore.logout');
            set({ error: (error as Error).message });
        }
    },
}));

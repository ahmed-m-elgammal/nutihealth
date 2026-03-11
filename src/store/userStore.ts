import { create } from 'zustand';
import { database } from '../database';
import { waitForDatabaseReady } from '../database/ready';
import { handleError } from '../utils/errors';
import User from '../database/models/User';
import { calculateNutritionTargets, type ActivityLevel, type Goal } from '../utils/nutrition';
import { getUserId, setUserId } from '../utils/storage';
import { UserWorkoutProfile } from '../types/workout';
import { supabase } from '../services/supabaseClient';
import { deleteAccountAndWipeLocalData } from '../services/accountDeletion';
import { withOnboardingPreferenceDefaults } from '../constants/onboarding';
import { clearAuthData } from '../utils/storage';

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
    deleteAccount: () => Promise<void>;
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

const findUserById = async (userId: string): Promise<User | null> => {
    await waitForDatabaseReady();
    const usersCollection = database.get<User>('users');
    try {
        return await usersCollection.find(userId);
    } catch {
        return null;
    }
};

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    isLoading: false,
    error: null,

    loadUser: async () => {
        try {
            set({ isLoading: true, error: null });
            const activeUserId = await getUserId();
            if (!activeUserId) {
                set({ user: null, isLoading: false });
                return;
            }

            const user = await findUserById(activeUserId);
            set({ user, isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.loadUser');
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    createUser: async (userData: UserData) => {
        try {
            set({ isLoading: true, error: null });

            let authenticatedUserId: string | null = null;
            if (supabase) {
                try {
                    const {
                        data: { user: authenticatedUser },
                        error: authenticatedUserError,
                    } = await supabase.auth.getUser();

                    if (!authenticatedUserError && authenticatedUser?.id) {
                        authenticatedUserId = authenticatedUser.id;
                    }
                } catch {
                    // Non-fatal: local-first fallback still works.
                }
            }

            const preferences = withOnboardingPreferenceDefaults(userData.preferences);

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

            const initialStats = { current_streak: 0, total_workouts: 0, total_meals_logged: 0, achievements: [] };
            const serializedWorkoutPreferences = userData.workoutPreferences
                ? JSON.stringify(userData.workoutPreferences)
                : null;
            let newUser: User;

            await database.write(async () => {
                const usersCollection = database.get<User>('users');
                if (authenticatedUserId) {
                    // Use an explicit record id without touching internal _raw fields.
                    const preparedUser = usersCollection.prepareCreateFromDirtyRaw({
                        id: authenticatedUserId,
                        name: userData.name,
                        email: userData.email,
                        age: userData.age,
                        gender: userData.gender,
                        height: userData.height,
                        weight: userData.weight,
                        goal: userData.goal,
                        activity_level: userData.activityLevel,
                        target_weight: userData.targetWeight,
                        bmr: nutrition.bmr,
                        tdee: nutrition.tdee,
                        calorie_target: nutrition.calorieTarget,
                        protein_target: nutrition.macros.protein,
                        carbs_target: nutrition.macros.carbs,
                        fats_target: nutrition.macros.fats,
                        stats: JSON.stringify(initialStats),
                        preferences: JSON.stringify(preferences),
                        workout_preferences: serializedWorkoutPreferences,
                        onboarding_completed: false,
                    });
                    await database.batch(preparedUser);
                    newUser = preparedUser as User;
                    return;
                }

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

                    user.stats = initialStats;
                    user.preferences = preferences;
                    user.workoutPreferences = userData.workoutPreferences || null;
                    user.onboardingCompleted = false;
                });
            });

            await setUserId(newUser!.id);
            set({ user: newUser!, isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.createUser');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateUser: async (updates: Partial<UserData>) => {
        try {
            set({ isLoading: true, error: null });

            let activeUser = get().user;
            if (!activeUser) {
                const activeUserId = await getUserId();
                if (!activeUserId) {
                    throw new Error('No active user session found.');
                }

                activeUser = await findUserById(activeUserId);
                if (activeUser) {
                    set({ user: activeUser });
                }
            }

            if (!activeUser) {
                throw new Error('No active user profile found.');
            }

            // User model now handles recalculation internally via updateProfile.
            await activeUser.updateProfile(updates as Partial<User>);
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'userStore.updateUser');
            set({ error: (error as Error).message, isLoading: false });
            throw error;
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
            await supabase.auth.signOut({ scope: 'global' });
            await clearAuthData();
            set({ user: null, error: null });
            await database.unsafeResetDatabase();
        } catch (error) {
            handleError(error, 'userStore.logout');
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deleteAccount: async () => {
        try {
            set({ isLoading: true, error: null });
            await deleteAccountAndWipeLocalData();
            set({ user: null, isLoading: false, error: null });
        } catch (error) {
            handleError(error, 'userStore.deleteAccount');
            set({ isLoading: false, error: (error as Error).message });
            throw error;
        }
    },
}));

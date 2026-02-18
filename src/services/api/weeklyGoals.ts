import { database } from '../../database';
import WeeklyGoalPlan from '../../database/models/WeeklyGoalPlan';
import { DailyMacros } from '../../types/models';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';

/**
 * Weekly Goal Plan Service
 * 
 * Provides functions to manage weekly goal plans, allowing users to set
 * different macro targets for each day of the week.
 */

export interface CreateWeeklyPlanData {
    planName: string;
    startDate?: Date;
    endDate?: Date;
    // Monday
    mondayCalories: number;
    mondayProtein: number;
    mondayCarbs: number;
    mondayFats: number;
    // Tuesday
    tuesdayCalories: number;
    tuesdayProtein: number;
    tuesdayCarbs: number;
    tuesdayFats: number;
    // Wednesday
    wednesdayCalories: number;
    wednesdayProtein: number;
    wednesdayCarbs: number;
    wednesdayFats: number;
    // Thursday
    thursdayCalories: number;
    thursdayProtein: number;
    thursdayCarbs: number;
    thursdayFats: number;
    // Friday
    fridayCalories: number;
    fridayProtein: number;
    fridayCarbs: number;
    fridayFats: number;
    // Saturday
    saturdayCalories: number;
    saturdayProtein: number;
    saturdayCarbs: number;
    saturdayFats: number;
    // Sunday
    sundayCalories: number;
    sundayProtein: number;
    sundayCarbs: number;
    sundayFats: number;
}

/**
 * Create a new weekly goal plan
 */
export async function createWeeklyPlan(data: CreateWeeklyPlanData): Promise<WeeklyGoalPlan> {
    try {
        const plan = await database.write(async () => {
            // Get current user
            const usersCollection = database.get<any>('users');
            const users = await usersCollection.query().fetch();

            if (users.length === 0) {
                throw new Error('No user found. Please complete onboarding first.');
            }

            const userId = users[0].id;

            // Create plan
            const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
            return await plansCollection.create((plan) => {
                plan.userId = userId;
                plan.planName = data.planName;
                plan.isActive = false; // Don't automatically activate
                plan.startDate = data.startDate ? data.startDate.getTime() : Date.now();
                plan.endDate = data.endDate?.getTime();

                // Monday
                plan.mondayCalories = data.mondayCalories;
                plan.mondayProtein = data.mondayProtein;
                plan.mondayCarbs = data.mondayCarbs;
                plan.mondayFats = data.mondayFats;

                // Tuesday
                plan.tuesdayCalories = data.tuesdayCalories;
                plan.tuesdayProtein = data.tuesdayProtein;
                plan.tuesdayCarbs = data.tuesdayCarbs;
                plan.tuesdayFats = data.tuesdayFats;

                // Wednesday
                plan.wednesdayCalories = data.wednesdayCalories;
                plan.wednesdayProtein = data.wednesdayProtein;
                plan.wednesdayCarbs = data.wednesdayCarbs;
                plan.wednesdayFats = data.wednesdayFats;

                // Thursday
                plan.thursdayCalories = data.thursdayCalories;
                plan.thursdayProtein = data.thursdayProtein;
                plan.thursdayCarbs = data.thursdayCarbs;
                plan.thursdayFats = data.thursdayFats;

                // Friday
                plan.fridayCalories = data.fridayCalories;
                plan.fridayProtein = data.fridayProtein;
                plan.fridayCarbs = data.fridayCarbs;
                plan.fridayFats = data.fridayFats;

                // Saturday
                plan.saturdayCalories = data.saturdayCalories;
                plan.saturdayProtein = data.saturdayProtein;
                plan.saturdayCarbs = data.saturdayCarbs;
                plan.saturdayFats = data.saturdayFats;

                // Sunday
                plan.sundayCalories = data.sundayCalories;
                plan.sundayProtein = data.sundayProtein;
                plan.sundayCarbs = data.sundayCarbs;
                plan.sundayFats = data.sundayFats;
            });
        });

        return plan;
    } catch (error) {
        handleError(error, 'weeklyGoals.createWeeklyPlan');
        throw error;
    }
}

/**
 * Get all weekly goal plans
 */
export async function getAllWeeklyPlans(): Promise<WeeklyGoalPlan[]> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        const plans = await plansCollection
            .query(Q.sortBy('created_at', Q.desc))
            .fetch();

        return plans;
    } catch (error) {
        handleError(error, 'weeklyGoals.getAllWeeklyPlans');
        throw error;
    }
}

/**
 * Get the currently active weekly goal plan
 */
export async function getActivePlan(): Promise<WeeklyGoalPlan | null> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        const plans = await plansCollection
            .query(Q.where('is_active', true))
            .fetch();

        if (plans.length === 0) {
            return null;
        }

        // Should only be one active plan, but return the first if multiple exist
        return plans[0];
    } catch (error) {
        handleError(error, 'weeklyGoals.getActivePlan');
        throw error;
    }
}

/**
 * Get today's macro targets from the active plan
 * Falls back to user's default targets if no active plan
 */
export async function getTodaysMacros(): Promise<DailyMacros | null> {
    try {
        const activePlan = await getActivePlan();

        if (!activePlan) {
            return null;
        }

        const today = new Date();

        // Check if plan is valid for today
        if (!activePlan.isValidForDate(today)) {
            return null;
        }

        return activePlan.getMacrosForDate(today);
    } catch (error) {
        handleError(error, 'weeklyGoals.getTodaysMacros');
        throw error;
    }
}

/**
 * Get macros for a specific date from the active plan
 */
export async function getMacrosForDate(date: Date): Promise<DailyMacros | null> {
    try {
        const activePlan = await getActivePlan();

        if (!activePlan || !activePlan.isValidForDate(date)) {
            return null;
        }

        return activePlan.getMacrosForDate(date);
    } catch (error) {
        handleError(error, 'weeklyGoals.getMacrosForDate');
        throw error;
    }
}

/**
 * Activate a weekly goal plan
 * Automatically deactivates all other plans
 */
export async function activatePlan(planId: string): Promise<void> {
    try {
        await database.write(async () => {
            const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');

            // Deactivate all plans
            const allPlans = await plansCollection.query().fetch();
            for (const plan of allPlans) {
                if (plan.isActive) {
                    await plan.deactivate();
                }
            }

            // Activate selected plan
            const selectedPlan = await plansCollection.find(planId);
            await selectedPlan.activate();
        });
    } catch (error) {
        handleError(error, 'weeklyGoals.activatePlan');
        throw error;
    }
}

/**
 * Deactivate a weekly goal plan
 */
export async function deactivatePlan(planId: string): Promise<void> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        const plan = await plansCollection.find(planId);
        await plan.deactivate();
    } catch (error) {
        handleError(error, 'weeklyGoals.deactivatePlan');
        throw error;
    }
}

/**
 * Update a weekly goal plan
 */
export async function updateWeeklyPlan(
    planId: string,
    updates: Partial<CreateWeeklyPlanData>
): Promise<void> {
    try {
        await database.write(async () => {
            const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
            const plan = await plansCollection.find(planId);

            await plan.update((p) => {
                if (updates.planName) p.planName = updates.planName;
                if (updates.startDate) p.startDate = updates.startDate.getTime();
                if (updates.endDate !== undefined) {
                    p.endDate = updates.endDate?.getTime();
                }

                // Update macros if provided
                if (updates.mondayCalories !== undefined) p.mondayCalories = updates.mondayCalories;
                if (updates.mondayProtein !== undefined) p.mondayProtein = updates.mondayProtein;
                if (updates.mondayCarbs !== undefined) p.mondayCarbs = updates.mondayCarbs;
                if (updates.mondayFats !== undefined) p.mondayFats = updates.mondayFats;

                if (updates.tuesdayCalories !== undefined) p.tuesdayCalories = updates.tuesdayCalories;
                if (updates.tuesdayProtein !== undefined) p.tuesdayProtein = updates.tuesdayProtein;
                if (updates.tuesdayCarbs !== undefined) p.tuesdayCarbs = updates.tuesdayCarbs;
                if (updates.tuesdayFats !== undefined) p.tuesdayFats = updates.tuesdayFats;

                if (updates.wednesdayCalories !== undefined) p.wednesdayCalories = updates.wednesdayCalories;
                if (updates.wednesdayProtein !== undefined) p.wednesdayProtein = updates.wednesdayProtein;
                if (updates.wednesdayCarbs !== undefined) p.wednesdayCarbs = updates.wednesdayCarbs;
                if (updates.wednesdayFats !== undefined) p.wednesdayFats = updates.wednesdayFats;

                if (updates.thursdayCalories !== undefined) p.thursdayCalories = updates.thursdayCalories;
                if (updates.thursdayProtein !== undefined) p.thursdayProtein = updates.thursdayProtein;
                if (updates.thursdayCarbs !== undefined) p.thursdayCarbs = updates.thursdayCarbs;
                if (updates.thursdayFats !== undefined) p.thursdayFats = updates.thursdayFats;

                if (updates.fridayCalories !== undefined) p.fridayCalories = updates.fridayCalories;
                if (updates.fridayProtein !== undefined) p.fridayProtein = updates.fridayProtein;
                if (updates.fridayCarbs !== undefined) p.fridayCarbs = updates.fridayCarbs;
                if (updates.fridayFats !== undefined) p.fridayFats = updates.fridayFats;

                if (updates.saturdayCalories !== undefined) p.saturdayCalories = updates.saturdayCalories;
                if (updates.saturdayProtein !== undefined) p.saturdayProtein = updates.saturdayProtein;
                if (updates.saturdayCarbs !== undefined) p.saturdayCarbs = updates.saturdayCarbs;
                if (updates.saturdayFats !== undefined) p.saturdayFats = updates.saturdayFats;

                if (updates.sundayCalories !== undefined) p.sundayCalories = updates.sundayCalories;
                if (updates.sundayProtein !== undefined) p.sundayProtein = updates.sundayProtein;
                if (updates.sundayCarbs !== undefined) p.sundayCarbs = updates.sundayCarbs;
                if (updates.sundayFats !== undefined) p.sundayFats = updates.sundayFats;
            });
        });
    } catch (error) {
        handleError(error, 'weeklyGoals.updateWeeklyPlan');
        throw error;
    }
}

/**
 * Delete a weekly goal plan
 */
export async function deleteWeeklyPlan(planId: string): Promise<void> {
    try {
        await database.write(async () => {
            const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
            const plan = await plansCollection.find(planId);
            await plan.markAsDeleted();
        });
    } catch (error) {
        handleError(error, 'weeklyGoals.deleteWeeklyPlan');
        throw error;
    }
}

/**
 * Helper: Create a simple plan with same macros every day
 */
export async function createUniformPlan(
    planName: string,
    calories: number,
    protein: number,
    carbs: number,
    fats: number
): Promise<WeeklyGoalPlan> {
    return createWeeklyPlan({
        planName,
        mondayCalories: calories,
        mondayProtein: protein,
        mondayCarbs: carbs,
        mondayFats: fats,
        tuesdayCalories: calories,
        tuesdayProtein: protein,
        tuesdayCarbs: carbs,
        tuesdayFats: fats,
        wednesdayCalories: calories,
        wednesdayProtein: protein,
        wednesdayCarbs: carbs,
        wednesdayFats: fats,
        thursdayCalories: calories,
        thursdayProtein: protein,
        thursdayCarbs: carbs,
        thursdayFats: fats,
        fridayCalories: calories,
        fridayProtein: protein,
        fridayCarbs: carbs,
        fridayFats: fats,
        saturdayCalories: calories,
        saturdayProtein: protein,
        saturdayCarbs: carbs,
        saturdayFats: fats,
        sundayCalories: calories,
        sundayProtein: protein,
        sundayCarbs: carbs,
        sundayFats: fats,
    });
}

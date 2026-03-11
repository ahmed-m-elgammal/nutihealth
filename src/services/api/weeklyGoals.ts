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
            return await plansCollection.create((record) => {
                record.userId = userId;
                record.planName = data.planName;
                record.isActive = false; // Don't automatically activate
                record.startDate = data.startDate ? data.startDate.getTime() : Date.now();
                record.endDate = data.endDate?.getTime();

                // Monday
                record.mondayCalories = data.mondayCalories;
                record.mondayProtein = data.mondayProtein;
                record.mondayCarbs = data.mondayCarbs;
                record.mondayFats = data.mondayFats;

                // Tuesday
                record.tuesdayCalories = data.tuesdayCalories;
                record.tuesdayProtein = data.tuesdayProtein;
                record.tuesdayCarbs = data.tuesdayCarbs;
                record.tuesdayFats = data.tuesdayFats;

                // Wednesday
                record.wednesdayCalories = data.wednesdayCalories;
                record.wednesdayProtein = data.wednesdayProtein;
                record.wednesdayCarbs = data.wednesdayCarbs;
                record.wednesdayFats = data.wednesdayFats;

                // Thursday
                record.thursdayCalories = data.thursdayCalories;
                record.thursdayProtein = data.thursdayProtein;
                record.thursdayCarbs = data.thursdayCarbs;
                record.thursdayFats = data.thursdayFats;

                // Friday
                record.fridayCalories = data.fridayCalories;
                record.fridayProtein = data.fridayProtein;
                record.fridayCarbs = data.fridayCarbs;
                record.fridayFats = data.fridayFats;

                // Saturday
                record.saturdayCalories = data.saturdayCalories;
                record.saturdayProtein = data.saturdayProtein;
                record.saturdayCarbs = data.saturdayCarbs;
                record.saturdayFats = data.saturdayFats;

                // Sunday
                record.sundayCalories = data.sundayCalories;
                record.sundayProtein = data.sundayProtein;
                record.sundayCarbs = data.sundayCarbs;
                record.sundayFats = data.sundayFats;
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
export async function getAllWeeklyPlans(userId?: string): Promise<WeeklyGoalPlan[]> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        const plans = userId
            ? await plansCollection.query(Q.where('user_id', userId), Q.sortBy('created_at', Q.desc)).fetch()
            : await plansCollection.query(Q.sortBy('created_at', Q.desc)).fetch();

        return plans;
    } catch (error) {
        handleError(error, 'weeklyGoals.getAllWeeklyPlans');
        throw error;
    }
}

/**
 * Get the currently active weekly goal plan
 */
export async function getActivePlan(userId?: string): Promise<WeeklyGoalPlan | null> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        const plans = userId
            ? await plansCollection.query(Q.where('user_id', userId), Q.where('is_active', true)).fetch()
            : await plansCollection.query(Q.where('is_active', true)).fetch();

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
 * Get a weekly goal plan by ID
 */
export async function getWeeklyPlanById(planId: string): Promise<WeeklyGoalPlan | null> {
    try {
        const plansCollection = database.get<WeeklyGoalPlan>('weekly_goal_plans');
        return await plansCollection.find(planId);
    } catch (error) {
        handleError(error, 'weeklyGoals.getWeeklyPlanById');
        return null;
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
export async function updateWeeklyPlan(planId: string, updates: Partial<CreateWeeklyPlanData>): Promise<void> {
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

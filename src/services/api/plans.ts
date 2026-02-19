import { database } from '../../database';
import Diet from '../../database/models/Diet';
import UserDiet from '../../database/models/UserDiet';
import MealPlan from '../../database/models/MealPlan';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';

function normalizeRestrictions(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((entry) => String(entry));
            }
        } catch {
            return [value];
        }
    }

    if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).map((entry) => String(entry));
    }

    return [];
}

export interface DietData {
    name: string;
    description?: string;
    type: 'preset' | 'custom';
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    fiberTarget?: number;
    restrictions?: string[];
}

/**
 * Get all available diet templates
 */
export async function getDietTemplates(): Promise<Diet[]> {
    try {
        const dietsCollection = database.get<Diet>('diets');
        const templates = await dietsCollection.query(Q.where('type', 'preset')).fetch();

        templates.forEach((diet) => {
            (diet as Diet & { restrictions: unknown }).restrictions = normalizeRestrictions(
                (diet as Diet & { restrictions: unknown }).restrictions,
            );
        });

        return templates;
    } catch (error) {
        handleError(error, 'plansApi.getDietTemplates');
        throw error;
    }
}

/**
 * Get user's active diet plan with diet relation loaded
 */
export async function getActiveUserDiet(userId: string): Promise<{ userDiet: UserDiet; diet: Diet } | null> {
    try {
        const userDietsCollection = database.get<UserDiet>('user_diets');
        const userDiets = await userDietsCollection
            .query(Q.where('user_id', userId), Q.where('is_active', true), Q.take(1))
            .fetch();

        if (userDiets.length === 0) {
            return null;
        }

        const userDiet = userDiets[0];
        const diet = await userDiet.diet.fetch();
        (diet as Diet & { restrictions: unknown }).restrictions = normalizeRestrictions(
            (diet as Diet & { restrictions: unknown }).restrictions,
        );

        return { userDiet, diet };
    } catch (error) {
        handleError(error, 'plansApi.getActiveUserDiet');
        throw error;
    }
}

/**
 * Activate a diet for a user
 */
export async function activateDiet(
    userId: string,
    dietId: string,
    startDate: Date = new Date(),
    endDate?: Date,
): Promise<UserDiet> {
    try {
        let newUserDiet: UserDiet | null = null;

        await database.write(async () => {
            const userDietsCollection = database.get<UserDiet>('user_diets');

            // Deactivate current active diet
            const currentActive = await userDietsCollection
                .query(Q.where('user_id', userId), Q.where('is_active', true))
                .fetch();

            for (const diet of currentActive) {
                await diet.update((d) => {
                    d.isActive = false;
                });
            }

            // Create new active user diet
            newUserDiet = await userDietsCollection.create((userDiet) => {
                userDiet.userId = userId;
                userDiet.dietId = dietId;
                userDiet.startDate = startDate;
                if (endDate) {
                    userDiet.endDate = endDate;
                }
                userDiet.isActive = true;
            });
        });

        return newUserDiet!;
    } catch (error) {
        handleError(error, 'plansApi.activateDiet');
        throw error;
    }
}

/**
 * Create a custom diet template
 */
export async function createCustomDiet(dietData: DietData): Promise<Diet> {
    try {
        let diet: Diet | null = null;
        await database.write(async () => {
            const dietsCollection = database.get<Diet>('diets');
            diet = await dietsCollection.create((d) => {
                d.name = dietData.name;
                d.description = dietData.description;
                d.type = 'custom';
                d.calorieTarget = dietData.calorieTarget;
                d.proteinTarget = dietData.proteinTarget;
                d.carbsTarget = dietData.carbsTarget;
                d.fatsTarget = dietData.fatsTarget;
                d.fiberTarget = dietData.fiberTarget || 0;
                d.restrictions = normalizeRestrictions(dietData.restrictions || []);
                d.isActive = true;
            });
        });
        return diet!;
    } catch (error) {
        handleError(error, 'plansApi.createCustomDiet');
        throw error;
    }
}

/**
 * Get active meal plan (weekly schedule)
 */
export async function getActiveMealPlan(userId: string): Promise<MealPlan | null> {
    try {
        const mealPlansCollection = database.get<MealPlan>('meal_plans');
        const plans = await mealPlansCollection
            .query(Q.where('user_id', userId), Q.where('is_active', true), Q.take(1))
            .fetch();
        return plans.length > 0 ? plans[0] : null;
    } catch (error) {
        handleError(error, 'plansApi.getActiveMealPlan');
        throw error;
    }
}

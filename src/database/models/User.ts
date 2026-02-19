import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json as jsonField, writer } from '@nozbe/watermelondb/decorators';
import { ActivityLevel } from '../../utils/calculations/tdee';
import { Goal } from '../../utils/nutrition/goals';
import { calculateNutritionTargets } from '../../utils/nutrition/clinical';

export interface UserStats {
    current_streak: number;
    total_workouts: number;
    total_meals_logged: number;
    achievements: string[];
}

export interface UserPreferences {
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
}

export default class User extends Model {
    static table = 'users';

    @field('name') name: string;
    @field('email') email?: string;
    @field('age') age: number;
    @field('gender') gender: 'male' | 'female' | 'other';
    @field('height') height: number;
    @field('weight') weight: number;
    @field('goal') goal: Goal;
    @field('activity_level') activityLevel: ActivityLevel;
    @field('target_weight') targetWeight?: number;
    @field('bmr') bmr: number;
    @field('tdee') tdee: number;
    @field('calorie_target') calorieTarget: number;
    @field('protein_target') proteinTarget: number;
    @field('carbs_target') carbsTarget: number;
    @field('fats_target') fatsTarget: number;
    @jsonField('stats', (value) => value) stats: UserStats;
    @jsonField('preferences', (value) => value) preferences: UserPreferences;
    @jsonField('workout_preferences', (value) => value) workoutPreferences: any; // key-value store for now
    @field('onboarding_completed') onboardingCompleted: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    /**
     * Updates user profile and automatically recalculates nutritional targets
     */
    @writer async updateProfile(updates: Partial<User>) {
        await this.update((record) => {
            if (updates.name !== undefined) record.name = updates.name;
            if (updates.email !== undefined) record.email = updates.email;
            if (updates.age !== undefined) record.age = updates.age;
            if (updates.gender !== undefined) record.gender = updates.gender;
            if (updates.height !== undefined) record.height = updates.height;
            if (updates.weight !== undefined) record.weight = updates.weight;
            if (updates.goal !== undefined) record.goal = updates.goal;
            if (updates.activityLevel !== undefined) record.activityLevel = updates.activityLevel;
            if (updates.targetWeight !== undefined) record.targetWeight = updates.targetWeight;
            if (updates.preferences !== undefined) record.preferences = updates.preferences;
            if (updates.workoutPreferences !== undefined) record.workoutPreferences = updates.workoutPreferences;
            if (updates.onboardingCompleted !== undefined) record.onboardingCompleted = updates.onboardingCompleted;

            // Check if we need to recalculate targets
            const needsRecalculation =
                updates.weight !== undefined ||
                updates.height !== undefined ||
                updates.age !== undefined ||
                updates.gender !== undefined ||
                updates.activityLevel !== undefined ||
                updates.goal !== undefined;

            if (needsRecalculation) {
                // Use updated values or fall back to current
                const weight = updates.weight ?? record.weight;
                const height = updates.height ?? record.height;
                const age = updates.age ?? record.age;
                const gender = updates.gender ?? record.gender;
                const activityLevel = updates.activityLevel ?? record.activityLevel;
                const goal = updates.goal ?? record.goal;
                const preferences = updates.preferences ?? record.preferences;

                const nutrition = calculateNutritionTargets({
                    age,
                    sex: gender,
                    heightCm: height,
                    weightKg: weight,
                    goal,
                    activityLevel,
                    bodyFatPercentage: preferences?.bodyFatPercentage,
                    isAthlete: preferences?.isAthlete,
                    hasPCOS: preferences?.hasPCOS,
                    hasInsulinResistance: preferences?.hasInsulinResistance,
                    onHormonalContraception: preferences?.onHormonalContraception,
                    isPostMenopause: preferences?.isPostMenopause,
                    week1WeightKg: preferences?.week1WeightKg,
                    currentWeightKg: weight,
                    compliancePercentage: preferences?.compliancePercentage,
                });

                record.bmr = nutrition.bmr;
                record.tdee = nutrition.tdee;
                record.calorieTarget = nutrition.calorieTarget;
                record.proteinTarget = nutrition.macros.protein;
                record.carbsTarget = nutrition.macros.carbs;
                record.fatsTarget = nutrition.macros.fats;
            }
        });
    }
}

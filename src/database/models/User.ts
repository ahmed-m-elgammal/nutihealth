import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

interface Stats {
    current_streak: number;
    total_workouts: number;
    total_meals_logged: number;
    achievements: string[];
}

interface Preferences {
    allergies: string[];
    dietary_restrictions: string[];
    theme: 'light' | 'dark' | 'auto';
    notifications_enabled: boolean;
    language: string;
}

export default class User extends Model {
    static table = 'users';

    @field('name') name!: string;
    @field('email') email?: string;
    @field('age') age!: number;
    @field('gender') gender!: string;
    @field('height') height!: number;
    @field('weight') weight!: number;
    @field('goal') goal!: string;
    @field('activity_level') activityLevel!: string;
    @field('target_weight') targetWeight?: number;
    @field('bmr') bmr!: number;
    @field('tdee') tdee!: number;
    @field('calorie_target') calorieTarget!: number;
    @field('protein_target') proteinTarget!: number;
    @field('carbs_target') carbsTarget!: number;
    @field('fats_target') fatsTarget!: number;
    @json('stats', (json) => json) stats!: Stats;
    @json('preferences', (json) => json) preferences!: Preferences;
    @field('onboarding_completed') onboardingCompleted!: boolean;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}

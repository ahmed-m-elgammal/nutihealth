import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

/**
 * Daily macros structure for a specific day of the week
 */
export interface DailyMacros {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

/**
 * WeeklyGoalPlan Model
 * 
 * Allows users to set different macro targets for each day of the week.
 * Useful for carb cycling, workout vs rest day nutrition, or any weekly variation pattern.
 * 
 * Example:
 * - Monday-Friday (workout days): 2500 cal, 200g carbs
 * - Saturday-Sunday (rest days): 2000 cal, 100g carbs
 */
export default class WeeklyGoalPlan extends Model {
    static table = 'weekly_goal_plans';

    @field('user_id') userId!: string;
    @field('plan_name') planName!: string;
    @field('is_active') isActive!: boolean;
    @field('start_date') startDate!: number; // timestamp
    @field('end_date') endDate?: number; // timestamp, optional (ongoing plan)

    // Monday
    @field('monday_calories') mondayCalories!: number;
    @field('monday_protein') mondayProtein!: number;
    @field('monday_carbs') mondayCarbs!: number;
    @field('monday_fats') mondayFats!: number;

    // Tuesday
    @field('tuesday_calories') tuesdayCalories!: number;
    @field('tuesday_protein') tuesdayProtein!: number;
    @field('tuesday_carbs') tuesdayCarbs!: number;
    @field('tuesday_fats') tuesdayFats!: number;

    // Wednesday
    @field('wednesday_calories') wednesdayCalories!: number;
    @field('wednesday_protein') wednesdayProtein!: number;
    @field('wednesday_carbs') wednesdayCarbs!: number;
    @field('wednesday_fats') wednesdayFats!: number;

    // Thursday
    @field('thursday_calories') thursdayCalories!: number;
    @field('thursday_protein') thursdayProtein!: number;
    @field('thursday_carbs') thursdayCarbs!: number;
    @field('thursday_fats') thursdayFats!: number;

    // Friday
    @field('friday_calories') fridayCalories!: number;
    @field('friday_protein') fridayProtein!: number;
    @field('friday_carbs') fridayCarbs!: number;
    @field('friday_fats') fridayFats!: number;

    // Saturday
    @field('saturday_calories') saturdayCalories!: number;
    @field('saturday_protein') saturdayProtein!: number;
    @field('saturday_carbs') saturdayCarbs!: number;
    @field('saturday_fats') saturdayFats!: number;

    // Sunday
    @field('sunday_calories') sundayCalories!: number;
    @field('sunday_protein') sundayProtein!: number;
    @field('sunday_carbs') sundayCarbs!: number;
    @field('sunday_fats') sundayFats!: number;

    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    /**
     * Get macros for a specific day of the week
     * @param dayOfWeek 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JavaScript Date.getDay() format)
     */
    getMacrosForDay(dayOfWeek: number): DailyMacros {
        const dayMap: Record<number, DailyMacros> = {
            0: { // Sunday
                calories: this.sundayCalories,
                protein: this.sundayProtein,
                carbs: this.sundayCarbs,
                fats: this.sundayFats,
            },
            1: { // Monday
                calories: this.mondayCalories,
                protein: this.mondayProtein,
                carbs: this.mondayCarbs,
                fats: this.mondayFats,
            },
            2: { // Tuesday
                calories: this.tuesdayCalories,
                protein: this.tuesdayProtein,
                carbs: this.tuesdayCarbs,
                fats: this.tuesdayFats,
            },
            3: { // Wednesday
                calories: this.wednesdayCalories,
                protein: this.wednesdayProtein,
                carbs: this.wednesdayCarbs,
                fats: this.wednesdayFats,
            },
            4: { // Thursday
                calories: this.thursdayCalories,
                protein: this.thursdayProtein,
                carbs: this.thursdayCarbs,
                fats: this.thursdayFats,
            },
            5: { // Friday
                calories: this.fridayCalories,
                protein: this.fridayProtein,
                carbs: this.fridayCarbs,
                fats: this.fridayFats,
            },
            6: { // Saturday
                calories: this.saturdayCalories,
                protein: this.saturdayProtein,
                carbs: this.saturdayCarbs,
                fats: this.saturdayFats,
            },
        };

        return dayMap[dayOfWeek];
    }

    /**
     * Get macros for a specific date
     * @param date The date to get macros for
     */
    getMacrosForDate(date: Date): DailyMacros {
        return this.getMacrosForDay(date.getDay());
    }

    /**
     * Check if this plan is valid for a given date
     * @param date The date to check
     */
    isValidForDate(date: Date): boolean {
        const timestamp = date.getTime();

        // Check start date
        if (timestamp < this.startDate) {
            return false;
        }

        // Check end date if it exists
        if (this.endDate && timestamp > this.endDate) {
            return false;
        }

        return this.isActive;
    }

    /**
     * Activate this plan (and deactivate others)
     * Note: You should handle deactivating other plans in the service layer
     */
    async activate(): Promise<void> {
        await this.update((plan) => {
            plan.isActive = true;
        });
    }

    /**
     * Deactivate this plan
     */
    async deactivate(): Promise<void> {
        await this.update((plan) => {
            plan.isActive = false;
        });
    }
}

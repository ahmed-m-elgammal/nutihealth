import { z } from 'zod';
import { DIET_MACROS } from '../../constants/nutrition';

// Diet validation schema
export const dietSchema = z.object({
    name: z.string()
        .min(1, 'Diet name is required')
        .max(100, 'Diet name is too long'),

    description: z.string()
        .max(500, 'Description is too long')
        .optional(),

    dietType: z.enum(['preset', 'custom'], {
        errorMap: () => ({ message: 'Invalid diet type' }),
    }),

    calorieTarget: z.number()
        .int('Calorie target must be a whole number')
        .min(800, 'Calorie target is too low (minimum 800)')
        .max(10000, 'Calorie target is too high (maximum 10000)'),

    proteinTarget: z.number()
        .nonnegative('Protein target cannot be negative')
        .max(500, 'Protein target is unrealistic'),

    carbsTarget: z.number()
        .nonnegative('Carbs target cannot be negative')
        .max(1000, 'Carbs target is unrealistic'),

    fatsTarget: z.number()
        .nonnegative('Fats target cannot be negative')
        .max(500, 'Fats target is unrealistic'),

    fiberTarget: z.number()
        .nonnegative('Fiber target cannot be negative')
        .max(100, 'Fiber target is unrealistic')
        .optional(),

    restrictions: z.array(z.string())
        .max(20, 'Too many dietary restrictions')
        .optional()
        .default([]),
});

// User diet (diet assignment) validation schema
export const userDietSchema = z.object({
    dietId: z.string().min(1, 'Diet ID is required'),

    startDate: z.number()
        .positive('Start date must be a valid timestamp'),

    endDate: z.number()
        .positive('End date must be a valid timestamp')
        .optional(),

    isActive: z.boolean(),

    targetWeight: z.number()
        .positive('Target weight must be positive')
        .max(500, 'Target weight is unrealistic')
        .optional(),

    weeklyGoal: z.number()
        .min(-2, 'Weekly goal is too aggressive (min -2kg/week)')
        .max(2, 'Weekly goal is too aggressive (max 2kg/week)')
        .optional(),
}).refine(
    (data) => {
        if (data.endDate) {
            return data.endDate > data.startDate;
        }
        return true;
    },
    { message: 'End date must be after start date', path: ['endDate'] }
);

/**
 * Validate diet data
 * @param data - Diet data to validate
 * @returns Validation result with errors if any
 */
export function validateDiet(data: unknown): {
    success: boolean;
    data?: any;
    errors?: Array<{ path: string; message: string }>;
} {
    try {
        const validated = dietSchema.parse(data);

        // Additional validation: check if macro targets are realistic
        const macroCalories =
            validated.proteinTarget * 4 +
            validated.carbsTarget * 4 +
            validated.fatsTarget * 9;

        const margin = validated.calorieTarget * 0.15; // 15% margin
        if (Math.abs(macroCalories - validated.calorieTarget) > margin) {
            return {
                success: false,
                errors: [{
                    path: 'macros',
                    message: 'Macro targets don\'t match calorie target. Please adjust.',
                }],
            };
        }

        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                })),
            };
        }
        return {
            success: false,
            errors: [{ path: '', message: 'Unknown validation error' }],
        };
    }
}

/**
 * Validate user diet assignment
 * @param data - User diet data to validate
 * @returns Validation result with errors if any
 */
export function validateUserDiet(data: unknown): {
    success: boolean;
    data?: any;
    errors?: Array<{ path: string; message: string }>;
} {
    try {
        const validated = userDietSchema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                })),
            };
        }
        return {
            success: false,
            errors: [{ path: '', message: 'Unknown validation error' }],
        };
    }
}

/**
 * Check if macro distribution is balanced
 * @param proteinGrams - Protein in grams
 * @param carbsGrams - Carbs in grams
 * @param fatsGrams - Fats in grams
 * @returns True if distribution follows common diet patterns
 */
export function isMacroDistributionValid(
    proteinGrams: number,
    carbsGrams: number,
    fatsGrams: number
): boolean {
    const totalCalories = proteinGrams * 4 + carbsGrams * 4 + fatsGrams * 9;

    if (totalCalories === 0) return false;

    const proteinPercent = (proteinGrams * 4 / totalCalories);
    const carbsPercent = (carbsGrams * 4 / totalCalories);
    const fatsPercent = (fatsGrams * 9 / totalCalories);

    // Check if any percentage is within reasonable ranges
    // Protein: 10-50%
    // Carbs: 5-65%
    // Fats: 15-75%
    return (
        proteinPercent >= 0.10 && proteinPercent <= 0.50 &&
        carbsPercent >= 0.05 && carbsPercent <= 0.65 &&
        fatsPercent >= 0.15 && fatsPercent <= 0.75
    );
}

/**
 * Suggest macro targets based on calorie target and diet type
 * @param calorieTarget - Target calories
 * @param dietType - Type of diet (balanced, keto, etc.)
 * @returns Suggested macro targets in grams
 */
export function suggestMacroTargets(
    calorieTarget: number,
    dietType: keyof typeof DIET_MACROS = 'balanced'
): { protein: number; carbs: number; fats: number } {
    const ratios = DIET_MACROS[dietType];

    return {
        protein: Math.round((calorieTarget * ratios.protein) / 4),
        carbs: Math.round((calorieTarget * ratios.carbs) / 4),
        fats: Math.round((calorieTarget * ratios.fats) / 9),
    };
}

/**
 * Validate calorie target against user stats
 * @param calorieTarget - Proposed calorie target
 * @param tdee - Total Daily Energy Expenditure
 * @param goal - User's goal ("lose", "maintain", or "gain")
 * @returns Object with isValid flag and suggested range
 */
export function validateCalorieTarget(
    calorieTarget: number,
    tdee: number,
    goal: 'lose' | 'maintain' | 'gain'
): { isValid: boolean; suggestedMin: number; suggestedMax: number; warning?: string } {
    const minHealthy = tdee * 0.6; // Don't go below 60% of TDEE
    const maxHealthy = tdee * 1.4; // Don't go above 140% of TDEE

    let suggestedMin: number;
    let suggestedMax: number;
    let warning: string | undefined;

    switch (goal) {
        case 'lose':
            suggestedMin = tdee - 750; // Max ~750 cal deficit
            suggestedMax = tdee - 200; // Min ~200 cal deficit
            if (calorieTarget < minHealthy) {
                warning = 'Calorie target is too low and may be unhealthy';
            }
            if (calorieTarget >= tdee) {
                warning = 'Calorie target should be below TDEE for weight loss';
            }
            break;

        case 'gain':
            suggestedMin = tdee + 200; // Min ~200 cal surplus
            suggestedMax = tdee + 500; // Max ~500 cal surplus
            if (calorieTarget <= tdee) {
                warning = 'Calorie target should be above TDEE for weight gain';
            }
            if (calorieTarget > maxHealthy) {
                warning = 'Calorie surplus is too high';
            }
            break;

        case 'maintain':
        default:
            suggestedMin = tdee - 100;
            suggestedMax = tdee + 100;
            if (Math.abs(calorieTarget - tdee) > 200) {
                warning = 'Calorie target is too far from TDEE for maintenance';
            }
            break;
    }

    const isValid = calorieTarget >= minHealthy && calorieTarget <= maxHealthy;

    return {
        isValid,
        suggestedMin: Math.round(suggestedMin),
        suggestedMax: Math.round(suggestedMax),
        warning,
    };
}

export type DietData = z.infer<typeof dietSchema>;
export type UserDietData = z.infer<typeof userDietSchema>;

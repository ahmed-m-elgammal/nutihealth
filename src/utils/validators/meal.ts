import { z } from 'zod';

// Meal validation schema
export const mealSchema = z.object({
    name: z.string()
        .min(1, 'Meal name is required')
        .max(100, 'Meal name is too long'),

    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack'], {
        errorMap: () => ({ message: 'Invalid meal type' }),
    }),

    consumedAt: z.number()
        .positive('Consumption time must be a valid timestamp')
        .refine(
            (val) => val <= Date.now() + 86400000, // Allow up to 24 hours in future
            'Consumption time cannot be too far in the future'
        ),

    photoUri: z.string().optional(),

    notes: z.string()
        .max(500, 'Notes are too long')
        .optional(),

    foods: z.array(z.object({
        name: z.string().min(1, 'Food name is required'),
        brand: z.string().optional(),
        barcode: z.string().optional(),
        servingSize: z.number().positive('Serving size must be positive'),
        servingUnit: z.string().min(1, 'Serving unit is required'),
        quantity: z.number().positive('Quantity must be positive'),
        calories: z.number().nonnegative('Calories cannot be negative'),
        protein: z.number().nonnegative('Protein cannot be negative'),
        carbs: z.number().nonnegative('Carbs cannot be negative'),
        fats: z.number().nonnegative('Fats cannot be negative'),
        fiber: z.number().nonnegative('Fiber cannot be negative').optional(),
        sugar: z.number().nonnegative('Sugar cannot be negative').optional(),
    }))
        .min(1, 'At least one food item is required'),
});

// Food validation schema
export const foodSchema = z.object({
    name: z.string()
        .min(1, 'Food name is required')
        .max(200, 'Food name is too long'),

    brand: z.string()
        .max(100, 'Brand name is too long')
        .optional(),

    barcode: z.string()
        .regex(/^[0-9]{8,13}$/, 'Invalid barcode format')
        .optional(),

    servingSize: z.number()
        .positive('Serving size must be positive')
        .max(10000, 'Serving size is unrealistic'),

    servingUnit: z.string()
        .min(1, 'Serving unit is required')
        .max(50, 'Serving unit is too long'),

    quantity: z.number()
        .positive('Quantity must be positive')
        .max(100, 'Quantity is unrealistic'),

    calories: z.number()
        .nonnegative('Calories cannot be negative')
        .max(10000, 'Calorie value is unrealistic'),

    protein: z.number()
        .nonnegative('Protein cannot be negative')
        .max(1000, 'Protein value is unrealistic'),

    carbs: z.number()
        .nonnegative('Carbs cannot be negative')
        .max(1000, 'Carbs value is unrealistic'),

    fats: z.number()
        .nonnegative('Fats cannot be negative')
        .max(1000, 'Fats value is unrealistic'),

    fiber: z.number()
        .nonnegative('Fiber cannot be negative')
        .max(500, 'Fiber value is unrealistic')
        .optional(),

    sugar: z.number()
        .nonnegative('Sugar cannot be negative')
        .max(500, 'Sugar value is unrealistic')
        .optional(),
});

// Quick validation functions

/**
 * Validate meal data
 * @param data - Meal data to validate
 * @returns Validation result with errors if any
 */
export function validateMeal(data: unknown): {
    success: boolean;
    data?: z.infer<typeof mealSchema>;
    errors?: Array<{ path: string; message: string }>;
} {
    try {
        const validated = mealSchema.parse(data);
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
 * Validate food data
 * @param data - Food data to validate
 * @returns Validation result with errors if any
 */
export function validateFood(data: unknown): {
    success: boolean;
    data?: z.infer<typeof foodSchema>;
    errors?: Array<{ path: string; message: string }>;
} {
    try {
        const validated = foodSchema.parse(data);
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
 * Check if nutrition values are realistic
 * @param calories - Calorie value
 * @param protein - Protein in grams
 * @param carbs - Carbs in grams
 * @param fats - Fats in grams
 * @returns True if values seem realistic
 */
export function areNutritionValuesRealistic(
    calories: number,
    protein: number,
    carbs: number,
    fats: number
): boolean {
    // Calculate calories from macros
    const calculatedCalories = protein * 4 + carbs * 4 + fats * 9;

    // Allow 20% margin of error
    const margin = calculatedCalories * 0.2;
    const diff = Math.abs(calories - calculatedCalories);

    return diff <= margin;
}

/**
 * Sanitize meal name
 * @param name - Raw meal name input
 * @returns Sanitized meal name
 */
export function sanitizeMealName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .slice(0, 100); // Max 100 characters
}

/**
 * Sanitize food name
 * @param name - Raw food name input
 * @returns Sanitized food name
 */
export function sanitizeFoodName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 200); // Max 200 characters
}

export type MealData = z.infer<typeof mealSchema>;
export type FoodData = z.infer<typeof foodSchema>;

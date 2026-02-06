/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * @param weight - Weight in kg
 * @param height - Height in cm
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @returns BMR in calories/day
 */
export function calculateBMR(
    weight: number,
    height: number,
    age: number,
    gender: 'male' | 'female' | 'other'
): number {
    // For 'other', we'll use the average of male and female
    if (gender === 'male') {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === 'female') {
        return 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
        // Average of male and female
        const maleCalc = 10 * weight + 6.25 * height - 5 * age + 5;
        const femaleCalc = 10 * weight + 6.25 * height - 5 * age - 161;
        return (maleCalc + femaleCalc) / 2;
    }
}

/**
 * Activity level multipliers for TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    very_active: 1.725, // Hard exercise 6-7 days/week
    athlete: 1.9, // Very hard exercise, physical job, or training twice per day
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 * @param bmr - Basal Metabolic Rate
 * @param activityLevel - Activity level
 * @returns TDEE in calories/day
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Goal-based calorie adjustment
 */
export const GOAL_ADJUSTMENTS = {
    lose: -500, // 500 calorie deficit for ~0.5kg/week loss
    maintain: 0, // No adjustment
    gain: 300, // 300 calorie surplus for lean muscle gain
} as const;

export type Goal = keyof typeof GOAL_ADJUSTMENTS;

/**
 * Calculates target calories based on goal
 * @param tdee - Total Daily Energy Expenditure
 * @param goal - User's goal
 * @returns Target calories/day
 */
export function calculateCalorieTarget(tdee: number, goal: Goal): number {
    return Math.round(tdee + GOAL_ADJUSTMENTS[goal]);
}

/**
 * Macro distribution based on goal
 */
export const MACRO_RATIOS = {
    lose: { protein: 0.35, carbs: 0.35, fats: 0.3 },
    maintain: { protein: 0.3, carbs: 0.4, fats: 0.3 },
    gain: { protein: 0.3, carbs: 0.45, fats: 0.25 },
} as const;

/**
 * Calculates macro targets in grams
 * @param calorieTarget - Target calories
 * @param goal - User's goal
 * @returns Object with protein, carbs, and fats in grams
 */
export function calculateMacros(
    calorieTarget: number,
    goal: Goal
): { protein: number; carbs: number; fats: number } {
    const ratios = MACRO_RATIOS[goal];

    return {
        protein: Math.round((calorieTarget * ratios.protein) / 4), // 4 cal/g
        carbs: Math.round((calorieTarget * ratios.carbs) / 4), // 4 cal/g
        fats: Math.round((calorieTarget * ratios.fats) / 9), // 9 cal/g
    };
}

/**
 * Calculate base water target based on weight
 * Base formula: 35ml per kg of body weight
 * @param weight - Weight in kg
 * @returns Water target in ml
 */
export function calculateBaseWaterTarget(weight: number): number {
    return Math.round(weight * 35);
}

/**
 * Calculate workout adjustment for water target
 * Additional 500ml per hour of exercise
 * @param workoutDurationMinutes - Duration of workout in minutes
 * @returns Additional water needed in ml
 */
export function calculateWorkoutWaterAdjustment(
    workoutDurationMinutes: number
): number {
    const hours = workoutDurationMinutes / 60;
    return Math.round(hours * 500);
}

/**
 * Calculate weather adjustment for water target
 * Based on temperature and humidity
 * @param tempCelsius - Temperature in Celsius
 * @param humidity - Humidity percentage (0-100)
 * @returns Additional water needed in ml
 */
export function calculateWeatherWaterAdjustment(
    tempCelsius: number,
    humidity: number
): number {
    let adjustment = 0;

    // Temperature adjustment
    if (tempCelsius > 25) {
        adjustment += (tempCelsius - 25) * 20; // 20ml per degree above 25°C
    }

    // Humidity adjustment (high humidity makes it harder to cool)
    if (humidity > 60) {
        adjustment += (humidity - 60) * 10; // 10ml per percentage point above 60%
    }

    return Math.round(adjustment);
}

/**
 * Estimate calories burned during exercise
 * Simplified MET (Metabolic Equivalent of Task) calculation
 * @param weight - Weight in kg
 * @param durationMinutes - Duration in minutes
 * @param intensity - 'low', 'moderate', 'high', 'very_high'
 * @returns Estimated calories burned
 */
export function estimateCaloriesBurned(
    weight: number,
    durationMinutes: number,
    intensity: 'low' | 'moderate' | 'high' | 'very_high'
): number {
    const MET_VALUES = {
        low: 3.5, // Light cardio, yoga
        moderate: 5.0, // Brisk walking, light weights
        high: 7.0, // Running, heavy weights
        very_high: 10.0, // HIIT, intense sports
    };

    const met = MET_VALUES[intensity];
    const hours = durationMinutes / 60;
    // Formula: Calories = MET × weight (kg) × time (hours)
    return Math.round(met * weight * hours);
}

/**
 * Calculate Body Mass Index (BMI)
 * @param weight - Weight in kg
 * @param height - Height in cm
 * @returns BMI value
 */
export function calculateBMI(weight: number, height: number): number {
    const heightMeters = height / 100;
    return parseFloat((weight / (heightMeters * heightMeters)).toFixed(1));
}

/**
 * Get BMI category
 * @param bmi - BMI value
 * @returns Category string
 */
export function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

/**
 * Calculate ideal weight range based on height (using BMI 18.5-25)
 * @param height - Height in cm
 * @returns Object with min and max ideal weight in kg
 */
export function getIdealWeightRange(height: number): { min: number; max: number } {
    const heightMeters = height / 100;
    return {
        min: Math.round(18.5 * heightMeters * heightMeters),
        max: Math.round(25 * heightMeters * heightMeters),
    };
}

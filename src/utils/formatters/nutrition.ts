import { CALORIES_PER_GRAM } from '../../constants/nutrition';
import { formatDecimal, formatPercentage } from './numbers';

/**
 * Format macro nutrients (protein, carbs, fats) as a string
 * @param protein - Protein in grams
 * @param carbs - Carbs in grams
 * @param fats - Fats in grams
 * @param format - 'short' (P/C/F) or 'long' (Protein: X, Carbs: Y, Fats: Z)
 * @returns Formatted macro string
 */
export function formatMacros(
    protein: number,
    carbs: number,
    fats: number,
    format: 'short' | 'long' = 'short'
): string {
    if (format === 'short') {
        return `${Math.round(protein)}/${Math.round(carbs)}/${Math.round(fats)}g`;
    }

    return `Protein: ${Math.round(protein)}g, Carbs: ${Math.round(carbs)}g, Fats: ${Math.round(fats)}g`;
}

/**
 * Calculate and format macro percentages from gram values
 * @param protein - Protein in grams
 * @param carbs - Carbs in grams
 * @param fats - Fats in grams
 * @returns Object with formatted percentage strings
 */
export function formatMacroPercentages(
    protein: number,
    carbs: number,
    fats: number
): { protein: string; carbs: string; fats: string } {
    const totalCalories =
        protein * CALORIES_PER_GRAM.protein +
        carbs * CALORIES_PER_GRAM.carbs +
        fats * CALORIES_PER_GRAM.fats;

    if (totalCalories === 0) {
        return { protein: '0%', carbs: '0%', fats: '0%' };
    }

    const proteinPercent = (protein * CALORIES_PER_GRAM.protein / totalCalories) * 100;
    const carbsPercent = (carbs * CALORIES_PER_GRAM.carbs / totalCalories) * 100;
    const fatsPercent = (fats * CALORIES_PER_GRAM.fats / totalCalories) * 100;

    return {
        protein: formatPercentage(proteinPercent, false),
        carbs: formatPercentage(carbsPercent, false),
        fats: formatPercentage(fatsPercent, false),
    };
}

/**
 * Format a serving size
 * @param size - Serving size amount
 * @param unit - Serving unit (g, ml, piece, etc.)
 * @returns Formatted serving string
 */
export function formatServing(size: number, unit: string): string {
    const amount = formatDecimal(size, size >= 100 ? 0 : 1);
    return `${amount} ${unit}`;
}

/**
 * Format a nutrition label-style macro breakdown
 * @param calories - Total calories
 * @param protein - Protein in grams
 * @param carbs - Carbs in grams
 * @param fats - Fats in grams
 * @param fiber - Fiber in grams (optional)
 * @param sugar - Sugar in grams (optional)
 * @returns Array of formatted nutrition facts
 */
export function formatNutritionFacts(
    calories: number,
    protein: number,
    carbs: number,
    fats: number,
    fiber?: number,
    sugar?: number
): Array<{ label: string; value: string; unit: string }> {
    const facts = [
        { label: 'Calories', value: Math.round(calories).toString(), unit: 'cal' },
        { label: 'Protein', value: Math.round(protein).toString(), unit: 'g' },
        { label: 'Carbohydrates', value: Math.round(carbs).toString(), unit: 'g' },
    ];

    if (fiber !== undefined) {
        facts.push({ label: 'Fiber', value: formatDecimal(fiber, 1), unit: 'g' });
    }

    if (sugar !== undefined) {
        facts.push({ label: 'Sugar', value: formatDecimal(sugar, 1), unit: 'g' });
    }

    facts.push({ label: 'Fat', value: Math.round(fats).toString(), unit: 'g' });

    return facts;
}

/**
 * Format daily progress against targets
 * @param consumed - Amount consumed
 * @param target - Target amount
 * @param unit - Unit label
 * @returns Formatted progress string
 */
export function formatProgress(consumed: number, target: number, unit: string): string {
    const consumedRounded = Math.round(consumed);
    const targetRounded = Math.round(target);
    const percentage = target > 0 ? formatPercentage((consumed / target) * 100, false) : '0%';

    return `${consumedRounded}/${targetRounded} ${unit} (${percentage})`;
}

/**
 * Format calorie balance (in/out)
 * @param consumed - Calories consumed
 * @param burned - Calories burned
 * @returns Formatted balance string with +/- indicator
 */
export function formatCalorieBalance(consumed: number, burned: number): string {
    const balance = consumed - burned;
    const sign = balance >= 0 ? '+' : '';
    const formatted = Math.round(Math.abs(balance));

    return `${sign}${balance >= 0 ? formatted : -formatted} cal`;
}

/**
 * Format macro ratio (e.g., "40/30/30")
 * @param proteinPercent - Protein percentage (0-100)
 * @param carbsPercent - Carbs percentage (0-100)
 * @param fatsPercent - Fats percentage (0-100)
 * @returns Formatted ratio string
 */
export function formatMacroRatio(
    proteinPercent: number,
    carbsPercent: number,
    fatsPercent: number
): string {
    return `${Math.round(proteinPercent)}/${Math.round(carbsPercent)}/${Math.round(fatsPercent)}`;
}

/**
 * Get a human-readable description of macro balance
 * @param protein - Protein in grams
 * @param carbs - Carbs in grams
 * @param fats - Fats in grams
 * @returns Description string (e.g., "High Protein", "Balanced")
 */
export function getMacroDescription(protein: number, carbs: number, fats: number): string {
    const percentages = formatMacroPercentages(protein, carbs, fats);
    const proteinNum = parseInt(percentages.protein);
    const carbsNum = parseInt(percentages.carbs);
    const fatsNum = parseInt(percentages.fats);

    if (proteinNum > 35) return 'High Protein';
    if (carbsNum < 15) return 'Low Carb / Keto';
    if (carbsNum < 30) return 'Low Carb';
    if (fatsNum > 40) return 'High Fat';
    if (Math.abs(proteinNum - 33) < 5 && Math.abs(carbsNum - 33) < 5 && Math.abs(fatsNum - 33) < 5) {
        return 'Balanced';
    }

    return 'Mixed';
}

/**
 * Format a meal type label
 * @param mealType - Meal type identifier
 * @returns Formatted meal type string
 */
export function formatMealType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): string {
    const labels = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
    };

    return labels[mealType] || mealType;
}

/**
 * Get emoji for meal type
 * @param mealType - Meal type identifier
 * @returns Emoji string
 */
export function getMealEmoji(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): string {
    const emojis = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍎',
    };

    return emojis[mealType] || '🍽️';
}

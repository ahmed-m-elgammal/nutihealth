// Nutrition constants and reference values

// Recommended Daily Allowances (RDA) for adults
export const RDA = {
    // Macronutrients (grams per day)
    protein: {
        male: 56,
        female: 46,
        athlete: 120, // for active individuals
    },
    fiber: {
        male: 38,
        female: 25,
    },

    // Water intake (ml per day)
    water: {
        male: 3700,
        female: 2700,
    },

    // Micronutrients (for reference - simplified)
    vitamins: {
        vitaminC: 90, // mg
        vitaminD: 20, // mcg
        vitaminA: 900, // mcg
    },
} as const;

// Calorie per gram for macronutrients
export const CALORIES_PER_GRAM = {
    protein: 4,
    carbs: 4,
    fats: 9,
    alcohol: 7,
} as const;

// Common serving sizes
export const SERVING_SIZES = {
    cup: 240, // ml
    tablespoon: 15, // ml
    teaspoon: 5, // ml
    ounce: 28.35, // g
    pound: 453.59, // g
} as const;

// Meal type calorie distribution (percentage of daily intake)
export const MEAL_DISTRIBUTION = {
    breakfast: 0.25, // 25%
    lunch: 0.35, // 35%
    dinner: 0.30, // 30%
    snack: 0.10, // 10%
} as const;

// Common diet macro ratios
export const DIET_MACROS = {
    balanced: {
        protein: 0.30,
        carbs: 0.40,
        fats: 0.30,
    },
    keto: {
        protein: 0.25,
        carbs: 0.05,
        fats: 0.70,
    },
    lowCarb: {
        protein: 0.30,
        carbs: 0.20,
        fats: 0.50,
    },
    highProtein: {
        protein: 0.40,
        carbs: 0.30,
        fats: 0.30,
    },
    mediterranean: {
        protein: 0.25,
        carbs: 0.45,
        fats: 0.30,
    },
} as const;

// Water intake adjustments
export const WATER_ADJUSTMENTS = {
    perKgBodyWeight: 35, // ml per kg
    perHourExercise: 500, // ml per hour of exercise
    perDegreeCelsiusAbove25: 20, // ml per degree above 25°C
    perHumidityPercentAbove60: 10, // ml per % above 60%
} as const;

// BMI Categories
export const BMI_CATEGORIES = {
    ranges: {
        underweight: { min: 0, max: 18.5 },
        normal: { min: 18.5, max: 25 },
        overweight: { min: 25, max: 30 },
        obese: { min: 30, max: 100 },
    },
    labels: {
        underweight: 'Underweight',
        normal: 'Normal weight',
        overweight: 'Overweight',
        obese: 'Obese',
    },
} as const;

// Weight loss/gain rates (kg per week)
export const WEIGHT_CHANGE_RATES = {
    aggressive: 1.0, // Not recommended
    moderate: 0.5,
    conservative: 0.25,
} as const;

// Calorie deficits/surplus for goals
export const CALORIE_ADJUSTMENTS = {
    lose: {
        aggressive: -1000, // ~1kg/week
        moderate: -500, // ~0.5kg/week
        conservative: -250, // ~0.25kg/week
    },
    gain: {
        aggressive: 500,
        moderate: 300,
        conservative: 200,
    },
    maintain: 0,
} as const;

// Common food categories
export const FOOD_CATEGORIES = [
    'Fruits',
    'Vegetables',
    'Grains',
    'Protein',
    'Dairy',
    'Fats & Oils',
    'Snacks',
    'Beverages',
    'Desserts',
    'Condiments',
] as const;

// Common dietary restrictions
export const DIETARY_RESTRICTIONS = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Low-Carb',
    'Keto',
    'Paleo',
    'Halal',
    'Kosher',
] as const;

// Common allergens
export const COMMON_ALLERGENS = [
    'Milk',
    'Eggs',
    'Fish',
    'Shellfish',
    'Tree Nuts',
    'Peanuts',
    'Wheat',
    'Soybeans',
    'Sesame',
] as const;

export type DietType = keyof typeof DIET_MACROS;
export type FoodCategory = typeof FOOD_CATEGORIES[number];
export type DietaryRestriction = typeof DIETARY_RESTRICTIONS[number];
export type Allergen = typeof COMMON_ALLERGENS[number];

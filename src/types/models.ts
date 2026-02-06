// TypeScript interfaces for database models

// Strict interfaces for JSON fields to replace 'any' types

/**
 * Exercise data structure for workout templates
 */
export interface WorkoutTemplateExercise {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
    restTime?: number; // seconds
    notes?: string;
}

/**
 * Meal plan data structure
 */
export interface MealPlanData {
    meals: {
        [day: string]: { // 'monday', 'tuesday', etc.
            breakfast?: string[]; // Array of recipe/meal IDs
            lunch?: string[];
            dinner?: string[];
            snacks?: string[];
        };
    };
    shoppingList?: string[];
    notes?: string;
}

/**
 * Habit frequency configuration for custom frequencies
 */
export interface HabitFrequencyConfig {
    daysOfWeek?: number[]; // 0-6, where 0 is Sunday
    timesPerWeek?: number;
    specificDates?: number[]; // Array of timestamps
    reminderTime?: string; // HH:MM format
}

/**
 * Body measurements for weight tracking
 */
export interface BodyMeasurements {
    chest?: number; // cm
    waist?: number; // cm
    hips?: number; // cm
    thighs?: number; // cm
    arms?: number; // cm
    neck?: number; // cm
    calves?: number; // cm
}

export interface UserModel {
    id: string;
    name: string;
    email?: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    height: number; // cm
    weight: number; // kg
    goal: 'lose' | 'maintain' | 'gain';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
    targetWeight?: number;
    bmr: number;
    tdee: number;
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    stats: UserStats;
    preferences: UserPreferences;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

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
}

export interface MealModel {
    id: string;
    userId: string;
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt: number; // timestamp
    photoUri?: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FoodModel {
    id: string;
    mealId: string;
    name: string;
    brand?: string;
    barcode?: string;
    servingSize: number;
    servingUnit: string;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomFoodModel {
    id: string;
    userId: string;
    name: string;
    brand?: string;
    barcode?: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    isFavorite: boolean;
    useCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface WaterLogModel {
    id: string;
    userId: string;
    amount: number; // ml
    loggedAt: number; // timestamp
    createdAt: Date;
    updatedAt: Date;
}

export interface WaterTargetModel {
    id: string;
    userId: string;
    date: number; // timestamp
    baseTarget: number;
    workoutAdjustment: number;
    weatherAdjustment: number;
    totalTarget: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkoutModel {
    id: string;
    userId: string;
    name: string;
    workoutType: 'strength' | 'cardio' | 'mobility' | 'custom';
    startedAt: number; // timestamp
    endedAt?: number;
    duration: number; // minutes
    totalVolume?: number;
    caloriesBurned?: number;
    notes?: string;
    templateId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkoutExerciseModel {
    id: string;
    workoutId: string;
    exerciseId: string;
    order: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExerciseSetModel {
    id: string;
    workoutExerciseId: string;
    setNumber: number;
    reps?: number;
    weight?: number; // kg
    distance?: number; // km
    duration?: number; // seconds
    rpe?: number; // 1-10
    isWarmup: boolean;
    isPR: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExerciseModel {
    id: string;
    name: string;
    category: 'strength' | 'cardio' | 'mobility';
    muscleGroup: string;
    equipment: string;
    description?: string;
    videoUrl?: string;
    imageUrl?: string;
    isCustom: boolean;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkoutTemplateModel {
    id: string;
    userId: string;
    name: string;
    description?: string;
    workoutType: string;
    exercises: WorkoutTemplateExercise[];
    isFavorite: boolean;
    useCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface RecipeModel {
    id: string;
    userId: string;
    name: string;
    description?: string;
    servings: number;
    prepTime?: number;
    cookTime?: number;
    ingredients: string[]; // JSON
    instructions: string[]; // JSON
    photoUri?: string;
    caloriesPerServing: number;
    proteinPerServing: number;
    carbsPerServing: number;
    fatsPerServing: number;
    isFavorite: boolean;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface MealPlanModel {
    id: string;
    userId: string;
    name: string;
    description?: string;
    startDate: number;
    endDate: number;
    planData: MealPlanData;
    isActive: boolean;
    isAIGenerated: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface HabitModel {
    id: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency: 'daily' | 'weekly' | 'custom';
    frequencyConfig?: HabitFrequencyConfig;
    currentStreak: number;
    bestStreak: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface HabitLogModel {
    id: string;
    habitId: string;
    completedAt: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WeightLogModel {
    id: string;
    userId: string;
    weight: number; // kg
    bodyFatPercentage?: number;
    muscleMass?: number;
    measurements?: BodyMeasurements;
    photoUri?: string;
    notes?: string;
    loggedAt: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DietModel {
    id: string;
    userId: string;
    name: string;
    description?: string;
    dietType: 'preset' | 'custom';
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    fiberTarget?: number;
    restrictions: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserDietModel {
    id: string;
    userId: string;
    dietId: string;
    startDate: number;
    endDate?: number;
    isActive: boolean;
    targetWeight?: number;
    weeklyGoal?: number;
    createdAt: Date;
    updatedAt: Date;
}

// API request/response type definitions

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Authentication
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

// Meals
export interface CreateMealRequest {
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt: number;
    photoUri?: string;
    foods: CreateFoodRequest[];
    notes?: string;
}

export interface CreateFoodRequest {
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
}

export interface UpdateMealRequest {
    name?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt?: number;
    photoUri?: string;
    notes?: string;
}

// Workouts
export interface CreateWorkoutRequest {
    name: string;
    workoutType: 'strength' | 'cardio' | 'mobility' | 'custom';
    startedAt: number;
    endedAt?: number;
    duration: number;
    notes?: string;
    exercises: WorkoutExerciseRequest[];
}

export interface WorkoutExerciseRequest {
    exerciseId: string;
    order: number;
    sets: ExerciseSetRequest[];
    notes?: string;
}

export interface ExerciseSetRequest {
    setNumber: number;
    reps?: number;
    weight?: number;
    distance?: number;
    duration?: number;
    rpe?: number;
    isWarmup?: boolean;
}

// Diets
export interface CreateDietRequest {
    name: string;
    description?: string;
    dietType: 'preset' | 'custom';
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    fiberTarget?: number;
    restrictions?: string[];
}

// Progress
export interface ProgressQuery {
    userId: string;
    startDate: number;
    endDate: number;
    metrics?: ('calories' | 'macros' | 'weight' | 'workouts' | 'water')[];
}

export interface ProgressResponse {
    calories?: CalorieProgress[];
    macros?: MacroProgress[];
    weight?: WeightProgress[];
    workouts?: WorkoutProgress[];
    water?: WaterProgress[];
}

export interface CalorieProgress {
    date: number;
    consumed: number;
    target: number;
    burned?: number;
}

export interface MacroProgress {
    date: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface WeightProgress {
    date: number;
    weight: number;
    bodyFat?: number;
}

export interface WorkoutProgress {
    date: number;
    count: number;
    totalDuration: number;
    caloriesBurned: number;
}

export interface WaterProgress {
    date: number;
    consumed: number;
    target: number;
}

// Sync
export interface SyncRequest {
    lastSyncTimestamp: number;
    changes: SyncChange[];
}

export interface SyncChange {
    modelName: string;
    recordId: string;
    operation: 'create' | 'update' | 'delete';
    data: Record<string, unknown>;
    timestamp: number;
}

export interface SyncResponse {
    success: boolean;
    conflicts?: SyncConflict[];
    serverChanges?: SyncChange[];
    lastSyncTimestamp: number;
}

export interface SyncConflict {
    recordId: string;
    modelName: string;
    localData: Record<string, unknown>;
    serverData: Record<string, unknown>;
    timestamp: number;
}

// AI Services
export interface AIFoodDetectionRequest {
    imageBase64: string;
}

export interface AIFoodDetectionResponse {
    foods: DetectedFood[];
    confidence: number;
}

export interface DetectedFood {
    name: string;
    estimatedQuantity: number;
    estimatedUnit: string;
    nutrition?: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    confidence: number;
}

export interface AIMealGenerationRequest {
    dietRestrictions?: string[];
    calorieTarget: number;
    macroTargets: {
        protein: number;
        carbs: number;
        fats: number;
    };
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    preferences?: string[];
    allergies?: string[];
}

export interface AIMealGenerationResponse {
    mealName: string;
    description: string;
    ingredients: {
        name: string;
        quantity: number;
        unit: string;
    }[];
    instructions: string[];
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    prepTime: number;
    cookTime: number;
}

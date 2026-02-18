// Types for AI Food Detection

export interface DetectedFood {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    confidence: number;
    source: 'database' | 'api' | 'estimate';
    needsUserConfirmation?: boolean;
    servingSize?: number;
    servingUnit?: string;
}

export interface HFClassificationResult {
    label: string;
    score: number;
}

export interface NutritionData {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    source: 'database' | 'api' | 'estimate';
}

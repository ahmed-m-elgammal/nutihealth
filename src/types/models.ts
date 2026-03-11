// Shared model types used by API services.

export interface TemplateFoodData {
    name: string;
    brand?: string;
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

export interface DailyMacros {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

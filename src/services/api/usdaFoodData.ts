import axios from 'axios';

export type UsdaFoodResult = {
    id: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    servingSize: number;
    servingUnit: string;
};

const USDA_SEARCH_API = 'https://api.nal.usda.gov/fdc/v1/foods/search';

const DEFAULT_API_KEY = 'DEMO_KEY';

const NUTRIENT_IDS = {
    calories: 1008,
    protein: 1003,
    carbs: 1005,
    fats: 1004,
    fiber: 1079,
    sugar: 2000,
} as const;

const getNutrientValue = (foodNutrients: any[] | undefined, nutrientId: number) => {
    if (!Array.isArray(foodNutrients)) return 0;
    const entry = foodNutrients.find((nutrient) => nutrient.nutrientId === nutrientId);
    return Number(entry?.value || 0);
};

export async function searchUsdaFoods(query: string, limit: number = 10): Promise<UsdaFoodResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY || DEFAULT_API_KEY;

    try {
        const response = await axios.get(USDA_SEARCH_API, {
            params: {
                api_key: apiKey,
                query: trimmed,
                pageSize: limit,
                dataType: ['Foundation', 'Survey (FNDDS)', 'Branded'],
            },
            timeout: 5000,
        });

        const foods: any[] = response.data?.foods || [];

        return foods
            .filter((item) => item.description)
            .map((item) => ({
                id: `usda-${item.fdcId}`,
                name: item.description,
                brand: item.brandOwner || item.brandName || 'USDA FoodData Central',
                calories: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.calories),
                protein: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.protein),
                carbs: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.carbs),
                fats: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.fats),
                fiber: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.fiber),
                sugar: getNutrientValue(item.foodNutrients, NUTRIENT_IDS.sugar),
                servingSize: 100,
                servingUnit: 'g',
            }));
    } catch {
        return [];
    }
}

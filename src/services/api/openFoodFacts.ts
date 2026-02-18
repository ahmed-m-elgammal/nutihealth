import axios from 'axios';
import { handleError } from '../../utils/errors';

const API_URL = 'https://world.openfoodfacts.org/api/v2/product';
const SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

/**
 * Canonical representation of a food item returned from barcode or AI flows.
 * Macros are stored for the `servingSize` + `servingUnit` combination so we
 * can scale up/down for user-selected portions.
 */
export interface FoodItem {
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
    quantity?: number;
    image_url?: string;
    source?: 'openfoodfacts' | 'database' | 'estimate' | 'api';
}

export interface FoodProduct {
    name: string;
    brand: string;
    barcode: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    image_url?: string;
}

/**
 * Primary fetcher for OpenFoodFacts products.
 * Returns macros per 100g where possible, falling back to 0 instead of NaN.
 */
export async function getProductByBarcode(barcode: string): Promise<FoodProduct | null> {
    try {
        const response = await axios.get(`${API_URL}/${barcode}.json`, {
            headers: {
                'User-Agent': 'NutriHealthApp/1.0 (contact@nutrihealth.app)',
            },
        });

        const product = response.data.product;

        if (!product) {
            return null;
        }

        // Parse Serving Size (e.g., \"100g\")
        let servingSize = 100;
        let servingUnit = 'g';

        if (product.serving_size) {
            const match = product.serving_size.match(/([\\d.]+)\\s*([a-zA-Z]+)/);
            if (match) {
                servingSize = parseFloat(match[1]);
                servingUnit = match[2];
            }
        }

        return {
            name: product.product_name,
            brand: product.brands,
            barcode: product.code,
            servingSize,
            servingUnit,
            calories: product.nutriments['energy-kcal_100g'] || 0,
            protein: product.nutriments['proteins_100g'] || 0,
            carbs: product.nutriments['carbohydrates_100g'] || 0,
            fats: product.nutriments['fat_100g'] || 0,
            fiber: product.nutriments['fiber_100g'] || 0,
            sugar: product.nutriments['sugars_100g'] || 0,
            image_url: product.image_url,
        };
    } catch (error) {
        handleError(error, 'openFoodFacts.getProductByBarcode');
        return null;
    }
}

/**
 * Search OpenFoodFacts database by product name
 */
export async function searchProducts(query: string, limit: number = 10): Promise<FoodProduct[]> {
    try {
        const response = await axios.get(SEARCH_API_URL, {
            params: {
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: limit,
                fields: 'product_name,brands,code,nutriments,serving_size,image_url'
            },
            headers: {
                'User-Agent': 'NutriHealthApp/1.0 (contact@nutrihealth.app)',
            },
            timeout: 5000
        });

        if (!response.data || !response.data.products) {
            return [];
        }

        return response.data.products
            .filter((p: any) => p.product_name && p.nutriments)
            .map((product: any) => {
                // Parse Serving Size (e.g., \"100g\")
                let servingSize = 100;
                let servingUnit = 'g';

                if (product.serving_size) {
                    const match = product.serving_size.match(/([\\d.]+)\\s*([a-zA-Z]+)/);
                    if (match) {
                        servingSize = parseFloat(match[1]);
                        servingUnit = match[2];
                    }
                }

                return {
                    name: product.product_name,
                    brand: product.brands || '',
                    barcode: product.code || '',
                    servingSize,
                    servingUnit,
                    calories: product.nutriments['energy-kcal_100g'] || 0,
                    protein: product.nutriments['proteins_100g'] || 0,
                    carbs: product.nutriments['carbohydrates_100g'] || 0,
                    fats: product.nutriments['fat_100g'] || 0,
                    fiber: product.nutriments['fiber_100g'] || 0,
                    sugar: product.nutriments['sugars_100g'] || 0,
                    image_url: product.image_url
                };
            });
    } catch (error) {
        handleError(error, 'openFoodFacts.searchProducts');
        return [];
    }
}

/**
 * Backwards-compatible alias expected by UI components.
 */
export const getFoodByBarcode = getProductByBarcode;

/**
 * Normalize a FoodProduct into our FoodItem shape and attach metadata.
 * Values remain per `servingSize`/`servingUnit`.
 */
export function extractNutrition(product: FoodProduct): FoodItem {
    return {
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        servingSize: product.servingSize,
        servingUnit: product.servingUnit,
        calories: product.calories,
        protein: product.protein,
        carbs: product.carbs,
        fats: product.fats,
        fiber: product.fiber,
        sugar: product.sugar,
        image_url: product.image_url,
        source: 'openfoodfacts',
    };
}

/**
 * Scales the nutrition of a food item to an arbitrary serving size/unit.
 * If units mismatch we skip scaling to avoid bogus values.
 */
export function calculateNutritionForServing(
    food: FoodItem,
    targetServingSize: number,
    targetServingUnit: string
): FoodItem {
    const numericTarget = Number.isFinite(targetServingSize) ? targetServingSize : food.servingSize;
    const sameUnit = food.servingUnit.toLowerCase() === targetServingUnit.toLowerCase();
    const ratio = sameUnit && food.servingSize > 0 ? numericTarget / food.servingSize : 1;

    const scale = (value?: number) => Math.round((value || 0) * ratio);

    return {
        ...food,
        servingSize: numericTarget,
        servingUnit: targetServingUnit,
        calories: scale(food.calories),
        protein: scale(food.protein),
        carbs: scale(food.carbs),
        fats: scale(food.fats),
        fiber: scale(food.fiber),
        sugar: scale(food.sugar),
    };
}

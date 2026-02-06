import axios from 'axios';
import { handleError } from '../../utils/errors';
import { getCacheItem, setCacheItem } from '../../utils/cache';

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org';

export interface OpenFoodFactsProduct {
    product_name: string;
    brands?: string;
    code: string; // barcode
    nutriments: {
        'energy-kcal_100g'?: number;
        'proteins_100g'?: number;
        'carbohydrates_100g'?: number;
        'fat_100g'?: number;
        'fiber_100g'?: number;
        'sugars_100g'?: number;
        'sodium_100g'?: number;
    };
    serving_size?: string;
    nutrition_grades?: string; // A, B, C, D, E
    image_url?: string;
}

export interface SearchResult {
    products: OpenFoodFactsProduct[];
    count: number;
    page: number;
    page_count: number;
}

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
    nutritionGrade?: string;
    imageUrl?: string;
}

/**
 * Search for foods in OpenFoodFacts database
 */
export async function searchFoods(query: string, page: number = 1): Promise<SearchResult> {
    // Check cache first
    const cacheKey = `openfoodfacts:search:${query}:${page}`;
    const cachedResult = getCacheItem<SearchResult>(cacheKey);

    if (cachedResult) {
        return cachedResult;
    }

    try {
        const response = await axios.get(`${OPENFOODFACTS_API_URL}/cgi/search.pl`, {
            params: {
                search_terms: query,
                search_simple: 1,
                json: 1,
                page,
                page_size: 20,
                fields: 'product_name,brands,code,nutriments,serving_size,nutrition_grades,image_url',
            },
        });

        const result: SearchResult = {
            products: response.data.products || [],
            count: response.data.count || 0,
            page: response.data.page || 1,
            page_count: response.data.page_count || 0,
        };

        // Cache the result
        setCacheItem(cacheKey, result);

        return result;
    } catch (error) {
        handleError(error, 'openFoodFacts.searchFoods');
        throw new Error('Failed to search foods');
    }
}

/**
 * Get food by barcode
 */
export async function getFoodByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    // Check cache first
    const cacheKey = `openfoodfacts:barcode:${barcode}`;
    const cachedProduct = getCacheItem<OpenFoodFactsProduct>(cacheKey);

    if (cachedProduct) {
        return cachedProduct;
    }

    try {
        const response = await axios.get(
            `${OPENFOODFACTS_API_URL}/api/v0/product/${barcode}.json`
        );

        if (response.data.status === 1 && response.data.product) {
            const product = response.data.product;
            // Cache the product
            setCacheItem(cacheKey, product);
            return product;
        }

        return null;
    } catch (error) {
        handleError(error, 'openFoodFacts.getFoodByBarcode');
        return null;
    }
}

/**
 * Extract and normalize nutrition data from OpenFoodFacts product
 */
export function extractNutrition(product: OpenFoodFactsProduct): FoodItem {
    const nutriments = product.nutriments || {};

    // Parse serving size (e.g., "100g", "1 cup")
    let servingSize = 100;
    let servingUnit = 'g';

    if (product.serving_size) {
        const match = product.serving_size.match(/(\d+)\s*([a-zA-Z]+)/);
        if (match) {
            servingSize = parseInt(match[1], 10);
            servingUnit = match[2];
        }
    }

    return {
        name: product.product_name || 'Unknown',
        brand: product.brands,
        barcode: product.code,
        servingSize,
        servingUnit,
        calories: nutriments['energy-kcal_100g'] || 0,
        protein: nutriments['proteins_100g'] || 0,
        carbs: nutriments['carbohydrates_100g'] || 0,
        fats: nutriments['fat_100g'] || 0,
        fiber: nutriments['fiber_100g'],
        sugar: nutriments['sugars_100g'],
        nutritionGrade: product.nutrition_grades,
        imageUrl: product.image_url,
    };
}

/**
 * Calculate nutrition for a specific serving size
 */
export function calculateNutritionForServing(
    food: FoodItem,
    targetServingSize: number,
    targetServingUnit: string
): FoodItem {
    // For simplicity, assume units match or convert grams
    const ratio = targetServingSize / food.servingSize;

    return {
        ...food,
        servingSize: targetServingSize,
        servingUnit: targetServingUnit,
        calories: Math.round(food.calories * ratio),
        protein: parseFloat((food.protein * ratio).toFixed(1)),
        carbs: parseFloat((food.carbs * ratio).toFixed(1)),
        fats: parseFloat((food.fats * ratio).toFixed(1)),
        fiber: food.fiber ? parseFloat((food.fiber * ratio).toFixed(1)) : undefined,
        sugar: food.sugar ? parseFloat((food.sugar * ratio).toFixed(1)) : undefined,
    };
}

/**
 * Cache search results locally
 * Note: This is now handled automatically in searchFoods() and getFoodByBarcode()
 * Keeping for backward compatibility
 */
export async function cacheSearchResults(query: string, results: OpenFoodFactsProduct[]): Promise<void> {
    const cacheKey = `openfoodfacts:manual:${query}`;
    setCacheItem(cacheKey, results);
}

/**
 * Get cached search results
 * Note: This is now handled automatically in searchFoods() and getFoodByBarcode()
 * Keeping for backward compatibility
 */
export async function getCachedSearchResults(query: string): Promise<OpenFoodFactsProduct[] | null> {
    const cacheKey = `openfoodfacts:manual:${query}`;
    return getCacheItem<OpenFoodFactsProduct[]>(cacheKey);
}

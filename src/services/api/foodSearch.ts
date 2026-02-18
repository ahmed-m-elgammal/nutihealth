import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import Food from '../../database/models/Food';
import CustomFood from '../../database/models/CustomFood';
import { getProductByBarcode, searchProducts } from './openFoodFacts';

export interface SearchResult {
    id: string;
    name: string;
    brand?: string;
    barcode?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    servingSize: number;
    servingUnit: string;
    source: 'recent' | 'database' | 'external';
}

export interface SearchResults {
    recent: SearchResult[];
    database: SearchResult[];
    external: SearchResult[];
}

/**
 * Search for foods across multiple sources
 */
export async function searchFoods(query: string, limit: number = 20): Promise<SearchResults> {
    const results: SearchResults = {
        recent: [],
        database: [],
        external: []
    };

    if (!query || query.trim().length < 2) {
        // Return only recent foods if no query
        results.recent = await getRecentFoods(10);
        return results;
    }

    const searchTerm = query.toLowerCase().trim();

    // 1. Search recent foods (from logged meals)
    results.recent = await searchRecentFoods(searchTerm, 5);

    // 2. Search custom foods database
    results.database = await searchCustomFoods(searchTerm, limit);

    // 3. Search OpenFoodFacts (external API) if query is substantial
    if (searchTerm.length >= 3) {
        try {
            results.external = await searchExternalFoods(searchTerm, 10);
        } catch (error) {
            console.warn('External food search failed:', error);
            // Continue without external results
        }
    }

    return results;
}

/**
 * Search recent foods from logged meals
 */
async function searchRecentFoods(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const foodsCollection = database.collections.get<Food>('foods');

        const recentFoods = await foodsCollection
            .query(
                Q.where('name', Q.like(`%${query}%`)),
                Q.sortBy('created_at', Q.desc),
                Q.take(limit)
            )
            .fetch();

        // Deduplicate by name
        const uniqueFoods = new Map<string, Food>();
        for (const food of recentFoods) {
            if (!uniqueFoods.has(food.name.toLowerCase())) {
                uniqueFoods.set(food.name.toLowerCase(), food);
            }
        }

        return Array.from(uniqueFoods.values()).map(food => ({
            id: food.id,
            name: food.name,
            brand: food.brand,
            barcode: food.barcode,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats,
            fiber: food.fiber,
            sugar: food.sugar,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            source: 'recent' as const
        }));
    } catch (error) {
        console.error('Recent foods search error:', error);
        return [];
    }
}

/**
 * Get recent foods without search filter
 */
async function getRecentFoods(limit: number): Promise<SearchResult[]> {
    try {
        const foodsCollection = database.collections.get<Food>('foods');

        const recentFoods = await foodsCollection
            .query(
                Q.sortBy('created_at', Q.desc),
                Q.take(limit * 3) // Get more to deduplicate
            )
            .fetch();

        // Deduplicate by name
        const uniqueFoods = new Map<string, Food>();
        for (const food of recentFoods) {
            if (!uniqueFoods.has(food.name.toLowerCase())) {
                uniqueFoods.set(food.name.toLowerCase(), food);
            }
        }

        return Array.from(uniqueFoods.values())
            .slice(0, limit)
            .map(food => ({
                id: food.id,
                name: food.name,
                brand: food.brand,
                barcode: food.barcode,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                fiber: food.fiber,
                sugar: food.sugar,
                servingSize: food.servingSize,
                servingUnit: food.servingUnit,
                source: 'recent' as const
            }));
    } catch (error) {
        console.error('Get recent foods error:', error);
        return [];
    }
}

/**
 * Search custom foods database
 */
async function searchCustomFoods(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const customFoodsCollection = database.collections.get<CustomFood>('custom_foods');

        const customFoods = await customFoodsCollection
            .query(
                Q.where('name', Q.like(`%${query}%`)),
                Q.sortBy('created_at', Q.desc),
                Q.take(limit)
            )
            .fetch();

        return customFoods.map(food => ({
            id: food.id,
            name: food.name,
            brand: food.brand,
            barcode: food.barcode,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats,
            fiber: food.fiber,
            sugar: food.sugar,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            source: 'database' as const
        }));
    } catch (error) {
        console.error('Custom foods search error:', error);
        return [];
    }
}

/**
 * Search OpenFoodFacts external API
 */
async function searchExternalFoods(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const products = await searchProducts(query, limit);

        return products.map(product => ({
            id: product.barcode || `external-${Date.now()}-${Math.random()}`,
            name: product.name,
            brand: product.brand,
            barcode: product.barcode,
            calories: product.calories,
            protein: product.protein,
            carbs: product.carbs,
            fats: product.fats,
            fiber: product.fiber,
            sugar: product.sugar,
            servingSize: product.servingSize,
            servingUnit: product.servingUnit,
            source: 'external' as const
        }));
    } catch (error) {
        console.error('External food search error:', error);
        throw error;
    }
}

/**
 * Search by barcode
 */
export async function searchByBarcode(barcode: string): Promise<SearchResult | null> {
    try {
        // First check custom foods
        const customFoodsCollection = database.collections.get<CustomFood>('custom_foods');
        const customFood = await customFoodsCollection
            .query(Q.where('barcode', Q.eq(barcode)))
            .fetch();

        if (customFood.length > 0) {
            const food = customFood[0];
            return {
                id: food.id,
                name: food.name,
                brand: food.brand,
                barcode: food.barcode,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                fiber: food.fiber,
                sugar: food.sugar,
                servingSize: food.servingSize,
                servingUnit: food.servingUnit,
                source: 'database' as const
            };
        }

        // Then check OpenFoodFacts
        const product = await getProductByBarcode(barcode);
        if (!product) return null;

        return {
            id: product.barcode || `external-${barcode}`,
            name: product.name,
            brand: product.brand,
            barcode: product.barcode,
            calories: product.calories,
            protein: product.protein,
            carbs: product.carbs,
            fats: product.fats,
            fiber: product.fiber,
            sugar: product.sugar,
            servingSize: product.servingSize,
            servingUnit: product.servingUnit,
            source: 'external' as const
        };
    } catch (error) {
        console.error('Barcode search error:', error);
        return null;
    }
}

import { NutritionData } from '../../types/food';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import Food from '../../database/models/Food';

/**
 * USDA FoodData Central API Integration
 * Free API with comprehensive nutrition data
 * Get your API key at: https://fdc.nal.usda.gov/api-key-signup.html
 */
const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY;
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const USDA_TIMEOUT = 5000; // 5 second timeout for USDA API

interface USDANutrient {
    nutrientId: number;
    nutrientName: string;
    value: number;
}

interface USDAFood {
    fdcId: number;
    description: string;
    foodNutrients: USDANutrient[];
}

/**
 * Finds nutrition data for a food label using multiple sources:
 * OPTIMIZED: Runs local DB queries in parallel for speed
 * 1. Local database (exact + fuzzy match in parallel)
 * 2. USDA API with timeout (if key configured)
 * 3. Generic estimate (last resort)
 */
export async function findNutritionData(foodLabel: string): Promise<NutritionData> {
    // Run both DB queries in parallel for better performance
    try {
        const [exactResults, fuzzyResults] = await Promise.all([
            database.collections.get('foods')
                .query(Q.where('name', Q.eq(foodLabel)))
                .fetch()
                .catch(() => []),
            database.collections.get('foods')
                .query(Q.where('name', Q.like(`%${foodLabel.toLowerCase()}%`)))
                .fetch()
                .catch(() => [])
        ]);

        // Check exact match first
        if (exactResults.length > 0) {
            const food = exactResults[0] as Food;
            return {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                fiber: food.fiber || 0,
                sugar: food.sugar || 0,
                source: 'database'
            };
        }

        // Then fuzzy match
        if (fuzzyResults.length > 0) {
            const food = fuzzyResults[0] as Food;
            return {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                fiber: food.fiber || 0,
                sugar: food.sugar || 0,
                source: 'database'
            };
        }
    } catch (error) {
        console.warn('Database queries failed:', error);
    }

    // 2. Fetch from USDA API with timeout (if configured)
    if (USDA_API_KEY) {
        try {
            const apiData = await fetchFromUSDA(foodLabel);
            if (apiData) {
                return { ...apiData, source: 'api' };
            }
        } catch (error) {
            console.warn('USDA API fetch failed:', error);
        }
    }

    // 3. Fall back to generic estimate (last resort)
    console.warn(`No nutrition data found for "${foodLabel}", using generic estimate`);
    return {
        calories: 200,
        protein: 10,
        carbs: 20,
        fats: 10,
        fiber: 2,
        sugar: 5,
        source: 'estimate'
    };
}

/**
 * Fetches nutrition data from USDA FoodData Central API with timeout
 */
async function fetchFromUSDA(foodName: string): Promise<Omit<NutritionData, 'source'> | null> {
    if (!USDA_API_KEY) {
        return null;
    }

    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), USDA_TIMEOUT);

        const response = await fetch(
            `${USDA_API_URL}?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`USDA API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.foods || data.foods.length === 0) {
            return null;
        }

        const food: USDAFood = data.foods[0];

        // Extract relevant nutrients (per 100g)
        const getNutrient = (name: string): number => {
            const nutrient = food.foodNutrients.find(n =>
                n.nutrientName.toLowerCase().includes(name.toLowerCase())
            );
            return nutrient?.value || 0;
        };

        return {
            calories: getNutrient('Energy'),
            protein: getNutrient('Protein'),
            carbs: getNutrient('Carbohydrate'),
            fats: getNutrient('Total lipid'),
            fiber: getNutrient('Fiber'),
            sugar: getNutrient('Sugars'),
        };
    } catch (error) {
        console.error('USDA API error:', error);
        return null;
    }
}

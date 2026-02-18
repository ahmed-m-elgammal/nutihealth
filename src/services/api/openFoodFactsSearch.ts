import axios from 'axios';
import { FoodProduct } from './openFoodFacts';
import { handleError } from '../../utils/errors';

const SEARCH_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

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

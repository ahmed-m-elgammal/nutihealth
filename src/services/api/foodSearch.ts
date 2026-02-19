import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import Food from '../../database/models/Food';
import CustomFood from '../../database/models/CustomFood';
import { egyptianFoods } from '../../constants/egyptianFoods';
import { getProductByBarcode, searchProducts } from './openFoodFacts';
import { searchUsdaFoods } from './usdaFoodData';

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
    source: 'recent' | 'database' | 'external' | 'regional';
}

export interface SearchResults {
    recent: SearchResult[];
    database: SearchResult[];
    external: SearchResult[];
}

type SearchCacheEntry = {
    timestamp: number;
    data: SearchResults;
};

const SEARCH_CACHE_TTL = 45_000;
const searchCache = new Map<string, SearchCacheEntry>();

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[\u064B-\u065F]/g, '');

const transliterationMap: Record<string, string> = {
    koshary: 'كشري',
    koshari: 'كشري',
    fool: 'فول',
    ful: 'فول',
    taameya: 'طعمية',
    tamia: 'طعمية',
    molokhia: 'ملوخية',
    mahshi: 'محشي',
    konafa: 'كنافة',
    kunafa: 'كنافة',
    basbousa: 'بسبوسة',
};

const enrichQueryVariants = (query: string) => {
    const normalized = normalizeText(query);
    const variants = new Set([normalized]);

    const mappedArabic = transliterationMap[normalized];
    if (mappedArabic) {
        variants.add(mappedArabic);
    }

    return [...variants].filter(Boolean);
};

const dedupeByName = (items: SearchResult[]) => {
    const seen = new Set<string>();
    const deduped: SearchResult[] = [];

    for (const item of items) {
        const key = normalizeText(item.name);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }

    return deduped;
};

const rankResults = (items: SearchResult[], query: string) => {
    const q = normalizeText(query);

    return [...items].sort((a, b) => {
        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);

        const aStarts = aName.startsWith(q) ? 1 : 0;
        const bStarts = bName.startsWith(q) ? 1 : 0;

        if (aStarts !== bStarts) {
            return bStarts - aStarts;
        }

        const aContains = aName.includes(q) ? 1 : 0;
        const bContains = bName.includes(q) ? 1 : 0;

        if (aContains !== bContains) {
            return bContains - aContains;
        }

        return aName.localeCompare(bName);
    });
};

/**
 * Search for foods across multiple sources
 */
export async function searchFoods(query: string, limit: number = 20): Promise<SearchResults> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
        return {
            recent: await getRecentFoods(10),
            database: [],
            external: [],
        };
    }

    const cacheKey = `${normalizeText(trimmedQuery)}:${limit}`;
    const now = Date.now();
    const cached = searchCache.get(cacheKey);
    if (cached && now - cached.timestamp < SEARCH_CACHE_TTL) {
        return cached.data;
    }

    const variants = enrichQueryVariants(trimmedQuery);

    const [recent, databaseFoods, externalFoods] = await Promise.all([
        searchRecentFoods(variants, 5),
        searchCustomFoods(variants, limit),
        searchExternalFoods(variants, 12),
    ]);

    const results: SearchResults = {
        recent,
        database: databaseFoods,
        external: externalFoods,
    };

    searchCache.set(cacheKey, { timestamp: now, data: results });
    return results;
}

/**
 * Search recent foods from logged meals
 */
async function searchRecentFoods(queries: string[], limit: number): Promise<SearchResult[]> {
    try {
        const foodsCollection = database.collections.get<Food>('foods');
        const aggregated = new Map<string, SearchResult>();

        for (const query of queries) {
            const recentFoods = await foodsCollection
                .query(Q.where('name', Q.like(`%${query}%`)), Q.sortBy('created_at', Q.desc), Q.take(limit * 2))
                .fetch();

            for (const food of recentFoods) {
                const key = normalizeText(food.name);
                if (aggregated.has(key)) continue;

                aggregated.set(key, {
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
                    source: 'recent',
                });
            }
        }

        const normalizedQuery = queries[0] || '';
        return rankResults([...aggregated.values()], normalizedQuery).slice(0, limit);
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

        const recentFoods = await foodsCollection.query(Q.sortBy('created_at', Q.desc), Q.take(limit * 3)).fetch();

        const uniqueFoods = new Map<string, Food>();
        for (const food of recentFoods) {
            if (!uniqueFoods.has(food.name.toLowerCase())) {
                uniqueFoods.set(food.name.toLowerCase(), food);
            }
        }

        return Array.from(uniqueFoods.values())
            .slice(0, limit)
            .map((food) => ({
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
                source: 'recent' as const,
            }));
    } catch (error) {
        console.error('Get recent foods error:', error);
        return [];
    }
}

/**
 * Search custom foods database
 */
async function searchCustomFoods(queries: string[], limit: number): Promise<SearchResult[]> {
    try {
        const customFoodsCollection = database.collections.get<CustomFood>('custom_foods');
        const found = new Map<string, SearchResult>();

        for (const query of queries) {
            const customFoods = await customFoodsCollection
                .query(Q.where('name', Q.like(`%${query}%`)), Q.sortBy('created_at', Q.desc), Q.take(limit))
                .fetch();

            for (const food of customFoods) {
                const key = normalizeText(food.name);
                if (found.has(key)) continue;

                found.set(key, {
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
                    source: 'database',
                });
            }
        }

        return rankResults([...found.values()], queries[0] || '').slice(0, limit);
    } catch (error) {
        console.error('Custom foods search error:', error);
        return [];
    }
}

const searchEgyptianFoods = (queries: string[], limit: number): SearchResult[] => {
    const matches = egyptianFoods.filter((food) => {
        const normalizedName = normalizeText(food.name);
        const normalizedAltNames = (food.altNames || []).map(normalizeText);

        return queries.some((query) => {
            const q = normalizeText(query);
            return normalizedName.includes(q) || normalizedAltNames.some((alt) => alt.includes(q));
        });
    });

    const mapped = matches.map<SearchResult>((food) => ({
        id: `regional-${food.id}`,
        name: food.name,
        brand: 'Egyptian Foods Database',
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber,
        sugar: food.sugar,
        servingSize: food.servingSize || 100,
        servingUnit: food.servingUnit || 'g',
        source: 'regional',
    }));

    return rankResults(mapped, queries[0] || '').slice(0, limit);
};

/**
 * Search external APIs + regional curated data
 */
async function searchExternalFoods(queries: string[], limit: number): Promise<SearchResult[]> {
    try {
        const primaryQuery = queries[0] || '';
        if (primaryQuery.length < 3) {
            return searchEgyptianFoods(queries, limit);
        }

        const [openFoodFactsProducts, usdaProducts] = await Promise.all([
            searchProducts(primaryQuery, limit),
            searchUsdaFoods(primaryQuery, limit),
        ]);

        const fromOpenFoodFacts: SearchResult[] = openFoodFactsProducts.map((product, index) => ({
            id: product.barcode || `off-${normalizeText(product.name)}-${index}`,
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
            source: 'external',
        }));

        const fromUsda: SearchResult[] = usdaProducts.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            calories: product.calories,
            protein: product.protein,
            carbs: product.carbs,
            fats: product.fats,
            fiber: product.fiber,
            sugar: product.sugar,
            servingSize: product.servingSize,
            servingUnit: product.servingUnit,
            source: 'external',
        }));

        const egyptianMatches = searchEgyptianFoods(queries, limit);

        return rankResults(dedupeByName([...egyptianMatches, ...fromOpenFoodFacts, ...fromUsda]), primaryQuery).slice(
            0,
            limit,
        );
    } catch (error) {
        console.error('External food search error:', error);
        return searchEgyptianFoods(queries, limit);
    }
}

/**
 * Search by barcode
 */
export async function searchByBarcode(barcode: string): Promise<SearchResult | null> {
    try {
        const customFoodsCollection = database.collections.get<CustomFood>('custom_foods');
        const customFood = await customFoodsCollection.query(Q.where('barcode', Q.eq(barcode))).fetch();

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
                source: 'database' as const,
            };
        }

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
            source: 'external' as const,
        };
    } catch (error) {
        console.error('Barcode search error:', error);
        return null;
    }
}

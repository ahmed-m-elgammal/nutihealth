import { api } from './apiWrapper';
import { findNutritionData } from './api/nutrition';
import { ImportedRecipe, normalizeRecipeResponse, RecipeIngredient, RecipeNutrition } from '../utils/recipeParser';
import { normalizeUnit } from '../utils/arabicNumberConverter';
import { storage } from '../utils/storage-adapter';

const CACHE_PREFIX = 'recipe-import:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MIN_LOADING_MS = 3000;

export type RecipeImportErrorCode = 'INVALID_URL' | 'NO_RECIPE' | 'NETWORK' | 'PARSE' | 'UNKNOWN';

export interface RecipeImportApiResponse {
    title: string;
    titleAr?: string;
    servings: number;
    ingredients: Array<{
        id?: string;
        name: string;
        amount: number;
        unit: string;
        nameAr?: string;
    }>;
    instructions: string[];
    nutrition: RecipeNutrition;
    imageUrl: string;
    language: 'en' | 'ar';
}

interface CacheEntry {
    timestamp: number;
    data: ImportedRecipe;
}

export interface ImportRecipeOptions {
    forceRefresh?: boolean;
    minLoadingMs?: number;
}

export class RecipeImportError extends Error {
    constructor(
        public readonly code: RecipeImportErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'RecipeImportError';
    }
}

/**
 * Imports a recipe from URL with cache + retry support.
 */
export async function importRecipeFromUrl(url: string, options: ImportRecipeOptions = {}): Promise<ImportedRecipe> {
    const normalizedUrl = validateRecipeUrl(url);
    const minLoadingMs = options.minLoadingMs ?? DEFAULT_MIN_LOADING_MS;
    const start = Date.now();

    if (!options.forceRefresh) {
        const cached = await readCachedRecipe(normalizedUrl);
        if (cached) {
            await waitForMinimumDuration(start, minLoadingMs);
            trackRecipeImportSuccess(cached, normalizedUrl, true);
            return cached;
        }
    }

    try {
        const response = await executeWithRetry(
            async () =>
                api.post<RecipeImportApiResponse>(
                    '/recipes/import',
                    { url: normalizedUrl },
                    {
                        suppressErrors: true,
                        retryCount: 0,
                        timeout: 20000,
                    },
                ),
            DEFAULT_MAX_RETRIES,
        );

        const normalizedRecipe = normalizeRecipeResponse(response, normalizedUrl);
        const recipeWithNutrition = await ensureRecipeNutrition(normalizedRecipe);

        await cacheRecipe(normalizedUrl, recipeWithNutrition);
        await waitForMinimumDuration(start, minLoadingMs);
        trackRecipeImportSuccess(recipeWithNutrition, normalizedUrl, false);

        return recipeWithNutrition;
    } catch (error) {
        await waitForMinimumDuration(start, minLoadingMs);
        throw toRecipeImportError(error);
    }
}

/**
 * Converts internal error codes to UI-friendly, localized message keys.
 */
export function mapImportErrorToMessageKey(code: RecipeImportErrorCode): string {
    switch (code) {
        case 'INVALID_URL':
            return 'recipeImport.errors.invalidUrl';
        case 'NO_RECIPE':
            return 'recipeImport.errors.noRecipe';
        case 'NETWORK':
            return 'recipeImport.errors.network';
        case 'PARSE':
            return 'recipeImport.errors.parse';
        default:
            return 'recipeImport.errors.unknown';
    }
}

/**
 * Clears cached recipe entries (used for debugging/testing).
 */
export async function clearRecipeImportCache(): Promise<void> {
    const keys = await storage.getAllKeys();
    const recipeKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (recipeKeys.length > 0) {
        await storage.multiRemove(recipeKeys);
    }
}

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (!shouldRetry(error) || attempt >= maxRetries - 1) {
                break;
            }

            const delay = Math.min(500 * Math.pow(2, attempt), 4000);
            await sleep(delay);
        }
    }

    throw lastError ?? new Error('Recipe import failed');
}

function shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('failed to fetch') ||
        message.includes('5')
    );
}

function validateRecipeUrl(url: string): string {
    try {
        const parsed = new URL(url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new RecipeImportError('INVALID_URL', 'Please enter a valid recipe URL');
        }
        return parsed.toString();
    } catch {
        throw new RecipeImportError('INVALID_URL', 'Please enter a valid recipe URL');
    }
}

function toRecipeImportError(error: unknown): RecipeImportError {
    if (error instanceof RecipeImportError) {
        return error;
    }

    if (!(error instanceof Error)) {
        return new RecipeImportError('UNKNOWN', 'Unexpected recipe import failure');
    }

    const message = error.message.toLowerCase();

    if (message.includes('valid recipe url')) {
        return new RecipeImportError('INVALID_URL', error.message);
    }

    if (message.includes('couldn') && message.includes('recipe')) {
        return new RecipeImportError('NO_RECIPE', error.message);
    }

    if (message.includes('parse')) {
        return new RecipeImportError('PARSE', error.message);
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return new RecipeImportError('NETWORK', error.message);
    }

    if (message.includes('connection failed') || message.includes('internet')) {
        return new RecipeImportError('NETWORK', error.message);
    }

    return new RecipeImportError('UNKNOWN', error.message);
}

async function readCachedRecipe(url: string): Promise<ImportedRecipe | null> {
    try {
        const key = buildCacheKey(url);
        const raw = await storage.getItem(key);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as CacheEntry;
        if (!parsed.timestamp || !parsed.data) {
            return null;
        }

        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
            await storage.removeItem(key);
            return null;
        }

        return parsed.data;
    } catch {
        return null;
    }
}

async function cacheRecipe(url: string, recipe: ImportedRecipe): Promise<void> {
    const entry: CacheEntry = {
        timestamp: Date.now(),
        data: recipe,
    };

    await storage.setItem(buildCacheKey(url), JSON.stringify(entry));
}

function buildCacheKey(url: string): string {
    const encoded = encodeURIComponent(url);
    return `${CACHE_PREFIX}${encoded}`;
}

async function ensureRecipeNutrition(recipe: ImportedRecipe): Promise<ImportedRecipe> {
    const nutrition = recipe.nutrition;
    const hasNutrition = nutrition.calories > 0 || nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fats > 0;

    if (hasNutrition) {
        return recipe;
    }

    const estimated = await estimateNutritionFromIngredients(recipe.ingredients, recipe.servings);
    return {
        ...recipe,
        nutrition: estimated,
    };
}

async function estimateNutritionFromIngredients(
    ingredients: RecipeIngredient[],
    servings: number,
): Promise<RecipeNutrition> {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    const limitedIngredients = ingredients.slice(0, 20);
    const nutritionLookups = await Promise.all(
        limitedIngredients.map(async (ingredient) => {
            const baseNutrition = await findNutritionData(ingredient.name);
            const multiplier = ingredientQuantityMultiplier(ingredient.amount, ingredient.unit);

            return {
                calories: baseNutrition.calories * multiplier,
                protein: baseNutrition.protein * multiplier,
                carbs: baseNutrition.carbs * multiplier,
                fats: baseNutrition.fats * multiplier,
            };
        }),
    );

    for (const item of nutritionLookups) {
        calories += item.calories;
        protein += item.protein;
        carbs += item.carbs;
        fats += item.fats;
    }

    const safeServings = Math.max(1, servings);

    return {
        calories: Math.round(calories / safeServings),
        protein: round(protein / safeServings),
        carbs: round(carbs / safeServings),
        fats: round(fats / safeServings),
    };
}

function ingredientQuantityMultiplier(amount: number, unit: string): number {
    const safeAmount = Number.isFinite(amount) ? Math.max(0.25, amount) : 1;
    const normalized = normalizeUnit(unit);

    switch (normalized) {
        case 'kg':
            return safeAmount * 10;
        case 'g':
            return safeAmount / 100;
        case 'l':
            return safeAmount * 10;
        case 'ml':
            return safeAmount / 100;
        case 'cup':
            return safeAmount * 2.4;
        case 'tbsp':
            return safeAmount * 0.15;
        case 'tsp':
            return safeAmount * 0.05;
        case 'lb':
            return safeAmount * 4.535;
        case 'oz':
            return safeAmount * 0.283;
        case 'pinch':
            return safeAmount * 0.02;
        case 'clove':
            return safeAmount * 0.1;
        default:
            return safeAmount;
    }
}

async function waitForMinimumDuration(startTime: number, minDuration: number): Promise<void> {
    const elapsed = Date.now() - startTime;
    const remaining = minDuration - elapsed;

    if (remaining > 0) {
        await sleep(remaining);
    }
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function round(value: number): number {
    return Math.round(value * 10) / 10;
}

function trackRecipeImportSuccess(recipe: ImportedRecipe, sourceUrl: string, cached: boolean): void {
    const payload = {
        event: 'recipe_import_success',
        sourceUrl,
        language: recipe.language,
        servings: recipe.servings,
        ingredientsCount: recipe.ingredients.length,
        cached,
    };

    const globalAnalytics = (
        globalThis as unknown as {
            analytics?: { track?: (event: string, data?: Record<string, unknown>) => void };
        }
    ).analytics;

    if (globalAnalytics?.track) {
        globalAnalytics.track('recipe_import_success', payload);
        return;
    }
}

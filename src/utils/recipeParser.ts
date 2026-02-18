import {
    convertAmountBetweenSystems,
    parseIngredientAmount,
    UnitSystem,
} from './arabicNumberConverter';

export type RecipeLanguage = 'en' | 'ar';

export interface RecipeNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface RecipeIngredient {
    id: string;
    name: string;
    amount: number;
    unit: string;
    nameAr?: string;
}

export interface ImportedRecipe {
    title: string;
    titleAr?: string;
    servings: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    nutrition: RecipeNutrition;
    imageUrl: string;
    language: RecipeLanguage;
    sourceUrl: string;
}

export interface RecipeTotals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

/**
 * Converts raw API payload into a strict recipe structure used by UI and meal logging.
 */
export function normalizeRecipeResponse(payload: unknown, sourceUrl: string): ImportedRecipe {
    const data = (payload ?? {}) as Record<string, unknown>;

    const rawIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
    const ingredients = rawIngredients
        .map((entry, index) => normalizeIngredient(entry, index))
        .filter((ingredient): ingredient is RecipeIngredient => ingredient !== null);

    return {
        title: String(data.title ?? '').trim() || 'Untitled Recipe',
        titleAr: typeof data.titleAr === 'string' ? data.titleAr.trim() : undefined,
        servings: normalizeServings(data.servings),
        ingredients,
        instructions: normalizeInstructions(data.instructions),
        nutrition: normalizeNutrition(data.nutrition),
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
        language: data.language === 'ar' ? 'ar' : 'en',
        sourceUrl,
    };
}

/**
 * Calculates the selected ingredient ratio used to proportionally scale recipe totals.
 */
export function calculateIngredientSelectionRatio(
    selectedIngredientIds: string[],
    totalIngredientCount: number
): number {
    if (totalIngredientCount <= 0) {
        return 1;
    }

    const ratio = selectedIngredientIds.length / totalIngredientCount;
    return Math.min(1, Math.max(0.1, ratio));
}

/**
 * Calculates nutrition totals from per-serving nutrition + serving/ingredient adjustments.
 */
export function calculateNutritionForServings(
    perServing: RecipeNutrition,
    servings: number,
    ingredientRatio: number = 1
): RecipeTotals {
    const safeServings = Math.max(0.1, servings);
    const safeRatio = Math.max(0.1, Math.min(1, ingredientRatio));

    return {
        calories: round(perServing.calories * safeServings * safeRatio),
        protein: round(perServing.protein * safeServings * safeRatio),
        carbs: round(perServing.carbs * safeServings * safeRatio),
        fats: round(perServing.fats * safeServings * safeRatio),
    };
}

/**
 * Converts ingredient quantities to preferred unit system for display.
 */
export function convertIngredientsToUnitSystem(
    ingredients: RecipeIngredient[],
    unitSystem: UnitSystem
): RecipeIngredient[] {
    return ingredients.map((ingredient) => {
        const conversion = convertAmountBetweenSystems(ingredient.amount, ingredient.unit, unitSystem);
        return {
            ...ingredient,
            amount: conversion.amount,
            unit: conversion.unit,
        };
    });
}

/**
 * Detects if text likely contains Arabic script.
 */
export function isArabicContent(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text);
}

/**
 * Decides layout direction based on recipe language and textual signals.
 */
export function resolveRecipeDirection(recipe: Pick<ImportedRecipe, 'language' | 'title' | 'titleAr'>): 'rtl' | 'ltr' {
    if (recipe.language === 'ar') {
        return 'rtl';
    }

    if (recipe.titleAr && isArabicContent(recipe.titleAr)) {
        return 'rtl';
    }

    return isArabicContent(recipe.title) ? 'rtl' : 'ltr';
}

function normalizeIngredient(entry: unknown, index: number): RecipeIngredient | null {
    if (typeof entry === 'string') {
        const parsed = parseIngredientAmount(entry);
        return {
            id: `ingredient-${index}`,
            name: parsed.name,
            amount: parsed.amount ?? 1,
            unit: parsed.unit,
        };
    }

    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const data = entry as Record<string, unknown>;
    const parsedFromName = typeof data.name === 'string' ? parseIngredientAmount(data.name) : null;

    const amount = coerceNumber(data.amount) ?? parsedFromName?.amount ?? 1;
    const unit = typeof data.unit === 'string' ? data.unit : parsedFromName?.unit ?? 'piece';
    const name =
        typeof data.name === 'string' && data.name.trim().length > 0
            ? data.name.trim()
            : parsedFromName?.name ?? 'Ingredient';

    return {
        id: typeof data.id === 'string' ? data.id : `ingredient-${index}`,
        name,
        amount,
        unit,
        nameAr: typeof data.nameAr === 'string' ? data.nameAr : undefined,
    };
}

function normalizeInstructions(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
}

function normalizeNutrition(value: unknown): RecipeNutrition {
    const nutrition = (value ?? {}) as Record<string, unknown>;

    return {
        calories: coerceNumber(nutrition.calories) ?? 0,
        protein: coerceNumber(nutrition.protein) ?? 0,
        carbs: coerceNumber(nutrition.carbs) ?? 0,
        fats: coerceNumber(nutrition.fats) ?? 0,
    };
}

function normalizeServings(value: unknown): number {
    const parsed = coerceNumber(value);
    if (!parsed || parsed <= 0) {
        return 1;
    }
    return Math.round(parsed);
}

function coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function round(value: number): number {
    return Math.round(value * 10) / 10;
}
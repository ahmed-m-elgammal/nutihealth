const { randomUUID } = require('node:crypto');
const baseRecipeCatalog = require('../data/egyptianRecipeCatalog.json');
const { normalizeText, normalizeIngredient } = require('./arabicIngredientNormalizationService');
const { estimateRecipeNutrition, convertToGrams } = require('./nutritionEstimatorService');
const { fetchRecipeById, searchRecipesByIngredient } = require('./cookpadScraperService');
const { loadFoodCsvCatalog } = require('./foodCsvCatalogService');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;
const DEFAULT_SERVING_SIZE_G = 250;
const COOKING_YIELD_FACTOR = 0.8;

const toSafeString = (value) => String(value || '').trim();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createSuggestionError = (message, code = 'SUGGESTION_ERROR', status = 400) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
};

const toPositiveNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const roundTo = (value, precision = 1) => {
    const factor = 10 ** precision;
    return Math.round((Number(value) || 0) * factor) / factor;
};

const uniqueNormalizedTokens = (values) => {
    const normalized = new Set();

    for (const value of values || []) {
        const token = normalizeText(value);
        if (!token) continue;
        normalized.add(token);
    }

    return Array.from(normalized);
};

const normalizeRecipeIngredients = (ingredients) => {
    if (!Array.isArray(ingredients)) return [];

    return ingredients.map((item) => toSafeString(item)).filter(Boolean);
};

const normalizeRecipeInstructions = (instructions) => {
    if (!Array.isArray(instructions)) return [];

    return instructions
        .map((item) => toSafeString(item))
        .filter(Boolean)
        .slice(0, 20);
};

const normalizeServings = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return Math.max(1, Math.round(parsed));
};

const normalizeCatalogRecord = (recipe) => {
    const recipeId = toSafeString(recipe.recipe_id);
    const foodNameAr = toSafeString(recipe.food_name_ar);
    const foodNameEn = toSafeString(recipe.food_name_en);
    const category = toSafeString(recipe.category || recipe.category_ar || recipe.category_en) || 'uncategorized';
    const ingredientsAr = normalizeRecipeIngredients(recipe.ingredients_ar);
    const ingredientsEn = normalizeRecipeIngredients(recipe.ingredients_en);
    const instructions = normalizeRecipeInstructions(recipe.instructions);
    const prepTimeMinutes = toPositiveNumber(recipe.prep_time_minutes, 0) || null;
    const cookTimeMinutes = toPositiveNumber(recipe.cook_time_minutes, 0) || null;

    return {
        recipe_id: recipeId,
        food_name_ar: foodNameAr,
        food_name_en: foodNameEn,
        category,
        ingredients_ar: ingredientsAr,
        ingredients_en: ingredientsEn,
        instructions,
        prep_time_minutes: prepTimeMinutes,
        cook_time_minutes: cookTimeMinutes,
        total_time_minutes: prepTimeMinutes && cookTimeMinutes ? prepTimeMinutes + cookTimeMinutes : null,
        servings: normalizeServings(recipe.servings),
        source: toSafeString(recipe.source || 'egyptian-catalog'),
        normalized_names: uniqueNormalizedTokens([foodNameAr, foodNameEn]),
        normalized_ingredients_ar: uniqueNormalizedTokens(ingredientsAr),
        normalized_ingredients_en: uniqueNormalizedTokens(ingredientsEn),
        normalized_ingredients_any: uniqueNormalizedTokens([...ingredientsAr, ...ingredientsEn]),
    };
};

const mergeCatalogRecords = (primaryCatalog, extraCatalog) => {
    const mergedCatalog = [];
    const byId = new Map();
    const indexById = new Map();

    const pushRecord = (record) => {
        if (!record?.recipe_id) return;
        const index = mergedCatalog.length;
        mergedCatalog.push(record);
        byId.set(record.recipe_id, record);
        indexById.set(record.recipe_id, index);
    };

    const updateRecordById = (recipeId, nextRecord) => {
        const index = indexById.get(recipeId);
        if (!Number.isInteger(index)) return;
        mergedCatalog[index] = nextRecord;
        byId.set(recipeId, nextRecord);
    };

    const pickLongerList = (first, second) => {
        const firstList = Array.isArray(first) ? first : [];
        const secondList = Array.isArray(second) ? second : [];
        return secondList.length > firstList.length ? secondList : firstList;
    };

    for (const record of primaryCatalog || []) {
        pushRecord(record);
    }

    for (const record of extraCatalog || []) {
        const recipeId = toSafeString(record?.recipe_id);
        if (!recipeId) continue;

        if (!byId.has(recipeId)) {
            pushRecord(record);
            continue;
        }

        const existing = byId.get(recipeId);
        const existingName = normalizeText(existing?.food_name_ar || existing?.food_name_en);
        const incomingName = normalizeText(record?.food_name_ar || record?.food_name_en);

        if (existingName && incomingName && existingName === incomingName) {
            const mergedRecord = {
                ...existing,
                food_name_ar: existing.food_name_ar || record.food_name_ar,
                food_name_en: existing.food_name_en || record.food_name_en,
                category: existing.category || record.category || record.category_ar || record.category_en,
                ingredients_ar: pickLongerList(existing.ingredients_ar, record.ingredients_ar),
                ingredients_en: pickLongerList(existing.ingredients_en, record.ingredients_en),
                instructions: pickLongerList(existing.instructions, record.instructions),
                prep_time_minutes: existing.prep_time_minutes || record.prep_time_minutes,
                cook_time_minutes: existing.cook_time_minutes || record.cook_time_minutes,
                servings: existing.servings || record.servings,
                source: existing.source || record.source,
            };
            updateRecordById(recipeId, mergedRecord);
            continue;
        }

        let nextId = `foodcsv-${recipeId}`;
        let suffix = 2;
        while (byId.has(nextId)) {
            nextId = `foodcsv-${recipeId}-${suffix}`;
            suffix += 1;
        }

        pushRecord({
            ...record,
            recipe_id: nextId,
        });
    }

    return mergedCatalog;
};

const { recipes: foodCsvCatalog, meta: foodCsvMeta } = loadFoodCsvCatalog();

const mergedRecipeCatalog = mergeCatalogRecords(
    Array.isArray(baseRecipeCatalog) ? baseRecipeCatalog : [],
    Array.isArray(foodCsvCatalog) ? foodCsvCatalog : [],
);

const catalog = mergedRecipeCatalog.map(normalizeCatalogRecord).filter((item) => item.recipe_id);
const catalogById = new Map(catalog.map((item) => [item.recipe_id, item]));
const baselineNutritionCache = new Map();

const catalogSourceLabel = foodCsvMeta?.loaded_recipes > 0 ? 'egyptian-food-catalog+food-csv' : 'egyptian-food-catalog';

function getPreferredIngredients(recipe, lang = 'ar') {
    if (!recipe) return [];

    const useEnglish = String(lang || '')
        .toLowerCase()
        .startsWith('en');
    if (useEnglish) {
        return recipe.ingredients_en.length > 0 ? recipe.ingredients_en : recipe.ingredients_ar;
    }

    return recipe.ingredients_ar.length > 0 ? recipe.ingredients_ar : recipe.ingredients_en;
}

function parseIngredientInputValue(value) {
    if (!value) return null;

    if (typeof value === 'string') {
        const name = toSafeString(value);
        if (!name) return null;

        return {
            name,
            quantity: 1,
            unit: 'piece',
        };
    }

    if (typeof value !== 'object') {
        return null;
    }

    const name = toSafeString(value.name || value.name_ar || value.name_en || value.original);
    if (!name) {
        return null;
    }

    return {
        name,
        quantity: toPositiveNumber(value.quantity, 1),
        unit: toSafeString(value.unit) || 'piece',
    };
}

function parseIngredientInputs(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values.map(parseIngredientInputValue).filter(Boolean);
}

function buildNormalizedIngredientInputs(ingredientInputs) {
    return ingredientInputs.map((input) => {
        const normalized = normalizeIngredient(input.name);

        return {
            original: input.name,
            canonicalName: normalized?.canonicalName || input.name,
            quantity: toPositiveNumber(input.quantity, 1),
            unit: toSafeString(input.unit) || 'piece',
            matchedFood: normalized?.matchedFood || null,
        };
    });
}

function resolveRecipeByQuery(query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return null;

    const exactMatch = catalog.find((recipe) => recipe.normalized_names.includes(normalizedQuery));
    if (exactMatch) return exactMatch;

    const includedMatch = catalog.find((recipe) =>
        recipe.normalized_names.some((name) => name.includes(normalizedQuery) || normalizedQuery.includes(name)),
    );

    return includedMatch || null;
}

function ensureRecipeSelection(payload) {
    const recipeId = toSafeString(payload?.recipe_id);
    if (recipeId) {
        const byId = catalogById.get(recipeId);
        if (!byId) {
            throw createSuggestionError('Recipe not found', 'NOT_FOUND', 404);
        }

        return byId;
    }

    const recipeQuery = toSafeString(payload?.recipe_query || payload?.query);
    if (!recipeQuery) {
        throw createSuggestionError('recipe_id or recipe_query is required', 'INVALID_PAYLOAD', 400);
    }

    const byQuery = resolveRecipeByQuery(recipeQuery);
    if (!byQuery) {
        throw createSuggestionError('Recipe not found', 'NOT_FOUND', 404);
    }

    return byQuery;
}

function estimateFromIngredients({ ingredientInputs, servingSizeG, cookingState, mealType = 'lunch' }) {
    const normalizedIngredients = buildNormalizedIngredientInputs(ingredientInputs);

    const totalEstimate = estimateRecipeNutrition(normalizedIngredients, 1, mealType);
    const totalInputWeightG = normalizedIngredients.reduce(
        (sum, item) => sum + convertToGrams(item.quantity, item.unit, item.matchedFood),
        0,
    );

    const normalizedCookingState = cookingState === 'before' ? 'before' : 'after';
    const referenceCookedWeightG =
        normalizedCookingState === 'before' ? totalInputWeightG * COOKING_YIELD_FACTOR : totalInputWeightG;

    const safeServingG = toPositiveNumber(servingSizeG, referenceCookedWeightG || DEFAULT_SERVING_SIZE_G);
    const scalingFactor = referenceCookedWeightG > 0 ? safeServingG / referenceCookedWeightG : 1;

    const scaledNutrition = {
        calories: Math.max(0, Math.round((totalEstimate.calories || 0) * scalingFactor)),
        protein: Math.max(0, roundTo((totalEstimate.protein || 0) * scalingFactor, 1)),
        carbs: Math.max(0, roundTo((totalEstimate.carbs || 0) * scalingFactor, 1)),
        fats: Math.max(0, roundTo((totalEstimate.fats || 0) * scalingFactor, 1)),
        fiber: Math.max(0, roundTo((totalEstimate.fiber || 0) * scalingFactor, 1)),
        confidence: totalEstimate.confidence || 'low',
        source: 'tier1',
    };

    const per100Scale = referenceCookedWeightG > 0 ? 100 / referenceCookedWeightG : 1;
    const per100g = {
        calories: Math.max(0, Math.round((totalEstimate.calories || 0) * per100Scale)),
        protein: Math.max(0, roundTo((totalEstimate.protein || 0) * per100Scale, 1)),
        carbs: Math.max(0, roundTo((totalEstimate.carbs || 0) * per100Scale, 1)),
        fats: Math.max(0, roundTo((totalEstimate.fats || 0) * per100Scale, 1)),
        fiber: Math.max(0, roundTo((totalEstimate.fiber || 0) * per100Scale, 1)),
    };

    return {
        totalEstimate,
        totalInputWeightG,
        referenceCookedWeightG,
        safeServingG,
        normalizedCookingState,
        scaledNutrition,
        per100g,
        normalizedIngredients,
    };
}

function estimateBaselineRecipeNutrition(recipe, lang = 'ar') {
    const cacheKey = `${recipe.recipe_id}:${
        String(lang || 'ar')
            .toLowerCase()
            .startsWith('en')
            ? 'en'
            : 'ar'
    }`;
    const cached = baselineNutritionCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const ingredientInputs = getPreferredIngredients(recipe, lang).map((name) => ({
        name,
        quantity: 1,
        unit: 'piece',
    }));

    const estimated = estimateFromIngredients({
        ingredientInputs,
        servingSizeG: DEFAULT_SERVING_SIZE_G,
        cookingState: 'after',
        mealType: 'lunch',
    });

    const baseline = {
        estimated_nutrition: estimated.scaledNutrition,
        per_100g: estimated.per100g,
        total_dish_weight_g: Math.round(estimated.referenceCookedWeightG || 0),
    };

    baselineNutritionCache.set(cacheKey, baseline);
    return baseline;
}

function computeRecipeCoverage(recipe, ingredientTokens) {
    if (!ingredientTokens.length) {
        return {
            score: 0,
            coverage: 0,
            matchedCount: 0,
            missingIngredients: getPreferredIngredients(recipe, 'ar').slice(0, 8),
        };
    }

    const recipeTokens = recipe.normalized_ingredients_any;
    let matchedCount = 0;

    for (const token of ingredientTokens) {
        const matched = recipeTokens.some(
            (recipeToken) => recipeToken === token || recipeToken.includes(token) || token.includes(recipeToken),
        );
        if (matched) matchedCount += 1;
    }

    const coverage = matchedCount / ingredientTokens.length;

    const missingIngredients = getPreferredIngredients(recipe, 'ar').filter((ingredientName) => {
        const normalizedIngredient = normalizeText(ingredientName);
        return !ingredientTokens.some(
            (token) =>
                normalizedIngredient === token ||
                normalizedIngredient.includes(token) ||
                token.includes(normalizedIngredient),
        );
    });

    const score = roundTo(coverage * 100, 0) / 100;

    return {
        score,
        coverage,
        matchedCount,
        missingIngredients: missingIngredients.slice(0, 8),
    };
}

function toSuggestionPayload(recipe, coverageInfo, lang = 'ar') {
    const baseline = estimateBaselineRecipeNutrition(recipe, lang);

    return {
        cookpad_id: recipe.recipe_id,
        recipe_id: recipe.recipe_id,
        cookpad_url: '',
        title_ar: recipe.food_name_ar || recipe.food_name_en,
        title_en: recipe.food_name_en || recipe.food_name_ar,
        photo_url: '',
        match_score: coverageInfo.score,
        ingredient_coverage: roundTo(coverageInfo.coverage, 3),
        missing_ingredients: coverageInfo.missingIngredients,
        estimated_nutrition: baseline.estimated_nutrition,
        prep_time_minutes: recipe.prep_time_minutes || null,
        diet_fit_label: `${coverageInfo.matchedCount} ingredient match${coverageInfo.matchedCount === 1 ? '' : 'es'}`,
        servings: normalizeServings(recipe.servings),
        ingredients_ar: recipe.ingredients_ar,
        ingredients_en: recipe.ingredients_en,
    };
}

function parseSuggestPayload(payload) {
    const ingredientInputs = parseIngredientInputs(payload?.ingredients || []);
    if (!ingredientInputs.length) {
        throw createSuggestionError('At least one ingredient is required', 'INVALID_PAYLOAD', 400);
    }

    const parsedLimit = Number(payload?.limit);
    const limit = Number.isFinite(parsedLimit) ? clamp(Math.floor(parsedLimit), 1, MAX_LIMIT) : DEFAULT_LIMIT;
    const lang = String(payload?.lang || payload?.language || 'ar')
        .toLowerCase()
        .startsWith('en')
        ? 'en'
        : 'ar';

    return {
        ingredientInputs,
        limit,
        lang,
    };
}

function validateSuggestPayload(payload) {
    return parseSuggestPayload(payload);
}

function validateSimpleSearchPayload(payload) {
    return parseSuggestPayload(payload);
}

function suggestSmartCookerRecipes(payload) {
    const { ingredientInputs, limit, lang } = parseSuggestPayload(payload);
    const ingredientTokens = uniqueNormalizedTokens(ingredientInputs.map((item) => item.name));

    const ranked = catalog
        .map((recipe) => {
            const coverageInfo = computeRecipeCoverage(recipe, ingredientTokens);
            if (coverageInfo.matchedCount === 0) {
                return null;
            }

            return {
                recipe,
                coverageInfo,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (b.coverageInfo.coverage !== a.coverageInfo.coverage) {
                return b.coverageInfo.coverage - a.coverageInfo.coverage;
            }
            if (b.coverageInfo.matchedCount !== a.coverageInfo.matchedCount) {
                return b.coverageInfo.matchedCount - a.coverageInfo.matchedCount;
            }
            return (a.recipe.food_name_ar || a.recipe.food_name_en).localeCompare(
                b.recipe.food_name_ar || b.recipe.food_name_en,
            );
        })
        .slice(0, Math.max(limit * 2, limit));

    const suggestions = ranked.slice(0, limit).map((item) => toSuggestionPayload(item.recipe, item.coverageInfo, lang));

    return {
        session_id: randomUUID(),
        suggestions,
        meta: {
            total_candidates: ranked.length,
            total_suggestions: suggestions.length,
            fetched_recipes: suggestions.length,
            search_terms_used: ingredientTokens,
            source: catalogSourceLabel,
        },
    };
}

function searchCookpadRecipesFromIngredients(payload) {
    return suggestSmartCookerRecipes(payload);
}

function getSmartCookerRecipeById(recipeId) {
    const normalizedId = toSafeString(recipeId);
    if (!normalizedId) {
        throw createSuggestionError('Recipe id is required', 'INVALID_ID', 400);
    }

    const recipe = catalogById.get(normalizedId);
    if (!recipe) {
        throw createSuggestionError('Recipe not found', 'NOT_FOUND', 404);
    }

    const baseline = estimateBaselineRecipeNutrition(recipe, 'ar');

    return {
        recipe_id: recipe.recipe_id,
        cookpad_id: recipe.recipe_id,
        source_url: '',
        title: recipe.food_name_en || recipe.food_name_ar,
        title_ar: recipe.food_name_ar || recipe.food_name_en,
        title_en: recipe.food_name_en || recipe.food_name_ar,
        image_url: '',
        category: recipe.category || undefined,
        servings: normalizeServings(recipe.servings),
        prep_time: recipe.prep_time_minutes || undefined,
        cook_time: recipe.cook_time_minutes || undefined,
        total_time: recipe.total_time_minutes || undefined,
        ingredients: recipe.ingredients_ar.length ? recipe.ingredients_ar : recipe.ingredients_en,
        ingredients_ar: recipe.ingredients_ar,
        ingredients_en: recipe.ingredients_en,
        instructions: recipe.instructions || [],
        nutrition: baseline.estimated_nutrition,
        per_100g: baseline.per_100g,
        fetched_at: Date.now(),
        expires_at: Date.now() + 60 * 60 * 1000,
    };
}

function searchSmartCookerCatalog(payload = {}) {
    const query = toSafeString(payload.query || payload.q || '');
    const lang = String(payload.lang || payload.language || 'ar')
        .toLowerCase()
        .startsWith('en')
        ? 'en'
        : 'ar';
    const parsedLimit = Number(payload.limit);
    const limit = Number.isFinite(parsedLimit) ? clamp(Math.floor(parsedLimit), 1, MAX_LIMIT) : 20;

    const normalizedQuery = normalizeText(query);

    const rows = normalizedQuery
        ? catalog.filter((recipe) =>
              recipe.normalized_names.some((name) => name.includes(normalizedQuery) || normalizedQuery.includes(name)),
          )
        : catalog;

    const items = rows.slice(0, limit).map((recipe) => ({
        recipe_id: recipe.recipe_id,
        food_name_ar: recipe.food_name_ar,
        food_name_en: recipe.food_name_en,
        category: recipe.category || undefined,
        ingredients_ar: recipe.ingredients_ar,
        ingredients_en: recipe.ingredients_en,
        display_name:
            lang === 'en' ? recipe.food_name_en || recipe.food_name_ar : recipe.food_name_ar || recipe.food_name_en,
    }));

    return {
        query,
        lang,
        total: rows.length,
        items,
    };
}

function estimateSmartCookerNutrition(payload = {}) {
    const recipe = ensureRecipeSelection(payload);
    const lang = String(payload.lang || payload.language || 'ar')
        .toLowerCase()
        .startsWith('en')
        ? 'en'
        : 'ar';
    const cookingState = payload.cooking_state === 'before' ? 'before' : 'after';

    const ingredientInputs = parseIngredientInputs(payload.ingredients_quantities || payload.ingredients || []);

    const defaultIngredients = getPreferredIngredients(recipe, lang).map((name) => ({
        name,
        quantity: 1,
        unit: 'piece',
    }));

    const effectiveInputs = ingredientInputs.length > 0 ? ingredientInputs : defaultIngredients;
    const servingSizeG = toPositiveNumber(payload.serving_size_g, DEFAULT_SERVING_SIZE_G);

    const estimated = estimateFromIngredients({
        ingredientInputs: effectiveInputs,
        servingSizeG,
        cookingState,
        mealType: 'lunch',
    });

    return {
        recipe: {
            recipe_id: recipe.recipe_id,
            food_name_ar: recipe.food_name_ar,
            food_name_en: recipe.food_name_en,
            category: recipe.category || undefined,
            ingredients_ar: recipe.ingredients_ar,
            ingredients_en: recipe.ingredients_en,
        },
        cooking_state: estimated.normalizedCookingState,
        serving_size_g: Math.round(estimated.safeServingG),
        total_dish_weight_g: Math.round(estimated.referenceCookedWeightG || 0),
        estimated_nutrition: estimated.scaledNutrition,
        per_100g: estimated.per100g,
        unmatched_ingredients: estimated.totalEstimate.unmatchedIngredients || [],
        ingredient_inputs: effectiveInputs,
        source: catalogSourceLabel,
    };
}

function buildCookpadLookupQueries(payload = {}) {
    const explicitQuery = toSafeString(payload.query || payload.recipe_query);
    const recipeId = toSafeString(payload.recipe_id);
    const recipe = recipeId ? catalogById.get(recipeId) : null;
    const candidates = [explicitQuery, recipe?.food_name_ar, recipe?.food_name_en]
        .map((value) => toSafeString(value))
        .filter(Boolean);

    return Array.from(new Set(candidates));
}

async function searchSmartCookerCookpadDetails(payload = {}) {
    const lookupQueries = buildCookpadLookupQueries(payload);
    if (!lookupQueries.length) {
        throw createSuggestionError('query or recipe_id is required', 'INVALID_PAYLOAD', 400);
    }

    let lastError = null;
    for (const query of lookupQueries.slice(0, 3)) {
        let recipeIds = [];
        try {
            recipeIds = await searchRecipesByIngredient(query);
        } catch (error) {
            lastError = error;
            continue;
        }

        for (const recipeId of recipeIds.slice(0, 6)) {
            try {
                const detail = await fetchRecipeById(recipeId);
                return {
                    ...detail,
                    matched_query: query,
                };
            } catch (error) {
                lastError = error;
            }
        }
    }

    const fallbackMessage = lastError?.message || 'No Cookpad details found for this recipe';
    const fallbackCode = lastError?.code || 'NOT_FOUND';
    const fallbackStatus = lastError?.status || 404;
    throw createSuggestionError(fallbackMessage, fallbackCode, fallbackStatus);
}

module.exports = {
    suggestSmartCookerRecipes,
    searchCookpadRecipesFromIngredients,
    validateSuggestPayload,
    validateSimpleSearchPayload,
    getSmartCookerRecipeById,
    searchSmartCookerCatalog,
    estimateSmartCookerNutrition,
    searchSmartCookerCookpadDetails,
};

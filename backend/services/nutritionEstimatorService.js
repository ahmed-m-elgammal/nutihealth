const axios = require('axios');
const NodeCache = require('node-cache');
const egyptianFoods = require('../data/egyptianFoods');
const { normalizeText } = require('./arabicIngredientNormalizationService');
const { logger } = require('../utils/logger');

const AI_MODEL =
    process.env.OPENROUTER_NUTRITION_MODEL ||
    process.env.OPENROUTER_MODEL ||
    process.env.GROQ_NUTRITION_MODEL ||
    'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = Number.parseInt(
    process.env.OPENROUTER_NUTRITION_TIMEOUT_MS || process.env.GROQ_NUTRITION_TIMEOUT_MS || '15000',
    10,
);
const AI_CHAT_COMPLETIONS_URL = (
    process.env.OPENROUTER_CHAT_COMPLETIONS_URL ||
    process.env.AI_CHAT_COMPLETIONS_URL ||
    'https://openrouter.ai/api/v1/chat/completions'
).trim();
const OPENROUTER_SITE_URL = (process.env.OPENROUTER_SITE_URL || '').trim();
const OPENROUTER_APP_NAME = (process.env.OPENROUTER_APP_NAME || 'NutriHealth Backend').trim();
const AI_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const aiNutritionCache = new NodeCache({
    stdTTL: AI_CACHE_TTL_SECONDS,
    useClones: false,
});

const foodIndex = egyptianFoods.map((food) => ({
    ...food,
    normalizedNames: Array.from(
        new Set([food.name, ...(food.altNames || [])].map((name) => normalizeText(name)).filter(Boolean)),
    ),
}));

const DEFAULT_CATEGORY_ESTIMATES = {
    vegetable: { calories: 50, protein: 2, carbs: 8, fats: 0.4, fiber: 2.8 },
    protein: { calories: 180, protein: 20, carbs: 1, fats: 9, fiber: 0 },
    grain: { calories: 250, protein: 7, carbs: 45, fats: 3, fiber: 3 },
    dairy: { calories: 120, protein: 6, carbs: 5, fats: 8, fiber: 0 },
    fat: { calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0 },
    spice: { calories: 20, protein: 1, carbs: 3, fats: 0.5, fiber: 1 },
    unknown: { calories: 120, protein: 4, carbs: 15, fats: 4, fiber: 1.5 },
};

const TYPICAL_MEAL_CALORIES = {
    breakfast: 450,
    lunch: 650,
    dinner: 650,
    snack: 250,
};

function resolveIngredientByName(canonicalName) {
    const normalized = normalizeText(canonicalName);
    if (!normalized) return null;

    return (
        foodIndex.find((food) => food.normalizedNames.includes(normalized)) ||
        foodIndex.find((food) =>
            food.normalizedNames.some((alias) => alias.includes(normalized) || normalized.includes(alias)),
        ) ||
        null
    );
}

function detectCategory(name) {
    const normalized = normalizeText(name);
    const fatKeywords = ['زيت', 'سمن', 'butter', 'oil', 'ghee'];
    const proteinKeywords = [
        'دجاج',
        'لحم',
        'سمك',
        'بيض',
        'chicken',
        'beef',
        'fish',
        'egg',
        'عدس',
        'حمص',
        'فول',
        'lentil',
        'chickpea',
    ];
    const grainKeywords = ['رز', 'دقيق', 'مكرونه', 'خبز', 'ارز', 'rice', 'flour', 'pasta', 'bread'];
    const dairyKeywords = ['لبن', 'حليب', 'جبن', 'جبنه', 'yogurt', 'milk', 'cheese'];
    const spiceKeywords = ['ملح', 'فلفل', 'كمون', 'كسبره', 'كزبره', 'ملعقه', 'salt', 'pepper', 'cumin'];

    if (fatKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return 'fat';
    if (proteinKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return 'protein';
    if (grainKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return 'grain';
    if (dairyKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return 'dairy';
    if (spiceKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return 'spice';
    if (normalized.includes('طماطم') || normalized.includes('tomato')) return 'vegetable';
    return 'other';
}

function convertToGrams(quantity, unit, food) {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const normalizedUnit = normalizeText(unit || 'piece');
    const pieceWeight = Number.isFinite(food?.pieceWeight) && food.pieceWeight > 0 ? food.pieceWeight : 80;

    const unitMap = {
        g: 1,
        gram: 1,
        grams: 1,
        غ: 1,
        غرام: 1,
        جرام: 1,
        kg: 1000,
        كيلو: 1000,
        كغ: 1000,
        ml: 1,
        مل: 1,
        مليلتر: 1,
        l: 1000,
        لتر: 1000,
        cup: 240,
        كوب: 240,
        cups: 240,
        tbsp: 15,
        'ملعقه كبيره': 15,
        'ملعقة كبيرة': 15,
        tsp: 5,
        'ملعقه صغيره': 5,
        'ملعقة صغيرة': 5,
        piece: pieceWeight,
        pieces: pieceWeight,
        حبه: pieceWeight,
        حبة: pieceWeight,
        clove: 5,
        فص: 5,
        pinch: 0.5,
        رشه: 0.5,
    };

    const multiplier = unitMap[normalizedUnit] || pieceWeight;
    return safeQuantity * multiplier;
}

function getTypicalMealCalories(mealType) {
    return TYPICAL_MEAL_CALORIES[mealType] || 500;
}

function resolveConfidence(total, unmatched) {
    if (total === 0) return 'low';
    if (unmatched === 0) return 'high';
    if (unmatched / total <= 0.35) return 'medium';
    return 'low';
}

function parseConfidence(value) {
    const normalized = normalizeText(value || '');
    if (normalized.includes('high') || normalized.includes('عالي')) return 'high';
    if (normalized.includes('low') || normalized.includes('منخفض')) return 'low';
    return 'medium';
}

function parseAiJsonPayload(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;

    const coercePayload = (parsed) => {
        if (Array.isArray(parsed)) {
            const firstObject = parsed.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
            return firstObject || null;
        }
        return parsed;
    };

    try {
        return coercePayload(JSON.parse(raw));
    } catch {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return coercePayload(JSON.parse(raw.slice(start, end + 1)));
            } catch {
                return null;
            }
        }
        const arrayStart = raw.indexOf('[');
        const arrayEnd = raw.lastIndexOf(']');
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            try {
                return coercePayload(JSON.parse(raw.slice(arrayStart, arrayEnd + 1)));
            } catch {
                return null;
            }
        }
        return null;
    }
}

function toPositiveNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    if (typeof value === 'string') {
        const match = value.match(/[\d.]+/);
        if (match?.[0]) {
            const parsed = Number.parseFloat(match[0]);
            if (Number.isFinite(parsed) && parsed >= 0) return parsed;
        }
    }
    return 0;
}

function buildAiCacheKey(ingredientsRaw, servings) {
    const normalizedIngredients = (Array.isArray(ingredientsRaw) ? ingredientsRaw : [])
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .sort();
    return `ai-nutrition:${normalizeText(normalizedIngredients.join('|'))}:${Number(servings) || 1}`;
}

async function estimateWithAI(ingredientsRaw, servings = 1) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
        return null;
    }

    const safeServings = Number.isFinite(servings) && servings > 0 ? servings : 1;
    const ingredientList = (Array.isArray(ingredientsRaw) ? ingredientsRaw : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 60);

    if (ingredientList.length === 0) {
        return null;
    }

    const cacheKey = buildAiCacheKey(ingredientList, safeServings);
    const cached = aiNutritionCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const prompt = [
        'You are a nutrition expert.',
        'Estimate total nutrition per serving for the following recipe ingredients.',
        `Servings in recipe: ${safeServings}`,
        'Return ONLY valid JSON with keys: calories, protein_g, carbs_g, fat_g, fiber_g, confidence.',
        'Confidence must be one of: high, medium, low.',
        'Ingredients:',
        ...ingredientList.map((item, index) => `${index + 1}. ${item}`),
    ].join('\n');

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
    if (/openrouter\.ai/i.test(AI_CHAT_COMPLETIONS_URL)) {
        if (OPENROUTER_SITE_URL) {
            headers['HTTP-Referer'] = OPENROUTER_SITE_URL;
        }
        if (OPENROUTER_APP_NAME) {
            headers['X-Title'] = OPENROUTER_APP_NAME;
        }
    }

    try {
        const response = await axios.post(
            AI_CHAT_COMPLETIONS_URL,
            {
                model: AI_MODEL,
                temperature: 0.1,
                max_tokens: 500,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content:
                            'You estimate nutrition for recipes. Output strict JSON only with requested keys and numeric values.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            },
            {
                timeout: AI_TIMEOUT_MS,
                headers,
            },
        );

        const content = response?.data?.choices?.[0]?.message?.content;
        const parsed = parseAiJsonPayload(content);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const normalized = {
            calories: Math.round(toPositiveNumber(parsed.calories)),
            protein: Math.round(toPositiveNumber(parsed.protein_g) * 10) / 10,
            carbs: Math.round(toPositiveNumber(parsed.carbs_g) * 10) / 10,
            fats: Math.round(toPositiveNumber(parsed.fat_g) * 10) / 10,
            fiber: Math.round(toPositiveNumber(parsed.fiber_g) * 10) / 10,
            confidence: parseConfidence(parsed.confidence),
            source: 'ai',
        };

        aiNutritionCache.set(cacheKey, normalized, AI_CACHE_TTL_SECONDS);
        return normalized;
    } catch (error) {
        logger.warn(
            {
                errorMessage: error?.message || 'Unknown AI nutrition error',
            },
            'AI nutrition estimation failed; falling back to Tier 1',
        );
        return null;
    }
}

function estimateRecipeNutrition(normalizedIngredients, servings = 1, mealType = 'lunch') {
    const safeServings = Number.isFinite(servings) && servings > 0 ? servings : 1;
    const ingredients = Array.isArray(normalizedIngredients) ? normalizedIngredients : [];
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    const unmatched = [];
    let matchedCount = 0;

    for (const ingredient of ingredients) {
        const directMatch =
            ingredient?.matchedFood || resolveIngredientByName(ingredient?.canonicalName || ingredient?.original || '');
        const grams = convertToGrams(ingredient?.quantity, ingredient?.unit, directMatch);

        if (directMatch) {
            totals.calories += (grams / 100) * (directMatch.calories || 0);
            totals.protein += (grams / 100) * (directMatch.protein || 0);
            totals.carbs += (grams / 100) * (directMatch.carbs || 0);
            totals.fats += (grams / 100) * (directMatch.fats || 0);
            totals.fiber += (grams / 100) * (directMatch.fiber || 0);
            matchedCount += 1;
            continue;
        }

        const category = detectCategory(ingredient?.canonicalName || ingredient?.original || '');
        const fallback = DEFAULT_CATEGORY_ESTIMATES[category] || DEFAULT_CATEGORY_ESTIMATES.unknown;
        totals.calories += (grams / 100) * fallback.calories;
        totals.protein += (grams / 100) * fallback.protein;
        totals.carbs += (grams / 100) * fallback.carbs;
        totals.fats += (grams / 100) * fallback.fats;
        totals.fiber += (grams / 100) * fallback.fiber;
        unmatched.push(ingredient?.canonicalName || ingredient?.original || 'unknown');
    }

    const perServing = {
        calories: Math.max(0, Math.round(totals.calories / safeServings)),
        protein: Math.max(0, Math.round((totals.protein / safeServings) * 10) / 10),
        carbs: Math.max(0, Math.round((totals.carbs / safeServings) * 10) / 10),
        fats: Math.max(0, Math.round((totals.fats / safeServings) * 10) / 10),
        fiber: Math.max(0, Math.round((totals.fiber / safeServings) * 10) / 10),
    };

    return {
        ...perServing,
        confidence: resolveConfidence(ingredients.length, unmatched.length),
        matchedCount,
        totalIngredients: ingredients.length,
        unmatchedIngredients: unmatched,
        typicalMealCalories: getTypicalMealCalories(mealType),
    };
}

module.exports = {
    estimateRecipeNutrition,
    estimateWithAI,
    getTypicalMealCalories,
    detectCategory,
    convertToGrams,
};

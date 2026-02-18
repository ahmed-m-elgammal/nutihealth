const axios = require('axios');
const cheerio = require('cheerio');
const {
    detectLanguageFromContent,
    parseIngredientLine,
    parseLocalizedNumber,
    parseServings,
} = require('../utils/arabicRecipeParser');

let schemaScraper = null;
try {
    // Optional dependency for schema.org recipe extraction.
    schemaScraper = require('recipe-schema-scraper');
} catch {
    try {
        schemaScraper = require('@dimfu/recipe-scraper');
    } catch {
        schemaScraper = null;
    }
}

/**
 * Parse recipe data from a URL and normalize to NutriHealth's API contract.
 * Supports schema.org JSON-LD first, then HTML fallback extraction.
 */
async function parseRecipeFromUrl(url) {
    if (!isValidHttpUrl(url)) {
        const invalidUrlError = new Error('Please enter a valid recipe URL');
        invalidUrlError.code = 'INVALID_URL';
        throw invalidUrlError;
    }

    const html = await fetchRecipeHtml(url);
    const $ = cheerio.load(html);

    const titleText =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="title"]').attr('content') ||
        $('h1').first().text() ||
        '';

    const language = detectLanguageFromContent({
        text: `${$('html').attr('lang') || ''} ${titleText}`,
        url,
    });

    const schemaRecipe = await extractFromSchema($, html, url);
    const fallbackRecipe = extractFromHtml($);
    const mergedRecipe = mergeRecipeData(schemaRecipe, fallbackRecipe);

    if (!mergedRecipe.title || mergedRecipe.ingredients.length === 0) {
        const parseError = new Error("Couldn't find recipe data. Try another URL");
        parseError.code = 'NO_RECIPE';
        throw parseError;
    }

    const title = mergedRecipe.title.trim();

    return {
        title,
        titleAr: language === 'ar' ? title : undefined,
        servings: parseServings(mergedRecipe.servings),
        ingredients: normalizeIngredients(mergedRecipe.ingredients),
        instructions: normalizeInstructions(mergedRecipe.instructions),
        nutrition: normalizeNutrition(mergedRecipe.nutrition),
        imageUrl: mergedRecipe.imageUrl || '',
        language,
    };
}

async function fetchRecipeHtml(url) {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 NutriHealthRecipeImporter/1.0',
                Accept: 'text/html,application/xhtml+xml',
            },
            maxRedirects: 5,
        });

        return response.data;
    } catch (error) {
        const status = error.response?.status;

        if (status === 400 || status === 404) {
            const invalidUrlError = new Error('Please enter a valid recipe URL');
            invalidUrlError.code = 'INVALID_URL';
            throw invalidUrlError;
        }

        if (status === 401 || status === 403 || status === 429) {
            const parseError = new Error("Couldn't parse this recipe. Manual entry available");
            parseError.code = 'PARSE';
            throw parseError;
        }

        const networkError = new Error('Connection failed. Check your internet');
        networkError.code = 'NETWORK';
        throw networkError;
    }
}

async function extractFromSchema($, html, url) {
    const schemaNodes = [];

    $('script[type="application/ld+json"]').each((_, element) => {
        const content = $(element).contents().text();
        if (!content || !content.trim()) {
            return;
        }

        try {
            const parsedJson = JSON.parse(content);
            const extracted = findRecipeNodes(parsedJson);
            schemaNodes.push(...extracted);
        } catch {
            // Ignore malformed json-ld blocks.
        }
    });

    if (schemaScraper) {
        try {
            const scraped = await trySchemaScraper(url, html);
            if (scraped) {
                schemaNodes.push(scraped);
            }
        } catch {
            // Optional package failure should not break imports.
        }
    }

    if (schemaNodes.length === 0) {
        return emptyRecipe();
    }

    const bestCandidate = schemaNodes
        .map((node) => normalizeSchemaNode(node))
        .sort((a, b) => scoreRecipeCandidate(b) - scoreRecipeCandidate(a))[0];

    return bestCandidate || emptyRecipe();
}

async function trySchemaScraper(url, html) {
    if (!schemaScraper) {
        return null;
    }

    if (typeof schemaScraper === 'function') {
        let result;

        if (html && typeof html === 'string') {
            result = await schemaScraper({ url, html, timeout: 15000, maxRedirects: 5 });
        } else {
            result = await schemaScraper(url, { timeout: 15000, maxRedirects: 5 });
        }

        return Array.isArray(result) ? result[0] : result;
    }

    if (typeof schemaScraper.scrape === 'function') {
        const result = await schemaScraper.scrape(url, html);
        return Array.isArray(result) ? result[0] : result;
    }

    if (typeof schemaScraper.parse === 'function') {
        const result = await schemaScraper.parse(html, url);
        return Array.isArray(result) ? result[0] : result;
    }

    return null;
}

function findRecipeNodes(input) {
    if (!input) {
        return [];
    }

    if (Array.isArray(input)) {
        return input.flatMap((item) => findRecipeNodes(item));
    }

    if (typeof input !== 'object') {
        return [];
    }

    const node = input;
    const type = node['@type'];

    const isRecipe =
        type === 'Recipe' ||
        (Array.isArray(type) && type.some((typeItem) => String(typeItem).toLowerCase() === 'recipe'));

    const found = isRecipe ? [node] : [];

    if (Array.isArray(node['@graph'])) {
        return [...found, ...node['@graph'].flatMap((graphNode) => findRecipeNodes(graphNode))];
    }

    return found;
}

function normalizeSchemaNode(node) {
    const recipeInstructions = parseInstructionField(node.recipeInstructions);
    const recipeIngredients = node.recipeIngredient || node.recipeIngredients || [];

    return {
        title: cleanText(node.name || node.headline || ''),
        ingredients: normalizeIngredientSource(recipeIngredients),
        instructions: recipeInstructions,
        servings: node.recipeYield,
        nutrition: {
            calories: extractNutritionNumber(node.nutrition?.calories),
            protein: extractNutritionNumber(node.nutrition?.proteinContent),
            carbs: extractNutritionNumber(node.nutrition?.carbohydrateContent),
            fats: extractNutritionNumber(node.nutrition?.fatContent),
        },
        imageUrl: extractImage(node.image),
    };
}

function extractFromHtml($) {
    const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('h1').first().text() ||
        $('title').text() ||
        '';

    const rawIngredients = uniqueNonEmpty(
        [
            ...collectTexts($, '[itemprop="recipeIngredient"]'),
            ...collectTexts($, '.recipe-ingredients li'),
            ...collectTexts($, '.ingredients li'),
            ...collectTexts($, '[class*="ingredient"] li'),
        ].map((value) => cleanText(value))
    );

    const rawInstructions = uniqueNonEmpty(
        [
            ...collectTexts($, '[itemprop="recipeInstructions"]'),
            ...collectTexts($, '.recipe-instructions li'),
            ...collectTexts($, '.instructions li'),
            ...collectTexts($, '[class*="instruction"] li'),
            ...collectTexts($, '[class*="direction"] li'),
        ].map((value) => cleanText(value))
    );

    const servingsText =
        $('[itemprop="recipeYield"]').first().text() ||
        $('[class*="servings"]').first().text() ||
        $('[class*="yield"]').first().text() ||
        '';

    const nutritionBlock =
        $('[class*="nutrition"]').first().text() ||
        $('[itemprop="nutrition"]').first().text() ||
        '';

    return {
        title: cleanText(title),
        ingredients: normalizeIngredientSource(rawIngredients),
        instructions: rawInstructions,
        servings: servingsText,
        nutrition: {
            calories: extractNutritionFromText(nutritionBlock, ['calories', 'سعرات']),
            protein: extractNutritionFromText(nutritionBlock, ['protein', 'بروتين']),
            carbs: extractNutritionFromText(nutritionBlock, ['carb', 'كربوهيدرات']),
            fats: extractNutritionFromText(nutritionBlock, ['fat', 'دهون']),
        },
        imageUrl:
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img').first().attr('src') ||
            '',
    };
}

function mergeRecipeData(primary, fallback) {
    return {
        title: primary.title || fallback.title,
        ingredients: primary.ingredients.length ? primary.ingredients : fallback.ingredients,
        instructions: primary.instructions.length ? primary.instructions : fallback.instructions,
        servings: primary.servings || fallback.servings || 1,
        nutrition: {
            calories: primary.nutrition.calories || fallback.nutrition.calories || 0,
            protein: primary.nutrition.protein || fallback.nutrition.protein || 0,
            carbs: primary.nutrition.carbs || fallback.nutrition.carbs || 0,
            fats: primary.nutrition.fats || fallback.nutrition.fats || 0,
        },
        imageUrl: primary.imageUrl || fallback.imageUrl,
    };
}

function normalizeIngredients(ingredients) {
    const normalized = normalizeIngredientSource(ingredients);
    return normalized.length > 0
        ? normalized.map((ingredient, index) => ({
            id: `ingredient-${index}`,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            nameAr: ingredient.nameAr,
        }))
        : [];
}

function normalizeIngredientSource(source) {
    if (!Array.isArray(source)) {
        return [];
    }

    return uniqueByName(
        source
            .map((ingredient) => {
                if (typeof ingredient === 'string') {
                    return parseIngredientLine(ingredient);
                }

                if (ingredient && typeof ingredient === 'object') {
                    const amount = parseLocalizedNumber(ingredient.amount) || 1;
                    return {
                        name: cleanText(ingredient.name || ingredient.text || ''),
                        amount,
                        unit: ingredient.unit || 'piece',
                        nameAr: ingredient.nameAr,
                    };
                }

                return null;
            })
            .filter((ingredient) => ingredient && ingredient.name)
            .map((ingredient) => ({
                ...ingredient,
                name: cleanText(ingredient.name),
                amount: Number.isFinite(ingredient.amount) ? ingredient.amount : 1,
                unit: ingredient.unit || 'piece',
            }))
    );
}

function normalizeInstructions(instructions) {
    if (!Array.isArray(instructions)) {
        return [];
    }

    return uniqueNonEmpty(instructions.map((instruction) => cleanText(instruction))).slice(0, 100);
}

function normalizeNutrition(nutrition) {
    const value = nutrition || {};

    return {
        calories: round(extractNutritionNumber(value.calories)),
        protein: round(extractNutritionNumber(value.protein)),
        carbs: round(extractNutritionNumber(value.carbs)),
        fats: round(extractNutritionNumber(value.fats)),
    };
}

function parseInstructionField(value) {
    if (!value) {
        return [];
    }

    if (typeof value === 'string') {
        return [cleanText(value)];
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') {
                    return cleanText(item);
                }

                if (item && typeof item === 'object') {
                    return cleanText(item.text || item.name || '');
                }

                return '';
            })
            .filter(Boolean);
    }

    return [];
}

function extractNutritionNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return 0;
    }

    const parsed = parseLocalizedNumber(value.match(/[\d٠-٩.\/,]+/)?.[0] || '');
    return parsed || 0;
}

function extractNutritionFromText(text, keywords) {
    const clean = normalizeWhitespace(text).toLowerCase();
    if (!clean) {
        return 0;
    }

    for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[^\\d٠-٩]{0,10}([\\d٠-٩.,/]+)`, 'i');
        const match = clean.match(regex);
        if (match?.[1]) {
            const parsed = parseLocalizedNumber(match[1]);
            if (parsed) {
                return parsed;
            }
        }
    }

    return 0;
}

function extractImage(imageField) {
    if (!imageField) {
        return '';
    }

    if (typeof imageField === 'string') {
        return imageField;
    }

    if (Array.isArray(imageField) && imageField.length > 0) {
        return extractImage(imageField[0]);
    }

    if (typeof imageField === 'object') {
        return imageField.url || imageField['@id'] || '';
    }

    return '';
}

function collectTexts($, selector) {
    return $(selector)
        .map((_, element) => $(element).text())
        .get();
}

function cleanText(value) {
    const decoded = decodeHtmlEntities(String(value || ''));
    return normalizeWhitespace(decoded.replace(/\s+/g, ' '));
}

function normalizeWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
    if (!value) {
        return '';
    }

    return cheerio.load(`<div>${value}</div>`)('div').text();
}

function uniqueNonEmpty(values) {
    return Array.from(new Set(values.filter(Boolean)));
}

function uniqueByName(ingredients) {
    const seen = new Set();

    return ingredients.filter((ingredient) => {
        const key = ingredient.name.toLowerCase();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function scoreRecipeCandidate(candidate) {
    let score = 0;
    if (candidate.title) score += 2;
    if (candidate.ingredients.length > 0) score += 4;
    if (candidate.instructions.length > 0) score += 4;
    if (candidate.imageUrl) score += 1;
    if (candidate.nutrition.calories > 0) score += 2;
    return score;
}

function round(value) {
    return Math.round((value || 0) * 10) / 10;
}

function emptyRecipe() {
    return {
        title: '',
        ingredients: [],
        instructions: [],
        servings: 1,
        nutrition: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        },
        imageUrl: '',
    };
}

function isValidHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

module.exports = {
    parseRecipeFromUrl,
};

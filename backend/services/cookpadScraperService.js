const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const { mergeRecipeData } = require('./recipeParserService');
const { logger } = require('../utils/logger');

const RECIPE_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6h
const SEARCH_CACHE_TTL_SECONDS = 60 * 60; // 1h
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT = 'NutriHealth/1.0 (+https://nutrihealth.app; smart-cooker)';
const ROBOTS_URL = 'https://cookpad.com/robots.txt';
const ROBOTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_REQUEST_GAP_MS = 1000;
const MAX_SEARCH_RESULTS = 25;

const recipeCache = new NodeCache({
    stdTTL: RECIPE_CACHE_TTL_SECONDS,
    useClones: false,
});
const searchCache = new NodeCache({
    stdTTL: SEARCH_CACHE_TTL_SECONDS,
    useClones: false,
});

const inFlightRequests = new Map();
const inFlightSearchRequests = new Map();
let searchQueue = Promise.resolve();
let nextAllowedSearchAt = 0;

let robotsPolicy = {
    fetchedAt: 0,
    disallow: [],
    crawlDelaySeconds: 0,
};
let robotsFetchPromise = null;
let nextAllowedRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createServiceError = (message, code, status = 500) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
};

const normalizeCookpadId = (value) => {
    const normalized = String(value || '').trim();
    if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
        throw createServiceError('Invalid Cookpad recipe id', 'INVALID_ID', 400);
    }

    return normalized;
};

const buildCookpadRecipeUrl = (cookpadId) => `https://cookpad.com/eg/recipes/${encodeURIComponent(cookpadId)}`;
const buildCookpadLocalizedRecipeUrl = (cookpadId) =>
    `https://cookpad.com/eg/%D9%88%D8%B5%D9%81%D8%A7%D8%AA/${encodeURIComponent(cookpadId)}`;
const buildCookpadSearchUrl = (query) => `https://cookpad.com/eg/search/${encodeURIComponent(query)}`;

const parseDurationToMinutes = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toUpperCase();
    if (!normalized.startsWith('P')) {
        return undefined;
    }

    const dayMatch = normalized.match(/(\d+)D/);
    const hourMatch = normalized.match(/T(?:.*?(\d+)H)/);
    const minuteMatch = normalized.match(/T(?:.*?(\d+)M)/);

    const days = dayMatch ? Number.parseInt(dayMatch[1], 10) : 0;
    const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;

    const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
    return Number.isFinite(totalMinutes) && totalMinutes > 0 ? totalMinutes : undefined;
};

const parseServings = (value) => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    if (typeof value === 'string') {
        const numericMatch = value.match(/\d+/);
        if (numericMatch?.[0]) {
            const parsed = Number.parseInt(numericMatch[0], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }

    return 1;
};

const cleanText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeIngredientItem = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        const clean = cleanText(value);
        return clean || null;
    }

    if (typeof value === 'object') {
        const name = cleanText(value.name || value.text || '');
        if (!name) return null;

        const amount = value.amount ? cleanText(String(value.amount)) : '';
        const unit = value.unit ? cleanText(String(value.unit)) : '';
        return [amount, unit, name].filter(Boolean).join(' ');
    }

    return null;
};

const uniqueValues = (values) => Array.from(new Set(values.filter(Boolean)));

const normalizeNutritionValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const match = value.match(/[\d.]+/);
        if (match?.[0]) {
            const parsed = Number.parseFloat(match[0]);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }

    return 0;
};

const normalizeSearchQuery = (value) =>
    String(value || '')
        .trim()
        .replace(/\s+/g, ' ');

const extractRecipeNodes = (input) => {
    if (!input) return [];

    if (Array.isArray(input)) {
        return input.flatMap((item) => extractRecipeNodes(item));
    }

    if (typeof input !== 'object') {
        return [];
    }

    const node = input;
    const rawType = node['@type'];
    const isRecipe =
        rawType === 'Recipe' ||
        (Array.isArray(rawType) && rawType.some((item) => String(item).toLowerCase() === 'recipe'));

    const found = isRecipe ? [node] : [];
    if (Array.isArray(node['@graph'])) {
        return [...found, ...node['@graph'].flatMap((graphNode) => extractRecipeNodes(graphNode))];
    }

    return found;
};

const extractLdJsonRecipe = ($) => {
    const candidates = [];

    $('script[type="application/ld+json"]').each((_, element) => {
        const content = $(element).contents().text();
        if (!content || !content.trim()) {
            return;
        }

        try {
            const parsed = JSON.parse(content);
            candidates.push(...extractRecipeNodes(parsed));
        } catch {
            // Ignore malformed JSON-LD block.
        }
    });

    if (!candidates.length) {
        return {
            recipe: {
                title: '',
                ingredients: [],
                instructions: [],
                servings: 1,
                nutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
                imageUrl: '',
            },
            extra: {},
        };
    }

    const best = candidates
        .map((node) => ({
            node,
            score:
                (node?.name ? 2 : 0) +
                (Array.isArray(node?.recipeIngredient) ? node.recipeIngredient.length : 0) +
                (Array.isArray(node?.recipeInstructions) ? node.recipeInstructions.length : 0),
        }))
        .sort((a, b) => b.score - a.score)[0]?.node;

    const instructions = Array.isArray(best?.recipeInstructions)
        ? best.recipeInstructions
              .map((item) => {
                  if (typeof item === 'string') return cleanText(item);
                  if (item && typeof item === 'object') return cleanText(item.text || item.name || '');
                  return '';
              })
              .filter(Boolean)
        : typeof best?.recipeInstructions === 'string'
          ? [cleanText(best.recipeInstructions)]
          : [];

    const ingredients = Array.isArray(best?.recipeIngredient)
        ? best.recipeIngredient.map((item) => cleanText(item))
        : [];

    return {
        recipe: {
            title: cleanText(best?.name || best?.headline || ''),
            ingredients,
            instructions,
            servings: best?.recipeYield,
            nutrition: {
                calories: cleanText(best?.nutrition?.calories || ''),
                protein: cleanText(best?.nutrition?.proteinContent || ''),
                carbs: cleanText(best?.nutrition?.carbohydrateContent || ''),
                fats: cleanText(best?.nutrition?.fatContent || ''),
            },
            imageUrl:
                typeof best?.image === 'string'
                    ? best.image
                    : Array.isArray(best?.image)
                      ? cleanText(best.image[0])
                      : cleanText(best?.image?.url || ''),
        },
        extra: {
            prepTime: parseDurationToMinutes(best?.prepTime),
            cookTime: parseDurationToMinutes(best?.cookTime),
            totalTime: parseDurationToMinutes(best?.totalTime),
            author:
                typeof best?.author === 'string'
                    ? cleanText(best.author)
                    : cleanText(best?.author?.name || best?.creator?.name || ''),
            category: cleanText(best?.recipeCategory || ''),
            keywords:
                typeof best?.keywords === 'string'
                    ? best.keywords
                          .split(',')
                          .map((keyword) => cleanText(keyword))
                          .filter(Boolean)
                    : Array.isArray(best?.keywords)
                      ? best.keywords.map((keyword) => cleanText(keyword)).filter(Boolean)
                      : [],
        },
    };
};

const extractHtmlFallbackRecipe = ($) => {
    const title =
        cleanText($('meta[property="og:title"]').attr('content')) ||
        cleanText($('meta[name="twitter:title"]').attr('content')) ||
        cleanText($('h1').first().text()) ||
        cleanText($('title').text());

    const ingredientSelectors = [
        '[data-testid="ingredient-item"]',
        '[class*="ingredient"] li',
        '.ingredient-list li',
        '.ingredients li',
    ];
    const instructionSelectors = ['[data-testid="step"]', '[class*="step"]', '[class*="direction"] li', '.steps li'];

    const ingredients = uniqueValues(
        ingredientSelectors.flatMap((selector) =>
            $(selector)
                .map((_, element) => cleanText($(element).text()))
                .get(),
        ),
    );

    const instructions = uniqueValues(
        instructionSelectors.flatMap((selector) =>
            $(selector)
                .map((_, element) => cleanText($(element).text()))
                .get(),
        ),
    );

    const servingsText =
        cleanText($('[itemprop="recipeYield"]').first().text()) ||
        cleanText($('[class*="serving"]').first().text()) ||
        cleanText($('[class*="yield"]').first().text());

    const author =
        cleanText($('[data-testid="recipe-author-name"]').first().text()) ||
        cleanText($('a[href*="/users/"]').first().text()) ||
        cleanText($('[rel="author"]').first().text());

    const tags = uniqueValues(
        [
            ...$('[data-testid="tag"]')
                .map((_, element) => cleanText($(element).text()))
                .get(),
            ...$('a[href*="/eg/recipes/tags/"]')
                .map((_, element) => cleanText($(element).text()))
                .get(),
        ].filter(Boolean),
    );

    const category =
        cleanText($('[data-testid="breadcrumb"] a').last().text()) ||
        cleanText($('a[href*="/eg/recipes/cat/"]').first().text()) ||
        undefined;

    return {
        recipe: {
            title,
            ingredients,
            instructions,
            servings: servingsText,
            nutrition: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
            },
            imageUrl:
                cleanText($('meta[property="og:image"]').attr('content')) ||
                cleanText($('meta[name="twitter:image"]').attr('content')) ||
                '',
        },
        extra: {
            author,
            category,
            tags,
        },
    };
};

const extractRecipeIdsFromSearchHtml = (html) => {
    const $ = cheerio.load(String(html || ''));
    const recipeIds = new Set();

    const addIfValid = (candidate) => {
        const normalized = String(candidate || '').trim();
        if (/^[A-Za-z0-9_-]+$/.test(normalized)) {
            recipeIds.add(normalized);
        }
    };

    $('a[href*="/eg/recipes/"]').each((_, element) => {
        const href = $(element).attr('href') || '';
        const normalizedHref = href.split('?')[0].split('#')[0];
        const match = normalizedHref.match(/\/eg\/recipes\/([A-Za-z0-9_-]+)/);
        if (match?.[1]) {
            addIfValid(match[1]);
        }
    });

    // Cookpad MENA pages localize the route segment, for example /eg/وصفات/:id.
    $('a[href*="/eg/%D9%88%D8%B5%D9%81%D8%A7%D8%AA/"], a[href*="/eg/وصفات/"]').each((_, element) => {
        const href = $(element).attr('href') || '';
        const normalizedHref = href.split('?')[0].split('#')[0];
        const match = normalizedHref.match(/\/eg\/(?:%D9%88%D8%B5%D9%81%D8%A7%D8%AA|وصفات)\/(\d+)/);
        if (match?.[1]) {
            addIfValid(match[1]);
        }
    });

    $('[data-recipe-id]').each((_, element) => {
        addIfValid($(element).attr('data-recipe-id'));
    });

    $('[data-search-tracking-result-id]').each((_, element) => {
        addIfValid($(element).attr('data-search-tracking-result-id'));
    });

    // Search result cards include IDs in the element id, e.g. id="recipe_25433207".
    $('li[id^="recipe_"]').each((_, element) => {
        const id = $(element).attr('id') || '';
        const match = id.match(/^recipe_([A-Za-z0-9_-]+)$/);
        if (match?.[1]) {
            addIfValid(match[1]);
        }
    });

    // Search container includes fetched recipe IDs in tracking metadata.
    $('[data-search-tracking-params-value]').each((_, element) => {
        const rawParams = String($(element).attr('data-search-tracking-params-value') || '').trim();
        if (!rawParams) {
            return;
        }

        try {
            const params = JSON.parse(rawParams);
            const rawFetchedIds = params?.fetched_recipe_ids;
            if (Array.isArray(rawFetchedIds)) {
                rawFetchedIds.forEach((value) => addIfValid(value));
                return;
            }

            if (typeof rawFetchedIds === 'string') {
                const parsed = JSON.parse(rawFetchedIds);
                if (Array.isArray(parsed)) {
                    parsed.forEach((value) => addIfValid(value));
                }
            }
        } catch {
            // Ignore malformed tracking payloads and continue with DOM extraction.
        }
    });

    return Array.from(recipeIds).slice(0, MAX_SEARCH_RESULTS);
};

const parseRobots = (content) => {
    const lines = String(content || '')
        .split(/\r?\n/)
        .map((line) => line.split('#')[0].trim());

    const blocks = [];
    let currentBlock = { agents: [], disallow: [], crawlDelaySeconds: null };
    let hasDirectives = false;

    for (const line of lines) {
        if (!line) {
            if (currentBlock.agents.length > 0 && (hasDirectives || currentBlock.disallow.length > 0)) {
                blocks.push(currentBlock);
                currentBlock = { agents: [], disallow: [], crawlDelaySeconds: null };
                hasDirectives = false;
            }
            continue;
        }

        const separatorIndex = line.indexOf(':');
        if (separatorIndex < 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim().toLowerCase();
        const value = line.slice(separatorIndex + 1).trim();

        if (key === 'user-agent') {
            if (currentBlock.agents.length > 0 && hasDirectives) {
                blocks.push(currentBlock);
                currentBlock = { agents: [], disallow: [], crawlDelaySeconds: null };
                hasDirectives = false;
            }
            currentBlock.agents.push(value.toLowerCase());
            continue;
        }

        hasDirectives = true;

        if (key === 'disallow') {
            currentBlock.disallow.push(value);
            continue;
        }

        if (key === 'crawl-delay') {
            const parsedDelay = Number.parseFloat(value);
            if (Number.isFinite(parsedDelay) && parsedDelay >= 0) {
                currentBlock.crawlDelaySeconds = parsedDelay;
            }
        }
    }

    if (currentBlock.agents.length > 0) {
        blocks.push(currentBlock);
    }

    const specificBlock = blocks.find((block) => block.agents.includes('nutrihealth'));
    const wildcardBlock = blocks.find((block) => block.agents.includes('*'));
    const selectedBlock = specificBlock || wildcardBlock;

    return {
        disallow: selectedBlock?.disallow?.filter(Boolean) || [],
        crawlDelaySeconds: selectedBlock?.crawlDelaySeconds ?? 0,
    };
};

const isPathDisallowed = (path, disallowRules) => {
    if (!Array.isArray(disallowRules) || !disallowRules.length) {
        return false;
    }

    return disallowRules.some((rule) => {
        const normalizedRule = String(rule || '').trim();
        if (!normalizedRule) return false;
        if (normalizedRule === '/') return true;
        return path.startsWith(normalizedRule);
    });
};

const getRobotsPolicy = async () => {
    const now = Date.now();
    if (robotsPolicy.fetchedAt && now - robotsPolicy.fetchedAt < ROBOTS_CACHE_TTL_MS) {
        return robotsPolicy;
    }

    if (robotsFetchPromise) {
        return robotsFetchPromise;
    }

    robotsFetchPromise = (async () => {
        try {
            const response = await axios.get(ROBOTS_URL, {
                timeout: REQUEST_TIMEOUT_MS,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/plain',
                },
            });

            const parsedPolicy = parseRobots(response.data);
            robotsPolicy = {
                fetchedAt: Date.now(),
                disallow: parsedPolicy.disallow,
                crawlDelaySeconds: parsedPolicy.crawlDelaySeconds,
            };
        } catch (error) {
            logger.warn(
                {
                    route: '/api/smart-cooker/recipe/:id',
                    errorMessage: error?.message || 'Failed to load robots.txt',
                },
                'Cookpad robots fetch failed, using permissive defaults',
            );

            robotsPolicy = {
                fetchedAt: Date.now(),
                disallow: [],
                crawlDelaySeconds: 0,
            };
        } finally {
            robotsFetchPromise = null;
        }

        return robotsPolicy;
    })();

    return robotsFetchPromise;
};

const enforceRobotsPolicy = async (recipePath) => {
    const policy = await getRobotsPolicy();

    if (isPathDisallowed(recipePath, policy.disallow)) {
        throw createServiceError('Robots policy blocks this recipe path', 'ROBOTS_BLOCKED', 403);
    }

    const crawlDelaySeconds = Number(policy.crawlDelaySeconds) || 0;
    if (crawlDelaySeconds <= 0) {
        return;
    }

    const delayMs = Math.round(crawlDelaySeconds * 1000);
    const now = Date.now();
    const waitMs = Math.max(0, nextAllowedRequestAt - now);
    if (waitMs > 0) {
        await sleep(waitMs);
    }

    nextAllowedRequestAt = Date.now() + delayMs;
};

const buildCachePayload = ({ cookpadId, sourceUrl, mergedRecipe, schemaExtra, fallbackExtra }) => {
    const now = Date.now();
    const title = cleanText(mergedRecipe.title);
    const instructions = uniqueValues(
        (Array.isArray(mergedRecipe.instructions) ? mergedRecipe.instructions : [])
            .map((instruction) => cleanText(instruction))
            .filter(Boolean),
    );
    const ingredients = uniqueValues(
        (Array.isArray(mergedRecipe.ingredients) ? mergedRecipe.ingredients : [])
            .map((ingredient) => normalizeIngredientItem(ingredient))
            .filter(Boolean),
    );

    const tags = uniqueValues([...(schemaExtra.keywords || []), ...(fallbackExtra.tags || [])]);
    const category = cleanText(schemaExtra.category || fallbackExtra.category || '');
    const author = cleanText(schemaExtra.author || fallbackExtra.author || '');
    const nutritionSource = mergedRecipe.nutrition || {};
    const nutrition = {
        calories: normalizeNutritionValue(nutritionSource.calories),
        protein: normalizeNutritionValue(nutritionSource.protein),
        carbs: normalizeNutritionValue(nutritionSource.carbs),
        fats: normalizeNutritionValue(nutritionSource.fats),
    };

    return {
        cookpad_id: cookpadId,
        source_url: sourceUrl,
        title,
        title_ar: /[\u0600-\u06FF]/.test(title) ? title : undefined,
        author: author || undefined,
        category: category || undefined,
        tags,
        image_url: mergedRecipe.imageUrl || undefined,
        servings: parseServings(mergedRecipe.servings),
        prep_time: schemaExtra.prepTime,
        cook_time: schemaExtra.cookTime,
        total_time: schemaExtra.totalTime,
        ingredients,
        instructions,
        nutrition,
        raw_payload: {
            source: 'cookpad',
            fetchedFrom: sourceUrl,
        },
        fetched_at: now,
        expires_at: now + RECIPE_CACHE_TTL_SECONDS * 1000,
    };
};

async function fetchRecipeById(cookpadId) {
    const normalizedId = normalizeCookpadId(cookpadId);
    const cacheKey = `cookpad:${normalizedId}`;
    const cached = recipeCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const existingRequest = inFlightRequests.get(cacheKey);
    if (existingRequest) {
        return existingRequest;
    }

    const requestPromise = (async () => {
        const encodedId = encodeURIComponent(normalizedId);
        const recipeCandidates = [
            {
                recipePath: `/eg/recipes/${encodedId}`,
                recipeUrl: buildCookpadRecipeUrl(normalizedId),
            },
            {
                recipePath: `/eg/%D9%88%D8%B5%D9%81%D8%A7%D8%AA/${encodedId}`,
                recipeUrl: buildCookpadLocalizedRecipeUrl(normalizedId),
            },
        ];
        let lastNotFoundError = null;

        for (const candidate of recipeCandidates) {
            await enforceRobotsPolicy(candidate.recipePath);

            try {
                const response = await axios.get(candidate.recipeUrl, {
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: {
                        'User-Agent': USER_AGENT,
                        Accept: 'text/html,application/xhtml+xml',
                    },
                });

                const html = String(response.data || '');
                const $ = cheerio.load(html);

                const { recipe: schemaRecipe, extra: schemaExtra } = extractLdJsonRecipe($);
                const { recipe: fallbackRecipe, extra: fallbackExtra } = extractHtmlFallbackRecipe($);
                const mergedRecipe = mergeRecipeData(schemaRecipe, fallbackRecipe);

                if (
                    !mergedRecipe?.title ||
                    !Array.isArray(mergedRecipe.ingredients) ||
                    mergedRecipe.ingredients.length === 0
                ) {
                    lastNotFoundError = createServiceError('Recipe not found', 'NOT_FOUND', 404);
                    continue;
                }

                const sourceUrl = cleanText($('meta[property="og:url"]').attr('content')) || candidate.recipeUrl;
                const payload = buildCachePayload({
                    cookpadId: normalizedId,
                    sourceUrl,
                    mergedRecipe,
                    schemaExtra,
                    fallbackExtra,
                });

                recipeCache.set(cacheKey, payload, RECIPE_CACHE_TTL_SECONDS);
                return payload;
            } catch (error) {
                if (error?.code === 'INVALID_ID' || error?.code === 'ROBOTS_BLOCKED') {
                    throw error;
                }

                if (error?.response?.status === 404 || error?.code === 'NOT_FOUND') {
                    lastNotFoundError = createServiceError('Recipe not found', 'NOT_FOUND', 404);
                    continue;
                }

                if (error?.response?.status === 429) {
                    throw createServiceError('Upstream rate limited request', 'UPSTREAM_RATE_LIMIT', 429);
                }

                if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
                    throw createServiceError('Network error', 'NETWORK', 503);
                }

                if (axios.isAxiosError(error) && !error.response) {
                    throw createServiceError('Network error', 'NETWORK', 503);
                }

                logger.error(
                    {
                        route: '/api/smart-cooker/recipe/:id',
                        errorMessage: error?.message || 'Unknown Cookpad scrape error',
                        cookpadId: normalizedId,
                        candidateUrl: candidate.recipeUrl,
                    },
                    'Cookpad scrape failed',
                );

                throw createServiceError('Failed to parse Cookpad recipe', 'PARSE', 500);
            }
        }

        if (lastNotFoundError) {
            throw lastNotFoundError;
        }

        throw createServiceError('Recipe not found', 'NOT_FOUND', 404);
    })().finally(() => {
        inFlightRequests.delete(cacheKey);
    });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

const enqueueSearch = (fn) => {
    const task = searchQueue
        .then(async () => {
            const waitMs = Math.max(0, nextAllowedSearchAt - Date.now());
            if (waitMs > 0) {
                await sleep(waitMs);
            }

            const result = await fn();
            nextAllowedSearchAt = Date.now() + SEARCH_REQUEST_GAP_MS;
            return result;
        })
        .catch(async () => {
            // Keep queue alive even if previous job failed.
            const waitMs = Math.max(0, nextAllowedSearchAt - Date.now());
            if (waitMs > 0) {
                await sleep(waitMs);
            }

            const result = await fn();
            nextAllowedSearchAt = Date.now() + SEARCH_REQUEST_GAP_MS;
            return result;
        });

    searchQueue = task.catch(() => undefined);
    return task;
};

async function searchRecipesByIngredient(ingredientName) {
    const normalizedQuery = normalizeSearchQuery(ingredientName);
    if (!normalizedQuery) {
        throw createServiceError('Ingredient query is required', 'INVALID_QUERY', 400);
    }

    const cacheKey = `search:${normalizedQuery.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const inFlight = inFlightSearchRequests.get(cacheKey);
    if (inFlight) {
        return inFlight;
    }

    const requestPromise = enqueueSearch(async () => {
        const searchPath = `/eg/search/${encodeURIComponent(normalizedQuery)}`;
        const searchUrl = buildCookpadSearchUrl(normalizedQuery);

        await enforceRobotsPolicy(searchPath);

        try {
            const response = await axios.get(searchUrl, {
                timeout: REQUEST_TIMEOUT_MS,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/html,application/xhtml+xml',
                },
            });

            const ids = extractRecipeIdsFromSearchHtml(response.data || '');
            searchCache.set(cacheKey, ids, SEARCH_CACHE_TTL_SECONDS);
            return ids;
        } catch (error) {
            if (error?.code === 'ROBOTS_BLOCKED') {
                throw error;
            }

            if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
                throw createServiceError('Network error', 'NETWORK', 503);
            }

            if (axios.isAxiosError(error) && !error.response) {
                throw createServiceError('Network error', 'NETWORK', 503);
            }

            throw createServiceError('Failed to search recipes', 'SEARCH_FAILED', 500);
        }
    }).finally(() => {
        inFlightSearchRequests.delete(cacheKey);
    });

    inFlightSearchRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

function __clearCookpadCacheForTests() {
    recipeCache.flushAll();
    searchCache.flushAll();
    inFlightRequests.clear();
    inFlightSearchRequests.clear();
    searchQueue = Promise.resolve();
    nextAllowedSearchAt = 0;
    robotsPolicy = {
        fetchedAt: 0,
        disallow: [],
        crawlDelaySeconds: 0,
    };
    robotsFetchPromise = null;
    nextAllowedRequestAt = 0;
}

module.exports = {
    fetchRecipeById,
    searchRecipesByIngredient,
    extractRecipeIdsFromSearchHtml,
    __clearCookpadCacheForTests,
};

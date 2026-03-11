const { parseIngredientLine, parseLocalizedNumber, normalizeUnit } = require('../utils/arabicRecipeParser');
const egyptianFoods = require('../data/egyptianFoods');

const DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;
const TATWEEL_REGEX = /\u0640/g;

const ADJECTIVE_STOP_WORDS = new Set([
    'طازج',
    'طازجه',
    'مفروم',
    'مفرومه',
    'مقطع',
    'مقطعه',
    'مفرومة',
    'مكعبات',
    'صغير',
    'صغيرة',
    'كبير',
    'كبيرة',
    'اختياري',
    'اختيارى',
    'حسب',
    'الرغبة',
    'حسبالرغبة',
    'للتقديم',
    'للطهي',
    'للطبخ',
    'to',
    'taste',
]);

const UNIT_PATTERNS = [
    'ملعقة كبيرة',
    'ملعقة صغيره',
    'ملعقة صغيرة',
    'كوب',
    'أكواب',
    'اكواب',
    'غرام',
    'جرام',
    'كغ',
    'كيلو',
    'كيلوجرام',
    'مليلتر',
    'مل',
    'لتر',
    'فص',
    'فصوص',
    'رشة',
    'cup',
    'cups',
    'tbsp',
    'tsp',
    'gram',
    'grams',
    'kg',
    'ml',
    'l',
    'clove',
    'pinch',
].sort((a, b) => b.length - a.length);

const UNIT_ALIAS_TO_CANONICAL = [
    ['ملاعق كبيرة', 'tbsp'],
    ['ملعقه كبيره', 'tbsp'],
    ['ملعقة كبيرة', 'tbsp'],
    ['ملعقة', 'tbsp'],
    ['ملاعق صغيرة', 'tsp'],
    ['ملعقه صغيره', 'tsp'],
    ['ملعقة صغيرة', 'tsp'],
    ['اكواب', 'cup'],
    ['أكواب', 'cup'],
    ['كوب', 'cup'],
    ['غرام', 'g'],
    ['جرام', 'g'],
    ['غ', 'g'],
    ['كغ', 'kg'],
    ['كيلو', 'kg'],
    ['كيلوجرام', 'kg'],
    ['مليلتر', 'ml'],
    ['مل', 'ml'],
    ['لتر', 'l'],
    ['فصوص', 'clove'],
    ['فص', 'clove'],
    ['رشة', 'pinch'],
    ['cups', 'cup'],
    ['cup', 'cup'],
    ['tbsp', 'tbsp'],
    ['tsp', 'tsp'],
    ['grams', 'g'],
    ['gram', 'g'],
    ['g', 'g'],
    ['kg', 'kg'],
    ['ml', 'ml'],
    ['l', 'l'],
    ['clove', 'clove'],
    ['pinch', 'pinch'],
]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([pattern, unit]) => [normalizeText(pattern), unit]);

const FOOD_NAME_INDEX = egyptianFoods.map((entry) => {
    const names = [entry.name, ...(entry.altNames || [])].map((name) => normalizeText(name));
    return {
        ...entry,
        normalizedNames: Array.from(new Set(names.filter(Boolean))),
    };
});

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(TATWEEL_REGEX, '')
        .replace(DIACRITICS_REGEX, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }

    return matrix[a.length][b.length];
}

function similarityScore(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
}

function stripQuantityAndUnits(raw) {
    let working = normalizeText(raw);
    if (!working) return '';

    working = working.replace(/^[\d٠-٩.,/]+\s*/g, '').trim();

    for (const unitPattern of UNIT_PATTERNS) {
        const normalizedUnitPattern = normalizeText(unitPattern);
        if (!normalizedUnitPattern) continue;
        if (working.startsWith(`${normalizedUnitPattern} `) || working === normalizedUnitPattern) {
            working = working.slice(normalizedUnitPattern.length).trim();
            break;
        }
    }

    const tokens = working
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !ADJECTIVE_STOP_WORDS.has(token));

    return tokens.join(' ').trim();
}

function canonicalizeIngredientName(rawName) {
    const cleaned = stripQuantityAndUnits(rawName);
    if (!cleaned) {
        return {
            canonicalName: normalizeText(rawName) || 'unknown ingredient',
            matchedFood: null,
            similarity: 0,
            confidence: 'low',
        };
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of FOOD_NAME_INDEX) {
        for (const alias of entry.normalizedNames) {
            if (!alias) continue;
            if (cleaned === alias) {
                return {
                    canonicalName: entry.name,
                    matchedFood: entry,
                    similarity: 1,
                    confidence: 'high',
                };
            }

            if (cleaned.includes(alias) || alias.includes(cleaned)) {
                const score = 0.92;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = entry;
                }
                continue;
            }

            const score = similarityScore(cleaned, alias);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }
    }

    if (bestMatch && bestScore >= 0.55) {
        return {
            canonicalName: bestMatch.name,
            matchedFood: bestMatch,
            similarity: bestScore,
            confidence: bestScore >= 0.8 ? 'high' : 'medium',
        };
    }

    return {
        canonicalName: cleaned,
        matchedFood: null,
        similarity: bestScore,
        confidence: 'low',
    };
}

function parseQuantityAndUnit(raw) {
    const parsed = parseIngredientLine(raw);
    const detectedUnit = detectUnitCanonical(raw);
    if (parsed?.name) {
        return {
            quantity: Number.isFinite(parsed.amount) && parsed.amount > 0 ? parsed.amount : 1,
            unit: detectedUnit || normalizeUnit(parsed.unit || 'piece'),
            name: stripQuantityAndUnits(parsed.name) || parsed.name,
        };
    }

    const text = String(raw || '').trim();
    const numericMatch = text.match(/([\d٠-٩.,/]+)/);
    const quantity = numericMatch ? parseLocalizedNumber(numericMatch[1]) || 1 : 1;
    const unit = detectedUnit || normalizeUnit(extractUnit(text) || 'piece');
    const name = stripQuantityAndUnits(text) || text;

    return {
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit,
        name,
    };
}

function extractUnit(text) {
    const normalized = normalizeText(text);
    for (const pattern of UNIT_PATTERNS) {
        const unitPattern = normalizeText(pattern);
        if (!unitPattern) continue;
        if (normalized.includes(` ${unitPattern} `) || normalized.startsWith(`${unitPattern} `) || normalized.endsWith(` ${unitPattern}`)) {
            return unitPattern;
        }
    }

    return '';
}

function detectUnitCanonical(text) {
    const normalized = normalizeText(text);
    for (const [pattern, unit] of UNIT_ALIAS_TO_CANONICAL) {
        if (!pattern) continue;
        if (normalized.includes(` ${pattern} `) || normalized.startsWith(`${pattern} `) || normalized.endsWith(` ${pattern}`)) {
            return unit;
        }
    }

    return '';
}

function normalizeIngredient(rawIngredient) {
    const parsed = parseQuantityAndUnit(rawIngredient);
    const canonical = canonicalizeIngredientName(parsed.name);

    return {
        original: String(rawIngredient || '').trim(),
        canonicalName: canonical.canonicalName,
        canonicalNameNormalized: normalizeText(canonical.canonicalName),
        quantity: parsed.quantity,
        unit: parsed.unit,
        confidence: canonical.similarity >= 0.8 ? 'high' : canonical.similarity >= 0.55 ? 'medium' : 'low',
        matchedFoodId: canonical.matchedFood?.id || null,
        matchedFood: canonical.matchedFood || null,
    };
}

function normalizeIngredients(rawIngredients) {
    if (!Array.isArray(rawIngredients)) return [];
    return rawIngredients
        .map((item) => normalizeIngredient(item))
        .filter((item) => item && item.canonicalName && item.canonicalName !== 'حسب الرغبه');
}

module.exports = {
    normalizeText,
    normalizeArabicText: normalizeText,
    normalizeIngredient,
    normalizeIngredients,
    canonicalizeIngredientName,
    parseQuantityAndUnit,
};

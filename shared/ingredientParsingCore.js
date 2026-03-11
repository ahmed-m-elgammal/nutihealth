const ARABIC_NUMERAL_MAP = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    '٫': '.',
    '٬': '',
};

const UNICODE_FRACTIONS = {
    '½': 0.5,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '¼': 0.25,
    '¾': 0.75,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
};

const UNIT_MAP = {
    // English
    cup: 'cup',
    cups: 'cup',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tbsp: 'tbsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    tsp: 'tsp',
    gram: 'g',
    grams: 'g',
    g: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    kilo: 'kg',
    kg: 'kg',
    milliliter: 'ml',
    milliliters: 'ml',
    ml: 'ml',
    liter: 'l',
    liters: 'l',
    l: 'l',
    ounce: 'oz',
    ounces: 'oz',
    oz: 'oz',
    pound: 'lb',
    pounds: 'lb',
    lb: 'lb',
    lbs: 'lb',
    pinch: 'pinch',
    clove: 'clove',
    cloves: 'clove',
    piece: 'piece',
    pieces: 'piece',

    // Arabic
    كوب: 'cup',
    اكواب: 'cup',
    ملعقة: 'tbsp',
    'ملعقة كبيرة': 'tbsp',
    'ملعقة صغيره': 'tsp',
    'ملعقة صغيرة': 'tsp',
    جرام: 'g',
    غرام: 'g',
    غ: 'g',
    كيلو: 'kg',
    كيلوجرام: 'kg',
    كغ: 'kg',
    مل: 'ml',
    مليلتر: 'ml',
    لتر: 'l',
    أوقية: 'oz',
    اوقية: 'oz',
    رطل: 'lb',
    رشة: 'pinch',
    فص: 'clove',
    فصوص: 'clove',
};

const UNIT_KEYS = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);

function normalizeArabicNumerals(value = '') {
    let normalized = String(value);
    for (const [arabic, western] of Object.entries(ARABIC_NUMERAL_MAP)) {
        normalized = normalized.replaceAll(arabic, western);
    }
    for (const [fraction, numberValue] of Object.entries(UNICODE_FRACTIONS)) {
        normalized = normalized.replaceAll(fraction, String(numberValue));
    }
    return normalized;
}

function parseLocalizedNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (!value) {
        return null;
    }

    const normalized = normalizeArabicNumerals(String(value).trim())
        .replaceAll('،', '.')
        .replaceAll(',', '.');

    const firstRangePart = normalized.split(/\s*(?:-|to)\s*/i)[0];

    const mixedMatch = firstRangePart.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const [, whole, numerator, denominator] = mixedMatch;
        const den = Number(denominator);
        if (!den) {
            return null;
        }
        return Number(whole) + Number(numerator) / den;
    }

    const fractionMatch = firstRangePart.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const [, numerator, denominator] = fractionMatch;
        const den = Number(denominator);
        if (!den) {
            return null;
        }
        return Number(numerator) / den;
    }

    const parsed = Number(firstRangePart);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnit(unit) {
    if (!unit) {
        return 'piece';
    }

    const compact = String(unit).toLowerCase().trim().replace(/\s+/g, ' ');
    return UNIT_MAP[compact] || UNIT_MAP[compact.replace(/\s+/g, '')] || compact;
}

function parseIngredientLine(ingredientText) {
    const raw = normalizeArabicNumerals(String(ingredientText || '').trim());
    if (!raw) {
        return null;
    }

    const amountMatch = raw.match(/^([\d.]+(?:\s+[\d.]+\/[\d.]+)?|[\d.]+\/[\d.]+)/);
    const amountToken = amountMatch ? amountMatch[1] : '';
    const amount = amountToken ? parseLocalizedNumber(amountToken) : null;

    let remainder = amountToken ? raw.slice(amountToken.length).trim() : raw;
    let unit = 'piece';

    for (const unitKey of UNIT_KEYS) {
        const normalizedUnitKey = normalizeArabicNumerals(unitKey).toLowerCase();
        if (
            remainder.toLowerCase().startsWith(`${normalizedUnitKey} `) ||
            remainder.toLowerCase() === normalizedUnitKey
        ) {
            unit = normalizeUnit(unitKey);
            remainder = remainder.slice(unitKey.length).trim();
            break;
        }
    }

    return {
        name: remainder || raw,
        amount: amount ?? 1,
        unit,
        nameAr: /[\u0600-\u06FF]/.test(remainder || raw) ? remainder || raw : undefined,
    };
}

module.exports = {
    ARABIC_NUMERAL_MAP,
    UNICODE_FRACTIONS,
    UNIT_MAP,
    UNIT_KEYS,
    normalizeArabicNumerals,
    parseLocalizedNumber,
    normalizeUnit,
    parseIngredientLine,
};
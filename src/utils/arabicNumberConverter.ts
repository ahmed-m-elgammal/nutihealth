/**
 * Utilities for parsing localized ingredient amounts and units.
 * Supports English and Arabic numerals/units.
 */

export type UnitSystem = 'metric' | 'imperial';

const ARABIC_NUMERAL_MAP: Record<string, string> = {
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
};

const UNICODE_FRACTION_MAP: Record<string, number> = {
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

const UNIT_ALIASES: Record<string, string> = {
    cup: 'cup',
    cups: 'cup',
    tbsp: 'tbsp',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tsp: 'tsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    g: 'g',
    gram: 'g',
    grams: 'g',
    kg: 'kg',
    kilo: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    l: 'l',
    liter: 'l',
    liters: 'l',
    oz: 'oz',
    ounce: 'oz',
    ounces: 'oz',
    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',
    piece: 'piece',
    pieces: 'piece',
    clove: 'clove',
    cloves: 'clove',
    pinch: 'pinch',
    كوب: 'cup',
    اكواب: 'cup',
    ملعقة: 'tbsp',
    ملعقةكبيرة: 'tbsp',
    ملعقةصغيرة: 'tsp',
    ملعقةكبيره: 'tbsp',
    ملعقةصغيره: 'tsp',
    جرام: 'g',
    غرام: 'g',
    غ: 'g',
    كغ: 'kg',
    كيلو: 'kg',
    كيلوجرام: 'kg',
    مل: 'ml',
    مليلتر: 'ml',
    لتر: 'l',
    اوقية: 'oz',
    أوقية: 'oz',
    رطل: 'lb',
    فص: 'clove',
    فصوص: 'clove',
    رشة: 'pinch',
};

const ALIAS_KEYS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);

const IMPERIAL_TO_METRIC: Record<string, { unit: string; factor: number }> = {
    cup: { unit: 'ml', factor: 240 },
    tbsp: { unit: 'ml', factor: 15 },
    tsp: { unit: 'ml', factor: 5 },
    oz: { unit: 'g', factor: 28.35 },
    lb: { unit: 'kg', factor: 0.453592 },
};

const METRIC_TO_IMPERIAL: Record<string, { unit: string; factor: number }> = {
    ml: { unit: 'cup', factor: 1 / 240 },
    l: { unit: 'cup', factor: 4.22675 },
    g: { unit: 'oz', factor: 1 / 28.35 },
    kg: { unit: 'lb', factor: 2.20462 },
};

export interface ParsedIngredientAmount {
    amount: number | null;
    unit: string;
    name: string;
    normalizedText: string;
}

/**
 * Converts Arabic/Persian numerals to standard western digits.
 */
export function convertArabicNumeralsToEnglish(value: string): string {
    let result = value;
    for (const [arabicDigit, englishDigit] of Object.entries(ARABIC_NUMERAL_MAP)) {
        result = result.replaceAll(arabicDigit, englishDigit);
    }

    return result.replaceAll('٫', '.').replaceAll('٬', '').replaceAll('،', '.');
}

/**
 * Converts standard digits to Arabic-Indic digits.
 */
export function convertEnglishNumeralsToArabic(value: string): string {
    const englishToArabicMap: Record<string, string> = {
        '0': '٠',
        '1': '١',
        '2': '٢',
        '3': '٣',
        '4': '٤',
        '5': '٥',
        '6': '٦',
        '7': '٧',
        '8': '٨',
        '9': '٩',
    };

    return value
        .split('')
        .map((char) => englishToArabicMap[char] ?? char)
        .join('');
}

/**
 * Normalizes localized numeric symbols (Arabic decimal/thousands separators, unicode fractions).
 */
export function normalizeLocalizedNumber(value: string): string {
    let normalized = convertArabicNumeralsToEnglish(value)
        .replaceAll('٫', '.')
        .replaceAll('٬', '')
        .replaceAll('،', '.');

    for (const [fraction, numeric] of Object.entries(UNICODE_FRACTION_MAP)) {
        normalized = normalized.replaceAll(fraction, String(numeric));
    }

    return normalized;
}

/**
 * Parses localized number strings into numeric values.
 */
export function parseLocalizedNumber(value: string | number): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const normalized = normalizeLocalizedNumber(value.trim());
    if (!normalized) {
        return null;
    }

    const rangeParts = normalized.split(/\s*(?:-|to)\s*/i);
    const candidate = rangeParts[0]?.trim() ?? normalized;

    const mixedMatch = candidate.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const [, whole, numerator, denominator] = mixedMatch;
        const den = Number(denominator);
        if (!den) {
            return null;
        }
        return Number(whole) + Number(numerator) / den;
    }

    const fractionMatch = candidate.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const [, numerator, denominator] = fractionMatch;
        const den = Number(denominator);
        if (!den) {
            return null;
        }
        return Number(numerator) / den;
    }

    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalizes English/Arabic unit labels to canonical short unit strings.
 */
export function normalizeUnit(value: string): string {
    const compact = value.trim().toLowerCase().replace(/\s+/g, '');
    return UNIT_ALIASES[compact] ?? value.trim().toLowerCase();
}

/**
 * Attempts to parse amount/unit/name from a recipe ingredient line.
 */
export function parseIngredientAmount(rawIngredient: string): ParsedIngredientAmount {
    const normalized = normalizeLocalizedNumber(rawIngredient).trim();

    const amountMatch = normalized.match(/^([\d.]+(?:\s+[\d.]+\/[\d.]+)?|[\d.]+\/[\d.]+)/);
    const amountToken = amountMatch?.[1] ?? '';
    const amount = amountToken ? parseLocalizedNumber(amountToken) : null;

    const rest = amountToken ? normalized.slice(amountToken.length).trim() : normalized;

    let detectedUnit = 'piece';
    let name = rest;

    const restLower = rest.toLowerCase();
    const restCompact = restLower.replace(/\s+/g, '');

    for (const alias of ALIAS_KEYS) {
        const aliasLower = alias.toLowerCase();
        const aliasCompact = aliasLower.replace(/\s+/g, '');
        if (
            restLower.startsWith(aliasLower + ' ') ||
            restLower === aliasLower ||
            restCompact.startsWith(aliasCompact)
        ) {
            detectedUnit = UNIT_ALIASES[alias];
            const removeLength = restLower.startsWith(aliasLower) ? alias.length : 0;
            name = removeLength > 0 ? rest.slice(removeLength).trim() : rest;
            if (!name) {
                name = rest;
            }
            break;
        }
    }

    return {
        amount,
        unit: normalizeUnit(detectedUnit),
        name: name.trim() || rawIngredient.trim(),
        normalizedText: normalized,
    };
}

/**
 * Converts amount+unit to the requested display system where a safe mapping exists.
 */
export function convertAmountBetweenSystems(
    amount: number,
    unit: string,
    targetSystem: UnitSystem,
): { amount: number; unit: string } {
    const canonicalUnit = normalizeUnit(unit);

    if (targetSystem === 'metric' && IMPERIAL_TO_METRIC[canonicalUnit]) {
        const conversion = IMPERIAL_TO_METRIC[canonicalUnit];
        return {
            amount: roundToTwo(amount * conversion.factor),
            unit: conversion.unit,
        };
    }

    if (targetSystem === 'imperial' && METRIC_TO_IMPERIAL[canonicalUnit]) {
        const conversion = METRIC_TO_IMPERIAL[canonicalUnit];
        return {
            amount: roundToTwo(amount * conversion.factor),
            unit: conversion.unit,
        };
    }

    return { amount: roundToTwo(amount), unit: canonicalUnit };
}

/**
 * Formats parsed amount/unit for the provided locale.
 */
export function formatLocalizedAmount(amount: number | null, unit: string, locale: 'en' | 'ar'): string {
    if (amount === null) {
        return unit;
    }

    const numeric = roundToTwo(amount).toString();
    if (locale === 'ar') {
        return `${convertEnglishNumeralsToArabic(numeric)} ${unit}`;
    }

    return `${numeric} ${unit}`;
}

function roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
}

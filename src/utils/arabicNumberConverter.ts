/**
 * Utilities for parsing localized ingredient amounts and units.
 * Supports English and Arabic numerals/units.
 */

import {
    normalizeArabicNumerals as normalizeArabicNumeralsCore,
    normalizeUnit as normalizeUnitCore,
    parseIngredientLine as parseIngredientLineCore,
    parseLocalizedNumber as parseLocalizedNumberCore,
} from '../../shared/ingredientParsingCore';

export type UnitSystem = 'metric' | 'imperial';

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
    return normalizeArabicNumeralsCore(value)
        .replaceAll('٫', '.')
        .replaceAll('٬', '')
        .replaceAll('،', '.');
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
    return convertArabicNumeralsToEnglish(value);
}

/**
 * Parses localized number strings into numeric values.
 */
export function parseLocalizedNumber(value: string | number): number | null {
    return parseLocalizedNumberCore(value);
}

/**
 * Normalizes English/Arabic unit labels to canonical short unit strings.
 */
export function normalizeUnit(value: string): string {
    return normalizeUnitCore(value);
}

/**
 * Attempts to parse amount/unit/name from a recipe ingredient line.
 */
export function parseIngredientAmount(rawIngredient: string): ParsedIngredientAmount {
    const normalized = normalizeLocalizedNumber(rawIngredient).trim();
    const hasAmountToken = /^([\d.]+(?:\s+[\d.]+\/[\d.]+)?|[\d.]+\/[\d.]+)/.test(normalized);
    const parsed = parseIngredientLineCore(rawIngredient);

    if (!parsed) {
        return {
            amount: null,
            unit: 'piece',
            name: rawIngredient.trim(),
            normalizedText: normalized,
        };
    }

    return {
        amount: hasAmountToken ? parsed.amount : null,
        unit: normalizeUnit(parsed.unit),
        name: parsed.name,
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

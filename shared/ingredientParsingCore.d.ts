export interface CoreParsedIngredient {
    name: string;
    amount: number;
    unit: string;
    nameAr?: string;
}

export const ARABIC_NUMERAL_MAP: Record<string, string>;
export const UNICODE_FRACTIONS: Record<string, number>;
export const UNIT_MAP: Record<string, string>;
export const UNIT_KEYS: string[];

export function normalizeArabicNumerals(value?: string): string;
export function parseLocalizedNumber(value: string | number): number | null;
export function normalizeUnit(unit: string): string;
export function parseIngredientLine(ingredientText: string): CoreParsedIngredient | null;
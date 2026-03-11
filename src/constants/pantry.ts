import type { PantryCategory, PantryUnit } from '../services/api/pantry';

export const PANTRY_CATEGORIES: Array<{
    key: PantryCategory;
    translationKey: string;
}> = [
    { key: 'all', translationKey: 'pantry.categories.all' },
    { key: 'vegetables', translationKey: 'pantry.categories.vegetables' },
    { key: 'fruits', translationKey: 'pantry.categories.fruits' },
    { key: 'proteins', translationKey: 'pantry.categories.proteins' },
    { key: 'grains', translationKey: 'pantry.categories.grains' },
    { key: 'dairy', translationKey: 'pantry.categories.dairy' },
    { key: 'spices', translationKey: 'pantry.categories.spices' },
    { key: 'other', translationKey: 'pantry.categories.other' },
];

export const PANTRY_UNITS: Array<{
    key: PantryUnit;
    translationKey: string;
}> = [
    { key: 'grams', translationKey: 'pantry.units.grams' },
    { key: 'ml', translationKey: 'pantry.units.ml' },
    { key: 'pieces', translationKey: 'pantry.units.pieces' },
    { key: 'cups', translationKey: 'pantry.units.cups' },
    { key: 'tbsp', translationKey: 'pantry.units.tbsp' },
    { key: 'tsp', translationKey: 'pantry.units.tsp' },
];

const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('../utils/logger');

const FOOD_CSV_PATH = path.resolve(__dirname, '..', '..', 'food.csv');

const toSafeString = (value) => String(value || '').trim();

const normalizeHeader = (value) => toSafeString(value).replace(/^\uFEFF/, '').toLowerCase();

const splitPipeValues = (value) =>
    String(value || '')
        .split('|')
        .map((item) => toSafeString(item))
        .filter(Boolean);

function parseCsvRows(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
        const char = csvText[index];

        if (inQuotes) {
            if (char === '"') {
                const nextChar = csvText[index + 1];
                if (nextChar === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            row.push(field);
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        if (char !== '\r') {
            field += char;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
        rows.pop();
    }

    return rows;
}

const parseDurationToMinutes = (value) => {
    const raw = toSafeString(value).toUpperCase();
    if (!raw) return null;

    const hasIsoPrefix = raw.startsWith('PT') || raw.startsWith('P');
    const hourMatch = raw.match(/(\d+)\s*H/);
    const minuteMatch = raw.match(/(\d+)\s*M/);

    if (hourMatch || minuteMatch) {
        const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
        const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;
        const total = hours * 60 + minutes;
        return Number.isFinite(total) && total > 0 ? total : null;
    }

    if (!hasIsoPrefix) {
        const numericMatch = raw.match(/\d+/);
        if (numericMatch?.[0]) {
            const valueAsMinutes = Number.parseInt(numericMatch[0], 10);
            return Number.isFinite(valueAsMinutes) && valueAsMinutes > 0 ? valueAsMinutes : null;
        }
    }

    return null;
};

const parseServings = (value) => {
    const raw = toSafeString(value);
    if (!raw) return 1;

    const numericMatch = raw.match(/\d+/);
    if (!numericMatch?.[0]) return 1;

    const parsed = Number.parseInt(numericMatch[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeIngredientName = (rawIngredient) => {
    const clean = toSafeString(rawIngredient);
    if (!clean) return '';

    const withoutLeadingAmount = clean.replace(/^[\d٠-٩.,/\s]+/u, '').trim();
    return withoutLeadingAmount || clean;
};

const parseIngredientList = (rawValue) => {
    const unique = new Set();
    const ingredients = [];

    for (const item of splitPipeValues(rawValue)) {
        const ingredientName = normalizeIngredientName(item);
        if (!ingredientName) continue;

        const key = ingredientName.toLowerCase();
        if (unique.has(key)) continue;
        unique.add(key);
        ingredients.push(ingredientName);
    }

    return ingredients;
};

const parseStepList = (rawValue) =>
    splitPipeValues(rawValue).map((step) =>
        step
            .replace(/^\d+\s*[.)-]?\s*/u, '')
            .replace(/\s+/g, ' ')
            .trim(),
    );

function loadFoodCsvCatalog() {
    if (!fs.existsSync(FOOD_CSV_PATH)) {
        logger.warn(
            {
                route: 'smart-cooker-catalog-loader',
                csvPath: FOOD_CSV_PATH,
                errorMessage: 'food.csv was not found',
            },
            'food.csv catalog file is missing; Smart Cooker will use fallback catalog only',
        );
        return {
            recipes: [],
            meta: {
                source: 'food.csv',
                path: FOOD_CSV_PATH,
                total_rows: 0,
                loaded_recipes: 0,
                skipped_rows: 0,
                duplicate_ids: 0,
            },
        };
    }

    const csvText = fs.readFileSync(FOOD_CSV_PATH, 'utf8');
    const rows = parseCsvRows(csvText);
    if (rows.length === 0) {
        return {
            recipes: [],
            meta: {
                source: 'food.csv',
                path: FOOD_CSV_PATH,
                total_rows: 0,
                loaded_recipes: 0,
                skipped_rows: 0,
                duplicate_ids: 0,
            },
        };
    }

    const headers = rows[0].map(normalizeHeader);
    const idIndex = headers.indexOf('id');
    const titleIndex = headers.indexOf('title');
    const categoryIndex = headers.indexOf('category');
    const cookTimeIndex = headers.indexOf('cook_time');
    const prepTimeIndex = headers.indexOf('prep_time');
    const servingsIndex = headers.indexOf('servings');
    const ingredientsIndex = headers.indexOf('ingredients');
    const stepsIndex = headers.indexOf('steps');

    const recipes = [];
    const seenIds = new Set();
    let skippedRows = 0;
    let duplicateIds = 0;

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const rawId = toSafeString(row[idIndex]);
        const title = toSafeString(row[titleIndex]);
        const ingredients = parseIngredientList(row[ingredientsIndex]);

        if (!rawId || !title || ingredients.length === 0) {
            skippedRows += 1;
            continue;
        }

        if (seenIds.has(rawId)) {
            duplicateIds += 1;
            continue;
        }
        seenIds.add(rawId);

        recipes.push({
            recipe_id: rawId,
            food_name_ar: title,
            food_name_en: title,
            ingredients_ar: ingredients,
            ingredients_en: [],
            instructions: parseStepList(row[stepsIndex]),
            category_ar: toSafeString(row[categoryIndex]),
            prep_time_minutes: parseDurationToMinutes(row[prepTimeIndex]),
            cook_time_minutes: parseDurationToMinutes(row[cookTimeIndex]),
            servings: parseServings(row[servingsIndex]),
            source: 'food-csv',
        });
    }

    return {
        recipes,
        meta: {
            source: 'food.csv',
            path: FOOD_CSV_PATH,
            total_rows: Math.max(0, rows.length - 1),
            loaded_recipes: recipes.length,
            skipped_rows: skippedRows,
            duplicate_ids: duplicateIds,
        },
    };
}

module.exports = {
    loadFoodCsvCatalog,
};

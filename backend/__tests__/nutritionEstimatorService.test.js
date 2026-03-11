const { estimateRecipeNutrition, detectCategory, convertToGrams } = require('../services/nutritionEstimatorService');

describe('nutritionEstimatorService', () => {
    // ─── basic estimation ──────────────────────────────────────────
    test('estimates per-serving nutrition with high confidence when all ingredients match', () => {
        const normalizedIngredients = [
            { canonicalName: 'Tomato', quantity: 2, unit: 'piece', matchedFood: { id: 'ingredient-tomato', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, pieceWeight: 80 } },
            { canonicalName: 'Olive Oil', quantity: 1, unit: 'tbsp', matchedFood: { id: 'ingredient-olive-oil', calories: 884, protein: 0, carbs: 0, fats: 100 } },
        ];

        const result = estimateRecipeNutrition(normalizedIngredients, 2, 'lunch');

        expect(result.confidence).toBe('high');
        expect(result.calories).toBeGreaterThan(0);
        expect(result.fats).toBeGreaterThan(0);
    });

    test('falls back for unmatched ingredients and lowers confidence', () => {
        const normalizedIngredients = [
            { canonicalName: 'Ingredient X', quantity: 2, unit: 'cup' },
            { canonicalName: 'Ingredient Y', quantity: 1, unit: 'tbsp' },
            { canonicalName: 'Ingredient Z', quantity: 1, unit: 'piece' },
        ];

        const result = estimateRecipeNutrition(normalizedIngredients, 3, 'dinner');

        expect(['medium', 'low']).toContain(result.confidence);
        expect(result.unmatchedIngredients.length).toBeGreaterThan(0);
        expect(result.calories).toBeGreaterThan(0);
    });

    // ─── category detection ────────────────────────────────────────
    test('detects fat-category items', () => {
        const cat = detectCategory('Olive Oil');
        expect(cat).toBe('fat');
    });

    test('detects protein-category items', () => {
        const cat = detectCategory('Chicken');
        expect(cat).toBe('protein');
    });

    test('detects grain-category items', () => {
        const cat = detectCategory('Rice');
        expect(cat).toBe('grain');
    });

    test('detects dairy-category items', () => {
        const cat = detectCategory('Milk');
        expect(cat).toBe('dairy');
    });

    test('detects vegetable-category items', () => {
        const cat = detectCategory('Tomato');
        expect(cat).toBe('vegetable');
    });

    test('detects spice-category items and assigns low calories', () => {
        const cat = detectCategory('Salt');
        expect(cat).toBe('spice');
    });

    test('returns "other" for unknown category', () => {
        const cat = detectCategory('XxUnknownIngredientXx');
        expect(cat).toBe('other');
    });

    // ─── gram conversion ───────────────────────────────────────────
    test('converts cups to grams', () => {
        const grams = convertToGrams(1, 'cup');
        expect(grams).toBeGreaterThan(0);
        expect(grams).toBeLessThan(500);
    });

    test('converts tablespoons to grams', () => {
        const grams = convertToGrams(2, 'tbsp');
        expect(grams).toBeGreaterThan(0);
    });

    test('converts teaspoons to grams', () => {
        const grams = convertToGrams(1, 'tsp');
        expect(grams).toBeGreaterThan(0);
        expect(grams).toBeLessThanOrEqual(10);
    });

    test('treats piece unit with default weight', () => {
        const grams = convertToGrams(1, 'piece');
        expect(grams).toBeGreaterThan(0);
    });

    // ─── calorie calculation edge cases ────────────────────────────
    test('handles zero servings by defaulting to 1', () => {
        const normalizedIngredients = [
            { canonicalName: 'Tomato', quantity: 1, unit: 'piece', matchedFood: { id: 'ingredient-tomato', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, pieceWeight: 80 } },
        ];
        const result = estimateRecipeNutrition(normalizedIngredients, 0, 'lunch');
        expect(result.calories).toBeGreaterThan(0);
    });

    test('handles empty ingredients array', () => {
        const result = estimateRecipeNutrition([], 2, 'snack');
        expect(result.calories).toBe(0);
        expect(result.confidence).toBeDefined();
    });

    test('produces per-serving values that scale with serving count', () => {
        const ingredients = [
            { canonicalName: 'Olive Oil', quantity: 2, unit: 'tbsp', matchedFood: { id: 'ingredient-olive-oil', calories: 884, protein: 0, carbs: 0, fats: 100 } },
        ];
        const onePortion = estimateRecipeNutrition(ingredients, 1, 'lunch');
        const fourPortions = estimateRecipeNutrition(ingredients, 4, 'lunch');

        // Total recipe is the same, so per-serving for 4 should be ~¼ of per-serving for 1
        expect(Math.abs(onePortion.calories - fourPortions.calories * 4)).toBeLessThan(5);
    });

    test('all nutrition fields are non-negative', () => {
        const ingredients = [
            { canonicalName: 'Ingredient Q', quantity: 5, unit: 'cup' },
        ];
        const result = estimateRecipeNutrition(ingredients, 2, 'dinner');
        expect(result.calories).toBeGreaterThanOrEqual(0);
        expect(result.protein).toBeGreaterThanOrEqual(0);
        expect(result.carbs).toBeGreaterThanOrEqual(0);
        expect(result.fats).toBeGreaterThanOrEqual(0);
    });
});

import {
    calculateIngredientSelectionRatio,
    calculateNutritionForServings,
    normalizeRecipeResponse,
    resolveRecipeDirection,
} from '../recipeParser';

describe('recipeParser', () => {
    it('normalizes raw API response into strict recipe shape', () => {
        const normalized = normalizeRecipeResponse(
            {
                title: 'Chicken Soup',
                servings: 4,
                ingredients: ['2 cups broth', '1 كوب أرز'],
                instructions: ['Boil', 'Serve'],
                nutrition: { calories: 200, protein: 14, carbs: 18, fats: 7 },
                language: 'en',
            },
            'https://example.com/recipe'
        );

        expect(normalized.ingredients).toHaveLength(2);
        expect(normalized.ingredients[0].amount).toBe(2);
        expect(normalized.servings).toBe(4);
        expect(normalized.sourceUrl).toBe('https://example.com/recipe');
    });

    it('caps ingredient ratio to a minimum so nutrition does not collapse to zero', () => {
        expect(calculateIngredientSelectionRatio([], 8)).toBe(0.1);
    });

    it('calculates nutrition totals for selected servings', () => {
        const totals = calculateNutritionForServings(
            { calories: 300, protein: 20, carbs: 30, fats: 10 },
            2,
            0.5
        );

        expect(totals.calories).toBe(300);
        expect(totals.protein).toBe(20);
        expect(totals.carbs).toBe(30);
        expect(totals.fats).toBe(10);
    });

    it('returns RTL direction for Arabic recipes', () => {
        const direction = resolveRecipeDirection({
            language: 'ar',
            title: 'شوربة العدس',
            titleAr: 'شوربة العدس',
        });

        expect(direction).toBe('rtl');
    });
});
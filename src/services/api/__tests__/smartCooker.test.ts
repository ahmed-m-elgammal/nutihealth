/**
 * Tests for src/services/api/smartCooker.ts
 *
 * All 5 exported API functions are verified for:
 *  - Correct endpoint and HTTP method
 *  - Request body / params forwarded properly
 *  - Input validation (empty id / query throws)
 */

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('../../apiWrapper', () => ({
    api: {
        get: (...args: any[]) => mockApiGet(...args),
        post: (...args: any[]) => mockApiPost(...args),
    },
}));

import {
    getSmartCookerRecipeById,
    searchSmartCookerCatalog,
    estimateSmartCookerNutrition,
    suggestSmartCookerRecipes,
    searchSmartCookerCookpadDetails,
    searchSmartCookerRecipes,
} from '../smartCooker';

describe('smartCooker', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── getSmartCookerRecipeById ───────────────────────────────────────────
    describe('getSmartCookerRecipeById', () => {
        it('calls GET /smart-cooker/recipe/:id with encoded id', async () => {
            mockApiGet.mockResolvedValueOnce({ cookpad_id: 'abc' });

            await getSmartCookerRecipeById('abc-123');

            expect(mockApiGet).toHaveBeenCalledWith('/smart-cooker/recipe/abc-123');
        });

        it('throws when id is empty', async () => {
            await expect(getSmartCookerRecipeById('')).rejects.toThrow('Recipe id is required');
        });
    });

    // ── searchSmartCookerCatalog ───────────────────────────────────────────
    describe('searchSmartCookerCatalog', () => {
        it('calls GET /smart-cooker/catalog with query params', async () => {
            mockApiGet.mockResolvedValueOnce({ total: 0, items: [] });

            await searchSmartCookerCatalog('كشري', 'ar', 10);

            expect(mockApiGet).toHaveBeenCalledWith(
                '/smart-cooker/catalog',
                expect.objectContaining({
                    params: { query: 'كشري', lang: 'ar', limit: '10' },
                    suppressErrors: true,
                }),
            );
        });
    });

    // ── estimateSmartCookerNutrition ───────────────────────────────────────
    describe('estimateSmartCookerNutrition', () => {
        it('calls POST /smart-cooker/estimate with payload and 45 s timeout', async () => {
            const payload = { recipe_query: 'koshary', serving_size_g: 200 };
            mockApiPost.mockResolvedValueOnce({ estimated_nutrition: {} });

            await estimateSmartCookerNutrition(payload);

            expect(mockApiPost).toHaveBeenCalledWith(
                '/smart-cooker/estimate',
                payload,
                expect.objectContaining({ timeout: 45000 }),
            );
        });
    });

    // ── suggestSmartCookerRecipes ──────────────────────────────────────────
    describe('suggestSmartCookerRecipes', () => {
        it('calls POST /smart-cooker/suggest', async () => {
            const payload = { ingredients: ['tomato', 'cheese'], meal_type: 'lunch' as const };
            mockApiPost.mockResolvedValueOnce({ session_id: 'x', suggestions: [] });

            await suggestSmartCookerRecipes(payload);

            expect(mockApiPost).toHaveBeenCalledWith(
                '/smart-cooker/suggest',
                payload,
                expect.objectContaining({ timeout: 45000 }),
            );
        });
    });

    // ── searchSmartCookerCookpadDetails ───────────────────────────────────
    describe('searchSmartCookerCookpadDetails', () => {
        it('calls GET /smart-cooker/cookpad-details with query and recipe_id', async () => {
            mockApiGet.mockResolvedValueOnce({ cookpad_id: '1', title: 'Koshary' });

            await searchSmartCookerCookpadDetails('koshary', 'recipe-1');

            expect(mockApiGet).toHaveBeenCalledWith(
                '/smart-cooker/cookpad-details',
                expect.objectContaining({
                    params: { query: 'koshary', recipe_id: 'recipe-1' },
                    timeout: 45000,
                }),
            );
        });

        it('throws when both query and recipeId are empty', async () => {
            await expect(searchSmartCookerCookpadDetails('', undefined)).rejects.toThrow(
                'query or recipe id is required',
            );
        });
    });

    // ── searchSmartCookerRecipes ───────────────────────────────────────────
    describe('searchSmartCookerRecipes', () => {
        it('calls POST /smart-cooker/search', async () => {
            const payload = { ingredients: ['rice'] };
            mockApiPost.mockResolvedValueOnce({ session_id: 'y', suggestions: [] });

            await searchSmartCookerRecipes(payload);

            expect(mockApiPost).toHaveBeenCalledWith(
                '/smart-cooker/search',
                payload,
                expect.objectContaining({ timeout: 45000, suppressErrors: true }),
            );
        });

        it('falls back to local catalog on network errors', async () => {
            const payload = { ingredients: ['كشري', 'عدس'] };
            mockApiPost.mockRejectedValueOnce(new Error('Network request failed'));

            const response = await searchSmartCookerRecipes(payload);

            expect(response.meta?.source).toBe('local_egyptian_catalog_fallback');
            expect(response.suggestions.length).toBeGreaterThan(0);
            expect(response.suggestions[0].ingredients_ar?.length).toBeGreaterThan(0);
        });
    });
});

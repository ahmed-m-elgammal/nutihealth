import { api } from '../apiWrapper';
import { importRecipeFromUrl } from '../recipeImportService';

jest.mock('../apiWrapper', () => ({
    api: {
        post: jest.fn(),
    },
}));

jest.mock('../api/nutrition', () => ({
    findNutritionData: jest.fn().mockResolvedValue({
        calories: 120,
        protein: 8,
        carbs: 10,
        fats: 4,
        fiber: 2,
        sugar: 1,
        source: 'estimate',
    }),
}));

jest.mock('../../utils/storage-adapter', () => ({
    storage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        getAllKeys: jest.fn(),
        multiRemove: jest.fn(),
        removeItem: jest.fn(),
    },
}));

describe('recipeImportService', () => {
    const mockPost = api.post as jest.Mock;
    const { storage } = jest.requireMock('../../utils/storage-adapter');

    beforeEach(() => {
        jest.clearAllMocks();
        (storage.getItem as jest.Mock).mockResolvedValue(null);
        (storage.setItem as jest.Mock).mockResolvedValue(undefined);
    });

    it('retries import requests with exponential backoff on network errors', async () => {
        mockPost.mockRejectedValueOnce(new Error('Network timeout')).mockResolvedValueOnce({
            title: 'Soup',
            servings: 2,
            ingredients: [{ name: 'Water', amount: 2, unit: 'cup' }],
            instructions: ['Boil water'],
            nutrition: { calories: 80, protein: 2, carbs: 12, fats: 1 },
            imageUrl: '',
            language: 'en',
        });

        const imported = await importRecipeFromUrl('https://example.com/soup', {
            forceRefresh: true,
            minLoadingMs: 0,
        });

        expect(mockPost).toHaveBeenCalledTimes(2);
        expect(imported.title).toBe('Soup');
    });

    it('throws INVALID_URL error for malformed links', async () => {
        await expect(importRecipeFromUrl('not-a-url', { minLoadingMs: 0 })).rejects.toMatchObject({
            code: 'INVALID_URL',
        });
    });
});

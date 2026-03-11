/**
 * Tests for src/services/ai/foodDetection.ts – identifyFoodFromImage
 *
 * Flow under test:
 *  1. Cache hit → returns cached result immediately
 *  2. Happy path → POST /analyze-food → nutrition lookup → returns DetectedFood
 *  3. Low-confidence response → throws
 *  4. Empty response from AI → throws
 *  5. Retryable errors are retried (up to 3 attempts)
 *  6. Non-retryable errors are thrown immediately
 */

const mockApiCall = jest.fn();
const mockGetCachedResult = jest.fn().mockResolvedValue(null);
const mockSetCachedResult = jest.fn().mockResolvedValue(undefined);
const mockHashBase64 = jest.fn((s: string) => `hash-${s.slice(0, 8)}`);
const mockFormatImageForAI = jest.fn((s: string) => `data:image/jpeg;base64,${s}`);
const mockFindNutritionData = jest.fn();

jest.mock('../../apiWrapper', () => ({ apiCall: (...args: any[]) => mockApiCall(...args) }));
jest.mock('../../../utils/detectionCache', () => ({
    getCachedResult: (...args: any[]) => mockGetCachedResult(...args),
    setCachedResult: (...args: any[]) => mockSetCachedResult(...args),
    hashBase64: (s: any) => mockHashBase64(s),
}));
jest.mock('../../../utils/image', () => ({
    formatImageForAI: (s: any) => mockFormatImageForAI(s),
}));
jest.mock('../../api/nutrition', () => ({
    findNutritionData: (...args: any[]) => mockFindNutritionData(...args),
}));

import { identifyFoodFromImage } from '../foodDetection';

const GOOD_LABEL = 'apple';
const MOCK_AI_RESPONSE = [{ label: GOOD_LABEL, score: 0.85 }];
const MOCK_NUTRITION = {
    calories: 52,
    protein: 0.3,
    carbs: 13.8,
    fats: 0.2,
    fiber: 2.4,
    sugar: 10,
    source: 'database' as const,
};

describe('foodDetection – identifyFoodFromImage', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns cached DetectedFood without calling API again', async () => {
        const cachedFood = { name: 'pizza', calories: 300, confidence: 0.9 };
        mockGetCachedResult.mockResolvedValueOnce(cachedFood);

        const result = await identifyFoodFromImage('base64data');

        expect(result.name).toBe('pizza');
        expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('calls POST /analyze-food and returns DetectedFood on success', async () => {
        mockApiCall.mockResolvedValueOnce(MOCK_AI_RESPONSE);
        mockFindNutritionData.mockResolvedValueOnce(MOCK_NUTRITION);

        const result = await identifyFoodFromImage('abc123');

        expect(mockApiCall).toHaveBeenCalledWith('/analyze-food', expect.objectContaining({ method: 'POST' }));
        expect(result.name).toBe(GOOD_LABEL);
        expect(result.confidence).toBe(0.85);
        expect(result.calories).toBe(52);
    });

    it('caches the result after a successful AI response', async () => {
        mockApiCall.mockResolvedValueOnce(MOCK_AI_RESPONSE);
        mockFindNutritionData.mockResolvedValueOnce(MOCK_NUTRITION);

        await identifyFoodFromImage('abc123');

        expect(mockSetCachedResult).toHaveBeenCalled();
    });

    it('throws when AI confidence is below 0.3', async () => {
        mockApiCall.mockResolvedValueOnce([{ label: 'unknown', score: 0.1 }]);
        mockFindNutritionData.mockResolvedValueOnce(MOCK_NUTRITION);

        await expect(identifyFoodFromImage('lowconf')).rejects.toThrow(/confidence too low|not recognized/i);
    });

    it('throws when AI returns an empty array', async () => {
        mockApiCall.mockResolvedValueOnce([]);

        await expect(identifyFoodFromImage('empty')).rejects.toThrow();
    });

    it('retries on rate-limit errors and ultimately throws after max attempts', async () => {
        const rateLimitError = new Error('rate limit exceeded');
        mockApiCall
            .mockRejectedValueOnce(rateLimitError)
            .mockRejectedValueOnce(rateLimitError)
            .mockRejectedValueOnce(rateLimitError);

        await expect(identifyFoodFromImage('retry-test')).rejects.toThrow();
        // Should have been called 3 times (MAX_AI_ATTEMPTS)
        expect(mockApiCall).toHaveBeenCalledTimes(3);
    }, 15000);
});

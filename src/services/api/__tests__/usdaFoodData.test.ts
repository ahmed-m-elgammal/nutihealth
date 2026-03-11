/**
 * Tests for src/services/api/usdaFoodData.ts – searchUsdaFoods
 *
 * Security note: USDA key must be sent in request headers, not URL params.
 */

import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../utils/logger', () => ({
    logger: { apiRequest: jest.fn(), apiResponse: jest.fn(), apiError: jest.fn() },
}));

// Expose a controllable API key
jest.mock('../../../constants/env', () => ({ EXPO_PUBLIC_USDA_API_KEY: 'TEST_KEY' }));

import { searchUsdaFoods } from '../usdaFoodData';

const MOCK_USDA_RESPONSE = {
    status: 200,
    data: {
        foods: [
            {
                fdcId: 12345,
                description: 'Raw Apple',
                brandOwner: 'USDA',
                foodNutrients: [
                    { nutrientId: 1008, value: 52 }, // calories
                    { nutrientId: 1003, value: 0.3 }, // protein
                    { nutrientId: 1005, value: 13.8 }, // carbs
                    { nutrientId: 1004, value: 0.2 }, // fats
                    { nutrientId: 1079, value: 2.4 }, // fiber
                    { nutrientId: 2000, value: 10.4 }, // sugar
                ],
            },
        ],
    },
};

describe('usdaFoodData – searchUsdaFoods', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns mapped results on success', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_USDA_RESPONSE);

        const results = await searchUsdaFoods('apple');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('usda-12345');
        expect(results[0].name).toBe('Raw Apple');
        expect(results[0].calories).toBe(52);
    });

    it('sends the USDA key via X-Api-Key header', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_USDA_RESPONSE);

        await searchUsdaFoods('apple');

        const callConfig = mockedAxios.get.mock.calls[0][1];
        expect(callConfig?.headers?.['X-Api-Key']).toBe('TEST_KEY');
        expect(callConfig?.params?.api_key).toBeUndefined();
    });

    it('returns empty array for queries shorter than 3 chars (fast path)', async () => {
        const results = await searchUsdaFoods('ab');

        expect(results).toEqual([]);
        expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('returns empty array on network failure (no crash)', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const results = await searchUsdaFoods('banana');

        expect(results).toEqual([]);
    });

    it('uses provided env key (TEST_KEY) in request headers', async () => {
        mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { foods: [] } });

        await searchUsdaFoods('test query');

        const callHeaders = mockedAxios.get.mock.calls[0]?.[1]?.headers;
        // EXPO_PUBLIC_USDA_API_KEY is mocked to 'TEST_KEY' at the top of this file
        expect(callHeaders?.['X-Api-Key']).toBe('TEST_KEY');
    });
});

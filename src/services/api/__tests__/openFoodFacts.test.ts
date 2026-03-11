/**
 * Tests for src/services/api/openFoodFacts.ts
 *
 * Coverage:
 *  - serving_size parsing
 *  - getProductByBarcode – success, product missing, network error
 *  - searchProducts – success, empty products array, network error
 */

import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../utils/errors', () => ({ handleError: jest.fn() }));
jest.mock('../../../utils/logger', () => ({
    logger: { apiRequest: jest.fn(), apiResponse: jest.fn(), apiError: jest.fn() },
}));

import { getProductByBarcode, searchProducts } from '../openFoodFacts';

const MOCK_PRODUCT_RESPONSE = {
    status: 200,
    data: {
        product: {
            product_name: 'Test Chips',
            brands: 'TestBrand',
            code: '1234567890',
            serving_size: '30g',
            nutriments: {
                'energy-kcal_100g': 450,
                proteins_100g: 5,
                carbohydrates_100g: 60,
                fat_100g: 20,
                fiber_100g: 2,
                sugars_100g: 3,
            },
            image_url: 'https://example.com/chips.jpg',
        },
    },
};

describe('openFoodFacts – getProductByBarcode', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns a FoodProduct on success', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_PRODUCT_RESPONSE);

        const result = await getProductByBarcode('1234567890');

        expect(result).not.toBeNull();
        expect(result?.name).toBe('Test Chips');
        expect(result?.calories).toBe(450);
        expect(result?.barcode).toBe('1234567890');
    });

    it('calls the correct OpenFoodFacts URL', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_PRODUCT_RESPONSE);

        await getProductByBarcode('1234567890');

        expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.stringContaining('1234567890.json'),
            expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) }),
        );
    });

    it('returns null when product field is absent', async () => {
        mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} });

        const result = await getProductByBarcode('0000000000');

        expect(result).toBeNull();
    });

    it('returns null on network failure (no crash)', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

        const result = await getProductByBarcode('9999999999');

        expect(result).toBeNull();
    });

    it('parses serving_size correctly when provided', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_PRODUCT_RESPONSE);

        const result = await getProductByBarcode('1234567890');

        expect(result?.servingSize).toBe(30);
        expect(result?.servingUnit).toBe('g');
    });
});

describe('openFoodFacts – searchProducts', () => {
    const MOCK_SEARCH_RESPONSE = {
        status: 200,
        data: {
            products: [
                {
                    product_name: 'Apple',
                    brands: 'FreshFarm',
                    code: '111',
                    serving_size: null,
                    nutriments: {
                        'energy-kcal_100g': 52,
                        proteins_100g: 0.3,
                        carbohydrates_100g: 14,
                        fat_100g: 0.2,
                        fiber_100g: 2.4,
                        sugars_100g: 10,
                    },
                },
            ],
        },
    };

    beforeEach(() => jest.clearAllMocks());

    it('returns mapped FoodProduct array on success', async () => {
        mockedAxios.get.mockResolvedValueOnce(MOCK_SEARCH_RESPONSE);

        const results = await searchProducts('apple');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Apple');
        expect(results[0].calories).toBe(52);
    });

    it('returns empty array when products field is missing', async () => {
        mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} });

        const results = await searchProducts('unknown');

        expect(results).toEqual([]);
    });

    it('returns empty array on network failure (no crash)', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Timeout'));

        const results = await searchProducts('pizza');

        expect(results).toEqual([]);
    });
});

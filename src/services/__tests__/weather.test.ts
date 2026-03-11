/**
 * Tests for src/services/weather.ts
 *
 * Issues tested:
 *  - BUG: response fields accessed without optional chaining → crash on
 *    unexpected shape. Tests document current brittle behaviour AND verify
 *    the safe fallback after applying the fix.
 *  - Caching behaviour (second call within TTL must not re-fetch)
 *  - getCurrentWeather / getCurrentWeatherByCity – success & error paths
 *  - calculateWeatherAdjustment – temperature / humidity rules
 */

// Mock apiWrapper BEFORE importing weather.ts
const mockApiGet = jest.fn();
jest.mock('../apiWrapper', () => ({
    api: { get: (...args: any[]) => mockApiGet(...args) },
}));

jest.mock('../../utils/errors', () => ({ handleError: jest.fn() }));

import { getCurrentWeather, getCurrentWeatherByCity, calculateWeatherAdjustment, clearWeatherCache } from '../weather';

const GOOD_RESPONSE = {
    main: { temp: 27.3, humidity: 55, feels_like: 29.1 },
    weather: [{ description: 'sunny', icon: '01d' }],
};

describe('weather – getCurrentWeather', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearWeatherCache();
    });

    it('returns WeatherData on a successful response', async () => {
        mockApiGet.mockResolvedValueOnce(GOOD_RESPONSE);

        const result = await getCurrentWeather(30.0, 31.0);

        expect(result).not.toBeNull();
        expect(result?.temperature).toBe(27);
        expect(result?.humidity).toBe(55);
        expect(result?.description).toBe('sunny');
    });

    it('returns cached value on second call within TTL', async () => {
        mockApiGet.mockResolvedValue(GOOD_RESPONSE);

        await getCurrentWeather(30.0, 31.0);
        await getCurrentWeather(30.0, 31.0);

        // Should only have been called once due to cache
        expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    it('returns null on API network failure (no crash)', async () => {
        mockApiGet.mockRejectedValueOnce(new Error('Network error'));

        const result = await getCurrentWeather(0, 0);

        expect(result).toBeNull();
    });

    it('returns null when response shape is missing main/weather fields', async () => {
        // After applying the optional-chaining fix, this should return null gracefully
        mockApiGet.mockResolvedValueOnce({});

        const result = await getCurrentWeather(0, 0);

        // Current buggy behaviour: throws TypeError (may be caught by handleError).
        // After fix: should return null.
        expect(result).toBeNull();
    });
});

describe('weather – getCurrentWeatherByCity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearWeatherCache();
    });

    it('returns WeatherData on success', async () => {
        mockApiGet.mockResolvedValueOnce(GOOD_RESPONSE);

        const result = await getCurrentWeatherByCity('Cairo');

        expect(result?.temperature).toBe(27);
    });

    it('passes city name as query param', async () => {
        mockApiGet.mockResolvedValueOnce(GOOD_RESPONSE);

        await getCurrentWeatherByCity(' Cairo ');

        expect(mockApiGet).toHaveBeenCalledWith('/weather', expect.objectContaining({ params: { city: 'Cairo' } }));
    });

    it('returns null on failure', async () => {
        mockApiGet.mockRejectedValueOnce(new Error('timeout'));

        const result = await getCurrentWeatherByCity('Unknown');

        expect(result).toBeNull();
    });
});

describe('calculateWeatherAdjustment', () => {
    it('adds 750ml for very hot weather (>30°C)', () => {
        const adj = calculateWeatherAdjustment({ temperature: 35, humidity: 60, description: '', feelsLike: 37, icon: '' });
        expect(adj.adjustment).toBe(750);
    });

    it('adds 500ml for hot weather (25-30°C)', () => {
        const adj = calculateWeatherAdjustment({ temperature: 27, humidity: 60, description: '', feelsLike: 27, icon: '' });
        expect(adj.adjustment).toBe(500);
    });

    it('adds 0ml for normal conditions', () => {
        const adj = calculateWeatherAdjustment({ temperature: 18, humidity: 60, description: '', feelsLike: 18, icon: '' });
        expect(adj.adjustment).toBe(0);
        expect(adj.reason).toBe('Normal conditions');
    });
});

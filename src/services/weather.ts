import { handleError } from '../utils/errors';
import { api } from './apiWrapper';

export interface WeatherData {
    temperature: number; // Celsius
    humidity: number; // Percentage
    description: string;
    feelsLike: number;
    icon: string;
}

export interface WeatherAdjustment {
    adjustment: number; // ml to add
    reason: string;
}

// Cache for weather data to avoid excessive API calls
let weatherCache: {
    data: WeatherData | null;
    timestamp: number;
} = {
    data: null,
    timestamp: 0,
};

const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Get current weather by coordinates
 */
export async function getCurrentWeather(
    latitude: number,
    longitude: number
): Promise<WeatherData | null> {
    try {
        // Check cache first
        const now = Date.now();
        if (weatherCache.data && now - weatherCache.timestamp < CACHE_DURATION) {
            return weatherCache.data;
        }

        const response = await api.get<any>('/weather', {
            params: {
                lat: String(latitude),
                lon: String(longitude),
            },
            suppressErrors: true,
        });

        const data: WeatherData = {
            temperature: Math.round(response.main.temp),
            humidity: response.main.humidity,
            description: response.weather[0].description,
            feelsLike: Math.round(response.main.feels_like),
            icon: response.weather[0].icon,
        };

        // Update cache
        weatherCache = {
            data,
            timestamp: now,
        };

        return data;
    } catch (error) {
        handleError(error, 'weather.getCurrentWeather');
        return null;
    }
}

/**
 * Get current weather by city name
 */
export async function getCurrentWeatherByCity(city: string): Promise<WeatherData | null> {
    try {
        const response = await api.get<any>('/weather', {
            params: {
                city: city.trim(),
            },
            suppressErrors: true,
        });

        const data: WeatherData = {
            temperature: Math.round(response.main.temp),
            humidity: response.main.humidity,
            description: response.weather[0].description,
            feelsLike: Math.round(response.main.feels_like),
            icon: response.weather[0].icon,
        };

        // Update cache
        weatherCache = {
            data,
            timestamp: Date.now(),
        };

        return data;
    } catch (error) {
        handleError(error, 'weather.getCurrentWeatherByCity');
        return null;
    }
}

/**
 * Calculate water intake adjustment based on weather
 */
export function calculateWeatherAdjustment(weather: WeatherData): WeatherAdjustment {
    let adjustment = 0;
    let reason = '';

    const { temperature, humidity } = weather;

    // Temperature-based adjustments
    if (temperature > 30) {
        adjustment += 750;
        reason = 'Very hot weather';
    } else if (temperature > 25) {
        adjustment += 500;
        reason = 'Hot weather';
    } else if (temperature > 20) {
        adjustment += 250;
        reason = 'Warm weather';
    }

    // Humidity adjustments (low humidity increases water needs)
    if (humidity < 30 && temperature > 20) {
        adjustment += 250;
        reason += (reason ? ' and low humidity' : 'Low humidity');
    }

    return {
        adjustment,
        reason: reason || 'Normal conditions',
    };
}

/**
 * Get weather icon URL from OpenWeather
 */
export function getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Clear weather cache (useful for manual refresh)
 */
export function clearWeatherCache(): void {
    weatherCache = {
        data: null,
        timestamp: 0,
    };
}

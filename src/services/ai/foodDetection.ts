import { apiCall } from '../apiWrapper';
import { formatImageForAI } from '../../utils/image';
import { getCachedResult, setCachedResult, hashBase64 } from '../../utils/detectionCache';
import { findNutritionData } from '../api/nutrition';
import { DetectedFood, HFClassificationResult } from '../../types/food';
import { Platform } from 'react-native';

const MAX_AI_ATTEMPTS = 3;
const AI_TIMEOUT_MS = 20000;
const AI_RETRYABLE_PATTERNS = [
    /rate limit/i,
    /too many requests/i,
    /timeout/i,
    /timed out/i,
    /network/i,
    /fetch/i,
    /temporar/i,
    /unavailable/i,
    /HF_TIMEOUT/i,
    /HF_RATE_LIMIT/i,
    /HF_UPSTREAM_UNAVAILABLE/i,
];

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableAiError = (message: string): boolean => AI_RETRYABLE_PATTERNS.some((pattern) => pattern.test(message));

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unable to analyze image right now.';
};

async function detectFoodWithRetry(formattedImage: string): Promise<HFClassificationResult[]> {
    let lastError: Error = new Error('AI analysis failed');

    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
        try {
            const response = await apiCall<HFClassificationResult[]>('/analyze-food', {
                method: 'POST',
                body: {
                    image: formattedImage,
                },
                suppressErrors: true,
                timeout: AI_TIMEOUT_MS,
                retryCount: 0,
            });

            if (!Array.isArray(response) || response.length === 0) {
                throw new Error('AI service returned no predictions.');
            }

            return response;
        } catch (error) {
            const message = toErrorMessage(error);
            lastError = new Error(message);
            const retryable = isRetryableAiError(message);
            const hasMoreAttempts = attempt < MAX_AI_ATTEMPTS;

            if (!retryable || !hasMoreAttempts) {
                break;
            }

            const delayMs = Math.min(350 * Math.pow(2, attempt), 2000);
            await sleep(delayMs);
        }
    }

    throw lastError;
}

/**
 * Identifies food from a base64-encoded image using Hugging Face Vision API
 *
 * Flow:
 * 1. Check cache for previously analyzed images
 * 2. Call Hugging Face API for food classification
 * 3. Query local database for nutrition data
 * 4. Fallback to USDA API if not in database
 * 5. Use generic estimate as last resort
 * 6. Cache the result for future use
 *
 * @param base64Image - Base64-encoded image data
 * @returns DetectedFood object with nutrition data and confidence score
 */
export async function identifyFoodFromImage(base64Image: string): Promise<DetectedFood> {
    const imageHash = hashBase64(base64Image);

    // Check cache first
    const cached = await getCachedResult<DetectedFood>(imageHash);
    if (cached) {
        return { ...cached, fromCache: true } as DetectedFood;
    }

    try {
        const formattedImage = formatImageForAI(base64Image);

        if (!formattedImage) {
            throw new Error('Invalid image data');
        }

        // Use guarded retries for transient backend/upstream AI failures.
        const response = await detectFoodWithRetry(formattedImage);

        // Validate response
        const topResult = response?.[0];

        if (!topResult || topResult.score < 0.3) {
            throw new Error('Food not recognized or confidence too low');
        }

        // Get nutrition data from multiple sources
        const nutritionData = await findNutritionData(topResult.label);

        const result: DetectedFood = {
            name: topResult.label,
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs,
            fats: nutritionData.fats,
            fiber: nutritionData.fiber,
            sugar: nutritionData.sugar,
            confidence: topResult.score,
            source: nutritionData.source,
            needsUserConfirmation: nutritionData.source === 'estimate' || topResult.score < 0.5,
            servingSize: 1,
            servingUnit: 'serving',
        };

        // Cache the result
        await setCachedResult(imageHash, result);

        return result;
    } catch (error) {
        console.error('AI Food Detection Error:', error);
        // Provide clearer message for common CORS/browser cases
        if (Platform.OS === 'web') {
            throw new Error(
                'Image analysis failed because the AI endpoint blocks browser requests. Configure EXPO_PUBLIC_HF_PROXY_URL to a CORS-enabled proxy.',
            );
        }
        throw error;
    }
}

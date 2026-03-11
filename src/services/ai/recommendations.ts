import { handleError } from '../../utils/errors';
import { api } from '../apiWrapper';
import { callN8nFitnessAdviceWebhook, hasN8nFitnessAdviceWebhook } from '../api/n8n';

export type RecommendationCategory = 'nutrition' | 'meal' | 'workout' | 'habit' | 'general';

export interface AIRecommendation {
    id: string;
    title: string;
    description: string;
    category: RecommendationCategory;
    confidence?: number;
    metadata?: Record<string, unknown>;
}

export interface AIRecommendationContext {
    userId?: string;
    goal?: string;
    caloriesTarget?: number;
    [key: string]: unknown;
}

const MAX_RECOMMENDATIONS = 6;

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const trimCodeFences = (value: string): string =>
    value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

function normalizeCategory(category: unknown): RecommendationCategory {
    const normalized = String(category || 'general')
        .trim()
        .toLowerCase();
    if (normalized === 'nutrition' || normalized === 'meal' || normalized === 'workout' || normalized === 'habit') {
        return normalized;
    }
    return 'general';
}

function parseConfidence(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.min(1, value));
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.min(1, parsed));
        }
    }

    return undefined;
}

function toRecommendation(item: unknown, index: number): AIRecommendation | null {
    if (!isRecord(item)) {
        return null;
    }

    const title = String(item.title ?? item.name ?? item.heading ?? '').trim();
    const description = String(item.description ?? item.details ?? item.text ?? '').trim();
    if (!title || !description) {
        return null;
    }

    const id = String(item.id ?? `ai-rec-${Date.now()}-${index}`);

    return {
        id,
        title,
        description,
        category: normalizeCategory(item.category),
        confidence: parseConfidence(item.confidence),
        metadata: isRecord(item.metadata) ? item.metadata : undefined,
    };
}

function parseRecommendationsFromLines(text: string): AIRecommendation[] {
    return text
        .split('\n')
        .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, MAX_RECOMMENDATIONS)
        .map((line, index) => ({
            id: `advice-line-${Date.now()}-${index}`,
            title: `Recommendation ${index + 1}`,
            description: line,
            category: 'general' as const,
            confidence: 0.7,
        }));
}

function parseRecommendationsFromText(raw: string): AIRecommendation[] {
    const cleaned = trimCodeFences(raw);

    const parseCandidate = (candidate: string): AIRecommendation[] => {
        const parsed = JSON.parse(candidate);
        const rawItems = Array.isArray(parsed)
            ? parsed
            : isRecord(parsed) && Array.isArray(parsed.recommendations)
              ? parsed.recommendations
              : [];

        if (!Array.isArray(rawItems)) {
            return [];
        }

        return rawItems
            .map((item, index) => toRecommendation(item, index))
            .filter((item): item is AIRecommendation => Boolean(item));
    };

    try {
        const structuredRecommendations = parseCandidate(cleaned);
        if (structuredRecommendations.length > 0) {
            return structuredRecommendations.slice(0, MAX_RECOMMENDATIONS);
        }
    } catch {
        // Fallback to extracting JSON payload from mixed text or plain bullet text.
    }

    const jsonArrayStart = cleaned.indexOf('[');
    const jsonArrayEnd = cleaned.lastIndexOf(']');
    if (jsonArrayStart !== -1 && jsonArrayEnd !== -1 && jsonArrayEnd > jsonArrayStart) {
        try {
            const extractedArray = cleaned.slice(jsonArrayStart, jsonArrayEnd + 1);
            const structuredRecommendations = parseCandidate(extractedArray);
            if (structuredRecommendations.length > 0) {
                return structuredRecommendations.slice(0, MAX_RECOMMENDATIONS);
            }
        } catch {
            // Continue to line-based parsing.
        }
    }

    return parseRecommendationsFromLines(cleaned);
}

function buildRecommendationsPrompt(context?: AIRecommendationContext): string {
    const compactContext = context ? JSON.stringify(context) : '{}';

    return [
        'Generate practical health recommendations in strict JSON only.',
        'Return either:',
        '[{"title":"string","description":"string","category":"meal|nutrition|workout|habit|general","confidence":0.0-1.0}]',
        'or',
        '{"recommendations":[...same item shape...]}',
        'No markdown fences. Keep recommendations concise and actionable.',
        `Context: ${compactContext}`,
    ].join('\n');
}

function buildFallbackRecommendations(context?: AIRecommendationContext): AIRecommendation[] {
    const goal = String(context?.goal ?? '').toLowerCase();

    if (goal.includes('lose')) {
        return [
            {
                id: 'fallback-lose-1',
                title: 'Prioritize Protein At Meals',
                description: 'Aim for a protein source in each meal to improve satiety and preserve lean mass.',
                category: 'nutrition',
                confidence: 0.7,
            },
            {
                id: 'fallback-lose-2',
                title: 'Use A Calorie Buffer',
                description: 'Leave 150-200 kcal unplanned so social or snack choices do not exceed your target.',
                category: 'meal',
                confidence: 0.65,
            },
            {
                id: 'fallback-lose-3',
                title: 'Add Daily Steps',
                description: 'Add one brisk 20-minute walk daily to improve adherence and energy expenditure.',
                category: 'workout',
                confidence: 0.65,
            },
        ];
    }

    if (goal.includes('gain') || goal.includes('muscle')) {
        return [
            {
                id: 'fallback-gain-1',
                title: 'Distribute Protein Across Day',
                description: 'Split your daily protein into 3-5 feedings to support muscle protein synthesis.',
                category: 'nutrition',
                confidence: 0.7,
            },
            {
                id: 'fallback-gain-2',
                title: 'Pre/Post Workout Fuel',
                description: 'Pair carbs with protein around training sessions to support performance and recovery.',
                category: 'meal',
                confidence: 0.65,
            },
            {
                id: 'fallback-gain-3',
                title: 'Progressive Overload',
                description: 'Increase reps, load, or sets weekly on key lifts while keeping form quality high.',
                category: 'workout',
                confidence: 0.65,
            },
        ];
    }

    return [
        {
            id: 'fallback-general-1',
            title: 'Plan Meals In Advance',
            description: 'Pre-log meals for the next day to reduce decision fatigue and improve consistency.',
            category: 'meal',
            confidence: 0.65,
        },
        {
            id: 'fallback-general-2',
            title: 'Anchor Your Sleep',
            description: 'Keep a consistent sleep and wake window to improve appetite regulation and recovery.',
            category: 'habit',
            confidence: 0.65,
        },
        {
            id: 'fallback-general-3',
            title: 'Keep Hydration Consistent',
            description: 'Distribute water intake across the day rather than waiting until evening.',
            category: 'general',
            confidence: 0.6,
        },
    ];
}

function extractRecommendationsFromResponse(payload: unknown): AIRecommendation[] {
    if (!isRecord(payload)) {
        return [];
    }

    if (Array.isArray(payload.recommendations)) {
        return payload.recommendations
            .map((item, index) => toRecommendation(item, index))
            .filter((item): item is AIRecommendation => Boolean(item))
            .slice(0, MAX_RECOMMENDATIONS);
    }

    if (typeof payload.advice === 'string') {
        return parseRecommendationsFromText(payload.advice).slice(0, MAX_RECOMMENDATIONS);
    }

    if (typeof payload.message === 'string') {
        return parseRecommendationsFromText(payload.message).slice(0, MAX_RECOMMENDATIONS);
    }

    return [];
}

export async function getAIRecommendations(context?: AIRecommendationContext): Promise<AIRecommendation[]> {
    const prompt = buildRecommendationsPrompt(context);

    try {
        if (hasN8nFitnessAdviceWebhook()) {
            const n8nResponse = await callN8nFitnessAdviceWebhook({ query: prompt });

            const n8nRecommendations = extractRecommendationsFromResponse(n8nResponse);
            if (n8nRecommendations.length > 0) {
                return n8nRecommendations;
            }
        }

        const chatResponse = await api.post<any>(
            '/chat',
            {
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a nutrition and fitness coach. Return concise, safe recommendations as strict JSON only.',
                    },
                    { role: 'user', content: prompt },
                ],
            },
            {
                timeout: 30000,
                suppressErrors: true,
            },
        );

        const content = chatResponse?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
            const chatRecommendations = parseRecommendationsFromText(content).slice(0, MAX_RECOMMENDATIONS);
            if (chatRecommendations.length > 0) {
                return chatRecommendations;
            }
        }
    } catch (error) {
        handleError(error, 'aiRecommendations.getAIRecommendations');
    }

    return buildFallbackRecommendations(context);
}

export async function getMealRecommendations(context?: AIRecommendationContext): Promise<AIRecommendation[]> {
    const recommendations = await getAIRecommendations(context);
    const filtered = recommendations.filter(
        (recommendation) =>
            recommendation.category === 'meal' ||
            recommendation.category === 'nutrition' ||
            recommendation.category === 'general',
    );

    return filtered.length > 0 ? filtered : recommendations.slice(0, 3);
}

export async function getWorkoutRecommendations(context?: AIRecommendationContext): Promise<AIRecommendation[]> {
    const recommendations = await getAIRecommendations(context);
    const filtered = recommendations.filter(
        (recommendation) =>
            recommendation.category === 'workout' ||
            recommendation.category === 'habit' ||
            recommendation.category === 'general',
    );

    return filtered.length > 0 ? filtered : recommendations.slice(0, 3);
}

export default {
    getAIRecommendations,
    getMealRecommendations,
    getWorkoutRecommendations,
};

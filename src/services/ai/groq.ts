import { env } from '../../constants/env';
import { handleError } from '../../utils/errors';
import { api } from '../apiWrapper';
import { callN8nMealPlannerWebhook, hasN8nMealPlannerWebhook } from '../api/n8n';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ParsedMealPreferences {
    diet: string;
    calories: number;
    allergies: string[];
}

const MAX_HISTORY_PAIRS = 20;
const MAX_NON_SYSTEM_MESSAGES = MAX_HISTORY_PAIRS * 2;
const DEFAULT_MEAL_PLAN_CALORIES = 2000;

const isAiEnabled = (): boolean => {
    const flag = (env as { enableAI?: boolean } | undefined)?.enableAI;
    return typeof flag === 'boolean' ? flag : true;
};

export type AIChatErrorKind = 'offline' | 'unreachable' | 'timeout' | 'server';

export class AIChatServiceError extends Error {
    kind: AIChatErrorKind;
    constructor(kind: AIChatErrorKind, message: string) {
        super(message);
        this.kind = kind;
    }
}

const classifyChatError = (error: any): AIChatServiceError => {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('offline') || message.includes('network request failed')) {
        return new AIChatServiceError('offline', "You're offline. AI chat requires an internet connection.");
    }
    if (message.includes('timeout')) {
        return new AIChatServiceError('timeout', 'The request took too long. Check your connection and try again.');
    }
    if (message.includes('500') || message.includes('503') || message.includes('server')) {
        return new AIChatServiceError(
            'server',
            "Something went wrong on our end. We've been notified and are looking into it.",
        );
    }
    return new AIChatServiceError(
        'unreachable',
        'The AI service is temporarily unavailable. Try again in a few minutes.',
    );
};

const DIET_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /\bvegan\b/i, value: 'vegan' },
    { pattern: /\bvegetarian\b/i, value: 'vegetarian' },
    { pattern: /\bketo(genic)?\b/i, value: 'keto' },
    { pattern: /\blow[\s-]?carb\b/i, value: 'low-carb' },
    { pattern: /\bhigh[\s-]?protein\b/i, value: 'high-protein' },
    { pattern: /\bmediterranean\b/i, value: 'mediterranean' },
    { pattern: /\bpaleo\b/i, value: 'paleo' },
];

const trimCodeFences = (value: string): string =>
    value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

function sanitizeAndWindowMessages(messages: ChatMessage[]): ChatMessage[] {
    const sanitizedMessages = messages
        .filter((message) => message && message.content?.trim())
        .map((message) => ({
            role: message.role,
            content: message.content.trim(),
        }));

    if (sanitizedMessages.length === 0) {
        return [];
    }

    const systemIndex = sanitizedMessages.findIndex((message) => message.role === 'system');
    const systemMessage = systemIndex >= 0 ? sanitizedMessages[systemIndex] : null;
    const nonSystemMessages = sanitizedMessages.filter((_, index) => index !== systemIndex);
    const recentMessages = nonSystemMessages.slice(-MAX_NON_SYSTEM_MESSAGES);

    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
}

function extractJsonObject(raw: string): Record<string, any> {
    const cleaned = trimCodeFences(raw);

    const parseCandidate = (candidate: string): Record<string, any> => {
        const parsed = JSON.parse(candidate);
        if (!isRecord(parsed)) {
            throw new Error('Expected a JSON object');
        }
        return parsed;
    };

    try {
        return parseCandidate(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Unable to parse JSON object from AI response.');
        }
        return parseCandidate(cleaned.slice(start, end + 1));
    }
}

function parseAllergies(preferences: string): string[] {
    const allergyMatch = preferences.match(/allerg(?:y|ies)\s*[:-]?\s*([^\n.;]+)/i);
    if (!allergyMatch?.[1]) {
        return [];
    }

    return allergyMatch[1]
        .split(/,|\/| and /i)
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseMealPreferences(preferences: string): ParsedMealPreferences {
    const trimmedPreferences = preferences.trim();
    const caloriesMatch = trimmedPreferences.match(/\b([1-9]\d{2,3})\s*(?:kcal|calories?|cals?)?\b/i);
    const parsedCalories = caloriesMatch?.[1] ? Number.parseInt(caloriesMatch[1], 10) : DEFAULT_MEAL_PLAN_CALORIES;

    const dietMatch = DIET_PATTERNS.find(({ pattern }) => pattern.test(trimmedPreferences));

    return {
        diet: dietMatch?.value ?? 'balanced',
        calories: Number.isFinite(parsedCalories)
            ? Math.min(6000, Math.max(900, parsedCalories))
            : DEFAULT_MEAL_PLAN_CALORIES,
        allergies: parseAllergies(trimmedPreferences),
    };
}

function extractMealPlanFromWebhookResponse(payload: unknown): Record<string, any> | null {
    if (!isRecord(payload)) {
        return null;
    }

    if (isRecord(payload.meal_plan)) {
        return payload.meal_plan;
    }

    if (isRecord(payload.plan)) {
        return payload.plan;
    }

    if (Array.isArray(payload.meals) || isRecord(payload.daily_totals)) {
        return payload;
    }

    return null;
}

function buildMealPlanPrompt(preferences: string, parsed: ParsedMealPreferences): ChatMessage[] {
    const systemPrompt =
        'You are a nutrition meal-planning assistant. Return only strict JSON without markdown fences.';

    const userPrompt = [
        'Generate a 1-day meal plan using this exact JSON shape:',
        '{',
        '  "diet": "string",',
        '  "target_calories": number,',
        '  "allergies": ["string"],',
        '  "meals": [',
        '    {"name":"Breakfast","items":[{"food":"string","portion":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]},',
        '    {"name":"Lunch","items":[{"food":"string","portion":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]},',
        '    {"name":"Dinner","items":[{"food":"string","portion":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]},',
        '    {"name":"Snack","items":[{"food":"string","portion":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]}',
        '  ],',
        '  "daily_totals":{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},',
        '  "notes":["string"]',
        '}',
        '',
        `Preferences: ${preferences.trim() || 'No additional preferences provided.'}`,
        `Diet: ${parsed.diet}`,
        `Target calories: ${parsed.calories}`,
        `Allergies: ${parsed.allergies.length > 0 ? parsed.allergies.join(', ') : 'none'}`,
    ].join('\n');

    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
}

function buildFallbackMealPlan(preferences: string, parsed: ParsedMealPreferences): Record<string, any> {
    return {
        diet: parsed.diet,
        target_calories: parsed.calories,
        allergies: parsed.allergies,
        meals: [],
        daily_totals: {
            calories: parsed.calories,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
        },
        notes: [
            'Unable to generate an AI meal plan right now. Please try again.',
            preferences.trim() ? `Preferences captured: ${preferences.trim()}` : 'No preferences were provided.',
        ],
        source: 'fallback',
    };
}

export async function chatWithCoach(messages: ChatMessage[]): Promise<string> {
    if (!isAiEnabled()) {
        return 'AI coach is currently disabled in this environment.';
    }

    try {
        const sanitizedMessages = sanitizeAndWindowMessages(messages);

        if (sanitizedMessages.length === 0) {
            throw new Error('Please provide at least one message.');
        }
        // Uses shared wrapper for auth, retries, timeout handling and structured logging.
        const response = await api.post<any>(
            '/chat',
            { messages: sanitizedMessages },
            {
                timeout: 30000,
                suppressErrors: true,
            },
        );

        const content = response?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('Invalid AI response');
        }

        return content;
    } catch (error: any) {
        handleError(error, 'groqService.chatWithCoach');
        throw classifyChatError(error);
    }
}

export async function generateMealPlan(preferences: string): Promise<any> {
    const parsedPreferences = parseMealPreferences(preferences);

    if (!isAiEnabled()) {
        return buildFallbackMealPlan(preferences, parsedPreferences);
    }

    if (hasN8nMealPlannerWebhook()) {
        try {
            const webhookResponse = await callN8nMealPlannerWebhook({
                diet: parsedPreferences.diet,
                calories: parsedPreferences.calories,
                allergies: parsedPreferences.allergies,
            });

            const webhookPlan = extractMealPlanFromWebhookResponse(webhookResponse);
            if (webhookPlan) {
                return { ...webhookPlan, source: 'n8n' };
            }
        } catch (error) {
            handleError(error, 'groqService.generateMealPlan.n8n');
        }
    }

    try {
        const chatResponse = await api.post<any>(
            '/chat',
            { messages: buildMealPlanPrompt(preferences, parsedPreferences) },
            {
                timeout: 45000,
                suppressErrors: true,
            },
        );

        const content = chatResponse?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
            const parsedPlan = extractJsonObject(content);
            return { ...parsedPlan, source: 'chat' };
        }
    } catch (error) {
        handleError(error, 'groqService.generateMealPlan.chat');
    }

    return buildFallbackMealPlan(preferences, parsedPreferences);
}

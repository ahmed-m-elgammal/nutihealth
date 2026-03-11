import {
    EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL,
    EXPO_PUBLIC_N8N_MEAL_PLANNER_URL,
    EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL,
} from '../../constants/env';
import { api } from '../apiWrapper';

export interface N8nMealPlannerPayload {
    diet: string;
    calories: number;
    allergies: string[];
}

export interface N8nFitnessAdvicePayload {
    query: string;
}

export interface N8nVoiceToTextPayload {
    uri: string;
    fileName?: string;
    mimeType?: string;
}

const normalizeUrl = (value: string): string => String(value || '').trim();

const requireWebhookUrl = (value: string, name: string): string => {
    const normalized = normalizeUrl(value);
    if (!normalized) {
        throw new Error(`${name} webhook URL is not configured.`);
    }
    return normalized;
};

const parseWebhookError = (payload: unknown, fallback: string): string => {
    if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const error = record.error;
        if (typeof error === 'string' && error.trim()) return error;
        if (error && typeof error === 'object') {
            const nestedMessage = (error as Record<string, unknown>).message;
            if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage;
        }
        const message = record.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
};

export const hasN8nMealPlannerWebhook = (): boolean => normalizeUrl(EXPO_PUBLIC_N8N_MEAL_PLANNER_URL).length > 0;
export const hasN8nFitnessAdviceWebhook = (): boolean => normalizeUrl(EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL).length > 0;
export const hasN8nVoiceToTextWebhook = (): boolean => normalizeUrl(EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL).length > 0;

export async function callN8nMealPlannerWebhook(payload: N8nMealPlannerPayload): Promise<any> {
    const webhookUrl = requireWebhookUrl(EXPO_PUBLIC_N8N_MEAL_PLANNER_URL, 'N8N meal planner');
    return api.post<any>(webhookUrl, payload, {
        timeout: 45000,
        suppressErrors: true,
        retryCount: 1,
    });
}

export async function callN8nFitnessAdviceWebhook(payload: N8nFitnessAdvicePayload): Promise<any> {
    const webhookUrl = requireWebhookUrl(EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL, 'N8N fitness advice');
    return api.post<any>(webhookUrl, payload, {
        timeout: 30000,
        suppressErrors: true,
        retryCount: 1,
    });
}

export async function callN8nVoiceToTextWebhook(payload: N8nVoiceToTextPayload): Promise<any> {
    const webhookUrl = requireWebhookUrl(EXPO_PUBLIC_N8N_VOICE_TO_TEXT_URL, 'N8N voice-to-text');

    const formData = new FormData();
    formData.append('data', {
        uri: payload.uri,
        name: payload.fileName || 'audio-recording.m4a',
        type: payload.mimeType || 'audio/m4a',
    } as unknown as Blob);

    const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        headers: {
            Accept: 'application/json',
        },
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText.trim()) {
        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = { message: rawText };
        }
    }

    if (!response.ok) {
        throw new Error(
            parseWebhookError(parsed, `Voice transcription request failed with status ${response.status}.`),
        );
    }

    return parsed;
}

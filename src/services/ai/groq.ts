import axios from 'axios';
import { handleError } from '../../utils/errors';
import { API_BASE_URL } from '../../constants/api';


export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function chatWithCoach(messages: ChatMessage[]): Promise<string> {
    try {
        const sanitizedMessages = messages
            .filter((message) => message && message.content?.trim())
            .map((message) => ({
                role: message.role,
                content: message.content.trim(),
            }));

        if (sanitizedMessages.length === 0) {
            throw new Error('Please provide at least one message.');
        }

        // Call via backend proxy
        const response = await axios.post(`${API_BASE_URL}/chat`, { messages: sanitizedMessages }, {
            timeout: 30000,
        });

        const content = response?.data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('Invalid AI response');
        }

        return content;
    } catch (error: any) {
        handleError(error, 'groqService.chatWithCoach');
        // Return a safe fallback so the app doesn't crash
        if (error.response?.status === 500 || error.code === 'ERR_NETWORK') {
            return "I'm having trouble connecting to the server. Please ensure the backend is running.";
        }
        return "I'm having trouble thinking right now. Please try again.";
    }
}

export async function generateMealPlan(_preferences: string): Promise<any> {
    // Implementation for structured JSON generation would go here
    // checking for "json_mode" support or just prompting for JSON
    return null;
}

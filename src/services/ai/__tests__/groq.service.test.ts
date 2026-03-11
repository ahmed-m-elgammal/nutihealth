/**
 * Tests for src/services/ai/groq.ts
 *
 * Key concerns covered:
 *  - Uses shared apiWrapper (`api.post`) instead of axios
 *  - chatWithCoach sanitizes/window messages and handles fallback states
 *  - generateMealPlan returns structured data (not permanent null)
 */

const mockApiPost = jest.fn();

jest.mock('../../../constants/env', () => ({
    EXPO_PUBLIC_N8N_MEAL_PLANNER_URL: '',
}));

jest.mock('../../apiWrapper', () => ({
    api: {
        post: (...args: any[]) => mockApiPost(...args),
    },
}));

jest.mock('../../../utils/errors', () => ({ handleError: jest.fn() }));

import { chatWithCoach, generateMealPlan } from '../groq';

const GOOD_MESSAGES = [{ role: 'user' as const, content: 'Hello coach' }];

describe('groq – chatWithCoach', () => {
    beforeEach(() => jest.clearAllMocks());

    it('calls api.post on /chat with sanitised messages', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [{ message: { content: 'Hi there!' } }],
        });

        const result = await chatWithCoach(GOOD_MESSAGES);

        expect(mockApiPost).toHaveBeenCalledWith(
            '/chat',
            { messages: [{ role: 'user', content: 'Hello coach' }] },
            expect.objectContaining({ timeout: 30000, suppressErrors: true }),
        );
        expect(result).toBe('Hi there!');
    });

    it('caps message window to system + last 20 pairs', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [{ message: { content: 'Windowed.' } }],
        });

        const longMessages = [
            { role: 'system' as const, content: 'System instructions' },
            ...Array.from({ length: 60 }, (_, index) => ({
                role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
                content: `Message ${index + 1}`,
            })),
        ];

        await chatWithCoach(longMessages);

        const sentMessages = mockApiPost.mock.calls[0][1].messages;
        expect(sentMessages).toHaveLength(41);
        expect(sentMessages[0]).toEqual({ role: 'system', content: 'System instructions' });
    });

    it('returns connectivity fallback for network errors', async () => {
        mockApiPost.mockRejectedValueOnce(new Error('Network request failed'));

        const result = await chatWithCoach(GOOD_MESSAGES);

        expect(result).toContain('trouble connecting to the server');
    });

    it('returns connectivity fallback when error looks like 500', async () => {
        mockApiPost.mockRejectedValueOnce(new Error('API Error: 500'));

        const result = await chatWithCoach(GOOD_MESSAGES);

        expect(result).toContain('trouble connecting to the server');
    });

    it('returns fallback when the message list is empty after sanitisation', async () => {
        const result = await chatWithCoach([{ role: 'user', content: '   ' }]);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('returns fallback when AI response has no content', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [{ message: { content: '' } }],
        });

        const result = await chatWithCoach(GOOD_MESSAGES);

        expect(typeof result).toBe('string');
    });

    it('returns fallback when AI response shape is invalid', async () => {
        mockApiPost.mockResolvedValueOnce({});

        const result = await chatWithCoach(GOOD_MESSAGES);

        expect(typeof result).toBe('string');
    });
});

describe('groq – generateMealPlan', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns parsed JSON meal plan from /chat response', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            diet: 'balanced',
                            target_calories: 2100,
                            allergies: ['peanuts'],
                            meals: [{ name: 'Breakfast', items: [] }],
                            daily_totals: { calories: 2100, protein_g: 140, carbs_g: 220, fat_g: 70 },
                            notes: ['Hydrate well.'],
                        }),
                    },
                },
            ],
        });

        const result = await generateMealPlan('balanced 2100 calories allergies: peanuts');

        expect(mockApiPost).toHaveBeenCalledWith(
            '/chat',
            expect.objectContaining({ messages: expect.any(Array) }),
            expect.objectContaining({ timeout: 45000, suppressErrors: true }),
        );
        expect(result).toBeTruthy();
        expect(result.source).toBe('chat');
        expect(result.target_calories).toBe(2100);
    });

    it('returns fallback meal plan when AI responses fail', async () => {
        mockApiPost.mockRejectedValueOnce(new Error('Network request failed'));

        const result = await generateMealPlan('vegan 1800 calories');

        expect(result).toBeTruthy();
        expect(result.source).toBe('fallback');
        expect(result.target_calories).toBe(1800);
    });
});

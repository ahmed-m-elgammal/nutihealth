const mockApiPost = jest.fn();

jest.mock('../../../constants/env', () => ({
    EXPO_PUBLIC_N8N_FITNESS_ADVICE_URL: '',
}));

jest.mock('../../apiWrapper', () => ({
    api: {
        post: (...args: any[]) => mockApiPost(...args),
    },
}));

jest.mock('../../../utils/errors', () => ({ handleError: jest.fn() }));

import { getAIRecommendations, getMealRecommendations, getWorkoutRecommendations } from '../recommendations';

describe('recommendations service', () => {
    beforeEach(() => jest.clearAllMocks());

    it('parses structured recommendations from /chat response', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify([
                            {
                                title: 'Protein-first breakfast',
                                description: 'Start your day with 30g protein.',
                                category: 'meal',
                                confidence: 0.9,
                            },
                        ]),
                    },
                },
            ],
        });

        const recommendations = await getAIRecommendations({ goal: 'lose_weight' });

        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].title).toBe('Protein-first breakfast');
        expect(recommendations[0].category).toBe('meal');
    });

    it('returns fallback recommendations when API request fails', async () => {
        mockApiPost.mockRejectedValueOnce(new Error('Network request failed'));

        const recommendations = await getAIRecommendations({ goal: 'gain_muscle' });

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.some((item) => item.category === 'workout')).toBe(true);
    });

    it('filters meal recommendations to meal/nutrition/general categories', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify([
                            {
                                title: 'Meal prep',
                                description: 'Prepare lunch in advance.',
                                category: 'meal',
                            },
                            {
                                title: 'Training split',
                                description: 'Use 3-day full body plan.',
                                category: 'workout',
                            },
                        ]),
                    },
                },
            ],
        });

        const recommendations = await getMealRecommendations({});

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.every((item) => item.category !== 'workout')).toBe(true);
    });

    it('filters workout recommendations to workout/habit/general categories', async () => {
        mockApiPost.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify([
                            {
                                title: 'Progressive overload',
                                description: 'Add reps weekly.',
                                category: 'workout',
                            },
                            {
                                title: 'Hydration timing',
                                description: 'Drink regularly through the day.',
                                category: 'meal',
                            },
                        ]),
                    },
                },
            ],
        });

        const recommendations = await getWorkoutRecommendations({});

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.every((item) => item.category !== 'meal')).toBe(true);
    });
});

const mockFindUser = jest.fn();
const mockFetchSchedules = jest.fn();

jest.mock('../../../database', () => ({
    database: {
        get: (table: string) => {
            if (table === 'users') {
                return { find: (...args: any[]) => mockFindUser(...args) };
            }

            if (table === 'workout_schedules') {
                return {
                    query: () => ({
                        fetch: (...args: any[]) => mockFetchSchedules(...args),
                    }),
                };
            }

            return {};
        },
    },
}));

import { getAdjustedTargetsForDate } from '../workoutCalorieAdjuster';

describe('workoutCalorieAdjuster', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindUser.mockResolvedValue({
            calorieTarget: 2200,
            proteinTarget: 150,
            carbsTarget: 240,
            fatsTarget: 70,
        });
    });

    it('applies heavy bump when schedule intensity column is heavy', async () => {
        mockFetchSchedules.mockResolvedValueOnce([
            {
                intensity: 'heavy',
                template: { fetch: jest.fn().mockResolvedValue({ workoutType: 'mobility' }) },
            },
        ]);

        const result = await getAdjustedTargetsForDate('user-1', new Date('2026-03-04T10:00:00Z'));

        expect(result.workoutIntensity).toBe('heavy');
        expect(result.adjustedCalories).toBe(2500);
        expect(result.adjustedProtein).toBe(170);
        expect(result.adjustedCarbs).toBe(280);
    });

    it('falls back to template workoutType when intensity column is missing', async () => {
        mockFetchSchedules.mockResolvedValueOnce([
            {
                intensity: undefined,
                template: { fetch: jest.fn().mockResolvedValue({ workoutType: 'cardio' }) },
            },
        ]);

        const result = await getAdjustedTargetsForDate('user-1', new Date('2026-03-04T10:00:00Z'));

        expect(result.workoutIntensity).toBe('moderate');
        expect(result.adjustedCalories).toBe(2350);
        expect(result.adjustedProtein).toBe(160);
        expect(result.adjustedCarbs).toBe(260);
    });

    it('returns base targets when no workout schedule exists for day', async () => {
        mockFetchSchedules.mockResolvedValueOnce([]);

        const result = await getAdjustedTargetsForDate('user-1', new Date('2026-03-04T10:00:00Z'));

        expect(result.workoutIntensity).toBe('none');
        expect(result.adjustedCalories).toBe(2200);
        expect(result.adjustedProtein).toBe(150);
        expect(result.adjustedCarbs).toBe(240);
        expect(result.adjustedFats).toBe(70);
    });
});

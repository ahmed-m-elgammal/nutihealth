import {
    ACTIVITY_MULTIPLIERS,
    calculateDailyHydration,
    calculateTDEE,
    calculateWeeklyWeightChange,
    calculateWorkoutWaterAdjustment,
    getActivityWaterBonus,
} from '../index';
import {
    calculateBaseWaterTarget,
    calculateExerciseWaterRange,
    calculateWeatherWaterAdjustment,
} from '../water';

describe('nutrition wrappers', () => {
    test('re-exports base water target from water module', () => {
        expect(calculateBaseWaterTarget(80)).toBe(2640);
    });

    test('re-exports exercise water range helpers from water module', () => {
        expect(calculateExerciseWaterRange(1.5)).toEqual({
            minMl: 750,
            maxMl: 1500,
            recommendedMl: 1125,
        });
    });

    test('re-exports weather and workout hydration adjustments', () => {
        expect(calculateWeatherWaterAdjustment(30, 70)).toBe(200);
        expect(calculateWorkoutWaterAdjustment(90, 'recommended')).toBe(1125);
    });

    test('re-exports activity multipliers and TDEE calculations through index', () => {
        expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55);
        expect(calculateTDEE(1800, 'moderate')).toBe(2790);
    });

    test('re-exports hydration and weekly progress helpers through index', () => {
        expect(getActivityWaterBonus('very_active')).toBe(750);

        const hydration = calculateDailyHydration(70, 'light', 1);
        expect(hydration.totalHydrationMl).toBe(3310);

        expect(calculateWeeklyWeightChange(79, 80, 2)).toBe(-0.5);
    });
});

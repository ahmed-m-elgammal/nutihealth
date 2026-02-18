export const GOAL_MULTIPLIERS = {
    lose: {
        obese: 0.75,
        lean: 0.88,
        standard: 0.8,
    },
    gain: 1.12,
    maintain: 1.0,
} as const;

export type Goal = keyof typeof GOAL_MULTIPLIERS;

export {
    calculateCalorieTarget,
    calculateDynamicCalorieTarget,
    type CalorieTargetContext,
    type DynamicCalorieContext,
} from './clinical';

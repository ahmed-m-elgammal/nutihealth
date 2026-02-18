import { Goal } from './goals';
import { calculateMacros as calculateClinicalMacros, type MacroContext, type MacroTargets } from './clinical';

// Legacy fallback ratios used when profile details are unavailable.
export const MACRO_RATIOS = {
    lose: { protein: 0.35, carbs: 0.35, fats: 0.3 },
    maintain: { protein: 0.3, carbs: 0.4, fats: 0.3 },
    gain: { protein: 0.3, carbs: 0.45, fats: 0.25 },
} as const;

export function calculateMacros(
    calorieTarget: number,
    goal: Goal,
    context: MacroContext = {}
): MacroTargets {
    return calculateClinicalMacros(calorieTarget, goal, context);
}

export type { MacroContext, MacroTargets };

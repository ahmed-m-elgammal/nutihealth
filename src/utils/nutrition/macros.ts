import { Goal } from './goals';
import {
    calculateMacros as calculateClinicalMacros,
    MACRO_RATIOS,
    type MacroContext,
    type MacroTargets,
} from './clinical';

export function calculateMacros(
    calorieTarget: number,
    goal: Goal,
    context: MacroContext = {}
): MacroTargets {
    return calculateClinicalMacros(calorieTarget, goal, context);
}

export { MACRO_RATIOS };
export type { MacroContext, MacroTargets };

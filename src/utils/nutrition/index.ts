export * from '../calculations/bmr';
export * from '../calculations/tdee';
export * from './goals';
export * from '../calculations/macros';
export * from './water';
export {
    analyzeWeeklyProgress,
    calculateFatMass,
    calculateLeanBodyMass,
    calculateNutritionTargets,
    calculateRefeedProtocol,
    calculateWeeklyWeightChange,
    recalculateAdaptiveTDEE,
    verifyMacroPercentages,
    type NutritionTargetInput,
    type NutritionTargetResult,
    type ProgressStatus,
    type RefeedProtocolResult,
    type WeeklyProgressResult,
} from './clinical';

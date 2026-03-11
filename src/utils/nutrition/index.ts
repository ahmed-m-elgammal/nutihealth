export * from './bmr';
export * from './tdee';
export * from './goals';
export * from './macros';
export * from './water';
export {
    analyzeWeeklyProgress,
    calculateBMI,
    calculateFatMass,
    calculateLeanBodyMass,
    calculateNutritionTargets,
    calculateRefeedProtocol,
    calculateWeeklyWeightChange,
    getBMICategory,
    recalculateAdaptiveTDEE,
    verifyMacroPercentages,
    type NutritionTargetInput,
    type NutritionTargetResult,
    type ProgressStatus,
    type RefeedProtocolResult,
    type WeeklyProgressResult,
} from './clinical';

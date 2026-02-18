export type BiologicalSex = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
export type ProgressStatus = 'Faster Than Expected' | 'Stalled' | 'Slower Than Expected' | 'On Track';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    athlete: 1.9,
} as const;

const PEDIATRIC_PA_COEFFICIENTS: Record<'male' | 'female', Record<ActivityLevel, number>> = {
    male: {
        sedentary: 1.0,
        light: 1.13,
        moderate: 1.26,
        very_active: 1.42,
        athlete: 1.42,
    },
    female: {
        sedentary: 1.0,
        light: 1.16,
        moderate: 1.31,
        very_active: 1.56,
        athlete: 1.56,
    },
};

const HYDRATION_ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 250,
    moderate: 500,
    very_active: 750,
    athlete: 1000,
} as const;

const LEGACY_MACRO_RATIOS: Record<Goal, { protein: number; carbs: number; fats: number }> = {
    lose: { protein: 0.35, carbs: 0.35, fats: 0.3 },
    maintain: { protein: 0.3, carbs: 0.4, fats: 0.3 },
    gain: { protein: 0.3, carbs: 0.45, fats: 0.25 },
} as const;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function normalizeBodyFat(bodyFatPercentage?: number | null): number | undefined {
    if (typeof bodyFatPercentage !== 'number' || !Number.isFinite(bodyFatPercentage)) {
        return undefined;
    }
    return clamp(bodyFatPercentage, 1, 70);
}

function isFemale(sex: BiologicalSex): boolean {
    return sex === 'female';
}

function getSexThreshold(
    sex: BiologicalSex,
    maleValue: number,
    femaleValue: number
): number {
    if (sex === 'male') return maleValue;
    if (sex === 'female') return femaleValue;
    return (maleValue + femaleValue) / 2;
}

function calculateRawBMI(weightKg: number, heightCm: number): number {
    const heightMeters = heightCm / 100;
    if (heightMeters <= 0) {
        return 0;
    }
    return weightKg / (heightMeters * heightMeters);
}

function average(a: number, b: number): number {
    return (a + b) / 2;
}

function toPediatricSex(sex: BiologicalSex): 'male' | 'female' {
    return sex === 'female' ? 'female' : 'male';
}

export interface BMRContext {
    activityLevel?: ActivityLevel;
    bodyFatPercentage?: number | null;
    usePediatricEquation?: boolean;
}

export interface TDEEContext {
    sex?: BiologicalSex;
    bodyFatPercentage?: number | null;
    isAthlete?: boolean;
    week1WeightKg?: number | null;
    currentWeightKg?: number | null;
    compliancePercentage?: number | null;
    isPediatricEER?: boolean;
}

export interface CalorieTargetContext {
    age?: number;
    sex?: BiologicalSex;
    weightKg?: number;
    bmi?: number;
    bodyFatPercentage?: number | null;
    onHormonalContraception?: boolean;
}

export interface MacroContext {
    age?: number;
    sex?: BiologicalSex;
    weightKg?: number;
    heightCm?: number;
    bodyFatPercentage?: number | null;
    isAthlete?: boolean;
    hasPCOS?: boolean;
    hasInsulinResistance?: boolean;
    isPostMenopause?: boolean;
}

export interface MacroTargets {
    protein: number;
    carbs: number;
    fats: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    totalPercent: number;
}

export interface HydrationTarget {
    baseHydrationMl: number;
    activityBonusMl: number;
    exerciseAdditionMinMl: number;
    exerciseAdditionMaxMl: number;
    exerciseAdditionRecommendedMl: number;
    totalHydrationMl: number;
}

export interface NutritionTargetInput {
    age: number;
    sex: BiologicalSex;
    heightCm: number;
    weightKg: number;
    goal: Goal;
    activityLevel: ActivityLevel;
    bodyFatPercentage?: number | null;
    isAthlete?: boolean;
    hasPCOS?: boolean;
    hasInsulinResistance?: boolean;
    onHormonalContraception?: boolean;
    isPostMenopause?: boolean;
    week1WeightKg?: number | null;
    currentWeightKg?: number | null;
    compliancePercentage?: number | null;
    intenseExerciseHours?: number;
}

export interface NutritionTargetResult {
    bmi: number;
    bmr: number;
    tdee: number;
    calorieTarget: number;
    macros: MacroTargets;
    hydration: HydrationTarget;
}

export interface WeeklyProgressResult {
    status: ProgressStatus;
    adjustmentPercent: number;
    weeklyChangeKg: number;
}

export interface RefeedProtocolResult {
    frequencyDays: number;
    refeedCalories: number;
    additionalCarbsRangeG: {
        min: number;
        max: number;
    };
}

function calculateAdultMifflin(weightKg: number, heightCm: number, ageYears: number, sex: BiologicalSex): number {
    const maleEquation = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    const femaleEquation = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;

    if (sex === 'male') return maleEquation;
    if (sex === 'female') return femaleEquation;
    return average(maleEquation, femaleEquation);
}

function calculateSeniorAdjustedBMR(bmr: number, ageYears: number): number {
    if (ageYears < 60) {
        return bmr;
    }
    const decadesOver60 = (ageYears - 60) / 10;
    const adjustmentFactor = Math.max(0, 1 - 0.03 * decadesOver60);
    return bmr * adjustmentFactor;
}

function calculatePediatricEER(
    ageYears: number,
    weightKg: number,
    heightCm: number,
    sex: BiologicalSex,
    activityLevel: ActivityLevel
): number {
    const pediatricSex = toPediatricSex(sex);
    const pa = PEDIATRIC_PA_COEFFICIENTS[pediatricSex][activityLevel];
    const heightM = heightCm / 100;

    if (pediatricSex === 'male') {
        return 88.5 - 61.9 * ageYears + pa * (26.7 * weightKg + 903 * heightM);
    }

    return 135.3 - 30.8 * ageYears + pa * (10.0 * weightKg + 934 * heightM);
}

export function calculateIdealBodyWeight(weightHeightCm: number, sex: BiologicalSex): number {
    const inchesOver5ft = weightHeightCm / 2.54 - 60;
    const maleIbw = 50 + 2.3 * inchesOver5ft;
    const femaleIbw = 45.5 + 2.3 * inchesOver5ft;

    if (sex === 'male') return maleIbw;
    if (sex === 'female') return femaleIbw;
    return average(maleIbw, femaleIbw);
}

export function calculateAdjustedBodyWeight(
    currentWeightKg: number,
    heightCm: number,
    sex: BiologicalSex
): number {
    const ibw = calculateIdealBodyWeight(heightCm, sex);
    return ibw + 0.4 * (currentWeightKg - ibw);
}

export function calculateBMR(
    weightKg: number,
    heightCm: number,
    ageYears: number,
    sex: BiologicalSex,
    context: BMRContext = {}
): number {
    const usePediatricEquation = context.usePediatricEquation ?? (ageYears >= 6 && ageYears <= 17);

    if (usePediatricEquation) {
        const activityLevel = context.activityLevel ?? 'moderate';
        return calculatePediatricEER(ageYears, weightKg, heightCm, sex, activityLevel);
    }

    const bmi = calculateRawBMI(weightKg, heightCm);
    const weightForEquation = bmi >= 30 ? calculateAdjustedBodyWeight(weightKg, heightCm, sex) : weightKg;
    const adultBmr = calculateAdultMifflin(weightForEquation, heightCm, ageYears, sex);

    return calculateSeniorAdjustedBMR(adultBmr, ageYears);
}

function shouldApplyAthleteAdjustment(
    sex: BiologicalSex,
    bodyFatPercentage?: number | null,
    isAthlete?: boolean
): boolean {
    const bodyFat = normalizeBodyFat(bodyFatPercentage);
    if (!isAthlete || bodyFat === undefined) {
        return false;
    }
    return bodyFat < getSexThreshold(sex, 13, 20);
}

function shouldApplyVeryLeanAdjustment(sex: BiologicalSex, bodyFatPercentage?: number | null): boolean {
    const bodyFat = normalizeBodyFat(bodyFatPercentage);
    if (bodyFat === undefined) {
        return false;
    }
    return bodyFat < getSexThreshold(sex, 5, 13);
}

function shouldApplyMetabolicAdaptation(
    week1WeightKg?: number | null,
    currentWeightKg?: number | null,
    compliancePercentage?: number | null
): boolean {
    if (
        typeof week1WeightKg !== 'number' ||
        !Number.isFinite(week1WeightKg) ||
        week1WeightKg <= 0 ||
        typeof currentWeightKg !== 'number' ||
        !Number.isFinite(currentWeightKg) ||
        typeof compliancePercentage !== 'number' ||
        !Number.isFinite(compliancePercentage)
    ) {
        return false;
    }

    const weightChangePercentage = (Math.abs(currentWeightKg - week1WeightKg) / week1WeightKg) * 100;
    return weightChangePercentage < 0.25 && compliancePercentage > 85;
}

export function calculateTDEE(
    bmr: number,
    activityLevel: ActivityLevel,
    context: TDEEContext = {}
): number {
    const isPediatricEER = context.isPediatricEER ?? false;
    let tdee = isPediatricEER ? bmr : bmr * ACTIVITY_MULTIPLIERS[activityLevel];

    if (shouldApplyAthleteAdjustment(context.sex ?? 'other', context.bodyFatPercentage, context.isAthlete)) {
        tdee *= 1.075;
    }

    if (shouldApplyVeryLeanAdjustment(context.sex ?? 'other', context.bodyFatPercentage)) {
        tdee += 125;
    }

    if (
        shouldApplyMetabolicAdaptation(
            context.week1WeightKg,
            context.currentWeightKg,
            context.compliancePercentage
        )
    ) {
        tdee *= 0.925;
    }

    return Math.round(tdee);
}

function getAbsoluteCalorieMinimum(sex: BiologicalSex, age: number): number {
    if (sex === 'female') {
        return age >= 65 ? 1300 : 1200;
    }
    if (sex === 'male') {
        return age >= 65 ? 1600 : 1500;
    }
    return age >= 65 ? 1500 : 1400;
}

export function calculateCalorieTarget(
    tdee: number,
    goal: Goal,
    context: CalorieTargetContext = {}
): number {
    const sex = context.sex ?? 'other';
    const age = context.age ?? 30;
    const bmi = context.bmi ?? 0;
    const bodyFat = normalizeBodyFat(context.bodyFatPercentage);

    let goalCalories = tdee;

    if (goal === 'lose') {
        if (bmi >= 30) {
            goalCalories = tdee * 0.75;
        } else if (bodyFat !== undefined && bodyFat < getSexThreshold(sex, 13, 20)) {
            goalCalories = tdee * 0.88;
        } else {
            goalCalories = tdee * 0.8;
        }
    } else if (goal === 'gain') {
        goalCalories = tdee * 1.12;
    }

    const maxDeficitFloor = tdee * 0.6;
    const absoluteMinimum = getAbsoluteCalorieMinimum(sex, age);

    let finalCalories = Math.max(goalCalories, maxDeficitFloor, absoluteMinimum);

    if (isFemale(sex) && !context.onHormonalContraception && typeof context.weightKg === 'number') {
        const hormonalMinimum = context.weightKg * 26;
        finalCalories = Math.max(finalCalories, hormonalMinimum);
    }

    return Math.round(finalCalories);
}

function calculateLegacyMacros(
    calorieTarget: number,
    goal: Goal
): MacroTargets {
    const ratios = LEGACY_MACRO_RATIOS[goal];
    const protein = Math.round((calorieTarget * ratios.protein) / 4);
    const carbs = Math.round((calorieTarget * ratios.carbs) / 4);
    const fats = Math.round((calorieTarget * ratios.fats) / 9);

    return verifyMacroPercentages(protein, carbs, fats, calorieTarget);
}

function calculateProteinPerKg(goal: Goal, context: MacroContext): number {
    const sex = context.sex ?? 'other';
    const bodyFat = normalizeBodyFat(context.bodyFatPercentage);
    let proteinPerKg = 1.6;

    if (goal === 'lose') {
        proteinPerKg = 2.0;
        if (bodyFat !== undefined && bodyFat < getSexThreshold(sex, 13, 20)) {
            proteinPerKg = 2.4;
        }
    } else if (goal === 'gain') {
        proteinPerKg = context.isAthlete ? 2.0 : 1.8;
    }

    const age = context.age ?? 30;
    if (age >= 65) {
        proteinPerKg += 0.3;
    } else if (age >= 13 && age <= 17) {
        proteinPerKg = Math.max(proteinPerKg, 1.5);
    }

    if (context.hasPCOS || context.hasInsulinResistance) {
        proteinPerKg = Math.max(proteinPerKg, 2.0);
    }

    return proteinPerKg;
}

function calculateFatPerKg(context: MacroContext): number {
    const sex = context.sex ?? 'other';
    const age = context.age ?? 30;
    const bodyFat = normalizeBodyFat(context.bodyFatPercentage);

    let fatPerKg = sex === 'male' ? 0.8 : sex === 'female' ? 1.0 : 0.9;

    if (sex === 'female') {
        if (context.isPostMenopause || age >= 50) {
            fatPerKg = 1.1;
        }
        if (bodyFat !== undefined && bodyFat < 20) {
            fatPerKg = 1.2;
        }
        if (context.hasPCOS) {
            fatPerKg = 0.9;
        }
    }

    return fatPerKg;
}

export function calculateMacros(
    calorieTarget: number,
    goal: Goal,
    context: MacroContext = {}
): MacroTargets {
    if (
        typeof context.weightKg !== 'number' ||
        !Number.isFinite(context.weightKg) ||
        typeof context.age !== 'number' ||
        !Number.isFinite(context.age) ||
        context.sex === undefined
    ) {
        return calculateLegacyMacros(calorieTarget, goal);
    }

    const isPcosMode = Boolean(context.hasPCOS || context.hasInsulinResistance);
    const bmi = typeof context.heightCm === 'number'
        ? calculateRawBMI(context.weightKg, context.heightCm)
        : 0;
    const bodyFat = normalizeBodyFat(context.bodyFatPercentage);
    const effectiveWeight =
        bmi >= 30 && bodyFat !== undefined
            ? context.weightKg * (1 - bodyFat / 100)
            : context.weightKg;

    const proteinPerKg = calculateProteinPerKg(goal, context);
    const rawProtein = proteinPerKg * effectiveWeight;
    const minProtein = (calorieTarget * 0.10) / 4;
    const maxProtein = (calorieTarget * 0.35) / 4;
    const protein = clamp(rawProtein, minProtein, maxProtein);

    const fatPerKg = calculateFatPerKg(context);
    const rawFat = fatPerKg * context.weightKg;
    let minFat = (calorieTarget * 0.20) / 9;
    const maxFat = (calorieTarget * 0.35) / 9;

    if (context.sex === 'female') {
        minFat = Math.max(minFat, context.weightKg * 0.8);
    }

    let fat = clamp(rawFat, minFat, maxFat);
    let carbs = Math.max((calorieTarget - protein * 4 - fat * 9) / 4, 0);

    if (isPcosMode) {
        const maxCarbsPcos = (calorieTarget * 0.40) / 4;
        if (carbs > maxCarbsPcos) {
            const excessCalories = (carbs - maxCarbsPcos) * 4;
            carbs = maxCarbsPcos;
            fat += excessCalories / 9;
        }
    }

    const minCarbs = (calorieTarget * (isPcosMode ? 0.30 : 0.45)) / 4;
    const maxCarbs = (calorieTarget * (isPcosMode ? 0.40 : 0.65)) / 4;

    carbs = clamp(carbs, minCarbs, maxCarbs);
    fat = clamp((calorieTarget - protein * 4 - carbs * 4) / 9, minFat, maxFat);
    carbs = clamp((calorieTarget - protein * 4 - fat * 9) / 4, minCarbs, maxCarbs);

    const roundedProtein = Math.max(0, Math.round(protein));
    const roundedCarbs = Math.max(0, Math.round(carbs));
    const roundedFat = Math.max(0, Math.round(fat));

    return verifyMacroPercentages(roundedProtein, roundedCarbs, roundedFat, calorieTarget);
}

export function verifyMacroPercentages(
    proteinGrams: number,
    carbGrams: number,
    fatGrams: number,
    totalCalories: number
): MacroTargets {
    const proteinPercent = (proteinGrams * 4 / totalCalories) * 100;
    const carbsPercent = (carbGrams * 4 / totalCalories) * 100;
    const fatsPercent = (fatGrams * 9 / totalCalories) * 100;
    const totalPercent = proteinPercent + carbsPercent + fatsPercent;

    return {
        protein: proteinGrams,
        carbs: carbGrams,
        fats: fatGrams,
        proteinPercent,
        carbsPercent,
        fatsPercent,
        totalPercent,
    };
}

export function calculateBMI(weightKg: number, heightCm: number): number {
    return parseFloat(calculateRawBMI(weightKg, heightCm).toFixed(1));
}

export function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    if (bmi < 35) return 'Obese Class I';
    if (bmi < 40) return 'Obese Class II';
    return 'Obese Class III';
}

export function calculateLeanBodyMass(weightKg: number, bodyFatPercentage: number): number {
    return weightKg * (1 - clamp(bodyFatPercentage, 0, 100) / 100);
}

export function calculateFatMass(weightKg: number, bodyFatPercentage: number): number {
    return weightKg - calculateLeanBodyMass(weightKg, bodyFatPercentage);
}

export function calculateWeeklyWeightChange(
    currentWeightKg: number,
    previousWeightKg: number,
    weeksElapsed: number
): number {
    if (weeksElapsed <= 0) {
        return 0;
    }
    return (currentWeightKg - previousWeightKg) / weeksElapsed;
}

export function analyzeWeeklyProgress(
    goal: Goal,
    currentWeightKg: number,
    previousWeightKg: number,
    weeksElapsed: number
): WeeklyProgressResult {
    const weeklyChangeKg = calculateWeeklyWeightChange(currentWeightKg, previousWeightKg, weeksElapsed);

    if (goal === 'lose') {
        if (weeklyChangeKg < -1.0) {
            return { status: 'Faster Than Expected', adjustmentPercent: 5, weeklyChangeKg };
        }
        if (weeklyChangeKg > -0.1) {
            return { status: 'Stalled', adjustmentPercent: -5, weeklyChangeKg };
        }
        if (weeklyChangeKg <= -0.1 && weeklyChangeKg > -0.25) {
            return { status: 'Slower Than Expected', adjustmentPercent: -3, weeklyChangeKg };
        }
        return { status: 'On Track', adjustmentPercent: 0, weeklyChangeKg };
    }

    if (goal === 'gain') {
        if (weeklyChangeKg > 0.5) {
            return { status: 'Faster Than Expected', adjustmentPercent: -5, weeklyChangeKg };
        }
        if (weeklyChangeKg < 0.1) {
            return { status: 'Stalled', adjustmentPercent: 5, weeklyChangeKg };
        }
        if (weeklyChangeKg >= 0.1 && weeklyChangeKg < 0.25) {
            return { status: 'Slower Than Expected', adjustmentPercent: 3, weeklyChangeKg };
        }
        return { status: 'On Track', adjustmentPercent: 0, weeklyChangeKg };
    }

    return { status: 'On Track', adjustmentPercent: 0, weeklyChangeKg };
}

export function recalculateAdaptiveTDEE(previousTdee: number, adjustmentPercent: number): number {
    return Math.round(previousTdee * (1 + adjustmentPercent / 100));
}

export function calculateRefeedProtocol(
    sex: BiologicalSex,
    bodyFatPercentage: number | undefined,
    bmi: number,
    tdee: number
): RefeedProtocolResult {
    const leanThreshold = getSexThreshold(sex, 13, 20);
    const hasBodyFat = typeof bodyFatPercentage === 'number' && Number.isFinite(bodyFatPercentage);
    let frequencyDays = 12;

    if (hasBodyFat && (bodyFatPercentage as number) < leanThreshold) {
        frequencyDays = 7;
    } else if (bmi >= 30) {
        frequencyDays = 14;
    }

    return {
        frequencyDays,
        refeedCalories: Math.round(tdee),
        additionalCarbsRangeG: { min: 50, max: 100 },
    };
}

export function calculateBaseWaterTarget(weightKg: number): number {
    return Math.round(weightKg * 33);
}

export function getActivityWaterBonus(activityLevel: ActivityLevel): number {
    return HYDRATION_ACTIVITY_BONUS_ML[activityLevel];
}

export function calculateExerciseWaterRange(intenseExerciseHours: number): {
    minMl: number;
    maxMl: number;
    recommendedMl: number;
} {
    const safeHours = Math.max(0, intenseExerciseHours);
    return {
        minMl: Math.round(safeHours * 500),
        maxMl: Math.round(safeHours * 1000),
        recommendedMl: Math.round(safeHours * 750),
    };
}

export function calculateWorkoutWaterAdjustment(
    workoutDurationMinutes: number,
    mode: 'minimum' | 'recommended' | 'maximum' = 'recommended'
): number {
    const hours = Math.max(0, workoutDurationMinutes / 60);
    const range = calculateExerciseWaterRange(hours);
    if (mode === 'minimum') return range.minMl;
    if (mode === 'maximum') return range.maxMl;
    return range.recommendedMl;
}

export function calculateWeatherWaterAdjustment(tempCelsius: number, humidity = 60): number {
    let adjustment = 0;

    if (tempCelsius > 25) {
        adjustment += (tempCelsius - 25) * 20;
    }

    if (humidity > 60) {
        adjustment += (humidity - 60) * 10;
    }

    return Math.round(adjustment);
}

export function calculateDailyHydration(
    weightKg: number,
    activityLevel: ActivityLevel,
    intenseExerciseHours = 0
): HydrationTarget {
    const baseHydrationMl = calculateBaseWaterTarget(weightKg);
    const activityBonusMl = getActivityWaterBonus(activityLevel);
    const exerciseRange = calculateExerciseWaterRange(intenseExerciseHours);
    const totalHydrationMl = baseHydrationMl + activityBonusMl + exerciseRange.recommendedMl;

    return {
        baseHydrationMl,
        activityBonusMl,
        exerciseAdditionMinMl: exerciseRange.minMl,
        exerciseAdditionMaxMl: exerciseRange.maxMl,
        exerciseAdditionRecommendedMl: exerciseRange.recommendedMl,
        totalHydrationMl: Math.round(totalHydrationMl),
    };
}

export function calculateNutritionTargets(input: NutritionTargetInput): NutritionTargetResult {
    const bmi = calculateBMI(input.weightKg, input.heightCm);
    const isPediatric = input.age >= 6 && input.age <= 17;

    const bmr = calculateBMR(
        input.weightKg,
        input.heightCm,
        input.age,
        input.sex,
        {
            activityLevel: input.activityLevel,
            bodyFatPercentage: input.bodyFatPercentage,
            usePediatricEquation: isPediatric,
        }
    );

    const tdee = calculateTDEE(
        bmr,
        input.activityLevel,
        {
            sex: input.sex,
            bodyFatPercentage: input.bodyFatPercentage,
            isAthlete: input.isAthlete,
            week1WeightKg: input.week1WeightKg,
            currentWeightKg: input.currentWeightKg,
            compliancePercentage: input.compliancePercentage,
            isPediatricEER: isPediatric,
        }
    );

    const calorieTarget = calculateCalorieTarget(
        tdee,
        input.goal,
        {
            age: input.age,
            sex: input.sex,
            weightKg: input.weightKg,
            bmi,
            bodyFatPercentage: input.bodyFatPercentage,
            onHormonalContraception: input.onHormonalContraception,
        }
    );

    const macros = calculateMacros(
        calorieTarget,
        input.goal,
        {
            age: input.age,
            sex: input.sex,
            weightKg: input.weightKg,
            heightCm: input.heightCm,
            bodyFatPercentage: input.bodyFatPercentage,
            isAthlete: input.isAthlete,
            hasPCOS: input.hasPCOS,
            hasInsulinResistance: input.hasInsulinResistance,
            isPostMenopause: input.isPostMenopause,
        }
    );

    const hydration = calculateDailyHydration(
        input.weightKg,
        input.activityLevel,
        input.intenseExerciseHours ?? 0
    );

    return {
        bmi,
        bmr: Math.round(bmr),
        tdee,
        calorieTarget,
        macros,
        hydration,
    };
}

export interface DynamicCalorieContext {
    age?: number;
    sex?: BiologicalSex;
    weightKg?: number;
    bmi?: number;
    bodyFatPercentage?: number;
    onHormonalContraception?: boolean;
}

export function calculateDynamicCalorieTarget(
    currentWeightKg: number,
    targetWeightKg: number,
    weeksToGoal: number,
    tdee: number,
    context: DynamicCalorieContext = {}
): { targetCalories: number; warning?: string; dailyAdjustment: number } {
    const safeWeeks = Math.max(1, weeksToGoal);
    const totalCalorieDiff = (targetWeightKg - currentWeightKg) * 7700;
    const dailyAdjustment = Math.round(totalCalorieDiff / (safeWeeks * 7));

    const inferredGoal: Goal =
        targetWeightKg < currentWeightKg ? 'lose' :
            targetWeightKg > currentWeightKg ? 'gain' : 'maintain';

    const adjustedTdee = tdee + dailyAdjustment;
    let targetCalories = calculateCalorieTarget(adjustedTdee, inferredGoal, context);
    let warning: string | undefined;

    if (targetWeightKg < currentWeightKg && dailyAdjustment < -1000) {
        warning = `Planned deficit (${Math.abs(dailyAdjustment)} kcal/day) is aggressive.`;
    }

    if (targetWeightKg > currentWeightKg && dailyAdjustment > 1000) {
        warning = `Planned surplus (${dailyAdjustment} kcal/day) is aggressive.`;
    }

    if (targetCalories < 1200) {
        targetCalories = 1200;
        warning = warning
            ? `${warning} Target calories were raised to a safe minimum.`
            : 'Target calories were raised to a safe minimum.';
    }

    return {
        targetCalories,
        warning,
        dailyAdjustment,
    };
}

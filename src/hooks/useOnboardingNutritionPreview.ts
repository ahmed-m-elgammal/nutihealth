import { useMemo } from 'react';
import type { UserData } from '../store/userStore';
import { calculateNutritionTargets, type ActivityLevel, type Goal } from '../utils/calculations';
import { DEFAULT_PROFILE_VALUES } from '../utils/profileCompletion';
import {
    withOnboardingPreferenceDefaults,
    type OnboardingPreferences,
} from '../constants/onboarding';

interface OnboardingNutritionPreviewOverrides {
    goal?: Goal;
    activityLevel?: ActivityLevel;
    preferences?: Partial<OnboardingPreferences>;
    currentWeightKg?: number;
}

export function useOnboardingNutritionPreview(
    data: Partial<UserData>,
    overrides: OnboardingNutritionPreviewOverrides = {},
) {
    const previewAge = data.age || DEFAULT_PROFILE_VALUES.age;
    const previewSex = data.gender || DEFAULT_PROFILE_VALUES.gender;
    const previewHeight = data.height || DEFAULT_PROFILE_VALUES.height;
    const previewWeight = data.weight || DEFAULT_PROFILE_VALUES.weight;
    const previewGoal = overrides.goal || (data.goal as Goal) || DEFAULT_PROFILE_VALUES.goal;
    const previewActivity =
        overrides.activityLevel ||
        (data.activityLevel as ActivityLevel) ||
        DEFAULT_PROFILE_VALUES.activityLevel;

    const preferences = useMemo(
        () =>
            withOnboardingPreferenceDefaults({
                ...(data.preferences || {}),
                ...(overrides.preferences || {}),
            }),
        [data.preferences, overrides.preferences],
    );

    const preview = useMemo(
        () =>
            calculateNutritionTargets({
                age: previewAge,
                sex: previewSex,
                heightCm: previewHeight,
                weightKg: previewWeight,
                goal: previewGoal,
                activityLevel: previewActivity,
                bodyFatPercentage: preferences.bodyFatPercentage,
                isAthlete: preferences.isAthlete,
                hasPCOS: preferences.hasPCOS,
                hasInsulinResistance: preferences.hasInsulinResistance,
                onHormonalContraception: preferences.onHormonalContraception,
                isPostMenopause: preferences.isPostMenopause,
                week1WeightKg: preferences.week1WeightKg,
                currentWeightKg: overrides.currentWeightKg ?? previewWeight,
                compliancePercentage: preferences.compliancePercentage,
            }),
        [
            overrides.currentWeightKg,
            preferences.bodyFatPercentage,
            preferences.compliancePercentage,
            preferences.hasInsulinResistance,
            preferences.hasPCOS,
            preferences.isAthlete,
            preferences.isPostMenopause,
            preferences.onHormonalContraception,
            preferences.week1WeightKg,
            previewActivity,
            previewAge,
            previewGoal,
            previewHeight,
            previewSex,
            previewWeight,
        ],
    );

    return {
        preview,
        preferences,
        inputs: {
            age: previewAge,
            sex: previewSex,
            heightCm: previewHeight,
            weightKg: previewWeight,
            goal: previewGoal,
            activityLevel: previewActivity,
        },
    };
}

export default useOnboardingNutritionPreview;
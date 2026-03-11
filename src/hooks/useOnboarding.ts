import { useCallback } from 'react';
import { withOnboardingPreferenceDefaults } from '../constants/onboarding';
import { useOnboardingStore } from '../store/onboardingStore';
import { type UserData, useUserStore } from '../store/userStore';
import { DEFAULT_PROFILE_VALUES } from '../utils/profileCompletion';

export type OnboardingSex = UserData['gender'];

export interface PersonalInfoDraft {
    name: string;
    ageInput: string;
    heightInput: string;
    weightInput: string;
    bodyFatInput?: string;
    sex: OnboardingSex;
}

interface ValidationResult {
    valid: boolean;
    message?: string;
}

interface ParsedPersonalInfo {
    parsedAge: number;
    parsedHeight: number;
    parsedWeight: number;
    parsedBodyFat?: number;
}

const validatePersonalInfo = ({
    name,
    parsedAge,
    parsedHeight,
    parsedWeight,
    parsedBodyFat,
}: {
    name: string;
    parsedAge: number;
    parsedHeight: number;
    parsedWeight: number;
    parsedBodyFat?: number;
}): ValidationResult => {
    const baseValid = Boolean(
        name.trim() &&
            Number.isFinite(parsedAge) &&
            parsedAge >= 6 &&
            parsedAge <= 100 &&
            Number.isFinite(parsedHeight) &&
            parsedHeight >= 100 &&
            parsedHeight <= 250 &&
            Number.isFinite(parsedWeight) &&
            parsedWeight >= 25 &&
            parsedWeight <= 350,
    );

    if (!baseValid) {
        return {
            valid: false,
            message:
                'Please enter valid age (6-100), height (100-250 cm), weight (25-350 kg), and optional body fat (3-60%).',
        };
    }

    if (parsedBodyFat !== undefined && (!Number.isFinite(parsedBodyFat) || parsedBodyFat < 3 || parsedBodyFat > 60)) {
        return {
            valid: false,
            message: 'Body fat should be between 3% and 60%.',
        };
    }

    return { valid: true };
};

export function useOnboarding() {
    const { data, updateData, reset } = useOnboardingStore();
    const createUser = useUserStore((state) => state.createUser);
    const completeOnboarding = useUserStore((state) => state.completeOnboarding);

    const parsePersonalInfoDraft = useCallback((draft: PersonalInfoDraft): ParsedPersonalInfo => {
        return {
            parsedAge: Number(draft.ageInput),
            parsedHeight: Number(draft.heightInput),
            parsedWeight: Number(draft.weightInput),
            parsedBodyFat: draft.bodyFatInput?.trim() ? Number(draft.bodyFatInput) : undefined,
        };
    }, []);

    const validatePersonalInfoDraft = useCallback(
        (draft: PersonalInfoDraft): ValidationResult => {
            const parsed = parsePersonalInfoDraft(draft);
            return validatePersonalInfo({
                name: draft.name,
                ...parsed,
            });
        },
        [parsePersonalInfoDraft],
    );

    const savePersonalInfo = useCallback(
        (draft: PersonalInfoDraft): ValidationResult => {
            const { parsedAge, parsedHeight, parsedWeight, parsedBodyFat } = parsePersonalInfoDraft(draft);
            const validation = validatePersonalInfoDraft(draft);

            if (!validation.valid) {
                return validation;
            }

            const preferences = {
                ...withOnboardingPreferenceDefaults(data.preferences),
                needsBodyMetrics: false,
                bodyFatPercentage: parsedBodyFat,
            };

            updateData({
                name: draft.name.trim(),
                age: Math.round(parsedAge),
                gender: draft.sex,
                height: Math.round(parsedHeight),
                weight: parseFloat(parsedWeight.toFixed(1)),
                preferences,
            });

            return { valid: true };
        },
        [data.preferences, parsePersonalInfoDraft, updateData, validatePersonalInfoDraft],
    );

    const saveGoal = useCallback(
        (goal: UserData['goal']) => {
            updateData({ goal });
        },
        [updateData],
    );

    const saveActivityLevel = useCallback(
        (activityLevel: UserData['activityLevel']) => {
            updateData({ activityLevel });
        },
        [updateData],
    );

    const savePreferences = useCallback(
        (preferences: NonNullable<UserData['preferences']>) => {
            updateData({ preferences: { ...preferences } });
        },
        [updateData],
    );

    const submitOnboarding = useCallback(async () => {
        const preferences = withOnboardingPreferenceDefaults(data.preferences);

        if (
            !data.name ||
            !data.age ||
            !data.gender ||
            !data.height ||
            !data.weight ||
            !data.goal ||
            !data.activityLevel
        ) {
            throw new Error('Missing required profile inputs. Please complete previous steps.');
        }

        const finalUserData: UserData = {
            name: data.name,
            age: data.age,
            gender: data.gender,
            height: data.height,
            weight: data.weight,
            goal: data.goal,
            activityLevel: data.activityLevel as UserData['activityLevel'],
            preferences,
        };

        await createUser(finalUserData);

        if (!useUserStore.getState().user) {
            throw new Error('Failed to create user profile. Please try again.');
        }

        await completeOnboarding();
        reset();
    }, [completeOnboarding, createUser, data, reset]);

    const personalInfoDefaults: PersonalInfoDraft = {
        name: data.name || '',
        ageInput: String(data.age || DEFAULT_PROFILE_VALUES.age),
        heightInput: String(data.height || DEFAULT_PROFILE_VALUES.height),
        weightInput: String(data.weight || DEFAULT_PROFILE_VALUES.weight),
        bodyFatInput:
            typeof data.preferences?.bodyFatPercentage === 'number'
                ? String(data.preferences.bodyFatPercentage)
                : '',
        sex: data.gender || DEFAULT_PROFILE_VALUES.gender,
    };

    return {
        data,
        personalInfoDefaults,
        validatePersonalInfoDraft,
        savePersonalInfo,
        saveGoal,
        saveActivityLevel,
        savePreferences,
        submitOnboarding,
    };
}

export default useOnboarding;

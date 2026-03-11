import type { UserData } from '../store/userStore';

export type OnboardingPreferences = NonNullable<UserData['preferences']>;

export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
    allergies: [],
    dietary_restrictions: [],
    theme: 'auto',
    notifications_enabled: true,
    language: 'en',
    needsBodyMetrics: false,
    bodyFatPercentage: undefined,
    hasPCOS: false,
    hasInsulinResistance: false,
    onHormonalContraception: false,
    isPostMenopause: false,
    isAthlete: false,
    week1WeightKg: undefined,
    compliancePercentage: undefined,
};

export const withOnboardingPreferenceDefaults = (
    preferences?: Partial<OnboardingPreferences> | null,
): OnboardingPreferences => ({
    ...DEFAULT_ONBOARDING_PREFERENCES,
    ...(preferences || {}),
});
import { create } from 'zustand';
import { UserData } from './userStore';
import { DEFAULT_ONBOARDING_PREFERENCES } from '../constants/onboarding';

interface OnboardingState {
    data: Partial<UserData>;
    updateData: (updates: Partial<UserData>) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    data: {
        preferences: {
            ...DEFAULT_ONBOARDING_PREFERENCES,
            allergies: [...DEFAULT_ONBOARDING_PREFERENCES.allergies],
            dietary_restrictions: [...DEFAULT_ONBOARDING_PREFERENCES.dietary_restrictions],
        },
    },
    updateData: (updates) =>
        set((state) => ({
            data: { ...state.data, ...updates },
        })),
    reset: () =>
        set({
            data: {
                preferences: {
                    ...DEFAULT_ONBOARDING_PREFERENCES,
                    allergies: [...DEFAULT_ONBOARDING_PREFERENCES.allergies],
                    dietary_restrictions: [...DEFAULT_ONBOARDING_PREFERENCES.dietary_restrictions],
                },
            },
        }),
}));

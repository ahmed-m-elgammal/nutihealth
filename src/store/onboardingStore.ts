import { create } from 'zustand';
import { UserData } from './userStore';
import { DEFAULT_ONBOARDING_PREFERENCES } from '../constants/onboarding';

interface OnboardingState {
    data: Partial<UserData>;
    currentStep: number;
    totalSteps: number;
    updateData: (updates: Partial<UserData>) => void;
    setCurrentStep: (step: number) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    currentStep: 1,
    totalSteps: 6,
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
    setCurrentStep: (step) => set((state) => ({ currentStep: Math.max(1, Math.min(state.totalSteps, step)) })),
    reset: () =>
        set({
            currentStep: 1,
            totalSteps: 6,
            data: {
                preferences: {
                    ...DEFAULT_ONBOARDING_PREFERENCES,
                    allergies: [...DEFAULT_ONBOARDING_PREFERENCES.allergies],
                    dietary_restrictions: [...DEFAULT_ONBOARDING_PREFERENCES.dietary_restrictions],
                },
            },
        }),
}));

import { create } from 'zustand';
import { UserData } from './userStore';

interface OnboardingState {
    data: Partial<UserData>;
    updateData: (updates: Partial<UserData>) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    data: {
        preferences: {
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
        },
    },
    updateData: (updates) =>
        set((state) => ({
            data: { ...state.data, ...updates },
        })),
    reset: () => set({ data: {} }),
}));

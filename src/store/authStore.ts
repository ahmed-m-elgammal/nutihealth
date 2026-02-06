import { create } from 'zustand';

interface AuthState {
    isAuthenticated: boolean;
    isOnboardingComplete: boolean;
    setAuthenticated: (value: boolean) => void;
    setOnboardingComplete: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isOnboardingComplete: false,

    setAuthenticated: (value) => set({ isAuthenticated: value }),
    setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
}));

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthSessionState = {
    userId: string | null;
    accessToken: string | null;
    setSession: (session: Session | null) => void;
    clearSession: () => void;
};

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
    userId: null,
    accessToken: null,
    setSession: (session) =>
        set({
            userId: session?.user?.id ?? null,
            accessToken: session?.access_token ?? null,
        }),
    clearSession: () => set({ userId: null, accessToken: null }),
}));

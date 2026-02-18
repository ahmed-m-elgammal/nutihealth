import { type ActivityLevel, type Goal } from './calculations';

type UserLike = {
    height?: number | null;
    weight?: number | null;
    preferences?: {
        needsBodyMetrics?: boolean;
    } | null;
};

export const DEFAULT_PROFILE_VALUES: {
    age: number;
    gender: 'male' | 'female' | 'other';
    height: number;
    weight: number;
    goal: Goal;
    activityLevel: ActivityLevel;
} = {
    age: 25,
    gender: 'other',
    height: 170,
    weight: 70,
    goal: 'maintain',
    activityLevel: 'moderate',
};

export function needsBodyMetrics(user?: UserLike | null): boolean {
    if (!user) return false;

    if (typeof user.preferences?.needsBodyMetrics === 'boolean') {
        return user.preferences.needsBodyMetrics;
    }

    return !user.height || user.height <= 0 || !user.weight || user.weight <= 0;
}

export function buildCompleteProfileRoute(nextRoute?: string): string {
    if (!nextRoute) return '/(modals)/complete-profile';
    return `/(modals)/complete-profile?next=${encodeURIComponent(nextRoute)}`;
}

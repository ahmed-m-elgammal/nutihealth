export const DIET_KEYS = {
    all: ['diets'] as const,
    templates: ['diets', 'templates'] as const,
    active: (userId: string) => ['diets', 'active', userId] as const,
};


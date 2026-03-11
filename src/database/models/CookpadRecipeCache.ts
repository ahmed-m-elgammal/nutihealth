import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';

const parseStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item));
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
        } catch {
            return [];
        }
    }

    return [];
};

const parseJsonObject = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {};
        } catch {
            return {};
        }
    }

    return {};
};

export default class CookpadRecipeCache extends Model {
    static table = 'cookpad_recipe_cache';

    @field('cookpad_id') cookpadId!: string;
    @field('source_url') sourceUrl!: string;
    @field('title') title!: string;
    @field('title_ar') titleAr?: string;
    @field('author') author?: string;
    @field('category') category?: string;
    @json('tags', parseStringArray) tags!: string[];
    @field('image_url') imageUrl?: string;
    @field('servings') servings!: number;
    @field('prep_time') prepTime?: number;
    @field('cook_time') cookTime?: number;
    @field('total_time') totalTime?: number;
    @json('ingredients', parseStringArray) ingredients!: string[];
    @json('instructions', parseStringArray) instructions!: string[];
    @json('nutrition', parseJsonObject) nutrition!: Record<string, unknown>;
    @json('raw_payload', parseJsonObject) rawPayload!: Record<string, unknown>;
    @json('search_terms', parseStringArray) searchTerms!: string[];
    @field('fetched_at') fetchedAt!: number;
    @field('expires_at') expiresAt!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}

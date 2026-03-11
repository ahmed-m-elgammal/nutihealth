import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, json, readonly } from '@nozbe/watermelondb/decorators';
import User from './User';

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

export default class SmartCookerSuggestion extends Model {
    static table = 'smart_cooker_suggestions';

    static associations = {
        users: { type: 'belongs_to' as const, key: 'user_id' },
    };

    @field('user_id') userId!: string;
    @immutableRelation('users', 'user_id') user!: Relation<User>;
    @json('pantry_item_ids', parseStringArray) pantryItemIds!: string[];
    @json('suggested_recipe_ids', parseStringArray) suggestedRecipeIds!: string[];
    @field('source_platform') sourcePlatform!: string;
    @field('confidence_score') confidenceScore?: number;
    @field('status') status?: string;
    @json('metadata', parseJsonObject) metadata!: Record<string, unknown>;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}

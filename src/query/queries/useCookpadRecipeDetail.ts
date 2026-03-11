import { useQuery } from '@tanstack/react-query';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import CookpadRecipeCache from '../../database/models/CookpadRecipeCache';
import { getSmartCookerRecipeById, type SmartCookerRecipeResponse } from '../../services/api/smartCooker';

const LOCAL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeId = (value: string) => String(value || '').trim();

const mapCacheModelToResponse = (record: CookpadRecipeCache): SmartCookerRecipeResponse => ({
    cookpad_id: record.cookpadId,
    source_url: record.sourceUrl,
    title: record.title,
    title_ar: record.titleAr,
    author: record.author,
    category: record.category,
    tags: record.tags || [],
    image_url: record.imageUrl,
    servings: record.servings || 1,
    prep_time: record.prepTime,
    cook_time: record.cookTime,
    total_time: record.totalTime,
    ingredients: record.ingredients || [],
    instructions: record.instructions || [],
    nutrition: record.nutrition || {},
    fetched_at: record.fetchedAt,
    expires_at: record.expiresAt,
});

async function getLocalRecipeCache(cookpadId: string): Promise<CookpadRecipeCache | null> {
    const rows = await database
        .get<CookpadRecipeCache>('cookpad_recipe_cache')
        .query(Q.where('cookpad_id', cookpadId), Q.sortBy('fetched_at', Q.desc), Q.take(1))
        .fetch();

    return rows[0] || null;
}

async function upsertLocalRecipeCache(recipe: SmartCookerRecipeResponse) {
    await database.write(async () => {
        const existing = await getLocalRecipeCache(recipe.cookpad_id);
        if (existing) {
            await existing.update((record) => {
                record.sourceUrl = recipe.source_url;
                record.title = recipe.title;
                record.titleAr = recipe.title_ar;
                record.author = recipe.author;
                record.category = recipe.category;
                record.tags = recipe.tags || [];
                record.imageUrl = recipe.image_url;
                record.servings = recipe.servings || 1;
                record.prepTime = recipe.prep_time;
                record.cookTime = recipe.cook_time;
                record.totalTime = recipe.total_time;
                record.ingredients = recipe.ingredients || [];
                record.instructions = recipe.instructions || [];
                record.nutrition = recipe.nutrition || {};
                record.rawPayload = recipe as unknown as Record<string, unknown>;
                record.searchTerms = [];
                record.fetchedAt = recipe.fetched_at || Date.now();
                record.expiresAt = recipe.expires_at || Date.now() + LOCAL_CACHE_TTL_MS;
            });
            return;
        }

        await database.get<CookpadRecipeCache>('cookpad_recipe_cache').create((record) => {
            record.cookpadId = recipe.cookpad_id;
            record.sourceUrl = recipe.source_url;
            record.title = recipe.title;
            record.titleAr = recipe.title_ar;
            record.author = recipe.author;
            record.category = recipe.category;
            record.tags = recipe.tags || [];
            record.imageUrl = recipe.image_url;
            record.servings = recipe.servings || 1;
            record.prepTime = recipe.prep_time;
            record.cookTime = recipe.cook_time;
            record.totalTime = recipe.total_time;
            record.ingredients = recipe.ingredients || [];
            record.instructions = recipe.instructions || [];
            record.nutrition = recipe.nutrition || {};
            record.rawPayload = recipe as unknown as Record<string, unknown>;
            record.searchTerms = [];
            record.fetchedAt = recipe.fetched_at || Date.now();
            record.expiresAt = recipe.expires_at || Date.now() + LOCAL_CACHE_TTL_MS;
        });
    });
}

async function fetchCookpadRecipeDetail(cookpadId: string): Promise<SmartCookerRecipeResponse> {
    const normalizedId = normalizeId(cookpadId);
    if (!normalizedId) {
        throw new Error('Cookpad recipe id is required');
    }

    const local = await getLocalRecipeCache(normalizedId);
    const now = Date.now();
    if (local) {
        const cacheAge = now - (local.fetchedAt || 0);
        const notExpired = (local.expiresAt || 0) > now;
        if (notExpired && cacheAge <= LOCAL_CACHE_TTL_MS) {
            return mapCacheModelToResponse(local);
        }
    }

    const remote = await getSmartCookerRecipeById(normalizedId);
    await upsertLocalRecipeCache(remote);
    return remote;
}

export function useCookpadRecipeDetail(cookpadId: string | null | undefined) {
    const normalizedId = normalizeId(String(cookpadId || ''));

    return useQuery({
        queryKey: ['cookpadRecipeDetail', normalizedId],
        enabled: Boolean(normalizedId),
        queryFn: async () => fetchCookpadRecipeDetail(normalizedId),
        staleTime: 1000 * 60 * 30,
    });
}

export default useCookpadRecipeDetail;

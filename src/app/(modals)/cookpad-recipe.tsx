import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3, Minus, Plus, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import Recipe from '../../database/models/Recipe';
import { triggerHaptic } from '../../utils/haptics';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import usePantryItems from '../../query/queries/usePantryItems';
import usePantryMutations from '../../query/mutations/usePantryMutations';
import { useMealMutations } from '../../query/mutations/useMealMutations';
import useCookpadRecipeDetail from '../../query/queries/useCookpadRecipeDetail';
import useSuggestionFeedback from '../../query/mutations/useSuggestionFeedback';
import IngredientCoverageBar from '../../components/smart-cooker/IngredientCoverageBar';
import { useUIStore } from '../../store/uiStore';
import type { SmartCookerMealType, SmartCookerSuggestion } from '../../services/api/smartCooker';

const MAX_SERVINGS = 8;
const MIN_SERVINGS = 1;

const asSingle = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value || '');

const inferMealType = (raw?: string): SmartCookerMealType => {
    const normalized = String(raw || '').trim().toLowerCase();
    if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
        return normalized;
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 17) return 'lunch';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'snack';
};

const normalizeName = (value: string) =>
    String(value || '')
        .toLowerCase()
        .replace(/[0-9٠-٩]/g, ' ')
        .replace(/[^\p{L}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const parseSuggestion = (raw: string): SmartCookerSuggestion | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SmartCookerSuggestion;
    } catch {
        return null;
    }
};

const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const match = value.match(/[\d.]+/);
        if (match?.[0]) {
            const parsed = Number.parseFloat(match[0]);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return fallback;
};

export default function CookpadRecipeModal() {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams<{
        cookpadId?: string;
        sessionId?: string;
        mealType?: string;
        suggestion?: string;
    }>();
    const cookpadId = asSingle(params.cookpadId);
    const sessionId = asSingle(params.sessionId) || null;
    const mealType = inferMealType(asSingle(params.mealType));
    const suggestion = useMemo(() => parseSuggestion(asSingle(params.suggestion)), [params.suggestion]);
    const viewedLoggedRef = useRef(false);

    const showToast = useUIStore((state) => state.showToast);
    const { user } = useCurrentUser();
    const { data: meals = [] } = useMeals(new Date(), user?.id);
    const pantryQuery = usePantryItems('all');
    const pantryItems = pantryQuery.data || [];
    const { bulkDelete } = usePantryMutations();
    const { createMeal } = useMealMutations();
    const { recordSuggestionAction } = useSuggestionFeedback();
    const [selectedServings, setSelectedServings] = useState(suggestion?.servings || 1);
    const [isCooking, setIsCooking] = useState(false);

    const recipeQuery = useCookpadRecipeDetail(cookpadId || null);
    const recipe = recipeQuery.data;

    const perServingNutrition = useMemo(() => {
        if (suggestion?.estimated_nutrition) {
            return {
                calories: toNumber(suggestion.estimated_nutrition.calories),
                protein: toNumber(suggestion.estimated_nutrition.protein),
                carbs: toNumber(suggestion.estimated_nutrition.carbs),
                fats: toNumber(suggestion.estimated_nutrition.fats),
                fiber: toNumber(suggestion.estimated_nutrition.fiber),
                confidence: suggestion.estimated_nutrition.confidence || 'medium',
                source: suggestion.estimated_nutrition.source || 'tier1',
            };
        }

        return {
            calories: toNumber(recipe?.nutrition?.calories),
            protein: toNumber(recipe?.nutrition?.protein),
            carbs: toNumber(recipe?.nutrition?.carbs),
            fats: toNumber(recipe?.nutrition?.fats),
            fiber: toNumber(recipe?.nutrition?.fiber),
            confidence: recipe?.nutrition?.confidence || 'medium',
            source: recipe?.nutrition?.source || 'tier1',
        };
    }, [recipe?.nutrition, suggestion?.estimated_nutrition]);

    const scaledNutrition = useMemo(
        () => ({
            calories: Math.round(perServingNutrition.calories * selectedServings),
            protein: Math.round(perServingNutrition.protein * selectedServings * 10) / 10,
            carbs: Math.round(perServingNutrition.carbs * selectedServings * 10) / 10,
            fats: Math.round(perServingNutrition.fats * selectedServings * 10) / 10,
            fiber: Math.round(perServingNutrition.fiber * selectedServings * 10) / 10,
        }),
        [perServingNutrition, selectedServings],
    );

    const totalCaloriesConsumedToday = useMemo(
        () => meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0),
        [meals],
    );
    const remainingToday = Math.max(0, (user?.calorieTarget || 2000) - totalCaloriesConsumedToday);

    const coverageData = useMemo(() => {
        const ingredientLines = recipe?.ingredients || [];
        if (ingredientLines.length === 0) {
            return { coverage: 0, missing: [], matchedPantryIds: [] as string[] };
        }

        const normalizedPantry = pantryItems.map((item) => ({
            id: item.id,
            normalized: normalizeName(item.normalizedName || item.name),
        }));
        const missingFromSuggestion = new Set((suggestion?.missing_ingredients || []).map((item) => normalizeName(item)));
        const matchedPantryIds = new Set<string>();
        const missing: string[] = [];
        let matchedCount = 0;

        for (const line of ingredientLines) {
            const normalizedLine = normalizeName(line);
            if (!normalizedLine) continue;

            if (missingFromSuggestion.has(normalizedLine)) {
                missing.push(line);
                continue;
            }

            const matchedPantry = normalizedPantry.find(
                (item) =>
                    item.normalized &&
                    (normalizedLine.includes(item.normalized) || item.normalized.includes(normalizedLine)),
            );

            if (matchedPantry) {
                matchedCount += 1;
                matchedPantryIds.add(matchedPantry.id);
            } else {
                missing.push(line);
            }
        }

        return {
            coverage: ingredientLines.length > 0 ? matchedCount / ingredientLines.length : 0,
            missing,
            matchedPantryIds: Array.from(matchedPantryIds),
        };
    }, [pantryItems, recipe?.ingredients, suggestion?.missing_ingredients]);

    useEffect(() => {
        if (!sessionId || !cookpadId || viewedLoggedRef.current || !recipe) return;
        viewedLoggedRef.current = true;
        recordSuggestionAction({
            sessionId,
            cookpadRecipeId: cookpadId,
            action: 'viewed',
            suggestedRecipeIds: [cookpadId],
        }).catch(() => undefined);
    }, [cookpadId, recipe, recordSuggestionAction, sessionId]);

    const ensureRecipeRecord = async (): Promise<string | null> => {
        if (!recipe || !user?.id || !cookpadId) return null;

        const existing = await database
            .get<Recipe>('recipes')
            .query(
                Q.where('user_id', user.id),
                Q.where('source_platform', 'cookpad'),
                Q.where('external_id', cookpadId),
                Q.take(1),
            )
            .fetch();

        if (existing[0]) {
            return existing[0].id;
        }

        const created = await database.write(async () => {
            return database.get<Recipe>('recipes').create((record) => {
                record.userId = user.id;
                record.name = recipe.title_ar || recipe.title;
                record.description = recipe.author ? `By ${recipe.author}` : undefined;
                record.servings = recipe.servings || 1;
                record.prepTime = recipe.prep_time;
                record.cookTime = recipe.cook_time;
                record.ingredients = (recipe.ingredients || []).map((line) => ({
                    name: line,
                    quantity: 1,
                    unit: 'item',
                }));
                record.instructions = recipe.instructions || [];
                record.photoUri = recipe.image_url;
                record.caloriesPerServing = perServingNutrition.calories;
                record.proteinPerServing = perServingNutrition.protein;
                record.carbsPerServing = perServingNutrition.carbs;
                record.fatsPerServing = perServingNutrition.fats;
                record.isFavorite = false;
                record.tags = recipe.tags || [];
                record.sourcePlatform = 'cookpad';
                record.externalId = cookpadId;
                record.nutritionConfidence =
                    perServingNutrition.confidence === 'high'
                        ? 1
                        : perServingNutrition.confidence === 'medium'
                          ? 0.7
                          : 0.4;
            });
        });

        return created.id;
    };

    const handleCookNow = async () => {
        if (!recipe || !cookpadId) return;
        if (isCooking) return;

        try {
            setIsCooking(true);
            const recipeRecordId = await ensureRecipeRecord();
            if (coverageData.matchedPantryIds.length > 0) {
                await bulkDelete(coverageData.matchedPantryIds);
            }

            const createdMeal = await createMeal({
                name: recipe.title_ar || recipe.title,
                mealType,
                consumedAt: new Date(),
                notes: `Cooked from Smart Cooker (${cookpadId})`,
                foods: [
                    {
                        name: recipe.title_ar || recipe.title,
                        servingSize: 1,
                        servingUnit: 'serving',
                        quantity: selectedServings,
                        calories: perServingNutrition.calories,
                        protein: perServingNutrition.protein,
                        carbs: perServingNutrition.carbs,
                        fats: perServingNutrition.fats,
                        fiber: perServingNutrition.fiber,
                        sugar: 0,
                    },
                ],
            });

            if (recipeRecordId) {
                await database.write(async () => {
                    const meal = await database.get<Meal>('meals').find(createdMeal.id);
                    await meal.update((record) => {
                        record.cookedFromRecipeId = recipeRecordId;
                    });
                });
            }

            await recordSuggestionAction({
                sessionId,
                cookpadRecipeId: cookpadId,
                action: 'cooked',
                pantryItemIds: coverageData.matchedPantryIds,
                suggestedRecipeIds: [cookpadId],
                metadata: {
                    servings: selectedServings,
                    meal_type: mealType,
                },
            });

            await triggerHaptic('medium');
            showToast('success', t('smartCooker.cookNow.success'));
            router.replace('/(tabs)/meals' as any);
        } catch (error) {
            const message = error instanceof Error ? error.message : t('common.tryAgain');
            showToast('error', message);
        } finally {
            setIsCooking(false);
        }
    };

    const handleSaveToPlan = () => {
        router.push('/(modals)/meal-prep-planner' as any);
    };

    const handleOpenOnCookpad = async () => {
        const url = recipe?.source_url || suggestion?.cookpad_url;
        if (!url) {
            showToast('warning', t('smartCooker.error.noRecipeUrl'));
            return;
        }

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                showToast('error', t('smartCooker.error.openRecipeFailed'));
                return;
            }

            await Linking.openURL(url);
        } catch {
            showToast('error', t('smartCooker.error.openRecipeFailed'));
        }
    };

    const confidenceLabel =
        perServingNutrition.source === 'ai'
            ? t('smartCooker.detail.confidenceAi')
            : t(`smartCooker.card.confidence.${perServingNutrition.confidence || 'unknown'}`);
    const dietFitLabel =
        scaledNutrition.calories <= remainingToday
            ? t('smartCooker.dietFit.fits')
            : scaledNutrition.calories <= remainingToday * 1.15
              ? t('smartCooker.detail.closeToLimit')
              : t('smartCooker.dietFit.over');

    if (recipeQuery.isLoading || !recipe) {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
                <View style={{ padding: 16 }}>
                    <Text style={{ color: '#64748b' }}>{t('common.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>{t('smartCooker.detail.title')}</Text>
                </View>
                <Pressable
                    onPress={() => router.back()}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                    }}
                >
                    <X size={18} color="#334155" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 14 }}>
                {recipe.image_url ? (
                    <Image source={{ uri: recipe.image_url }} style={{ width: '100%', height: 220, borderRadius: 16 }} contentFit="cover" />
                ) : null}

                <View style={{ gap: 5 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}>{recipe.title_ar || recipe.title}</Text>
                    {recipe.author ? <Text style={{ color: '#64748b' }}>{recipe.author}</Text> : null}
                    <Pressable onPress={handleOpenOnCookpad}>
                        <Text style={{ color: '#0f766e', fontWeight: '700' }}>{t('smartCooker.detail.viewOnCookpad')}</Text>
                    </Pressable>
                </View>

                <View style={{ gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
                    <Text style={{ fontWeight: '800', color: '#0f172a' }}>{t('smartCooker.detail.coverage')}</Text>
                    <Text style={{ color: '#334155', fontWeight: '700' }}>
                        {Math.round(coverageData.coverage * 100)}% {t('smartCooker.card.coverage')}
                    </Text>
                    <IngredientCoverageBar coverage={coverageData.coverage} />
                    {coverageData.missing.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {coverageData.missing.slice(0, 6).map((item) => (
                                <View
                                    key={item}
                                    style={{
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: '#fde68a',
                                        backgroundColor: '#fef9c3',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#854d0e' }}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ color: '#166534', fontWeight: '700' }}>{t('smartCooker.card.noMissingIngredients')}</Text>
                    )}
                </View>

                <View style={{ gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#eff6ff', padding: 12 }}>
                    <Text style={{ fontWeight: '800', color: '#1e3a8a' }}>{t('smartCooker.detail.nutritionPerServing')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>{t('smartCooker.detail.servings')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Pressable
                                onPress={() => setSelectedServings((value) => Math.max(MIN_SERVINGS, value - 1))}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: '#93c5fd',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <Minus size={14} color="#1e3a8a" />
                            </Pressable>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e3a8a' }}>{selectedServings}</Text>
                            <Pressable
                                onPress={() => setSelectedServings((value) => Math.min(MAX_SERVINGS, value + 1))}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: '#93c5fd',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <Plus size={14} color="#1e3a8a" />
                            </Pressable>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>{scaledNutrition.calories} kcal</Text>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>
                            {t('smartCooker.card.protein')}: {scaledNutrition.protein}g
                        </Text>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>
                            {t('smartCooker.card.carbs')}: {scaledNutrition.carbs}g
                        </Text>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>
                            {t('smartCooker.card.fats')}: {scaledNutrition.fats}g
                        </Text>
                        <Text style={{ color: '#1e3a8a', fontWeight: '700' }}>
                            {t('smartCooker.detail.fiber')}: {scaledNutrition.fiber}g
                        </Text>
                    </View>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 12 }}>{confidenceLabel}</Text>
                </View>

                <View style={{ gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#f0fdf4', padding: 12 }}>
                    <Text style={{ fontWeight: '800', color: '#166534' }}>{t('smartCooker.detail.dietFit')}</Text>
                    <Text style={{ color: '#166534', fontWeight: '700' }}>{dietFitLabel}</Text>
                    <Text style={{ color: '#15803d' }}>
                        {t('smartCooker.detail.remainingBudget', { calories: Math.round(remainingToday) })}
                    </Text>
                </View>

                <View style={{ gap: 8 }}>
                    <Text style={{ fontWeight: '800', color: '#0f172a' }}>{t('smartCooker.detail.ingredients')}</Text>
                    {recipe.ingredients.map((ingredient) => (
                        <Text key={ingredient} style={{ color: '#334155' }}>
                            • {ingredient}
                        </Text>
                    ))}
                </View>

                <View style={{ gap: 8 }}>
                    <Text style={{ fontWeight: '800', color: '#0f172a' }}>{t('smartCooker.detail.instructions')}</Text>
                    {recipe.instructions.map((step, index) => (
                        <View key={`${index + 1}-${step}`} style={{ flexDirection: 'row', gap: 8 }}>
                            <Text style={{ color: '#0f172a', fontWeight: '800' }}>{index + 1}.</Text>
                            <Text style={{ color: '#334155', flex: 1 }}>{step}</Text>
                        </View>
                    ))}
                </View>

                {recipe.prep_time || recipe.cook_time || recipe.total_time ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {recipe.total_time ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Clock3 size={14} color="#0f766e" />
                                <Text style={{ color: '#0f766e', fontWeight: '700' }}>
                                    {recipe.total_time} {t('smartCooker.card.minutes')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </ScrollView>

            <View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderColor: '#e2e8f0',
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: 18,
                    flexDirection: 'row',
                    gap: 10,
                }}
            >
                <Pressable
                    onPress={handleSaveToPlan}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                    }}
                >
                    <Text style={{ color: '#334155', fontWeight: '700' }}>{t('smartCooker.detail.saveToPlan')}</Text>
                </Pressable>
                <Pressable
                    onPress={handleCookNow}
                    disabled={isCooking}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: '#16a34a',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        opacity: isCooking ? 0.7 : 1,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>
                        {isCooking ? t('smartCooker.cookNow.cooking') : t('smartCooker.cookNow.action')}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

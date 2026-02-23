import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import RecipePreviewCard from '../../components/RecipeImport/RecipePreviewCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMealMutations } from '../../query/mutations/useMealMutations';
import { useUIStore } from '../../store/uiStore';
import { importRecipeFromUrl, mapImportErrorToMessageKey, RecipeImportError } from '../../services/recipeImportService';
import {
    calculateIngredientSelectionRatio,
    calculateNutritionForServings,
    convertIngredientsToUnitSystem,
    ImportedRecipe,
    resolveRecipeDirection,
} from '../../utils/recipeParser';
import { UnitSystem } from '../../utils/arabicNumberConverter';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Screen step 3/4: recipe preview and meal logging.
 */
export default function RecipePreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ url?: string }>();
    const { t } = useTranslation();
    const showToast = useUIStore((state) => state.showToast);
    const { createMeal } = useMealMutations();

    const [recipe, setRecipe] = useState<ImportedRecipe | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<RecipeImportError | null>(null);
    const [selectedServings, setSelectedServings] = useState(1);
    const [mealType, setMealType] = useState<MealType>('breakfast');
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

    const errorMessage = useMemo(() => {
        if (!error) {
            return null;
        }
        return t(mapImportErrorToMessageKey(error.code));
    }, [error, t]);

    useEffect(() => {
        const loadRecipe = async () => {
            if (!params.url || typeof params.url !== 'string') {
                setError(new RecipeImportError('INVALID_URL', 'Missing recipe URL'));
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const importedRecipe = await importRecipeFromUrl(params.url, { minLoadingMs: 1200 });
                setRecipe(importedRecipe);
                setSelectedServings(1);
                setSelectedIngredientIds(importedRecipe.ingredients.map((ingredient) => ingredient.id));
            } catch (caughtError) {
                const recipeError =
                    caughtError instanceof RecipeImportError
                        ? caughtError
                        : new RecipeImportError('UNKNOWN', 'Preview loading failed');
                setError(recipeError);
            } finally {
                setIsLoading(false);
            }
        };

        void loadRecipe();
    }, [params.url]);

    const rtl = recipe ? resolveRecipeDirection(recipe) === 'rtl' : false;
    const locale: 'en' | 'ar' = recipe?.language === 'ar' ? 'ar' : 'en';

    const ingredientsForDisplay = useMemo(() => {
        if (!recipe) {
            return [];
        }
        return convertIngredientsToUnitSystem(recipe.ingredients, unitSystem);
    }, [recipe, unitSystem]);

    const selectedIngredientRatio = useMemo(() => {
        if (!recipe) {
            return 1;
        }
        return calculateIngredientSelectionRatio(selectedIngredientIds, recipe.ingredients.length);
    }, [recipe, selectedIngredientIds]);

    const totalNutrition = useMemo(() => {
        if (!recipe) {
            return {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
            };
        }

        return calculateNutritionForServings(recipe.nutrition, selectedServings, selectedIngredientRatio);
    }, [recipe, selectedServings, selectedIngredientRatio]);

    const handleAddToMeal = async () => {
        if (!recipe) {
            return;
        }

        setIsSaving(true);

        try {
            const perServingNutrition = calculateNutritionForServings(recipe.nutrition, 1, selectedIngredientRatio);
            const selectedIngredients = recipe.ingredients
                .filter((ingredient) => selectedIngredientIds.includes(ingredient.id))
                .map((ingredient) => ingredient.name)
                .join(', ');

            await createMeal({
                name: locale === 'ar' ? recipe.titleAr || recipe.title : recipe.title,
                mealType,
                consumedAt: new Date(),
                notes: `Imported from ${recipe.sourceUrl}\nIngredients: ${selectedIngredients}`,
                foods: [
                    {
                        name: locale === 'ar' ? recipe.titleAr || recipe.title : recipe.title,
                        servingSize: 1,
                        servingUnit: 'serving',
                        quantity: selectedServings,
                        calories: perServingNutrition.calories,
                        protein: perServingNutrition.protein,
                        carbs: perServingNutrition.carbs,
                        fats: perServingNutrition.fats,
                    },
                ],
            });

            showToast('success', t('recipeImport.success.addedToMeal'));
            router.dismissTo('/(tabs)/meals');
        } catch {
            showToast('error', t('recipeImport.errors.addMealFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
                <View className="flex-row items-center border-b border-neutral-200 bg-white px-5 py-4">
                    <Pressable
                        onPress={() => router.back()}
                        className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ArrowLeft size={18} color="#404040" />
                    </Pressable>
                    <Text className="text-xl font-bold text-neutral-900">{t('recipeImport.preview.title')}</Text>
                </View>

                <View className="flex-1 px-5 py-6">
                    <Skeleton className="mb-4 h-52 w-full rounded-3xl" />
                    <Skeleton className="mb-2 h-8 w-2/3 rounded-xl" />
                    <Skeleton className="mb-3 h-24 w-full rounded-2xl" />
                    <Skeleton className="mb-3 h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !recipe) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 px-6" edges={['top']}>
                <View className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6">
                    <Text className="mb-2 text-xl font-bold text-neutral-900">{t('recipeImport.errors.title')}</Text>
                    <Text className="mb-5 text-neutral-600">{errorMessage ?? t('recipeImport.errors.unknown')}</Text>

                    <Pressable
                        onPress={() => router.replace('/(modals)/recipe-import')}
                        className="items-center rounded-xl bg-primary-500 py-3"
                    >
                        <Text className="font-bold text-white">{t('recipeImport.actions.retry')}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <View className="flex-row items-center border-b border-neutral-200 bg-white px-5 py-4">
                <Pressable
                    onPress={() => router.back()}
                    className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                >
                    <ArrowLeft size={18} color="#404040" />
                </Pressable>
                <Text className="text-xl font-bold text-neutral-900">{t('recipeImport.preview.title')}</Text>
                {isSaving && <ActivityIndicator className="ml-3" color="#10b981" size="small" />}
            </View>

            <RecipePreviewCard
                recipe={recipe}
                locale={locale}
                rtl={rtl}
                mealType={mealType}
                selectedServings={selectedServings}
                selectedIngredientIds={selectedIngredientIds}
                ingredientsForDisplay={ingredientsForDisplay}
                totalNutrition={totalNutrition}
                unitSystem={unitSystem}
                isSaving={isSaving}
                onUnitSystemChange={setUnitSystem}
                onDecreaseServings={() => setSelectedServings((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                onIncreaseServings={() => setSelectedServings((prev) => Math.min(10, Number((prev + 0.5).toFixed(1))))}
                onSetMealType={setMealType}
                onToggleIngredient={(ingredientId) => {
                    setSelectedIngredientIds((prev) => {
                        if (prev.includes(ingredientId)) {
                            const next = prev.filter((id) => id !== ingredientId);
                            return next.length === 0 ? prev : next;
                        }

                        return [...prev, ingredientId];
                    });
                }}
                onAddToMeal={handleAddToMeal}
            />
        </SafeAreaView>
    );
}

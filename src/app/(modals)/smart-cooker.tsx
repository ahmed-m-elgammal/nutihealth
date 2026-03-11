import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calculator, ChefHat, ExternalLink, Search, Sparkles, X } from 'lucide-react-native';
import {
    estimateSmartCookerNutrition,
    getSmartCookerRecipeById,
    searchSmartCookerCatalog,
    searchSmartCookerCookpadDetails,
    searchSmartCookerRecipes,
    type SmartCookerCatalogItem,
    type SmartCookerCookpadDetailResponse,
    type SmartCookerEstimateResponse,
    type SmartCookerRecipeResponse,
    type SmartCookerSuggestion,
} from '../../services/api/smartCooker';
import { useUIStore } from '../../store/uiStore';
import { useAddMealDraftStore } from '../../store/addMealDraftStore';
import type { SearchResult } from '../../services/api/foodSearch';

type SmartCookerMode = 'recipe' | 'ingredients';

type EditableIngredient = {
    name: string;
    quantity: string;
    unit: string;
};

const DEFAULT_SERVING_SIZE_G = '450';
const UNIT_OPTIONS = ['g', 'ml', 'piece', 'cup', 'tbsp', 'tsp'] as const;
const SPLIT_LAYOUT_BREAKPOINT = 900;

const splitIngredientChunk = (rawChunk: string): string[] => {
    const normalizedChunk = rawChunk.replace(/\s+/g, ' ').trim();
    if (!normalizedChunk) {
        return [];
    }

    // Definite separator form: "item و item"
    let expandedChunk = normalizedChunk.replace(/\s+و\s+/g, ',');

    // Attached conjunction form: "item وبندورة وثوم".
    // Apply only when repeated to avoid splitting words that naturally start with "و" (e.g., "ورق").
    const attachedConjunctionCount = expandedChunk.match(/\s+و(?=\S)/g)?.length ?? 0;
    if (attachedConjunctionCount >= 2) {
        expandedChunk = expandedChunk.replace(/\s+و(?=\S)/g, ',');
    }

    return expandedChunk
        .split(',')
        .map((part, index) => {
            const trimmedPart = part.trim();
            if (index === 0) {
                return trimmedPart;
            }

            return trimmedPart.replace(/^و(?=\S)/, '').trim();
        })
        .filter(Boolean);
};

const parseList = (raw: string): string[] => {
    const seen = new Set<string>();

    return raw
        .split(/[\n,،;؛]/g)
        .flatMap((item) => splitIngredientChunk(item))
        .filter(Boolean)
        .filter((item) => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
};

const asNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
};

const suggestionToRecipeItem = async (suggestion: SmartCookerSuggestion): Promise<SmartCookerCatalogItem> => {
    if (Array.isArray(suggestion.ingredients_ar) && suggestion.ingredients_ar.length > 0) {
        return {
            recipe_id: suggestion.recipe_id || suggestion.cookpad_id,
            food_name_ar: suggestion.title_ar,
            food_name_en: suggestion.title_en || suggestion.title_ar,
            category: 'uncategorized',
            ingredients_ar: suggestion.ingredients_ar,
            ingredients_en: suggestion.ingredients_en || [],
            display_name: suggestion.title_ar,
        };
    }

    const detail = await getSmartCookerRecipeById(suggestion.recipe_id || suggestion.cookpad_id);

    return {
        recipe_id: detail.recipe_id || detail.cookpad_id,
        food_name_ar: detail.title_ar || detail.title,
        food_name_en: detail.title_en || detail.title,
        category: detail.category || 'uncategorized',
        ingredients_ar: detail.ingredients_ar || detail.ingredients || [],
        ingredients_en: detail.ingredients_en || [],
        display_name: detail.title_ar || detail.title,
    };
};

const buildFallbackSteps = (
    selectedRecipeTitle: string,
    ingredients: EditableIngredient[],
    cookingState: 'before' | 'after',
    servingSizeG: string,
): string[] => {
    const ingredientPreview = ingredients
        .slice(0, 4)
        .map((item) => item.name)
        .filter(Boolean)
        .join('، ');

    return [
        `Prepare ingredients for ${selectedRecipeTitle || 'the selected recipe'}${ingredientPreview ? `: ${ingredientPreview}` : ''}.`,
        'Adjust each ingredient quantity and unit to match your real cooking amounts.',
        `Set dish state to ${cookingState === 'before' ? 'Before cooking' : 'After cooking'} and serving size to ${Math.max(
            1,
            asNumber(servingSizeG, 450),
        )}g.`,
        'Estimate macros, then add the result to your meal when values look correct.',
    ];
};

export default function SmartCookerModal() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const addFood = useAddMealDraftStore((state) => state.addFood);
    const { width } = useWindowDimensions();
    const useSplitLayout = width >= SPLIT_LAYOUT_BREAKPOINT;

    const [mode, setMode] = useState<SmartCookerMode>('recipe');
    const [recipeQuery, setRecipeQuery] = useState('');
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogResults, setCatalogResults] = useState<SmartCookerCatalogItem[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<SmartCookerCatalogItem | null>(null);
    const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<SmartCookerRecipeResponse | null>(null);
    const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);

    const [ingredientInputs, setIngredientInputs] = useState<EditableIngredient[]>([]);
    const [servingSizeG, setServingSizeG] = useState(DEFAULT_SERVING_SIZE_G);
    const [cookingState, setCookingState] = useState<'before' | 'after'>('after');
    const [estimating, setEstimating] = useState(false);
    const [estimateResult, setEstimateResult] = useState<SmartCookerEstimateResponse | null>(null);
    const [cookpadDetail, setCookpadDetail] = useState<SmartCookerCookpadDetailResponse | null>(null);
    const [cookpadLoading, setCookpadLoading] = useState(false);
    const [cookpadError, setCookpadError] = useState('');

    const [ingredientsQuery, setIngredientsQuery] = useState('');
    const [suggesting, setSuggesting] = useState(false);
    const [suggestions, setSuggestions] = useState<SmartCookerSuggestion[]>([]);

    const selectedRecipeTitle = useMemo(() => {
        if (!selectedRecipe) return '';
        return selectedRecipe.food_name_ar || selectedRecipe.food_name_en || '';
    }, [selectedRecipe]);

    const selectedRecipeKind = useMemo(() => {
        const directCategory = String(selectedRecipe?.category || '').trim();
        if (directCategory) return directCategory;

        const detailCategory = String(selectedRecipeDetail?.category || '').trim();
        if (detailCategory) return detailCategory;

        return '';
    }, [selectedRecipe?.category, selectedRecipeDetail?.category]);

    const estimateServingSize = useMemo(() => {
        if (estimateResult?.serving_size_g) return estimateResult.serving_size_g;
        return Math.max(1, asNumber(servingSizeG, 450));
    }, [estimateResult?.serving_size_g, servingSizeG]);

    const displayedSteps = useMemo(() => {
        if (cookpadDetail?.instructions?.length) {
            return cookpadDetail.instructions;
        }

        if (selectedRecipeDetail?.instructions?.length) {
            return selectedRecipeDetail.instructions;
        }

        return buildFallbackSteps(selectedRecipeTitle, ingredientInputs, cookingState, servingSizeG);
    }, [
        cookpadDetail?.instructions,
        selectedRecipeDetail?.instructions,
        selectedRecipeTitle,
        ingredientInputs,
        cookingState,
        servingSizeG,
    ]);

    const initializeIngredientsFromRecipe = (
        recipe: SmartCookerCatalogItem,
        detail?: SmartCookerRecipeResponse | null,
    ) => {
        const fromDetail = detail?.ingredients_ar?.length
            ? detail.ingredients_ar
            : detail?.ingredients?.length
              ? detail.ingredients
              : [];
        const preferred =
            fromDetail.length > 0
                ? fromDetail
                : recipe.ingredients_ar.length > 0
                  ? recipe.ingredients_ar
                  : recipe.ingredients_en;
        setIngredientInputs(
            preferred.map((name) => ({
                name,
                quantity: '1',
                unit: 'piece',
            })),
        );
    };

    const handleSearchRecipeCatalog = async () => {
        const query = recipeQuery.trim();
        if (!query) {
            showToast('warning', 'Enter recipe name first.');
            return;
        }

        try {
            setCatalogLoading(true);
            const response = await searchSmartCookerCatalog(query, 'ar', 20);
            setCatalogResults(response.items || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to search recipes.';
            showToast('error', message);
        } finally {
            setCatalogLoading(false);
        }
    };

    const loadSelectedRecipeDetails = async (recipe: SmartCookerCatalogItem) => {
        const detail = await getSmartCookerRecipeById(recipe.recipe_id);

        const mergedRecipe: SmartCookerCatalogItem = {
            ...recipe,
            food_name_ar: detail.title_ar || recipe.food_name_ar,
            food_name_en: detail.title_en || recipe.food_name_en,
            category: detail.category || recipe.category,
            ingredients_ar: detail.ingredients_ar || detail.ingredients || recipe.ingredients_ar,
            ingredients_en: detail.ingredients_en || recipe.ingredients_en,
            display_name: recipe.display_name || detail.title_ar || detail.title_en || detail.title,
        };

        setSelectedRecipe(mergedRecipe);
        setSelectedRecipeDetail(detail);
        initializeIngredientsFromRecipe(mergedRecipe, detail);
    };

    const handleSelectRecipe = async (recipe: SmartCookerCatalogItem) => {
        setSelectedRecipe(recipe);
        setSelectedRecipeDetail(null);
        setCookpadDetail(null);
        setCookpadError('');
        initializeIngredientsFromRecipe(recipe);
        setEstimateResult(null);

        try {
            setRecipeDetailLoading(true);
            await loadSelectedRecipeDetails(recipe);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not load recipe details.';
            showToast('warning', message);
        } finally {
            setRecipeDetailLoading(false);
        }
    };

    const handleChangeIngredientQuantity = (index: number, quantity: string) => {
        setIngredientInputs((prev) =>
            prev.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return {
                    ...item,
                    quantity,
                };
            }),
        );
    };

    const handleChangeIngredientUnit = (index: number, unit: string) => {
        setIngredientInputs((prev) =>
            prev.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return {
                    ...item,
                    unit,
                };
            }),
        );
    };

    const handleEstimate = async () => {
        if (!selectedRecipe) {
            showToast('warning', 'Select a recipe first.');
            return;
        }

        if (ingredientInputs.length === 0) {
            showToast('warning', 'No ingredients available for this recipe.');
            return;
        }

        try {
            setEstimating(true);
            const response = await estimateSmartCookerNutrition({
                recipe_id: selectedRecipe.recipe_id,
                ingredients_quantities: ingredientInputs.map((item) => ({
                    name: item.name,
                    quantity: asNumber(item.quantity, 1),
                    unit: item.unit || 'piece',
                })),
                serving_size_g: asNumber(servingSizeG, 0),
                cooking_state: cookingState,
                lang: 'ar',
            });
            setEstimateResult(response);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to estimate nutrition.';
            showToast('error', message);
        } finally {
            setEstimating(false);
        }
    };

    const handleLoadCookpadDetails = async () => {
        if (!selectedRecipe) {
            showToast('warning', 'Select a recipe first.');
            return;
        }

        const query = selectedRecipe.food_name_ar || selectedRecipe.food_name_en;
        if (!query) {
            showToast('warning', 'Recipe title is required to fetch details.');
            return;
        }

        try {
            setCookpadLoading(true);
            setCookpadError('');
            const details = await searchSmartCookerCookpadDetails(query, selectedRecipe.recipe_id);
            setCookpadDetail(details);
            showToast('success', 'Cookpad details loaded.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not load Cookpad details.';
            setCookpadError(message);
            showToast('warning', message);
        } finally {
            setCookpadLoading(false);
        }
    };

    const handleOpenCookpadUrl = async () => {
        const url = cookpadDetail?.source_url;
        if (!url) return;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                showToast('error', 'Unable to open recipe link.');
                return;
            }
            await Linking.openURL(url);
        } catch {
            showToast('error', 'Unable to open recipe link.');
        }
    };

    const handleSuggestRecipes = async () => {
        const parsedIngredients = parseList(ingredientsQuery);
        if (parsedIngredients.length === 0) {
            showToast('warning', 'Add at least one ingredient.');
            return;
        }

        try {
            setSuggesting(true);
            const response = await searchSmartCookerRecipes({
                ingredients: parsedIngredients,
                limit: 12,
                lang: 'ar',
            });
            setSuggestions(response.suggestions || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to find recipe suggestions.';
            showToast('error', message);
            setSuggestions([]);
        } finally {
            setSuggesting(false);
        }
    };

    const handleUseSuggestion = async (suggestion: SmartCookerSuggestion) => {
        try {
            const recipe = await suggestionToRecipeItem(suggestion);
            setMode('recipe');
            setRecipeQuery(recipe.food_name_ar || recipe.food_name_en || '');
            setCatalogResults([]);
            await handleSelectRecipe(recipe);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load recipe details.';
            showToast('error', message);
        }
    };

    const handleAddToMeal = () => {
        if (!estimateResult) {
            showToast('warning', 'Estimate nutrition first.');
            return;
        }

        const nutrition = estimateResult.estimated_nutrition;
        const recipeName =
            estimateResult.recipe.food_name_ar || estimateResult.recipe.food_name_en || 'Smart Cooker Meal';

        const draftFood: SearchResult = {
            id: `smart-cooker-${estimateResult.recipe.recipe_id}-${Date.now()}`,
            name: recipeName,
            brand: 'Smart Cooker',
            calories: asNumber(nutrition.calories, 0),
            protein: asNumber(nutrition.protein, 0),
            carbs: asNumber(nutrition.carbs, 0),
            fats: asNumber(nutrition.fats, 0),
            fiber: asNumber(nutrition.fiber, 0),
            sugar: 0,
            servingSize: Math.max(1, asNumber(estimateResult.serving_size_g, 1)),
            servingUnit: 'g',
            source: 'external',
        };

        addFood(draftFood, { quantity: 1, unit: 'serving' });
        showToast('success', 'Recipe added. Save meal to count these macros in your totals.');
        router.back();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top', 'bottom']}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
                <LinearGradient
                    colors={['#10b77f', '#0f172a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: 'rgba(255,255,255,0.14)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ChefHat size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Smart Cooker</Text>
                            <Text style={{ marginTop: 2, color: '#94a3b8' }}>
                                Egyptian recipes with macro estimation and optional Cookpad detail steps
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => router.back()}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(255,255,255,0.16)',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.2)',
                            }}
                        >
                            <X size={16} color="#fff" />
                        </Pressable>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36, gap: 14 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        gap: 8,
                        borderRadius: 12,
                        backgroundColor: '#1e293b',
                        borderWidth: 1,
                        borderColor: '#334155',
                        padding: 5,
                    }}
                >
                    <Pressable
                        onPress={() => setMode('recipe')}
                        style={{
                            flex: 1,
                            borderRadius: 9,
                            borderWidth: 1,
                            borderColor: mode === 'recipe' ? '#10b77f' : 'transparent',
                            backgroundColor: mode === 'recipe' ? '#10b77f' : '#334155',
                            paddingVertical: 9,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: mode === 'recipe' ? '#f8fafc' : '#94a3b8', fontWeight: '800' }}>
                            Option 1: Recipe
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setMode('ingredients')}
                        style={{
                            flex: 1,
                            borderRadius: 9,
                            borderWidth: 1,
                            borderColor: mode === 'ingredients' ? '#10b77f' : 'transparent',
                            backgroundColor: mode === 'ingredients' ? '#10b77f' : '#334155',
                            paddingVertical: 9,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: mode === 'ingredients' ? '#f8fafc' : '#94a3b8', fontWeight: '800' }}>
                            Option 2: Ingredients
                        </Text>
                    </Pressable>
                </View>

                {mode === 'recipe' ? (
                    <>
                        <View
                            style={{
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: '#334155',
                                backgroundColor: '#1e293b',
                                padding: 12,
                                gap: 10,
                            }}
                        >
                            <Text style={{ color: '#f8fafc', fontWeight: '800' }}>Search recipe (كشري / Koshari)</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    value={recipeQuery}
                                    onChangeText={setRecipeQuery}
                                    placeholder="اكتب اسم الوجبة"
                                    onSubmitEditing={handleSearchRecipeCatalog}
                                    style={{
                                        flex: 1,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        backgroundColor: '#1e293b',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        color: '#f8fafc',
                                    }}
                                />
                                <Pressable
                                    onPress={handleSearchRecipeCatalog}
                                    style={{
                                        borderRadius: 10,
                                        backgroundColor: '#10b77f',
                                        width: 46,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {catalogLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Search size={16} color="#fff" />
                                    )}
                                </Pressable>
                            </View>

                            {catalogResults.length > 0 ? (
                                <View style={{ gap: 6 }}>
                                    {catalogResults.slice(0, 8).map((item) => (
                                        <Pressable
                                            key={item.recipe_id}
                                            onPress={() => handleSelectRecipe(item)}
                                            style={{
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor:
                                                    selectedRecipe?.recipe_id === item.recipe_id
                                                        ? '#10b77f'
                                                        : '#334155',
                                                backgroundColor:
                                                    selectedRecipe?.recipe_id === item.recipe_id
                                                        ? '#334155'
                                                        : '#1e293b',
                                                padding: 10,
                                            }}
                                        >
                                            <Text style={{ color: '#f8fafc', fontWeight: '800' }}>
                                                {item.food_name_ar || item.food_name_en}
                                            </Text>
                                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.food_name_en}</Text>
                                            <Text style={{ color: '#10b77f', fontSize: 12, fontWeight: '700' }}>
                                                Kind: {item.category || 'uncategorized'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            ) : null}
                        </View>

                        {selectedRecipe ? (
                            <View
                                style={{
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    backgroundColor: '#1e293b',
                                    padding: 12,
                                    gap: 11,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                    }}
                                >
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 16 }}>
                                            {selectedRecipeTitle}
                                        </Text>
                                        <Text style={{ color: '#10b77f', fontSize: 12, fontWeight: '700' }}>
                                            Kind: {selectedRecipeKind || 'uncategorized'}
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                            Adjust ingredient quantities, serving size, and dish state before estimating
                                            macros.
                                        </Text>
                                        {recipeDetailLoading ? (
                                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                                Loading recipe details...
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={handleLoadCookpadDetails}
                                        disabled={cookpadLoading}
                                        style={{
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: '#10b77f',
                                            backgroundColor: '#334155',
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            opacity: cookpadLoading ? 0.7 : 1,
                                        }}
                                    >
                                        <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 12 }}>
                                            {cookpadLoading ? 'Loading...' : 'Get Cookpad Steps'}
                                        </Text>
                                    </Pressable>
                                </View>

                                <Text
                                    style={{
                                        color: '#94a3b8',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.7,
                                        fontSize: 11,
                                    }}
                                >
                                    Ingredients ({ingredientInputs.length})
                                </Text>

                                {ingredientInputs.map((item, index) => (
                                    <View
                                        key={`${item.name}-${index}`}
                                        style={{
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#334155',
                                            backgroundColor: '#1e293b',
                                            padding: 9,
                                            gap: 8,
                                        }}
                                    >
                                        <Text style={{ color: '#f8fafc', fontWeight: '800' }}>{item.name}</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                            <TextInput
                                                value={item.quantity}
                                                onChangeText={(value) => handleChangeIngredientQuantity(index, value)}
                                                keyboardType="numeric"
                                                placeholder="1"
                                                style={{
                                                    width: 90,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: '#334155',
                                                    backgroundColor: '#1e293b',
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 8,
                                                    color: '#f8fafc',
                                                }}
                                            />
                                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                {UNIT_OPTIONS.map((unit) => {
                                                    const selected = item.unit === unit;
                                                    return (
                                                        <Pressable
                                                            key={`${item.name}-${unit}`}
                                                            onPress={() => handleChangeIngredientUnit(index, unit)}
                                                            style={{
                                                                borderRadius: 999,
                                                                borderWidth: 1,
                                                                borderColor: selected ? '#10b77f' : '#334155',
                                                                backgroundColor: selected ? '#10b77f' : '#334155',
                                                                paddingHorizontal: 10,
                                                                paddingVertical: 6,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: selected ? '#f8fafc' : '#94a3b8',
                                                                    fontWeight: '700',
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                {unit}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    </View>
                                ))}

                                <View style={{ flexDirection: useSplitLayout ? 'row' : 'column', gap: 10 }}>
                                    <View
                                        style={{
                                            flex: 1,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#334155',
                                            backgroundColor: '#1e293b',
                                            padding: 10,
                                            gap: 7,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: '#94a3b8',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.7,
                                                fontSize: 11,
                                            }}
                                        >
                                            Serving size (g)
                                        </Text>
                                        <TextInput
                                            value={servingSizeG}
                                            onChangeText={setServingSizeG}
                                            keyboardType="numeric"
                                            style={{
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: '#334155',
                                                backgroundColor: '#1e293b',
                                                paddingHorizontal: 10,
                                                paddingVertical: 8,
                                                color: '#f8fafc',
                                            }}
                                        />
                                    </View>

                                    <View
                                        style={{
                                            flex: 1,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#334155',
                                            backgroundColor: '#1e293b',
                                            padding: 10,
                                            gap: 7,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: '#94a3b8',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.7,
                                                fontSize: 11,
                                            }}
                                        >
                                            Before / After cooking
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <Pressable
                                                onPress={() => setCookingState('before')}
                                                style={{
                                                    flex: 1,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: cookingState === 'before' ? '#10b77f' : '#334155',
                                                    backgroundColor: cookingState === 'before' ? '#334155' : '#1e293b',
                                                    paddingVertical: 8,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: cookingState === 'before' ? '#f8fafc' : '#94a3b8',
                                                        fontWeight: '800',
                                                    }}
                                                >
                                                    Before
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => setCookingState('after')}
                                                style={{
                                                    flex: 1,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: cookingState === 'after' ? '#10b77f' : '#334155',
                                                    backgroundColor: cookingState === 'after' ? '#334155' : '#1e293b',
                                                    paddingVertical: 8,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: cookingState === 'after' ? '#f8fafc' : '#94a3b8',
                                                        fontWeight: '800',
                                                    }}
                                                >
                                                    After
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>

                                <Pressable
                                    onPress={handleEstimate}
                                    disabled={estimating}
                                    style={{
                                        borderRadius: 12,
                                        backgroundColor: '#10b77f',
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        gap: 8,
                                        opacity: estimating ? 0.7 : 1,
                                    }}
                                >
                                    {estimating ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Calculator size={16} color="#fff" />
                                    )}
                                    <Text style={{ color: '#fff', fontWeight: '800' }}>Estimate Nutrition</Text>
                                </Pressable>
                            </View>
                        ) : null}

                        {selectedRecipe ? (
                            <View style={{ flexDirection: useSplitLayout ? 'row' : 'column', gap: 10 }}>
                                <View
                                    style={{
                                        flex: 1,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        backgroundColor: '#1e293b',
                                        padding: 12,
                                        gap: 8,
                                    }}
                                >
                                    <Text style={{ color: '#10b77f', fontWeight: '800', fontSize: 16 }}>
                                        Estimated Macros ({estimateServingSize}g)
                                    </Text>
                                    {estimateResult ? (
                                        <>
                                            <Text style={{ color: '#10b77f', fontWeight: '800', fontSize: 22 }}>
                                                {Math.round(asNumber(estimateResult.estimated_nutrition.calories, 0))}{' '}
                                                kcal
                                            </Text>
                                            <View style={{ gap: 4 }}>
                                                <Text style={{ color: '#f8fafc', fontWeight: '700' }}>
                                                    Protein: {asNumber(estimateResult.estimated_nutrition.protein, 0)}g
                                                </Text>
                                                <Text style={{ color: '#f8fafc', fontWeight: '700' }}>
                                                    Carbs: {asNumber(estimateResult.estimated_nutrition.carbs, 0)}g
                                                </Text>
                                                <Text style={{ color: '#f8fafc', fontWeight: '700' }}>
                                                    Fat: {asNumber(estimateResult.estimated_nutrition.fats, 0)}g
                                                </Text>
                                                <Text style={{ color: '#f8fafc', fontWeight: '700' }}>
                                                    Fiber: {asNumber(estimateResult.estimated_nutrition.fiber, 0)}g
                                                </Text>
                                            </View>
                                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                                Confidence: {estimateResult.estimated_nutrition.confidence}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={{ color: '#94a3b8' }}>
                                            Run estimation to see full macro breakdown.
                                        </Text>
                                    )}

                                    <Pressable
                                        onPress={handleAddToMeal}
                                        disabled={!estimateResult}
                                        style={{
                                            marginTop: 2,
                                            borderRadius: 10,
                                            backgroundColor: estimateResult ? '#10b77f' : '#334155',
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '800' }}>Add to Meal</Text>
                                    </Pressable>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                        After adding, tap Save Meal to include these macros in daily totals.
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flex: 1,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        backgroundColor: '#1e293b',
                                        padding: 12,
                                        gap: 8,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Text style={{ color: '#10b77f', fontWeight: '800', fontSize: 16 }}>Steps</Text>
                                        <Text style={{ color: '#10b77f', fontSize: 12, fontWeight: '700' }}>
                                            {cookpadDetail?.instructions?.length ? 'Cookpad' : 'Guided'}
                                        </Text>
                                    </View>

                                    {cookpadLoading ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <ActivityIndicator color="#10b77f" />
                                            <Text style={{ color: '#10b77f', fontWeight: '700' }}>
                                                Fetching detailed steps...
                                            </Text>
                                        </View>
                                    ) : null}

                                    {cookpadError ? (
                                        <Text style={{ color: '#b45309', fontSize: 12 }}>{cookpadError}</Text>
                                    ) : null}

                                    <View style={{ gap: 8 }}>
                                        {displayedSteps.slice(0, 8).map((step, index) => (
                                            <View
                                                key={`${index + 1}-${step}`}
                                                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
                                            >
                                                <View
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 11,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: '#10221c',
                                                    }}
                                                >
                                                    <Text style={{ color: '#10b77f', fontWeight: '800', fontSize: 12 }}>
                                                        {index + 1}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: '#f8fafc', flex: 1 }}>{step}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {cookpadDetail?.source_url ? (
                                        <Pressable
                                            onPress={handleOpenCookpadUrl}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                        >
                                            <ExternalLink size={14} color="#10b77f" />
                                            <Text style={{ color: '#10b77f', fontWeight: '800' }}>
                                                Open recipe on Cookpad
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            </View>
                        ) : null}
                    </>
                ) : (
                    <>
                        <View
                            style={{
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: '#334155',
                                backgroundColor: '#1e293b',
                                padding: 12,
                                gap: 10,
                            }}
                        >
                            <Text style={{ color: '#f8fafc', fontWeight: '800' }}>What ingredients do you have?</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                Enter one per line or separated by commas to get ranked Egyptian recipe suggestions.
                            </Text>
                            <TextInput
                                value={ingredientsQuery}
                                onChangeText={setIngredientsQuery}
                                placeholder="رز, طماطم, عدس"
                                multiline
                                textAlignVertical="top"
                                style={{
                                    minHeight: 100,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    backgroundColor: '#1e293b',
                                    paddingHorizontal: 10,
                                    paddingVertical: 10,
                                    color: '#f8fafc',
                                }}
                            />

                            <Pressable
                                onPress={handleSuggestRecipes}
                                disabled={suggesting}
                                style={{
                                    borderRadius: 10,
                                    backgroundColor: '#10b77f',
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                    opacity: suggesting ? 0.7 : 1,
                                }}
                            >
                                {suggesting ? <ActivityIndicator color="#fff" /> : <Sparkles size={16} color="#fff" />}
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Suggest Recipes</Text>
                            </Pressable>
                        </View>

                        {suggestions.map((suggestion) => (
                            <View
                                key={suggestion.recipe_id || suggestion.cookpad_id}
                                style={{
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    backgroundColor: '#1e293b',
                                    padding: 12,
                                    gap: 8,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text style={{ color: '#f8fafc', fontWeight: '800', flex: 1 }}>
                                        {suggestion.title_ar}
                                    </Text>
                                    <ChefHat size={16} color="#10b77f" />
                                </View>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    Match {Math.round(asNumber(suggestion.ingredient_coverage, 0) * 100)}% {'·'}{' '}
                                    {Math.round(asNumber(suggestion.estimated_nutrition.calories, 0))} kcal
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    Protein {Math.round(asNumber(suggestion.estimated_nutrition.protein, 0))}g {'·'}{' '}
                                    Carbs {Math.round(asNumber(suggestion.estimated_nutrition.carbs, 0))}g {'·'} Fats{' '}
                                    {Math.round(asNumber(suggestion.estimated_nutrition.fats, 0))}g
                                </Text>
                                <Pressable
                                    onPress={() => handleUseSuggestion(suggestion)}
                                    style={{
                                        alignSelf: 'flex-start',
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        backgroundColor: '#1e293b',
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Text style={{ color: '#10b77f', fontWeight: '700' }}>Use this recipe</Text>
                                </Pressable>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

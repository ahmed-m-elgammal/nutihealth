import React from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import CalorieCircle from '../charts/CalorieCircle';
import { RecipeIngredient, ImportedRecipe, RecipeTotals } from '../../utils/recipeParser';
import IngredientsList from './IngredientsList';
import { UnitSystem } from '../../utils/arabicNumberConverter';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface RecipePreviewCardProps {
    recipe: ImportedRecipe;
    locale: 'en' | 'ar';
    rtl: boolean;
    mealType: MealType;
    selectedServings: number;
    selectedIngredientIds: string[];
    ingredientsForDisplay: RecipeIngredient[];
    totalNutrition: RecipeTotals;
    unitSystem: UnitSystem;
    isSaving: boolean;
    onUnitSystemChange: (system: UnitSystem) => void;
    onDecreaseServings: () => void;
    onIncreaseServings: () => void;
    onSetMealType: (mealType: MealType) => void;
    onToggleIngredient: (ingredientId: string) => void;
    onAddToMeal: () => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Recipe preview UI rendered before adding to diary.
 */
export function RecipePreviewCard({
    recipe,
    locale,
    rtl,
    mealType,
    selectedServings,
    selectedIngredientIds,
    ingredientsForDisplay,
    totalNutrition,
    unitSystem,
    isSaving,
    onUnitSystemChange,
    onDecreaseServings,
    onIncreaseServings,
    onSetMealType,
    onToggleIngredient,
    onAddToMeal,
}: RecipePreviewCardProps) {
    const { t } = useTranslation();

    const title = locale === 'ar' ? recipe.titleAr || recipe.title : recipe.title;
    const totalRecipeCalories = Math.max(1, Math.round(recipe.nutrition.calories * recipe.servings));

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm mb-4">
                {recipe.imageUrl ? (
                    <Image
                        source={{ uri: recipe.imageUrl }}
                        style={{ width: '100%', height: 200, backgroundColor: '#f5f5f5' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-52 bg-neutral-100 items-center justify-center">
                        <Text className="text-4xl">🍽️</Text>
                    </View>
                )}

                <View className="p-5">
                    <Text
                        className="text-2xl font-bold text-neutral-900"
                        style={{ textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}
                    >
                        {title}
                    </Text>

                    <Text
                        className="text-neutral-500 mt-2"
                        style={{ textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}
                    >
                        {t('recipeImport.preview.servingsInRecipe', { count: recipe.servings })}
                    </Text>

                    <View
                        className="mt-4 bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex-row items-center justify-between"
                        style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}
                    >
                        <Text className="text-neutral-700 font-semibold">
                            {t('recipeImport.preview.selectedServings')}
                        </Text>

                        <View className="flex-row items-center">
                            <Pressable
                                onPress={onDecreaseServings}
                                className="w-9 h-9 rounded-full bg-white border border-neutral-200 items-center justify-center"
                            >
                                <Text className="text-neutral-700 text-lg">-</Text>
                            </Pressable>
                            <Text className="mx-4 font-bold text-neutral-900 text-lg">
                                {selectedServings.toFixed(1).replace(/\.0$/, '')}
                            </Text>
                            <Pressable
                                onPress={onIncreaseServings}
                                className="w-9 h-9 rounded-full bg-white border border-neutral-200 items-center justify-center"
                            >
                                <Text className="text-neutral-700 text-lg">+</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>

            <View className="bg-white rounded-3xl border border-neutral-200 p-5 mb-4 shadow-sm">
                <Text className="text-lg font-bold text-neutral-900 mb-3" style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {t('recipeImport.preview.nutritionTitle')}
                </Text>

                <View className="items-center mb-4">
                    <CalorieCircle
                        current={Math.round(totalNutrition.calories)}
                        target={totalRecipeCalories}
                        size={140}
                    />
                </View>

                <View className="flex-row gap-2">
                    <MacroPill label={t('recipeImport.preview.protein')} value={`${Math.round(totalNutrition.protein)}g`} backgroundColor="#eff6ff" valueColor="#1d4ed8" />
                    <MacroPill label={t('recipeImport.preview.carbs')} value={`${Math.round(totalNutrition.carbs)}g`} backgroundColor="#fff7ed" valueColor="#c2410c" />
                    <MacroPill label={t('recipeImport.preview.fats')} value={`${Math.round(totalNutrition.fats)}g`} backgroundColor="#faf5ff" valueColor="#7e22ce" />
                </View>

                <Text className="text-xs text-neutral-500 mt-3" style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {t('recipeImport.preview.perServingHint', {
                        calories: Math.round(recipe.nutrition.calories),
                        protein: Math.round(recipe.nutrition.protein),
                        carbs: Math.round(recipe.nutrition.carbs),
                        fats: Math.round(recipe.nutrition.fats),
                    })}
                </Text>
            </View>

            <View className="bg-white rounded-3xl border border-neutral-200 p-5 mb-4 shadow-sm">
                <IngredientsList
                    ingredients={ingredientsForDisplay}
                    selectedIngredientIds={selectedIngredientIds}
                    locale={locale}
                    rtl={rtl}
                    unitSystem={unitSystem}
                    onUnitSystemChange={onUnitSystemChange}
                    onToggleIngredient={onToggleIngredient}
                />
            </View>

            <View className="bg-white rounded-3xl border border-neutral-200 p-5 mb-4 shadow-sm">
                <Text className="text-lg font-bold text-neutral-900 mb-3" style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {t('recipeImport.preview.instructions')}
                </Text>
                {recipe.instructions.map((instruction, index) => (
                    <View
                        key={`${instruction.slice(0, 20)}-${index}`}
                        className="mb-3 flex-row"
                        style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}
                    >
                        <View className="w-6 h-6 rounded-full bg-primary-100 items-center justify-center mt-0.5">
                            <Text className="text-primary-700 text-xs font-bold">{index + 1}</Text>
                        </View>
                        <Text
                            className="flex-1 text-neutral-700 leading-6"
                            style={{
                                marginLeft: rtl ? 0 : 10,
                                marginRight: rtl ? 10 : 0,
                                textAlign: rtl ? 'right' : 'left',
                                writingDirection: rtl ? 'rtl' : 'ltr',
                            }}
                        >
                            {instruction}
                        </Text>
                    </View>
                ))}
            </View>

            <View className="bg-white rounded-3xl border border-neutral-200 p-5 mb-4 shadow-sm">
                <Text className="text-lg font-bold text-neutral-900 mb-3" style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {t('recipeImport.preview.mealType')}
                </Text>
                <View className="flex-row flex-wrap gap-2" style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}>
                    {MEAL_TYPES.map((type) => (
                        <Pressable
                            key={type}
                            onPress={() => onSetMealType(type)}
                            className={`px-4 py-2 rounded-full border ${
                                mealType === type
                                    ? 'bg-primary-500 border-primary-500'
                                    : 'bg-white border-neutral-200'
                            }`}
                        >
                            <Text className={`font-semibold ${mealType === type ? 'text-white' : 'text-neutral-700'}`}>
                                {t(`recipeImport.mealTypes.${type}`)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <Pressable
                className={`rounded-2xl py-4 items-center ${isSaving ? 'bg-primary-300' : 'bg-primary-500'}`}
                disabled={isSaving}
                onPress={onAddToMeal}
            >
                {isSaving ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text className="text-white text-base font-bold">
                        {t('recipeImport.preview.addToMeal', {
                            mealType: t(`recipeImport.mealTypes.${mealType}`),
                        })}
                    </Text>
                )}
            </Pressable>
        </ScrollView>
    );
}

function MacroPill({
    label,
    value,
    backgroundColor,
    valueColor,
}: {
    label: string;
    value: string;
    backgroundColor: string;
    valueColor: string;
}) {
    return (
        <View className="flex-1 rounded-2xl p-3 items-center" style={{ backgroundColor }}>
            <Text className="text-xs text-neutral-500">{label}</Text>
            <Text className="text-base font-bold mt-1" style={{ color: valueColor }}>{value}</Text>
        </View>
    );
}

export default RecipePreviewCard;

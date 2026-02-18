import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RecipeIngredient } from '../../utils/recipeParser';
import { formatLocalizedAmount, UnitSystem } from '../../utils/arabicNumberConverter';

interface IngredientsListProps {
    ingredients: RecipeIngredient[];
    selectedIngredientIds: string[];
    locale: 'en' | 'ar';
    rtl: boolean;
    unitSystem: UnitSystem;
    onUnitSystemChange: (system: UnitSystem) => void;
    onToggleIngredient: (ingredientId: string) => void;
}

interface IngredientRowProps {
    ingredient: RecipeIngredient;
    selected: boolean;
    locale: 'en' | 'ar';
    rtl: boolean;
    onPress: () => void;
}

function IngredientRow({ ingredient, selected, locale, rtl, onPress }: IngredientRowProps) {
    const scale = useSharedValue(selected ? 1 : 0.85);

    useEffect(() => {
        scale.value = withSpring(selected ? 1 : 0.85, {
            stiffness: 220,
            damping: 15,
        });
    }, [scale, selected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const amountText = formatLocalizedAmount(ingredient.amount, ingredient.unit, locale);
    const name = locale === 'ar' ? ingredient.nameAr || ingredient.name : ingredient.name;

    return (
        <Pressable
            onPress={onPress}
            className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 mb-2 flex-row items-center"
            style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}
        >
            <Animated.View
                style={animatedStyle}
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 bg-white'
                }`}
            >
                {selected && <Text className="text-white text-xs font-bold">✓</Text>}
            </Animated.View>

            <View
                className="flex-1"
                style={{ marginLeft: rtl ? 0 : 12, marginRight: rtl ? 12 : 0 }}
            >
                <Text
                    className="text-neutral-900 font-semibold"
                    style={{ textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}
                >
                    {name}
                </Text>
                <Text
                    className="text-neutral-500 text-xs mt-1"
                    style={{ textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}
                >
                    {amountText}
                </Text>
            </View>
        </Pressable>
    );
}

/**
 * Recipe ingredients with animated checkboxes and unit system toggles.
 */
export function IngredientsList({
    ingredients,
    selectedIngredientIds,
    locale,
    rtl,
    unitSystem,
    onUnitSystemChange,
    onToggleIngredient,
}: IngredientsListProps) {
    const { t } = useTranslation();

    return (
        <View>
            <View className="flex-row items-center justify-between mb-3" style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}>
                <Text className="text-lg font-bold text-neutral-900" style={{ writingDirection: rtl ? 'rtl' : 'ltr' }}>
                    {t('recipeImport.preview.ingredients')}
                </Text>

                <View className="bg-neutral-100 p-1 rounded-full flex-row">
                    <Pressable
                        onPress={() => onUnitSystemChange('metric')}
                        className={`px-3 py-1 rounded-full ${unitSystem === 'metric' ? 'bg-white' : ''}`}
                    >
                        <Text className={`text-xs font-semibold ${unitSystem === 'metric' ? 'text-neutral-800' : 'text-neutral-500'}`}>
                            {t('recipeImport.preview.metric')}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onUnitSystemChange('imperial')}
                        className={`px-3 py-1 rounded-full ${unitSystem === 'imperial' ? 'bg-white' : ''}`}
                    >
                        <Text className={`text-xs font-semibold ${unitSystem === 'imperial' ? 'text-neutral-800' : 'text-neutral-500'}`}>
                            {t('recipeImport.preview.imperial')}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {ingredients.map((ingredient) => (
                <IngredientRow
                    key={ingredient.id}
                    ingredient={ingredient}
                    selected={selectedIngredientIds.includes(ingredient.id)}
                    locale={locale}
                    rtl={rtl}
                    onPress={() => onToggleIngredient(ingredient.id)}
                />
            ))}
        </View>
    );
}

export default IngredientsList;
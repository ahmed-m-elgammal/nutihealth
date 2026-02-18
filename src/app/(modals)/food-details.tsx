import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Heading, Body, Caption, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useMealStore } from '../../store/mealStore';
import { calculateNutritionForServing, FoodItem } from '../../services/api/openFoodFacts';

export default function FoodDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addMeal } = useMealStore();

    const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [servingSize, setServingSize] = useState('100'); // Default to what's in foodItem or 100
    const [servingUnit, setServingUnit] = useState('g');
    const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
    const [calculatedNutrition, setCalculatedNutrition] = useState<FoodItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (params.food) {
            try {
                const parsedFood = JSON.parse(params.food as string);
                setFoodItem(parsedFood);
                setServingSize(parsedFood.servingSize?.toString() || '100');
                setServingUnit(parsedFood.servingUnit || 'g');
                setCalculatedNutrition(parsedFood);
            } catch (e) {
                console.error("Failed to parse food params", e);
                Alert.alert("Error", "Could not load food details");
                router.back();
            }
        }
    }, [params.food]);

    useEffect(() => {
        if (foodItem && quantity && servingSize) {
            const qty = parseFloat(quantity);
            const size = parseFloat(servingSize);

            if (!isNaN(qty) && !isNaN(size)) {
                // Determine total amount consumed based on quantity * servingSize if unit matches
                // Or if quantity is "number of servings", we treat it differently.
                // Let's assume quantity is "Number of servings" of size "servingSize".

                // If the foodItem's base values are per 100g, and servingSize is set to 100, ratio is 1.
                // If user changes servingSize to 200, we need to recalculate base vs new.

                // Logic: 
                // 1. Calculate nutrition for the single serving size (e.g. 150g) from base (usually 100g)
                const singleServing = calculateNutritionForServing(foodItem, size, servingUnit);

                // 2. Multiply by quantity (number of servings)
                const total = {
                    ...singleServing,
                    calories: Math.round(singleServing.calories * qty),
                    protein: Math.round(singleServing.protein * qty),
                    carbs: Math.round(singleServing.carbs * qty),
                    fats: Math.round(singleServing.fats * qty),
                    quantity: qty
                };

                setCalculatedNutrition(total);
            }
        }
    }, [quantity, servingSize, foodItem]);

    const handleSave = async () => {
        if (!calculatedNutrition || !foodItem) return;

        setIsSaving(true);
        try {
            await addMeal({
                name: foodItem.name,
                mealType,
                consumedAt: new Date(),
                foods: [{
                    // Recalculate per-serving values to be safe
                    ...calculateNutritionForServing(foodItem, parseFloat(servingSize), servingUnit),
                    quantity: parseFloat(quantity)
                }]
            });

            // Show success and go back to meals
            router.dismissTo('/(tabs)/meals');
        } catch (error) {
            Alert.alert("Error", "Failed to save meal");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!foodItem || !calculatedNutrition) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <ScreenLayout className="bg-background">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <X size={24} className="text-foreground" />
                </TouchableOpacity>
                <Heading>Food Details</Heading>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Food Header */}
                <View className="mb-6">
                    <Heading>{foodItem.name}</Heading>
                    <Body className="text-muted-foreground">{foodItem.brand || 'Unknown Brand'}</Body>
                    {foodItem.calories > 0 && (
                        <View className="bg-primary-100 self-start px-3 py-1 rounded-full mt-2">
                            <Text className="text-primary-700 font-bold">{foodItem.calories} kcal / {foodItem.servingSize}{foodItem.servingUnit}</Text>
                        </View>
                    )}
                </View>

                {/* Macro Summary Card (Calculated) */}
                <Card className="mb-6 bg-neutral-900 border-neutral-900">
                    <CardContent className="p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Heading className="text-white">
                                {calculatedNutrition.calories} kcal
                            </Heading>
                            <Caption className="text-neutral-400">Total for this entry</Caption>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1 items-center bg-white/10 p-3 rounded-xl">
                                <Text className="text-blue-400 font-bold text-lg">{calculatedNutrition.protein}g</Text>
                                <Text className="text-neutral-400 text-xs mt-1">Protein</Text>
                            </View>
                            <View className="flex-1 items-center bg-white/10 p-3 rounded-xl">
                                <Text className="text-orange-400 font-bold text-lg">{calculatedNutrition.carbs}g</Text>
                                <Text className="text-neutral-400 text-xs mt-1">Carbs</Text>
                            </View>
                            <View className="flex-1 items-center bg-white/10 p-3 rounded-xl">
                                <Text className="text-purple-400 font-bold text-lg">{calculatedNutrition.fats}g</Text>
                                <Text className="text-neutral-400 text-xs mt-1">Fats</Text>
                            </View>
                        </View>
                    </CardContent>
                </Card>

                {/* Serving Configuration */}
                <View className="mb-6 space-y-4">
                    <Subheading>Serving Size</Subheading>

                    <View className="flex-row gap-4">
                        <View className="flex-1">
                            <Text className="text-sm text-muted-foreground mb-2">Serving Size ({servingUnit})</Text>
                            <TextInput
                                className="bg-neutral-100 p-4 rounded-xl text-lg font-semibold"
                                keyboardType="numeric"
                                value={servingSize}
                                onChangeText={setServingSize}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm text-muted-foreground mb-2">Number of Servings</Text>
                            <TextInput
                                className="bg-neutral-100 p-4 rounded-xl text-lg font-semibold"
                                keyboardType="numeric"
                                value={quantity}
                                onChangeText={setQuantity}
                            />
                        </View>
                    </View>
                </View>

                {/* Meal Type Selection */}
                <View className="mb-8">
                    <Subheading className="mb-4">Meal Type</Subheading>
                    <View className="flex-row flex-wrap gap-3">
                        {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setMealType(type as any)}
                                className={`px-4 py-3 rounded-xl border ${mealType === type
                                    ? 'bg-primary-600 border-primary-600'
                                    : 'bg-white border-neutral-200'
                                    }`}
                            >
                                <Text className={`font-semibold capitalize ${mealType === type ? 'text-white' : 'text-neutral-700'
                                    }`}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100">
                <Button
                    size="lg"
                    className="w-full"
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Check size={20} className="text-white mr-2" />
                            <Text className="text-white font-bold text-lg">Add to Log</Text>
                        </>
                    )}
                </Button>
            </View>
        </ScreenLayout>
    );
}

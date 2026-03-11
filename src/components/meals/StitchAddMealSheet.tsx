import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, ChefHat, ScanLine, Search } from 'lucide-react-native';
import { useAddMealDraftStore } from '../../store/addMealDraftStore';
import { triggerHaptic } from '../../utils/haptics';
import { stitchModalColors, stitchModalSharedStyles } from './modalTheme';

type StitchAddMealSheetProps = {
    onOpenSearch: () => void;
    onOpenScan: () => void;
    onOpenAiDetect: () => void;
    onOpenCookpadSearch: () => void;
    onSaveMeal: () => void;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function StitchAddMealSheet({
    onOpenSearch,
    onOpenScan,
    onOpenAiDetect,
    onOpenCookpadSearch,
    onSaveMeal,
}: StitchAddMealSheetProps) {
    const mealType = useAddMealDraftStore((state) => state.mealType);
    const setMealType = useAddMealDraftStore((state) => state.setMealType);
    const foods = useAddMealDraftStore((state) => state.foods);
    const removeFood = useAddMealDraftStore((state) => state.removeFood);

    const totalCalories = foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
    const totalProtein = foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
    const totalCarbs = foods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
    const totalFats = foods.reduce((sum, food) => sum + food.fats * food.quantity, 0);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Meal</Text>
            <Text style={styles.stepLabel}>Step 1 · Meal type</Text>

            <View style={styles.chipRow}>
                {MEAL_TYPES.map((type) => {
                    const active = mealType === type;
                    return (
                        <Pressable
                            key={type}
                            onPress={() => {
                                triggerHaptic('light').catch(() => undefined);
                                setMealType(type);
                            }}
                            android_ripple={{ color: 'rgba(16,183,127,0.24)' }}
                            style={[styles.mealChip, active && styles.mealChipActive]}
                        >
                            <Text style={[styles.mealChipText, active && styles.mealChipTextActive]}>{type}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={styles.stepLabel}>Step 2 · Entry method</Text>
            <View style={styles.methodList}>
                <Pressable
                    onPress={onOpenSearch}
                    android_ripple={{ color: 'rgba(16,183,127,0.18)' }}
                    style={styles.methodCard}
                >
                    <Search size={18} color={stitchModalColors.primary} />
                    <Text style={styles.methodText}>Search Food</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenScan}
                    android_ripple={{ color: 'rgba(16,183,127,0.18)' }}
                    style={styles.methodCard}
                >
                    <ScanLine size={18} color={stitchModalColors.primary} />
                    <Text style={styles.methodText}>Scan Barcode</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenCookpadSearch}
                    android_ripple={{ color: 'rgba(16,183,127,0.18)' }}
                    style={styles.methodCard}
                >
                    <ChefHat size={18} color={stitchModalColors.primary} />
                    <Text style={styles.methodText}>Smart Cooker</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenAiDetect}
                    android_ripple={{ color: 'rgba(16,183,127,0.18)' }}
                    style={styles.methodCard}
                >
                    <Camera size={18} color={stitchModalColors.primary} />
                    <Text style={styles.methodText}>AI Photo Detect</Text>
                </Pressable>
            </View>

            <Text style={styles.stepLabel}>Step 3 · Selected foods</Text>
            <View style={styles.selectedFoodsCard}>
                {foods.length === 0 ? (
                    <Text style={styles.emptyFoodsText}>No foods added yet. Use Search Food to add items.</Text>
                ) : (
                    <>
                        {foods.slice(0, 4).map((food) => (
                            <View key={food.id} style={styles.foodRow}>
                                <View style={styles.foodTextWrap}>
                                    <Text style={styles.foodName}>{food.name}</Text>
                                    <Text style={styles.foodMeta}>
                                        {food.quantity} {food.servingUnit} {'•'}{' '}
                                        {Math.round(food.calories * food.quantity)} kcal
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => removeFood(food.id)}
                                    android_ripple={{ color: 'rgba(248,250,252,0.14)' }}
                                    style={styles.removeButton}
                                >
                                    <Text style={styles.removeButtonText}>Remove</Text>
                                </Pressable>
                            </View>
                        ))}

                        {foods.length > 4 ? (
                            <Text style={styles.foodMeta}>+{foods.length - 4} more item(s)</Text>
                        ) : null}

                        <Text style={styles.totalCalories}>Total: {Math.round(totalCalories)} kcal</Text>
                        <Text style={styles.totalMacros}>
                            Protein {Math.round(totalProtein)}g {'·'} Carbs {Math.round(totalCarbs)}g {'·'} Fat{' '}
                            {Math.round(totalFats)}g
                        </Text>
                    </>
                )}
            </View>

            <Pressable
                onPress={() => {
                    triggerHaptic('success').catch(() => undefined);
                    onSaveMeal();
                }}
                android_ripple={{ color: 'rgba(248,250,252,0.24)' }}
                style={[stitchModalSharedStyles.actionButton, styles.saveButton]}
            >
                <Text style={stitchModalSharedStyles.actionButtonText}>Save Meal</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: stitchModalColors.bgDark,
        padding: 16,
    },
    title: {
        fontWeight: '800',
        fontSize: 22,
        color: stitchModalColors.textMain,
    },
    stepLabel: {
        color: stitchModalColors.textSecondary,
        marginTop: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        fontSize: 12,
        fontWeight: '700',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    mealChip: {
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: stitchModalColors.cardDark,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
    },
    mealChipActive: {
        backgroundColor: stitchModalColors.primary,
        borderColor: stitchModalColors.primary,
    },
    mealChipText: {
        textTransform: 'capitalize',
        color: stitchModalColors.textSecondary,
        fontWeight: '700',
    },
    mealChipTextActive: {
        color: stitchModalColors.textMain,
        fontWeight: '800',
    },
    methodList: {
        marginTop: 10,
        gap: 10,
    },
    methodCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: stitchModalColors.cardDark,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
    },
    methodText: {
        color: stitchModalColors.textMain,
        fontWeight: '700',
    },
    selectedFoodsCard: {
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: stitchModalColors.cardDark,
        padding: 12,
        gap: 8,
    },
    emptyFoodsText: {
        color: stitchModalColors.textSecondary,
    },
    foodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    foodTextWrap: {
        flex: 1,
        paddingRight: 10,
    },
    foodName: {
        fontWeight: '700',
        color: stitchModalColors.textMain,
    },
    foodMeta: {
        color: stitchModalColors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    removeButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: 'rgba(15,23,42,0.45)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    removeButtonText: {
        color: stitchModalColors.textMain,
        fontWeight: '700',
        fontSize: 12,
    },
    totalCalories: {
        color: stitchModalColors.textMain,
        fontWeight: '800',
        marginTop: 2,
    },
    totalMacros: {
        color: stitchModalColors.textSecondary,
        fontSize: 12,
    },
    saveButton: {
        marginTop: 'auto',
    },
});

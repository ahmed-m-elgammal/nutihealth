import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Search, ScanLine, Camera, ChefHat } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';
import { useAddMealDraftStore } from '../../store/addMealDraftStore';

type AddMealSheetProps = {
    onOpenSearch: () => void;
    onOpenScan: () => void;
    onOpenAiDetect: () => void;
    onOpenCookpadSearch: () => void;
    onSaveMeal: () => void;
    isAiEnabled?: boolean;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function AddMealSheet({
    onOpenSearch,
    onOpenScan,
    onOpenAiDetect,
    onOpenCookpadSearch,
    onSaveMeal,
    isAiEnabled = true,
}: AddMealSheetProps) {
    const mealType = useAddMealDraftStore((state) => state.mealType);
    const setMealType = useAddMealDraftStore((state) => state.setMealType);
    const foods = useAddMealDraftStore((state) => state.foods);
    const removeFood = useAddMealDraftStore((state) => state.removeFood);

    const totalCalories = foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
    const totalProtein = foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
    const totalCarbs = foods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
    const totalFats = foods.reduce((sum, food) => sum + food.fats * food.quantity, 0);

    return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: 20, color: '#0f172a' }}>Add Meal</Text>
            <Text style={{ color: '#64748b', marginTop: 2 }}>Step 1 · Meal type</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {MEAL_TYPES.map((type) => (
                    <Pressable
                        key={type}
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            setMealType(type);
                        }}
                        android_ripple={{ color: 'rgba(22,163,74,0.12)' }}
                        style={{
                            borderRadius: 999,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: mealType === type ? '#16a34a' : '#cbd5e1',
                            backgroundColor: mealType === type ? '#dcfce7' : '#fff',
                        }}
                    >
                        <Text
                            style={{
                                textTransform: 'capitalize',
                                color: mealType === type ? '#166534' : '#334155',
                                fontWeight: '700',
                            }}
                        >
                            {type}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={{ color: '#64748b', marginTop: 18 }}>Step 2 · Entry method</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
                <Pressable
                    onPress={onOpenSearch}
                    android_ripple={{ color: '#dcfce7' }}
                    style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        overflow: 'hidden',
                    }}
                >
                    <Search size={18} color="#16a34a" />
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>Search Food</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenScan}
                    android_ripple={{ color: '#dbeafe' }}
                    style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        overflow: 'hidden',
                    }}
                >
                    <ScanLine size={18} color="#2563eb" />
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>Scan Barcode</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenCookpadSearch}
                    android_ripple={{ color: '#ffedd5' }}
                    style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        overflow: 'hidden',
                    }}
                >
                    <ChefHat size={18} color="#ea580c" />
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>Smart Cooker</Text>
                </Pressable>
                {isAiEnabled ? (
                    <Pressable
                        onPress={onOpenAiDetect}
                        android_ripple={{ color: '#f3e8ff' }}
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            padding: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <Camera size={18} color="#9333ea" />
                        <Text style={{ fontWeight: '700', color: '#0f172a' }}>AI Photo Detect</Text>
                    </Pressable>
                ) : null}
            </View>

            <Text style={{ color: '#64748b', marginTop: 18 }}>Step 3 · Selected foods</Text>
            <View
                style={{
                    marginTop: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 12,
                    gap: 8,
                }}
            >
                {foods.length === 0 ? (
                    <Text style={{ color: '#64748b' }}>No foods added yet. Use Search Food to add items.</Text>
                ) : (
                    <>
                        {foods.slice(0, 4).map((food) => (
                            <View
                                key={food.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>{food.name}</Text>
                                    <Text style={{ color: '#64748b', fontSize: 12 }}>
                                        {food.quantity} {food.servingUnit} {'•'}{' '}
                                        {Math.round(food.calories * food.quantity)} kcal
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => removeFood(food.id)}
                                    android_ripple={{ color: 'rgba(239,68,68,0.15)' }}
                                    style={{
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: '#fecaca',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12 }}>Remove</Text>
                                </Pressable>
                            </View>
                        ))}
                        {foods.length > 4 ? (
                            <Text style={{ color: '#64748b', fontSize: 12 }}>+{foods.length - 4} more item(s)</Text>
                        ) : null}
                        <Text style={{ color: '#0f172a', fontWeight: '700', marginTop: 2 }}>
                            Total: {Math.round(totalCalories)} kcal
                        </Text>
                        <Text style={{ color: '#334155', fontSize: 12 }}>
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
                android_ripple={{ color: 'rgba(220,252,231,0.35)' }}
                style={{
                    marginTop: 'auto',
                    borderRadius: 14,
                    backgroundColor: '#16a34a',
                    paddingVertical: 14,
                    alignItems: 'center',
                    overflow: 'hidden',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save Meal</Text>
            </Pressable>
        </View>
    );
}

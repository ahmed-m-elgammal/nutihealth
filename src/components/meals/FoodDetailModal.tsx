import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type FoodDetailModalProps = {
    food: {
        name: string;
        brand?: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    onSave: () => void;
    onRemove: () => void;
};

export default function FoodDetailModal({ food, onSave, onRemove }: FoodDetailModalProps) {
    const [qty, setQty] = useState('1');
    const q = Number(qty) || 1;

    const totals = useMemo(
        () => ({
            calories: Math.round(food.calories * q),
            protein: Math.round(food.protein * q),
            carbs: Math.round(food.carbs * q),
            fats: Math.round(food.fats * q),
        }),
        [food, q],
    );

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#fff' }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>{food.name}</Text>
            <Text style={{ color: '#64748b', marginTop: 2 }}>{food.brand || 'Unknown brand'}</Text>

            <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>Nutrition facts</Text>
                <Text style={{ marginTop: 6, color: '#334155' }}>{totals.calories} kcal</Text>
                <Text style={{ color: '#2563eb' }}>Protein: {totals.protein}g</Text>
                <Text style={{ color: '#d97706' }}>Carbs: {totals.carbs}g</Text>
                <Text style={{ color: '#db2777' }}>Fats: {totals.fats}g</Text>
            </View>

            <View style={{ marginTop: 14 }}>
                <Text style={{ color: '#334155', marginBottom: 6 }}>Quantity</Text>
                <TextInput
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontWeight: '700' }}
                />
            </View>

            <View style={{ marginTop: 18, flexDirection: 'row', gap: 10 }}>
                <Pressable
                    onPress={onSave}
                    android_ripple={{ color: 'rgba(220,252,231,0.35)' }}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: '#16a34a',
                        paddingVertical: 12,
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Save Changes</Text>
                </Pressable>
                <Pressable
                    onPress={onRemove}
                    android_ripple={{ color: 'rgba(254,226,226,0.5)' }}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        backgroundColor: '#fff',
                        paddingVertical: 12,
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#dc2626', fontWeight: '700' }}>Remove</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

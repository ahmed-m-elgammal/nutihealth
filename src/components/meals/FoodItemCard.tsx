import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Copy, Trash2 } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

type FoodItem = {
    id: string;
    name: string;
    brand?: string;
    quantity?: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
};

type FoodItemCardProps = {
    item: FoodItem;
    onPress: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
};

export default function FoodItemCard({ item, onPress, onDelete, onDuplicate }: FoodItemCardProps) {
    return (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
            style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#fff',
                padding: 12,
                overflow: 'hidden',
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
                    {item.brand ? (
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.brand}</Text>
                    ) : null}
                    <Text style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>
                        {Math.round(item.quantity || 1)} serving • {Math.round(item.calories)} kcal
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            onDuplicate();
                        }}
                        android_ripple={{ color: '#dbeafe' }}
                        style={{ borderRadius: 999, padding: 8, backgroundColor: '#eff6ff', overflow: 'hidden' }}
                    >
                        <Copy size={14} color="#1d4ed8" />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('medium').catch(() => undefined);
                            onDelete();
                        }}
                        android_ripple={{ color: '#fee2e2' }}
                        style={{ borderRadius: 999, padding: 8, backgroundColor: '#fef2f2', overflow: 'hidden' }}
                    >
                        <Trash2 size={14} color="#dc2626" />
                    </Pressable>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: '#2563eb' }}>P {Math.round(item.protein || 0)}g</Text>
                <Text style={{ fontSize: 11, color: '#d97706' }}>C {Math.round(item.carbs || 0)}g</Text>
                <Text style={{ fontSize: 11, color: '#db2777' }}>F {Math.round(item.fats || 0)}g</Text>
            </View>
        </Pressable>
    );
}

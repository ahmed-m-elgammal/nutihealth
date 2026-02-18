import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Search, ScanLine, Camera } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

type AddMealSheetProps = {
    onOpenSearch: () => void;
    onOpenScan: () => void;
    onOpenAiDetect: () => void;
    onSaveMeal: () => void;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function AddMealSheet({ onOpenSearch, onOpenScan, onOpenAiDetect, onSaveMeal }: AddMealSheetProps) {
    const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>('breakfast');

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

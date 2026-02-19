import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

type Ingredient = { name: string; amount: string; checked: boolean };

type PrepTabProps = {
    ingredients: Ingredient[];
    prepTime: number;
    onToggleIngredient: (index: number) => void;
};

export default function PrepTab({ ingredients, prepTime, onToggleIngredient }: PrepTabProps) {
    const completed = ingredients.filter((item) => item.checked).length;
    const progress = ingredients.length ? completed / ingredients.length : 0;

    return (
        <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Prep time estimate: {prepTime} min</Text>

            <View
                style={{ marginTop: 10, height: 10, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' }}
            >
                <View style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: '#16a34a', height: 10 }} />
            </View>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
                {completed}/{ingredients.length} ingredients ready
            </Text>

            <FlashList
                data={ingredients}
                estimatedItemSize={56}
                scrollEnabled={false}
                keyExtractor={(item, idx) => `${item.name}-${idx}`}
                renderItem={({ item, index }) => (
                    <Pressable
                        onPress={() => onToggleIngredient(index)}
                        android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                        style={{
                            marginTop: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: '#fff',
                            padding: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                borderWidth: 1,
                                borderColor: item.checked ? '#16a34a' : '#94a3b8',
                                backgroundColor: item.checked ? '#16a34a' : '#fff',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {item.checked ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#0f172a', fontWeight: '600' }}>{item.name}</Text>
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>{item.amount}</Text>
                    </Pressable>
                )}
            />
        </View>
    );
}

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { triggerHaptic } from '../../utils/haptics';

type ServingSizePickerProps = {
    visible: boolean;
    foodName: string;
    caloriesPerServing: number;
    onClose: () => void;
    onAdd: (payload: { quantity: number; unit: string; calories: number }) => void;
};

const UNITS = ['g', 'ml', 'piece', 'serving'];

export default function ServingSizePicker({
    visible,
    foodName,
    caloriesPerServing,
    onClose,
    onAdd,
}: ServingSizePickerProps) {
    const [quantity, setQuantity] = useState('1');
    const [unit, setUnit] = useState('serving');

    const totalCalories = useMemo(() => {
        const qty = Number(quantity) || 0;
        return Math.round(qty * caloriesPerServing);
    }, [quantity, caloriesPerServing]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        height: '85%',
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        padding: 16,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{foodName}</Text>
                    <Text style={{ color: '#64748b', marginTop: 4 }}>Choose serving size</Text>

                    <View style={{ marginTop: 14 }}>
                        <Text style={{ color: '#334155', marginBottom: 6 }}>Quantity</Text>
                        <TextInput
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                            style={{
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                                borderRadius: 12,
                                padding: 12,
                                fontSize: 18,
                                fontWeight: '700',
                            }}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                        {UNITS.map((u) => (
                            <Pressable
                                key={u}
                                onPress={() => {
                                    triggerHaptic('light').catch(() => undefined);
                                    setUnit(u);
                                }}
                                android_ripple={{ color: 'rgba(22,163,74,0.12)' }}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: unit === u ? '#16a34a' : '#cbd5e1',
                                    backgroundColor: unit === u ? '#dcfce7' : '#fff',
                                }}
                            >
                                <Text style={{ color: unit === u ? '#166534' : '#334155', fontWeight: '600' }}>
                                    {u}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#f8fafc', padding: 12 }}>
                        <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                            Total calories: {totalCalories} kcal
                        </Text>
                    </View>

                    <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            onPress={onClose}
                            android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                            style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                                borderRadius: 12,
                                paddingVertical: 12,
                                alignItems: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            <Text style={{ fontWeight: '700', color: '#334155' }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                triggerHaptic('success').catch(() => undefined);
                                onAdd({ quantity: Number(quantity) || 1, unit, calories: totalCalories });
                            }}
                            android_ripple={{ color: 'rgba(220,252,231,0.4)' }}
                            style={{
                                flex: 1,
                                borderRadius: 12,
                                backgroundColor: '#16a34a',
                                paddingVertical: 12,
                                alignItems: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            <Text style={{ fontWeight: '700', color: '#fff' }}>Add</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

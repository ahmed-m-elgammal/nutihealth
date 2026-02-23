import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type WaterCustomInputProps = {
    onSubmit: (amount: number) => void;
};

export default function WaterCustomInput({ onSubmit }: WaterCustomInputProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid amount in ml');
            return;
        }

        setError(null);
        setValue('');
        onSubmit(amount);
    };

    return (
        <View style={{ marginTop: 14 }}>
            <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Custom Amount</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                    value={value}
                    onChangeText={setValue}
                    keyboardType="numeric"
                    placeholder="Type ml"
                    placeholderTextColor="#94a3b8"
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: '#0f172a',
                        fontWeight: '600',
                    }}
                />
                <Pressable
                    onPress={handleSubmit}
                    android_ripple={{ color: 'rgba(153,246,228,0.3)' }}
                    style={{
                        borderRadius: 12,
                        backgroundColor: '#14b8a6',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
                </Pressable>
            </View>
            {error ? <Text style={{ color: '#dc2626', marginTop: 6, fontSize: 12 }}>{error}</Text> : null}
        </View>
    );
}

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
        <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: '#94a3b8', marginBottom: 10, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Custom Amount
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                    value={value}
                    onChangeText={setValue}
                    onSubmitEditing={handleSubmit}
                    keyboardType="numeric"
                    placeholder="Enter ml"
                    placeholderTextColor="#475569"
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: '#334155',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        color: '#f8fafc',
                        fontWeight: '600',
                        backgroundColor: '#1e293b',
                        fontSize: 15,
                    }}
                />
                <Pressable
                    onPress={handleSubmit}
                    android_ripple={{ color: 'rgba(16,183,72,0.2)' }}
                    style={({ pressed }) => ({
                        borderRadius: 12,
                        backgroundColor: pressed ? '#0d9440' : '#10b748',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 20,
                        overflow: 'hidden',
                    })}
                >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Add</Text>
                </Pressable>
            </View>
            {error ? <Text style={{ color: '#ef4444', marginTop: 6, fontSize: 12 }}>{error}</Text> : null}
        </View>
    );
}

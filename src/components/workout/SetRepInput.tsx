import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type SetRepInputProps = {
    setNumber: number;
    reps: string;
    weight: string;
    completed: boolean;
    onChangeReps: (value: string) => void;
    onChangeWeight: (value: string) => void;
    onToggleComplete: () => void;
};

export default function SetRepInput({
    setNumber,
    reps,
    weight,
    completed,
    onChangeReps,
    onChangeWeight,
    onToggleComplete,
}: SetRepInputProps) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                opacity: completed ? 0.65 : 1,
                marginTop: 6,
            }}
        >
            <Text style={{ width: 42, color: '#334155', fontWeight: '700' }}>Set {setNumber}</Text>
            <TextInput
                value={reps}
                onChangeText={onChangeReps}
                keyboardType="numeric"
                placeholder="Reps"
                style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: '#0f172a',
                }}
            />
            <TextInput
                value={weight}
                onChangeText={onChangeWeight}
                keyboardType="numeric"
                placeholder="kg"
                style={{
                    width: 72,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: '#0f172a',
                }}
            />
            <Pressable
                onPress={onToggleComplete}
                android_ripple={{ color: 'rgba(34,197,94,0.2)' }}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: completed ? '#16a34a' : '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <Text style={{ color: completed ? '#fff' : '#64748b', fontWeight: '900' }}>✓</Text>
            </Pressable>
        </View>
    );
}

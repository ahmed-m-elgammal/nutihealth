import React from 'react';
import { Text, View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

type WorkoutTimerProps = {
    elapsedSeconds: number;
    estimatedDurationMinutes: number;
};

const formatHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function WorkoutTimer({ elapsedSeconds, estimatedDurationMinutes }: WorkoutTimerProps) {
    const progress = Math.min(elapsedSeconds / Math.max(1, estimatedDurationMinutes * 60), 1);
    const size = 150;
    const stroke = 12;
    const r = (size - stroke) / 2;

    return (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Canvas style={{ width: size, height: size }}>
                <Circle cx={size / 2} cy={size / 2} r={r} style="stroke" strokeWidth={stroke} color="#e2e8f0" />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    style="stroke"
                    strokeWidth={stroke}
                    color="#16a34a"
                    start={-Math.PI / 2}
                    end={-Math.PI / 2 + progress * Math.PI * 2}
                />
            </Canvas>
            <Text style={{ marginTop: -96, fontWeight: '800', fontSize: 22, color: '#0f172a' }}>
                {formatHMS(elapsedSeconds)}
            </Text>
            <Text style={{ marginTop: 68, color: '#64748b', fontSize: 12 }}>
                Elapsed vs est. {estimatedDurationMinutes}m
            </Text>
        </View>
    );
}

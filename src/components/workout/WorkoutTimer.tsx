import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
    const radius = (size - stroke) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size} style={{ position: 'absolute' }}>
                    <Circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#16a34a"
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(-90 ${center} ${center})`}
                    />
                </Svg>
                <Text style={{ fontWeight: '800', fontSize: 22, color: '#0f172a' }}>{formatHMS(elapsedSeconds)}</Text>
            </View>
            <Text style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
                Elapsed vs est. {estimatedDurationMinutes}m
            </Text>
        </View>
    );
}

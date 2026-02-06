import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Droplet } from 'lucide-react-native';

interface WaterProgressProps {
    current: number;
    target: number;
    percentage: number;
    size?: number;
}

export default function WaterProgress({ current, target, percentage, size = 160 }: WaterProgressProps) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    const color = percentage >= 100 ? '#3B82F6' : percentage >= 50 ? '#06B6D4' : '#0EA5E9';

    return (
        <View style={{ width: size, height: size }} className="items-center justify-center">
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#E0F2FE"
                    strokeWidth="12"
                    fill="none"
                />
                {/* Progress circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View className="items-center">
                <Droplet size={32} color={color} fill={color} />
                <Text className="text-3xl font-bold text-gray-900 mt-2">{current}ml</Text>
                <Text className="text-sm text-gray-500">of {target}ml</Text>
                <Text className="text-xs text-gray-400 mt-1">{Math.round(percentage)}%</Text>
            </View>
        </View>
    );
}

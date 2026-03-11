import React from 'react';
import { View } from 'react-native';

interface IngredientCoverageBarProps {
    coverage: number; // 0..1
}

export default function IngredientCoverageBar({ coverage }: IngredientCoverageBarProps) {
    const clamped = Math.max(0, Math.min(1, coverage || 0));

    return (
        <View
            style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
            }}
        >
            <View
                style={{
                    width: `${Math.round(clamped * 100)}%`,
                    height: '100%',
                    backgroundColor: '#16a34a',
                    borderRadius: 999,
                }}
            />
        </View>
    );
}

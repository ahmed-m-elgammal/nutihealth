import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type PeriodSelectorProps = {
    periods?: string[];
    selectedPeriod: string;
    onPeriodChange: (period: string) => void;
};

const ITEM_WIDTH = 88;

export default function PeriodSelector({
    periods = ['Week', 'Month', '3 Months', 'Year'],
    selectedPeriod,
    onPeriodChange,
}: PeriodSelectorProps) {
    const selectedIndex = Math.max(
        0,
        periods.findIndex((p) => p === selectedPeriod),
    );
    const x = useSharedValue(selectedIndex * ITEM_WIDTH);

    useEffect(() => {
        x.value = withSpring(selectedIndex * ITEM_WIDTH, { damping: 20, stiffness: 180 });
    }, [x, selectedIndex]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
    }));

    return (
        <View style={{ borderRadius: 14, backgroundColor: '#e2e8f0', padding: 4, overflow: 'hidden' }}>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        left: 4,
                        top: 4,
                        width: ITEM_WIDTH - 2,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#16a34a',
                    },
                    indicatorStyle,
                ]}
            />
            <View style={{ flexDirection: 'row' }}>
                {periods.map((period) => {
                    const active = period === selectedPeriod;

                    return (
                        <Pressable
                            key={period}
                            onPress={() => {
                                if (active) return;
                                triggerHaptic('light').catch(() => undefined);
                                onPeriodChange(period);
                            }}
                            android_ripple={{ color: 'rgba(22,163,74,0.15)' }}
                            style={{ width: ITEM_WIDTH, height: 40, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ color: active ? '#fff' : '#334155', fontWeight: '700', fontSize: 12 }}>
                                {period}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

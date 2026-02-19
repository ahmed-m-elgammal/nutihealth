import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format, isAfter, isSameDay, startOfDay, subDays } from 'date-fns';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type DatePickerStripProps = {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
};

const ITEM_WIDTH = 52;

export default function DatePickerStrip({ selectedDate, onSelectDate }: DatePickerStripProps) {
    const days = useMemo(() => {
        const today = startOfDay(new Date());
        return Array.from({ length: 7 }).map((_, i) => subDays(today, 3 - i));
    }, []);

    const selectedIndex = Math.max(
        0,
        days.findIndex((d) => isSameDay(d, selectedDate)),
    );

    const indicatorX = useSharedValue(selectedIndex * ITEM_WIDTH);

    useEffect(() => {
        indicatorX.value = withSpring(selectedIndex * ITEM_WIDTH, { damping: 20, stiffness: 190 });
    }, [indicatorX, selectedIndex]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
    }));

    return (
        <View style={{ borderRadius: 16, backgroundColor: '#e5e7eb', padding: 4, overflow: 'hidden' }}>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        left: 4,
                        top: 4,
                        width: ITEM_WIDTH - 2,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: '#16a34a',
                    },
                    indicatorStyle,
                ]}
            />
            <View style={{ flexDirection: 'row' }}>
                {days.map((day) => {
                    const isFuture = isAfter(startOfDay(day), startOfDay(new Date()));
                    const isActive = isSameDay(day, selectedDate);

                    return (
                        <Pressable
                            key={day.toISOString()}
                            android_ripple={{ color: 'rgba(22,163,74,0.16)' }}
                            onPress={() => {
                                if (isFuture) {
                                    triggerHaptic('error').catch(() => undefined);
                                    return;
                                }

                                triggerHaptic('light').catch(() => undefined);
                                onSelectDate(day);
                            }}
                            style={{
                                width: ITEM_WIDTH,
                                height: 56,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                            }}
                        >
                            <Text style={{ color: isActive ? '#fff' : isFuture ? '#94a3b8' : '#475569', fontSize: 11 }}>
                                {format(day, 'EEE')}
                            </Text>
                            <Text
                                style={{
                                    color: isActive ? '#fff' : isFuture ? '#94a3b8' : '#0f172a',
                                    fontWeight: '700',
                                }}
                            >
                                {format(day, 'd')}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

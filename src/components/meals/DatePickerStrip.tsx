import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, differenceInCalendarDays, format, isAfter, isSameDay, startOfDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

type DatePickerStripProps = {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
};

const ITEM_WIDTH = 56;
const WINDOW_DAYS = 21;

export const buildDateWindow = (selectedDate: Date, today: Date, windowSize: number = WINDOW_DAYS): Date[] => {
    const normalizedToday = startOfDay(today);
    const normalizedSelected = startOfDay(selectedDate);
    const cappedSelected = isAfter(normalizedSelected, normalizedToday) ? normalizedToday : normalizedSelected;

    let windowStart = subDays(cappedSelected, Math.floor(windowSize / 2));
    let windowEnd = addDays(windowStart, windowSize - 1);

    if (isAfter(windowEnd, normalizedToday)) {
        const overflowDays = differenceInCalendarDays(windowEnd, normalizedToday);
        windowStart = subDays(windowStart, overflowDays);
        windowEnd = addDays(windowStart, windowSize - 1);
    }

    return Array.from({ length: windowSize }, (_, index) => addDays(windowStart, index));
};

export default function DatePickerStrip({ selectedDate, onSelectDate }: DatePickerStripProps) {
    const [today, setToday] = useState(startOfDay(new Date()));
    const stripRef = useRef<ScrollView>(null);
    const normalizedSelectedDate = useMemo(() => startOfDay(selectedDate), [selectedDate]);
    const safeSelectedDate = isAfter(normalizedSelectedDate, today) ? today : normalizedSelectedDate;
    const days = useMemo(() => buildDateWindow(safeSelectedDate, today), [safeSelectedDate, today]);

    const selectedIndex = Math.max(
        0,
        days.findIndex((d) => isSameDay(d, safeSelectedDate)),
    );

    useEffect(() => {
        if (!isSameDay(selectedDate, safeSelectedDate)) {
            onSelectDate(safeSelectedDate);
        }
    }, [onSelectDate, safeSelectedDate, selectedDate]);

    useEffect(() => {
        const now = new Date();
        const nextMidnight = startOfDay(addDays(now, 1));
        const timeoutMs = nextMidnight.getTime() - now.getTime() + 250;
        const timer = setTimeout(() => {
            setToday(startOfDay(new Date()));
        }, timeoutMs);

        return () => clearTimeout(timer);
    }, [today]);

    useEffect(() => {
        const offsetX = Math.max(0, selectedIndex * ITEM_WIDTH - ITEM_WIDTH * 2);
        stripRef.current?.scrollTo({ x: offsetX, animated: true });
    }, [selectedIndex]);

    const canGoForward = !isSameDay(safeSelectedDate, today);
    const selectDay = (day: Date) => {
        const normalizedDay = startOfDay(day);
        if (isAfter(normalizedDay, today)) {
            triggerHaptic('error').catch(() => undefined);
            return;
        }
        triggerHaptic('light').catch(() => undefined);
        onSelectDate(normalizedDay);
    };

    return (
        <View
            style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                paddingVertical: 6,
                paddingHorizontal: 4,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                    onPress={() => selectDay(subDays(safeSelectedDate, 1))}
                    android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                    style={{
                        width: 36,
                        height: 56,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <ChevronLeft size={16} color="#334155" />
                </Pressable>

                <ScrollView
                    ref={stripRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                    {days.map((day) => {
                        const isFuture = isAfter(startOfDay(day), today);
                        const isActive = isSameDay(day, safeSelectedDate);

                        return (
                            <Pressable
                                key={day.toISOString()}
                                android_ripple={{ color: 'rgba(22,163,74,0.16)' }}
                                onPress={() => selectDay(day)}
                                style={{
                                    width: ITEM_WIDTH,
                                    height: 56,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    backgroundColor: isActive ? '#16a34a' : 'transparent',
                                }}
                            >
                                <Text
                                    style={{
                                        color: isActive ? '#fff' : isFuture ? '#94a3b8' : '#475569',
                                        fontSize: 11,
                                    }}
                                >
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
                </ScrollView>

                <Pressable
                    disabled={!canGoForward}
                    onPress={() => selectDay(addDays(safeSelectedDate, 1))}
                    android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                    style={{
                        width: 36,
                        height: 56,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        opacity: canGoForward ? 1 : 0.35,
                    }}
                >
                    <ChevronRight size={16} color="#334155" />
                </Pressable>
            </View>
        </View>
    );
}

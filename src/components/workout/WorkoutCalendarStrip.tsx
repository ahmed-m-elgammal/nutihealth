import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, isSameDay } from 'date-fns';

type WorkoutCalendarDay = {
    date: Date;
    workoutName?: string;
    intensity?: 'low' | 'medium' | 'high';
    isRestDay: boolean;
};

type WorkoutCalendarStripProps = {
    weekDays: WorkoutCalendarDay[];
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onPrevWeek: () => void;
    onNextWeek: () => void;
};

const intensityColor = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
};

const DayCard = memo(
    ({ item, selected, onPress }: { item: WorkoutCalendarDay; selected: boolean; onPress: () => void }) => {
        const dotColor = item.intensity ? intensityColor[item.intensity] : '#cbd5e1';

        return (
            <Pressable
                onPress={onPress}
                android_ripple={{ color: 'rgba(22,163,74,0.16)' }}
                style={{
                    width: 102,
                    borderRadius: 14,
                    borderWidth: selected ? 0 : 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: selected ? '#16a34a' : '#fff',
                    padding: 10,
                    elevation: selected ? 4 : 0,
                    overflow: 'hidden',
                    marginRight: 8,
                }}
            >
                <Text style={{ color: selected ? '#dcfce7' : '#64748b', fontSize: 11 }}>
                    {format(item.date, 'EEE')}
                </Text>
                <Text style={{ color: selected ? '#fff' : '#0f172a', fontSize: 18, fontWeight: '700' }}>
                    {format(item.date, 'd')}
                </Text>

                <View style={{ marginTop: 8 }}>
                    {item.isRestDay ? (
                        <View
                            style={{
                                alignSelf: 'flex-start',
                                borderRadius: 999,
                                backgroundColor: selected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                            }}
                        >
                            <Text style={{ color: selected ? '#ecfeff' : '#475569', fontSize: 10 }}>Rest</Text>
                        </View>
                    ) : (
                        <>
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: selected ? '#ecfccb' : '#334155',
                                    fontSize: 11,
                                    fontWeight: '600',
                                }}
                            >
                                {item.workoutName || 'Workout'}
                            </Text>
                            <View
                                style={{
                                    marginTop: 6,
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: dotColor,
                                }}
                            />
                        </>
                    )}
                </View>
            </Pressable>
        );
    },
);

function WorkoutCalendarStrip({
    weekDays,
    selectedDate,
    onDateSelect,
    onPrevWeek,
    onNextWeek,
}: WorkoutCalendarStripProps) {
    const keyExtractor = useCallback((item: WorkoutCalendarDay) => item.date.toISOString(), []);

    const renderItem = useCallback(
        ({ item }: { item: WorkoutCalendarDay }) => (
            <DayCard
                item={item}
                selected={isSameDay(item.date, selectedDate)}
                onPress={() => onDateSelect(item.date)}
            />
        ),
        [onDateSelect, selectedDate],
    );

    return (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Pressable
                    onPress={onPrevWeek}
                    android_ripple={{ color: 'rgba(15,23,42,0.07)' }}
                    style={{ padding: 8, borderRadius: 999, backgroundColor: '#f1f5f9' }}
                >
                    <ChevronLeft size={18} color="#334155" />
                </Pressable>
                <Text style={{ fontWeight: '700', color: '#0f172a', alignSelf: 'center' }}>Weekly Plan</Text>
                <Pressable
                    onPress={onNextWeek}
                    android_ripple={{ color: 'rgba(15,23,42,0.07)' }}
                    style={{ padding: 8, borderRadius: 999, backgroundColor: '#f1f5f9' }}
                >
                    <ChevronRight size={18} color="#334155" />
                </Pressable>
            </View>

            <FlashList
                data={weekDays}
                keyExtractor={keyExtractor}
                horizontal
                estimatedItemSize={110}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={110}
                renderItem={renderItem}
            />
        </View>
    );
}

export default memo(WorkoutCalendarStrip);

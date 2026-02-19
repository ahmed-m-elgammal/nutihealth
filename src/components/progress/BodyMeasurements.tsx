import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';

type Measurement = {
    id: string;
    date: Date;
    weight: number;
    waist?: number;
};

type BodyMeasurementsProps = {
    entries: Measurement[];
    heightCm?: number;
    onAddMeasurement: () => void;
};

export default function BodyMeasurements({ entries, heightCm, onAddMeasurement }: BodyMeasurementsProps) {
    const latestWeight = entries[0]?.weight ?? 0;
    const bmi = useMemo(() => {
        const h = (heightCm || 0) / 100;
        if (!h || !latestWeight) return null;
        return latestWeight / (h * h);
    }, [heightCm, latestWeight]);

    const hasTodayLog = useMemo(() => {
        const today = new Date();
        return entries.some((e) => format(e.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
    }, [entries]);

    const bmiLabel =
        bmi == null ? '—' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                padding: 12,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>Body measurements</Text>
                <Pressable
                    onPress={onAddMeasurement}
                    android_ripple={{ color: 'rgba(22,163,74,0.15)' }}
                    style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#dcfce7' }}
                >
                    <Text style={{ color: '#166534', fontWeight: '700' }}>+ Add</Text>
                </Pressable>
            </View>

            <View
                style={{
                    marginTop: 10,
                    borderRadius: 999,
                    alignSelf: 'flex-start',
                    backgroundColor: '#f1f5f9',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                }}
            >
                <Text style={{ color: '#334155', fontWeight: '700' }}>
                    BMI: {bmi ? bmi.toFixed(1) : '—'} · {bmiLabel}
                </Text>
            </View>

            {!hasTodayLog ? (
                <Animated.View entering={FadeInDown.duration(300)}>
                    <Pressable
                        onPress={() => {
                            triggerHaptic('medium').catch(() => undefined);
                            onAddMeasurement();
                        }}
                        android_ripple={{ color: 'rgba(22,163,74,0.15)' }}
                        style={{
                            marginTop: 10,
                            borderRadius: 999,
                            backgroundColor: '#ecfccb',
                            alignSelf: 'flex-start',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                        }}
                    >
                        <Text style={{ color: '#365314', fontWeight: '700' }}>Log today’s weight</Text>
                    </Pressable>
                </Animated.View>
            ) : null}

            <FlashList
                data={entries}
                estimatedItemSize={64}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                    <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: '#f8fafc', padding: 10 }}>
                        <Text style={{ color: '#0f172a', fontWeight: '700' }}>{format(item.date, 'MMM d, yyyy')}</Text>
                        <Text style={{ color: '#334155', marginTop: 3 }}>
                            Weight: {item.weight} kg {item.waist ? `• Waist: ${item.waist} cm` : ''}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

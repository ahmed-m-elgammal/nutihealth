import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { calculateWeatherAdjustment, getCurrentWeatherByCity } from '../../services/weather';
import { clearScheduledReminders, scheduleDailyWaterReminder } from '../../services/notifications';

type WaterReminderToggleProps = {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
};

export default function WaterReminderToggle({ enabled, onToggle }: WaterReminderToggleProps) {
    const [loading, setLoading] = useState(false);
    const [weatherBoost, setWeatherBoost] = useState<number>(0);
    const [weatherReason, setWeatherReason] = useState<string>('');

    const handleToggle = async (next: boolean) => {
        setLoading(true);
        onToggle(next);

        try {
            if (next) {
                await scheduleDailyWaterReminder();
                const weather = await getCurrentWeatherByCity('Cairo');
                if (weather) {
                    const adjustment = calculateWeatherAdjustment(weather);
                    setWeatherBoost(adjustment.adjustment);
                    setWeatherReason(adjustment.reason);
                }
            } else {
                await clearScheduledReminders();
                setWeatherBoost(0);
                setWeatherReason('');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ marginTop: 16 }}>
            <View
                style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#dbeafe',
                    backgroundColor: '#f8fafc',
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>Smart reminders</Text>
                    <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>
                        Schedule hydration nudges based on your needs.
                    </Text>
                </View>
                {loading ? (
                    <ActivityIndicator color="#0e7490" />
                ) : (
                    <Switch
                        value={enabled}
                        onValueChange={handleToggle}
                        trackColor={{ false: '#cbd5e1', true: '#67e8f9' }}
                        thumbColor={enabled ? '#0e7490' : '#f8fafc'}
                    />
                )}
            </View>

            {enabled && weatherBoost >= 250 ? (
                <Pressable
                    android_ripple={{ color: 'rgba(251,191,36,0.18)' }}
                    style={{
                        marginTop: 8,
                        borderRadius: 12,
                        backgroundColor: '#fffbeb',
                        borderWidth: 1,
                        borderColor: '#fde68a',
                        padding: 10,
                    }}
                >
                    <Text style={{ color: '#92400e', fontWeight: '700' }}>Warm weather notice</Text>
                    <Text style={{ color: '#b45309', marginTop: 2, fontSize: 12 }}>
                        Suggested hydration boost: +{weatherBoost} ml ({weatherReason}).
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}

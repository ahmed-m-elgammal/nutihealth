import React, { useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
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
                    borderColor: '#334155',
                    backgroundColor: '#1e293b',
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 15 }}>Smart Reminders</Text>
                    <Text style={{ color: '#94a3b8', marginTop: 3, fontSize: 12 }}>
                        Schedule hydration nudges based on your needs.
                    </Text>
                </View>
                {loading ? (
                    <ActivityIndicator color="#10b748" />
                ) : (
                    <Switch
                        value={enabled}
                        onValueChange={handleToggle}
                        trackColor={{ false: '#334155', true: '#15803d' }}
                        thumbColor={enabled ? '#10b748' : '#64748b'}
                        ios_backgroundColor="#334155"
                    />
                )}
            </View>

            {enabled && weatherBoost >= 250 ? (
                <View
                    style={{
                        marginTop: 8,
                        borderRadius: 12,
                        backgroundColor: 'rgba(234,179,8,0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(234,179,8,0.3)',
                        padding: 12,
                    }}
                >
                    <Text style={{ color: '#fbbf24', fontWeight: '700' }}>☀️ Warm weather notice</Text>
                    <Text style={{ color: '#d97706', marginTop: 2, fontSize: 12 }}>
                        Suggested hydration boost: +{weatherBoost} ml ({weatherReason}).
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

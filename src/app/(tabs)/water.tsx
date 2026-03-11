import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import WaterFill from '../../components/water/WaterFill';
import WaterQuickAdd from '../../components/water/WaterQuickAdd';
import WaterCustomInput from '../../components/water/WaterCustomInput';
import WaterUndoButton from '../../components/water/WaterUndoButton';
import WaterHistory from '../../components/water/WaterHistory';
import WaterReminderToggle from '../../components/water/WaterReminderToggle';
import { triggerHaptic } from '../../utils/haptics';
import { EmptyGlassIllustration } from '../../components/illustrations/EmptyStateIllustrations';
import { useWaterActions } from '../../hooks/useWaterActions';
import { Droplets } from 'lucide-react-native';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWaterWeeklyTrend } from '../../query/queries/useWaterWeeklyTrend';

export default function WaterScreen() {
    const {
        totalConsumed,
        targetAmount,
        percentage,
        remindersEnabled,
        entries,
        undoVisible,
        addWater,
        handleUndo,
        clearUndo,
        setRemindersEnabled,
    } = useWaterActions();
    const { user } = useCurrentUser();
    const { data: weeklyTrend = [] } = useWaterWeeklyTrend(user?.id, targetAmount);

    const maxYAxis = useMemo(() => {
        const maxIntake = Math.max(...weeklyTrend.map((item) => item.intake), 0);
        const maxTarget = Math.max(...weeklyTrend.map((item) => item.target), targetAmount, 1);
        return Math.max(maxIntake, maxTarget);
    }, [targetAmount, weeklyTrend]);

    return (
        <ScreenErrorBoundary screenName="water">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top']}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Droplets size={26} color="#10b748" />
                            <Text style={{ fontSize: 26, fontWeight: '800', color: '#f8fafc' }}>Hydration</Text>
                        </View>
                        <Text style={{ marginTop: 4, color: '#94a3b8', fontSize: 14 }}>
                            Track your daily water intake
                        </Text>
                    </View>

                    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                        <WaterFill currentAmount={totalConsumed} goalAmount={targetAmount} width={220} height={220} />
                        <Text style={{ marginTop: 16, color: '#94a3b8', fontSize: 14 }}>
                            Daily Goal:{' '}
                            <Text style={{ color: '#10b748', fontWeight: '700' }}>{Math.round(percentage)}%</Text>
                        </Text>
                    </View>

                    <View
                        style={{
                            marginHorizontal: 16,
                            borderRadius: 16,
                            backgroundColor: '#1e293b',
                            borderWidth: 1,
                            borderColor: '#334155',
                            padding: 16,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ color: '#f8fafc', fontWeight: '700', marginBottom: 8 }}>7-Day Trend</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                            Intake (blue) vs target (green line)
                        </Text>

                        {weeklyTrend.length > 0 ? (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-end',
                                    justifyContent: 'space-between',
                                }}
                            >
                                {weeklyTrend.map((point) => {
                                    const targetHeight = (point.target / maxYAxis) * 90;
                                    const intakeHeight = (point.intake / maxYAxis) * 90;

                                    return (
                                        <View key={point.dateKey} style={{ alignItems: 'center', width: 34 }}>
                                            <Svg width={28} height={96}>
                                                <Line
                                                    x1={2}
                                                    y1={96 - targetHeight}
                                                    x2={26}
                                                    y2={96 - targetHeight}
                                                    stroke="#22c55e"
                                                    strokeWidth={2}
                                                    strokeDasharray="2,2"
                                                />
                                                <Rect
                                                    x={8}
                                                    y={96 - intakeHeight}
                                                    width={12}
                                                    height={intakeHeight}
                                                    rx={4}
                                                    fill="#38bdf8"
                                                />
                                            </Svg>
                                            <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                                                {point.dayLabel}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : null}
                    </View>

                    <View
                        style={{
                            marginHorizontal: 16,
                            borderRadius: 16,
                            backgroundColor: '#1e293b',
                            borderWidth: 1,
                            borderColor: '#334155',
                            padding: 16,
                            gap: 0,
                        }}
                    >
                        <WaterQuickAdd
                            onAdd={(amount) => {
                                triggerHaptic('light').catch(() => undefined);
                                addWater(amount).catch(() => undefined);
                            }}
                        />

                        <WaterCustomInput
                            onSubmit={(amount) => {
                                addWater(amount).catch(() => undefined);
                            }}
                        />

                        <WaterUndoButton
                            visible={undoVisible}
                            timeout={5000}
                            onUndo={() => {
                                handleUndo().catch(() => undefined);
                            }}
                            onExpire={() => {
                                clearUndo();
                            }}
                        />
                    </View>

                    <View style={{ marginHorizontal: 16 }}>
                        <WaterReminderToggle
                            enabled={remindersEnabled}
                            onToggle={(enabled) => {
                                setRemindersEnabled(enabled).catch(() => undefined);
                            }}
                        />
                    </View>

                    <View style={{ marginHorizontal: 16, marginTop: 8 }}>
                        {entries.length === 0 ? (
                            <EmptyState
                                illustration={<EmptyGlassIllustration />}
                                title="Fresh hydration start"
                                message="Log your first glass to build today's hydration timeline."
                            />
                        ) : (
                            <WaterHistory entries={entries} />
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

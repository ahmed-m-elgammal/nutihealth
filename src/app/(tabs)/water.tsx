import React from 'react';
import { View, Text, ScrollView } from 'react-native';
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

    return (
        <ScreenErrorBoundary screenName="water">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top']}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Droplets size={26} color="#10b748" />
                            <Text style={{ fontSize: 26, fontWeight: '800', color: '#f8fafc' }}>Hydration</Text>
                        </View>
                        <Text style={{ marginTop: 4, color: '#94a3b8', fontSize: 14 }}>
                            Track your daily water intake
                        </Text>
                    </View>

                    {/* Circular Progress */}
                    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                        <WaterFill
                            currentAmount={totalConsumed}
                            goalAmount={targetAmount}
                            width={220}
                            height={220}
                        />
                        <Text style={{ marginTop: 16, color: '#94a3b8', fontSize: 14 }}>
                            Daily Goal:{' '}
                            <Text style={{ color: '#10b748', fontWeight: '700' }}>
                                {Math.round(percentage)}%
                            </Text>
                        </Text>
                    </View>

                    {/* Action Card */}
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

                    {/* Reminder Toggle */}
                    <View style={{ marginHorizontal: 16 }}>
                        <WaterReminderToggle
                            enabled={remindersEnabled}
                            onToggle={(enabled) => {
                                setRemindersEnabled(enabled).catch(() => undefined);
                            }}
                        />
                    </View>

                    {/* History */}
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

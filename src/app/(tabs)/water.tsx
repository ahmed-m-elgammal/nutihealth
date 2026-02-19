import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useWaterStore } from '../../store/waterStore';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import WaterFill from '../../components/water/WaterFill';
import WaterQuickAdd from '../../components/water/WaterQuickAdd';
import WaterCustomInput from '../../components/water/WaterCustomInput';
import WaterUndoButton from '../../components/water/WaterUndoButton';
import WaterHistory from '../../components/water/WaterHistory';
import WaterReminderToggle from '../../components/water/WaterReminderToggle';
import { triggerHaptic } from '../../utils/haptics';
import { EmptyGlassIllustration } from '../../components/illustrations/EmptyStateIllustrations';

type LastAdded = {
    id: string;
    amount: number;
};

export default function WaterScreen() {
    const { todaysLogs, totalConsumed, targetAmount, percentage, addWaterLog, deleteWaterLog, loadTodaysWater } =
        useWaterStore();

    const [undoVisible, setUndoVisible] = useState(false);
    const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);
    const [remindersEnabled, setRemindersEnabled] = useState(false);

    useEffect(() => {
        loadTodaysWater().catch(() => undefined);
    }, [loadTodaysWater]);

    const addWater = async (amount: number) => {
        const prevLatestId = todaysLogs[0]?.id;
        await addWaterLog(amount, 'custom');
        await loadTodaysWater();

        const nextLatest = useWaterStore.getState().todaysLogs[0];
        if (nextLatest && nextLatest.id !== prevLatestId) {
            setLastAdded({ id: nextLatest.id, amount: nextLatest.amount });
            setUndoVisible(true);
        }
    };

    const handleUndo = async () => {
        if (!lastAdded) return;
        await deleteWaterLog(lastAdded.id);
        await loadTodaysWater();
        setUndoVisible(false);
        setLastAdded(null);
    };

    const entries = useMemo(
        () =>
            todaysLogs.map((log) => ({
                id: log.id,
                time: format(new Date(log.loggedAt), 'HH:mm'),
                amount: log.amount,
            })),
        [todaysLogs],
    );

    return (
        <ScreenErrorBoundary screenName="water">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>Hydration</Text>
                            <Text style={{ marginTop: 4, color: '#64748b' }}>
                                Engaging water tracking with quick rituals
                            </Text>
                        </View>
                    }
                    headerHeight={120}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    <View
                        style={{
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#dbeafe',
                            backgroundColor: '#f0fdfa',
                            padding: 14,
                        }}
                    >
                        <WaterFill currentAmount={totalConsumed} goalAmount={targetAmount} width={320} height={240} />

                        <Text style={{ marginTop: 10, color: '#0f172a', fontWeight: '700' }}>
                            {Math.round(totalConsumed)} / {Math.round(targetAmount)} ml · {Math.round(percentage)}%
                        </Text>

                        <View style={{ marginTop: 12 }}>
                            <WaterQuickAdd
                                onAdd={(amount) => {
                                    triggerHaptic('light').catch(() => undefined);
                                    addWater(amount).catch(() => undefined);
                                }}
                            />
                        </View>

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
                                setUndoVisible(false);
                                setLastAdded(null);
                            }}
                        />
                    </View>

                    <WaterReminderToggle enabled={remindersEnabled} onToggle={setRemindersEnabled} />

                    {entries.length === 0 ? (
                        <EmptyState
                            illustration={<EmptyGlassIllustration />}
                            title="Fresh hydration start"
                            message="Log your first glass to build today's hydration timeline."
                        />
                    ) : (
                        <WaterHistory entries={entries} />
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

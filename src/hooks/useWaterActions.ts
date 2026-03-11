import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useWaterStore } from '../store/waterStore';

type LastAdded = {
    id: string;
    amount: number;
};

export function useWaterActions() {
    const {
        todaysLogs,
        totalConsumed,
        targetAmount,
        percentage,
        addWaterLog,
        deleteWaterLog,
        loadTodaysWater,
        remindersEnabled,
        loadReminderPreference,
        setRemindersEnabled,
    } = useWaterStore();

    const [undoVisible, setUndoVisible] = useState(false);
    const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);

    useEffect(() => {
        loadTodaysWater().catch(() => undefined);
    }, [loadTodaysWater]);

    useEffect(() => {
        loadReminderPreference().catch(() => undefined);
    }, [loadReminderPreference]);

    const addWater = useCallback(
        async (amount: number) => {
            const prevLatestId = todaysLogs[0]?.id;
            await addWaterLog(amount, 'custom');

            const nextLatest = useWaterStore.getState().todaysLogs[0];
            if (nextLatest && nextLatest.id !== prevLatestId) {
                setLastAdded({ id: nextLatest.id, amount: nextLatest.amount });
                setUndoVisible(true);
            }
        },
        [addWaterLog, todaysLogs],
    );

    const handleUndo = useCallback(async () => {
        if (!lastAdded) return;

        await deleteWaterLog(lastAdded.id);
        await loadTodaysWater();
        setUndoVisible(false);
        setLastAdded(null);
    }, [deleteWaterLog, lastAdded, loadTodaysWater]);

    const clearUndo = useCallback(() => {
        setUndoVisible(false);
        setLastAdded(null);
    }, []);

    const entries = useMemo(
        () =>
            todaysLogs.map((log) => ({
                id: log.id,
                time: format(new Date(log.loggedAt), 'HH:mm'),
                amount: log.amount,
            })),
        [todaysLogs],
    );

    return {
        todaysLogs,
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
    };
}

export default useWaterActions;

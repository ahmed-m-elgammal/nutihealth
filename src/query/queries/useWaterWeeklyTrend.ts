import { useQuery } from '@tanstack/react-query';
import { Q } from '@nozbe/watermelondb';
import { format } from 'date-fns';
import { database } from '../../database';
import WaterLog from '../../database/models/WaterLog';
import WaterTarget from '../../database/models/WaterTarget';

const DAY_MS = 24 * 60 * 60 * 1000;

export type WaterTrendPoint = {
    dayLabel: string;
    dateKey: number;
    intake: number;
    target: number;
};

const startOfDay = (timestamp: number) => {
    const day = new Date(timestamp);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
};

export function useWaterWeeklyTrend(userId?: string, fallbackTarget: number = 0) {
    return useQuery({
        queryKey: ['water-weekly-trend', userId, fallbackTarget],
        enabled: Boolean(userId),
        staleTime: 60 * 60 * 1000,
        queryFn: async (): Promise<WaterTrendPoint[]> => {
            if (!userId) return [];

            const today = startOfDay(Date.now());
            const start = today - 6 * DAY_MS;
            const end = today + DAY_MS - 1;

            const [logs, targets] = await Promise.all([
                database
                    .get<WaterLog>('water_logs')
                    .query(Q.where('user_id', userId), Q.where('logged_at', Q.between(start, end)))
                    .fetch(),
                database
                    .get<WaterTarget>('water_targets')
                    .query(Q.where('user_id', userId), Q.where('date', Q.between(start, end)))
                    .fetch(),
            ]);

            const intakeByDay = new Map<number, number>();
            logs.forEach((entry) => {
                const dayKey = startOfDay(entry.loggedAt);
                intakeByDay.set(dayKey, (intakeByDay.get(dayKey) || 0) + (Number(entry.amount) || 0));
            });

            const targetByDay = new Map<number, number>();
            targets.forEach((entry) => {
                const dayKey = startOfDay(entry.date);
                targetByDay.set(dayKey, Number(entry.totalTarget) || fallbackTarget);
            });

            return Array.from({ length: 7 }, (_, index) => {
                const dayKey = start + index * DAY_MS;
                return {
                    dayLabel: format(new Date(dayKey), 'EEE'),
                    dateKey: dayKey,
                    intake: Math.round(intakeByDay.get(dayKey) || 0),
                    target: Math.round(targetByDay.get(dayKey) || fallbackTarget || 0),
                };
            });
        },
    });
}

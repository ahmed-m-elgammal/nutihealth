import { differenceInCalendarDays, isAfter, isSameDay, startOfDay } from 'date-fns';
import { buildDateWindow } from '../DatePickerStrip';

describe('buildDateWindow', () => {
    const today = new Date(2026, 1, 22, 12, 0, 0);

    it('keeps the selected date visible and never emits future dates', () => {
        const selected = new Date(2026, 1, 10, 8, 0, 0);
        const days = buildDateWindow(selected, today, 21);

        expect(days).toHaveLength(21);
        expect(days.some((day) => isSameDay(day, selected))).toBe(true);
        expect(days.some((day) => isAfter(day, startOfDay(today)))).toBe(false);
    });

    it('ends the window at today when selected day is near today', () => {
        const selected = new Date(2026, 1, 22, 8, 0, 0);
        const days = buildDateWindow(selected, today, 21);

        expect(isSameDay(days[days.length - 1], today)).toBe(true);
    });

    it('normalizes future selections back to today', () => {
        const selected = new Date(2026, 1, 27, 8, 0, 0);
        const days = buildDateWindow(selected, today, 21);

        expect(days.some((day) => isSameDay(day, selected))).toBe(false);
        expect(days.some((day) => isSameDay(day, today))).toBe(true);
        expect(days.some((day) => isAfter(day, startOfDay(today)))).toBe(false);
    });

    it('creates a contiguous daily range', () => {
        const selected = new Date(2025, 0, 1, 8, 0, 0);
        const days = buildDateWindow(selected, today, 21);

        for (let index = 1; index < days.length; index += 1) {
            expect(differenceInCalendarDays(days[index], days[index - 1])).toBe(1);
        }
    });
});

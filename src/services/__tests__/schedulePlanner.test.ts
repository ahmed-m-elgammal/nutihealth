import {
    mapTemplatesToSchedule,
    sanitizeSchedulePreferences,
} from '../workout/schedulePlanner';

describe('schedulePlanner', () => {
    it('sanitizes invalid preferences and keeps at least one training day', () => {
        const result = sanitizeSchedulePreferences({
            startDay: 'NotADay' as unknown as 'Monday',
            restDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as unknown as ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[],
        });

        expect(result.startDay).toBe('Monday');
        expect(result.restDays.length).toBe(6);
    });

    it('maps templates using start day and rest day preferences', () => {
        const mapped = mapTemplatesToSchedule(
            ['t1', 't2', 't3', 't4'],
            {
                startDay: 'Wednesday',
                restDays: ['Thursday', 'Sunday'],
            }
        );

        expect(mapped.assignments).toEqual([
            { templateId: 't1', dayOfWeek: 'Wednesday' },
            { templateId: 't2', dayOfWeek: 'Friday' },
            { templateId: 't3', dayOfWeek: 'Saturday' },
            { templateId: 't4', dayOfWeek: 'Monday' },
        ]);
    });

    it('returns dropped templates when program has more workouts than available days', () => {
        const mapped = mapTemplatesToSchedule(
            ['a', 'b', 'c'],
            {
                startDay: 'Monday',
                restDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            }
        );

        expect(mapped.assignments).toEqual([{ templateId: 'a', dayOfWeek: 'Monday' }]);
        expect(mapped.droppedTemplateIds).toEqual(['b', 'c']);
    });
});

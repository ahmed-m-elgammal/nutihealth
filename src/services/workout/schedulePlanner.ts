import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type User from '../../database/models/User';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import type WorkoutTemplate from '../../database/models/WorkoutTemplate';

export const WEEK_DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

export type WeekDayName = typeof WEEK_DAYS[number];

export interface WorkoutSchedulePreferences {
    startDay: WeekDayName;
    restDays: WeekDayName[];
}

export interface ScheduleAssignment {
    dayOfWeek: WeekDayName;
    templateId: string;
}

export interface MappedTemplateSchedule {
    assignments: ScheduleAssignment[];
    droppedTemplateIds: string[];
    orderedTrainingDays: WeekDayName[];
    effectivePreferences: WorkoutSchedulePreferences;
}

export interface ApplyTemplateScheduleResult extends MappedTemplateSchedule {
    assignmentsCreated: number;
}

export const DEFAULT_WORKOUT_SCHEDULE_PREFERENCES: WorkoutSchedulePreferences = {
    startDay: 'Monday',
    restDays: [],
};

const normalizeDay = (day: string): string => day.trim().toLowerCase();

const toWeekDayName = (value?: string | null): WeekDayName | null => {
    if (!value) {
        return null;
    }

    const normalized = normalizeDay(value);
    return WEEK_DAYS.find((day) => normalizeDay(day) === normalized) || null;
};

const toWeekDayNames = (values: unknown): WeekDayName[] => {
    if (!Array.isArray(values)) {
        return [];
    }

    const normalizedValues = values
        .map((value) => (typeof value === 'string' ? toWeekDayName(value) : null))
        .filter((value): value is WeekDayName => Boolean(value));

    return WEEK_DAYS.filter((day) => normalizedValues.includes(day));
};

export const getOrderedWeekDays = (
    startDay: WeekDayName = DEFAULT_WORKOUT_SCHEDULE_PREFERENCES.startDay
): WeekDayName[] => {
    const startIndex = WEEK_DAYS.indexOf(startDay);

    if (startIndex < 0) {
        return [...WEEK_DAYS];
    }

    return [...WEEK_DAYS.slice(startIndex), ...WEEK_DAYS.slice(0, startIndex)];
};

export const sanitizeSchedulePreferences = (
    preferences?: Partial<WorkoutSchedulePreferences> | null
): WorkoutSchedulePreferences => {
    const startDay = toWeekDayName(preferences?.startDay || null)
        || DEFAULT_WORKOUT_SCHEDULE_PREFERENCES.startDay;

    const uniqueRestDays = Array.from(new Set(toWeekDayNames(preferences?.restDays || [])));
    const maxRestDays = WEEK_DAYS.length - 1;
    const clampedRestDays = uniqueRestDays.slice(0, maxRestDays);

    return {
        startDay,
        restDays: clampedRestDays,
    };
};

export const getSchedulePreferencesFromUser = (workoutPreferences: unknown): WorkoutSchedulePreferences => {
    if (!workoutPreferences || typeof workoutPreferences !== 'object') {
        return DEFAULT_WORKOUT_SCHEDULE_PREFERENCES;
    }

    const record = workoutPreferences as Record<string, unknown>;

    const nested = record.schedulePreferences;
    if (nested && typeof nested === 'object') {
        return sanitizeSchedulePreferences(nested as Partial<WorkoutSchedulePreferences>);
    }

    return sanitizeSchedulePreferences({
        startDay: typeof record.startDay === 'string' ? record.startDay as WeekDayName : undefined,
        restDays: record.restDays as WeekDayName[] | undefined,
    });
};

export const mapTemplatesToSchedule = (
    templateIds: string[],
    preferences?: Partial<WorkoutSchedulePreferences> | null
): MappedTemplateSchedule => {
    const uniqueTemplateIds = Array.from(new Set(templateIds.filter(Boolean)));
    const effectivePreferences = sanitizeSchedulePreferences(preferences);

    const orderedDays = getOrderedWeekDays(effectivePreferences.startDay);
    const orderedTrainingDays = orderedDays.filter((day) => !effectivePreferences.restDays.includes(day));

    const usableTrainingDays = orderedTrainingDays.length > 0
        ? orderedTrainingDays
        : orderedDays;

    const assignments: ScheduleAssignment[] = uniqueTemplateIds
        .slice(0, usableTrainingDays.length)
        .map((templateId, index) => ({
            templateId,
            dayOfWeek: usableTrainingDays[index],
        }));

    return {
        assignments,
        droppedTemplateIds: uniqueTemplateIds.slice(usableTrainingDays.length),
        orderedTrainingDays: usableTrainingDays,
        effectivePreferences,
    };
};

export interface ApplyTemplateScheduleParams {
    database: Database;
    user: User;
    templates: WorkoutTemplate[];
    preferences?: Partial<WorkoutSchedulePreferences> | null;
}

export async function applyTemplateScheduleForUser({
    database,
    user,
    templates,
    preferences,
}: ApplyTemplateScheduleParams): Promise<ApplyTemplateScheduleResult> {
    const orderedUniqueTemplateIds = Array.from(
        new Set(
            templates
                .map((template) => template.id)
                .filter(Boolean)
        )
    );

    const storedPreferences = getSchedulePreferencesFromUser(user.workoutPreferences);
    const mergedPreferences = sanitizeSchedulePreferences({
        ...storedPreferences,
        ...preferences,
        restDays: preferences?.restDays ?? storedPreferences.restDays,
    });

    const mapped = mapTemplatesToSchedule(orderedUniqueTemplateIds, mergedPreferences);
    const schedulesCollection = database.get<WorkoutSchedule>('workout_schedules');

    await database.write(async () => {
        const existingSchedules = await schedulesCollection
            .query(Q.where('user_id', user.id))
            .fetch();

        await Promise.all(existingSchedules.map((schedule) => schedule.destroyPermanently()));

        for (const assignment of mapped.assignments) {
            await schedulesCollection.create((record) => {
                record.userId = user.id;
                record.templateId = assignment.templateId;
                record.dayOfWeek = assignment.dayOfWeek;
            });
        }

        await user.update((record) => {
            const existingPreferences = (record.workoutPreferences && typeof record.workoutPreferences === 'object')
                ? record.workoutPreferences as Record<string, unknown>
                : {};

            record.workoutPreferences = {
                ...existingPreferences,
                schedulePreferences: mapped.effectivePreferences,
            };
        });
    });

    return {
        ...mapped,
        assignmentsCreated: mapped.assignments.length,
    };
}

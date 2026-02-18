import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { getExerciseById, getExercises } from '../../data/exerciseLibrary';
import type Exercise from '../../database/models/Exercise';
import type TemplateExercise from '../../database/models/TemplateExercise';
import type WorkoutSchedule from '../../database/models/WorkoutSchedule';
import type WorkoutTemplate from '../../database/models/WorkoutTemplate';
import {
    type EquipmentType,
    type MuscleGroup,
    type RepType,
    type UserWorkoutProfile,
    type WeeklyWorkoutPlan,
    type WorkoutDay,
    type WorkoutExercise,
} from '../../types/workout';
import {
    WEEK_DAYS,
    type WeekDayName,
    getOrderedWeekDays,
    getSchedulePreferencesFromUser,
} from './schedulePlanner';

export const DEFAULT_WORKOUT_PROFILE: UserWorkoutProfile = {
    fitnessLevel: 'intermediate',
    goals: ['general_fitness'],
    daysPerWeek: 4,
    preferredDuration: 45,
    availableEquipment: ['bodyweight', 'dumbbells'],
    targetAreas: ['full_body'],
    limitations: [],
    experienceYears: 1,
};

interface TemplateExerciseConfig {
    exerciseId?: string;
    sets?: number;
    reps?: number | string;
    duration?: number;
    repType?: RepType;
    restPeriod?: number;
    rpe?: number;
    weightGuidance?: string;
    notes?: string;
    order?: number;
    isSuperset?: boolean;
    supersetId?: string;
}

interface ScheduleContext {
    templateById: Map<string, WorkoutTemplate>;
    templateExercisesByTemplateId: Map<string, TemplateExercise[]>;
    exerciseById: Map<string, Exercise>;
}

const ALLOWED_MUSCLE_GROUPS: MuscleGroup[] = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core',
    'full_body',
    'cardio',
    'forearms',
    'low_back',
];

const EQUIPMENT_MAP: Record<string, EquipmentType> = {
    bodyweight: 'bodyweight',
    dumbbell: 'dumbbells',
    dumbbells: 'dumbbells',
    barbell: 'barbell',
    cable: 'cables',
    cables: 'cables',
    machine: 'machines',
    machines: 'machines',
    kettlebell: 'kettlebell',
    resistance_band: 'resistance_band',
    cardio_machine: 'cardio_machine',
};

const EXERCISE_CATEGORY_MAP: Record<string, WorkoutExercise['category']> = {
    strength: 'strength',
    cardio: 'cardio',
    flexibility: 'flexibility',
    core: 'core',
    mobility: 'mobility',
    intro: 'intro',
};

const normalizeText = (value?: string): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const libraryExerciseByName = new Map(
    getExercises().map((exercise) => [normalizeText(exercise.name), exercise])
);

const normalizeDay = (day?: string): string => (typeof day === 'string' ? day.trim().toLowerCase() : '');

const toWeekDayName = (value?: string): WeekDayName => {
    const normalized = normalizeDay(value);
    return WEEK_DAYS.find((day) => normalizeDay(day) === normalized) || 'Monday';
};

const resolveMuscleGroup = (value?: string): MuscleGroup => {
    if (!value) {
        return 'full_body';
    }

    const normalized = value.toLowerCase();
    if (ALLOWED_MUSCLE_GROUPS.includes(normalized as MuscleGroup)) {
        return normalized as MuscleGroup;
    }

    if (normalized === 'legs') {
        return 'quads';
    }

    if (normalized === 'arms') {
        return 'biceps';
    }

    return 'full_body';
};

const resolveEquipment = (value?: string): EquipmentType => {
    if (!value) {
        return 'bodyweight';
    }

    return EQUIPMENT_MAP[value.toLowerCase()] || 'bodyweight';
};

const resolveCategory = (value?: string): WorkoutExercise['category'] => {
    if (!value) {
        return 'strength';
    }

    return EXERCISE_CATEGORY_MAP[value.toLowerCase()] || 'strength';
};

const parseTemplateConfigList = (template: WorkoutTemplate): TemplateExerciseConfig[] => {
    if (!Array.isArray(template.exercises)) {
        return [];
    }

    return (template.exercises as unknown[])
        .filter((item) => Boolean(item) && typeof item === 'object')
        .map((item) => item as TemplateExerciseConfig);
};

const parseNumericFromRange = (value: string): number => {
    const firstMatch = value.match(/\d+/);
    return firstMatch ? parseInt(firstMatch[0], 10) : 0;
};

const resolveRepType = (config: TemplateExerciseConfig, reps: number | string): RepType => {
    if (config.repType) {
        return config.repType;
    }

    if (typeof reps === 'string') {
        const normalized = reps.toLowerCase();
        if (normalized.includes('sec') || normalized.includes('min') || normalized.endsWith('s')) {
            return 'time';
        }
    }

    return config.duration ? 'time' : 'reps';
};

const estimateExerciseDurationSeconds = (exercise: WorkoutExercise): number => {
    const effortSeconds = exercise.repType === 'time'
        ? (typeof exercise.reps === 'number' ? exercise.reps : Math.max(20, parseNumericFromRange(String(exercise.reps))))
        : (typeof exercise.reps === 'number' ? exercise.reps * 3 : parseNumericFromRange(String(exercise.reps)) * 3);

    const totalWorkSeconds = Math.max(15, effortSeconds) * Math.max(1, exercise.sets);
    const totalRestSeconds = Math.max(0, exercise.restPeriod) * Math.max(0, exercise.sets - 1);

    return totalWorkSeconds + totalRestSeconds + 30;
};

const estimateWorkoutDuration = (mainWorkout: WorkoutExercise[]): number => {
    if (mainWorkout.length === 0) {
        return 0;
    }

    const totalSeconds = mainWorkout.reduce((sum, exercise) => sum + estimateExerciseDurationSeconds(exercise), 0);
    return Math.max(20, Math.round(totalSeconds / 60));
};

const resolveTemplateConfigForExercise = (
    configs: TemplateExerciseConfig[],
    templateExercise: TemplateExercise,
    index: number
): TemplateExerciseConfig => {
    const byOrder = configs.find((config) => config.order === index);
    if (byOrder) {
        return byOrder;
    }

    const byExerciseId = configs.find((config) => config.exerciseId === templateExercise.exerciseId);
    if (byExerciseId) {
        return byExerciseId;
    }

    return {};
};

const buildWorkoutExercise = (
    templateExercise: TemplateExercise,
    linkedExercise: Exercise | undefined,
    index: number,
    config: TemplateExerciseConfig
): WorkoutExercise => {
    const libraryExercise = (
        (config.exerciseId ? getExerciseById(config.exerciseId) : undefined)
        || getExerciseById(templateExercise.exerciseId)
        || (linkedExercise ? libraryExerciseByName.get(normalizeText(linkedExercise.name)) : undefined)
    );

    const reps = config.reps
        ?? (templateExercise.reps > 0 ? templateExercise.reps : undefined)
        ?? (config.duration ? `${config.duration}s` : 10);

    const repType = resolveRepType(config, reps);
    const parsedSets = Math.max(1, config.sets ?? templateExercise.sets ?? 1);
    const parsedRestPeriod = Math.max(0, config.restPeriod ?? (repType === 'time' ? 45 : 75));

    const resolvedEquipment = linkedExercise?.equipment
        ? [resolveEquipment(linkedExercise.equipment), ...(libraryExercise?.equipment || []).map(resolveEquipment)]
        : (libraryExercise?.equipment || ['bodyweight']).map(resolveEquipment);

    const equipment: EquipmentType[] = resolvedEquipment.length > 0
        ? Array.from(new Set<EquipmentType>(resolvedEquipment))
        : ['bodyweight'];

    const muscleGroup = resolveMuscleGroup(
        linkedExercise?.muscleGroup
        || libraryExercise?.targetMuscles.primary[0]
    );
    const category = resolveCategory(
        libraryExercise?.category
        || linkedExercise?.category
    );

    return {
        id: linkedExercise?.id || libraryExercise?.id || `exercise_${index}`,
        name: linkedExercise?.name || libraryExercise?.name || `Exercise ${index + 1}`,
        category,
        targetMuscles: {
            primary: [muscleGroup],
            secondary: libraryExercise?.targetMuscles.secondary || [],
        },
        equipment,
        difficulty: libraryExercise?.difficulty || 'beginner',
        instructions: libraryExercise?.instructions || [
            linkedExercise?.description || 'Perform each rep with controlled form.',
        ],
        formTips: libraryExercise?.formTips || ['Maintain posture and breathe steadily.'],
        videoUrl: libraryExercise?.videoUrl || linkedExercise?.videoUrl,
        thumbnailUrl: libraryExercise?.thumbnailUrl || linkedExercise?.imageUrl || linkedExercise?.videoUrl,
        sets: parsedSets,
        reps,
        repType,
        restPeriod: parsedRestPeriod,
        rpe: config.rpe,
        notes: config.notes,
        weightGuidance: config.weightGuidance,
        isSuperset: config.isSuperset,
        supersetId: config.supersetId,
        order: index,
    };
};

const createRestDay = (dayOfWeek: string): WorkoutDay => {
    const safeDay = toWeekDayName(dayOfWeek);

    return {
    id: `rest_${safeDay.toLowerCase()}`,
    dayOfWeek: safeDay,
    title: 'Rest & Recovery',
    focus: [],
    estimatedDuration: 0,
    warmup: [],
    mainWorkout: [],
    cooldown: [],
    notes: 'Optional: light mobility, stretching, or a walk.',
    isRestDay: true,
};
};

const buildScheduleContext = async (
    database: Database,
    schedules: WorkoutSchedule[]
): Promise<ScheduleContext> => {
    const templateIds = Array.from(new Set(schedules.map((schedule) => schedule.templateId).filter(Boolean)));

    if (templateIds.length === 0) {
        return {
            templateById: new Map(),
            templateExercisesByTemplateId: new Map(),
            exerciseById: new Map(),
        };
    }

    const templates = await database
        .get<WorkoutTemplate>('workout_templates')
        .query(Q.where('id', Q.oneOf(templateIds)))
        .fetch();

    const templateById = new Map(templates.map((template) => [template.id, template]));

    const templateExercises = await database
        .get<TemplateExercise>('template_exercises')
        .query(
            Q.where('template_id', Q.oneOf(templateIds)),
            Q.sortBy('order', Q.asc)
        )
        .fetch();

    const templateExercisesByTemplateId = new Map<string, TemplateExercise[]>();
    templateExercises.forEach((templateExercise) => {
        const existing = templateExercisesByTemplateId.get(templateExercise.templateId) || [];
        existing.push(templateExercise);
        templateExercisesByTemplateId.set(templateExercise.templateId, existing);
    });

    const exerciseIds = Array.from(new Set(templateExercises.map((item) => item.exerciseId).filter(Boolean)));
    const linkedExercises = exerciseIds.length > 0
        ? await database
            .get<Exercise>('exercises')
            .query(Q.where('id', Q.oneOf(exerciseIds)))
            .fetch()
        : [];

    const exerciseById = new Map(linkedExercises.map((exercise) => [exercise.id, exercise]));

    return {
        templateById,
        templateExercisesByTemplateId,
        exerciseById,
    };
};

const buildWorkoutDayFromSchedule = (
    schedule: WorkoutSchedule,
    context: ScheduleContext
): WorkoutDay => {
    const template = context.templateById.get(schedule.templateId);

    if (!template) {
        return {
            ...createRestDay(schedule.dayOfWeek),
            id: schedule.id,
            title: 'Template unavailable',
        };
    }

    const templateExercises = context.templateExercisesByTemplateId.get(template.id) || [];
    const templateConfigs = parseTemplateConfigList(template);

    const mainWorkout = templateExercises.map((templateExercise, index): WorkoutExercise => {
        const linkedExercise = context.exerciseById.get(templateExercise.exerciseId);
        const config = resolveTemplateConfigForExercise(templateConfigs, templateExercise, index);

        return buildWorkoutExercise(templateExercise, linkedExercise, index, config);
    });

    const focus = Array.from(
        new Set(mainWorkout.flatMap((exercise) => exercise.targetMuscles.primary))
    );

    return {
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        title: template.name,
        focus: focus.length > 0 ? focus : ['full_body'],
        estimatedDuration: estimateWorkoutDuration(mainWorkout),
        warmup: [],
        mainWorkout,
        cooldown: [],
        notes: template.description,
        isRestDay: mainWorkout.length === 0,
    };
};

export interface BuildWeeklyWorkoutPlanParams {
    database: Database;
    userId: string;
    schedules: WorkoutSchedule[];
    userProfileSnapshot?: UserWorkoutProfile;
    userWorkoutPreferences?: unknown;
}

export async function buildWeeklyWorkoutPlanFromSchedules({
    database,
    userId,
    schedules,
    userProfileSnapshot,
    userWorkoutPreferences,
}: BuildWeeklyWorkoutPlanParams): Promise<WeeklyWorkoutPlan> {
    const context = await buildScheduleContext(database, schedules);
    const schedulePreferences = getSchedulePreferencesFromUser(userWorkoutPreferences);
    const orderedDays = getOrderedWeekDays(schedulePreferences.startDay);

    const scheduleByDay = new Map<string, WorkoutSchedule>();
    schedules.forEach((schedule) => {
        const key = normalizeDay(schedule.dayOfWeek);
        if (!key) {
            return;
        }
        if (!scheduleByDay.has(key)) {
            scheduleByDay.set(key, schedule);
        }
    });

    const days = orderedDays.map((dayName) => {
        try {
            const schedule = scheduleByDay.get(normalizeDay(dayName));
            if (!schedule) {
                return createRestDay(dayName);
            }

            return buildWorkoutDayFromSchedule(schedule, context);
        } catch (error) {
            console.error(`Failed to build workout day for ${dayName}:`, error);
            return createRestDay(dayName);
        }
    });

    return {
        id: `schedule_${userId}`,
        userId,
        generatedAt: Date.now(),
        weekStartDate: Date.now(),
        userProfileSnapshot: userProfileSnapshot || DEFAULT_WORKOUT_PROFILE,
        days,
        status: 'active',
    };
}

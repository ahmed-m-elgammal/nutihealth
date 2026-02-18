import { WorkoutProgram, WorkoutDay, WorkoutExercise, RepType } from '../types/workout';
import { getExerciseById } from './exerciseLibrary';

interface ExercisePreset {
    id: string;
    sets: number;
    reps: number | string;
    repType?: RepType;
    restPeriod?: number;
    rpe?: number;
    notes?: string;
}

const createExercise = (preset: ExercisePreset, order: number): WorkoutExercise => {
    const base = getExerciseById(preset.id);

    if (!base) {
        return {
            id: preset.id,
            name: preset.id.replace(/_/g, ' '),
            category: 'strength',
            targetMuscles: { primary: ['full_body'], secondary: [] },
            equipment: ['bodyweight'],
            difficulty: 'beginner',
            instructions: ['Perform with controlled tempo and full range.'],
            formTips: ['Brace your core and maintain posture.'],
            sets: preset.sets,
            reps: preset.reps,
            repType: preset.repType || 'reps',
            restPeriod: preset.restPeriod ?? 60,
            rpe: preset.rpe,
            notes: preset.notes,
            order,
        };
    }

    return {
        ...base,
        sets: preset.sets,
        reps: preset.reps,
        repType: preset.repType || 'reps',
        restPeriod: preset.restPeriod ?? 60,
        rpe: preset.rpe,
        notes: preset.notes,
        order,
    };
};

const createDay = (
    id: string,
    title: string,
    focus: WorkoutDay['focus'],
    estimatedDuration: number,
    presets: ExercisePreset[],
    dayOfWeek: string = 'Monday',
    notes?: string
): WorkoutDay => ({
    id,
    dayOfWeek,
    title,
    focus,
    estimatedDuration,
    warmup: [],
    mainWorkout: presets.map((preset, index) => createExercise(preset, index)),
    cooldown: [],
    notes,
    isRestDay: false,
});

const FULL_BODY_A = createDay(
    'full_body_a',
    'Full Body A',
    ['quads', 'chest', 'back', 'core'],
    50,
    [
        { id: 'goblet_squat', sets: 4, reps: '10-12', restPeriod: 75, rpe: 7 },
        { id: 'pushups', sets: 4, reps: '8-12', restPeriod: 60, rpe: 7 },
        { id: 'dumbbell_row', sets: 4, reps: '10-12', restPeriod: 75, rpe: 7 },
        { id: 'romanian_deadlift', sets: 3, reps: '10', restPeriod: 90, rpe: 7 },
        { id: 'plank', sets: 3, reps: '45s', repType: 'time', restPeriod: 45, rpe: 7 },
    ],
    'Monday',
    'Add 1-2 reps or 2.5-5 lbs each week when all sets are completed.'
);

const FULL_BODY_B = createDay(
    'full_body_b',
    'Full Body B',
    ['glutes', 'hamstrings', 'shoulders', 'core'],
    52,
    [
        { id: 'squat', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_press', sets: 4, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'pullups', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8, notes: 'Use assistance if needed.' },
        { id: 'overhead_press', sets: 3, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'mountain_climber', sets: 3, reps: '35s', repType: 'time', restPeriod: 30, rpe: 8 },
    ],
    'Wednesday'
);

const FULL_BODY_C = createDay(
    'full_body_c',
    'Full Body C',
    ['quads', 'chest', 'back', 'cardio'],
    48,
    [
        { id: 'bench_press', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'lunge', sets: 4, reps: '10 each leg', restPeriod: 75, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '10', restPeriod: 75, rpe: 8 },
        { id: 'tricep_dip', sets: 3, reps: '12-15', restPeriod: 60, rpe: 8 },
        { id: 'jumping_jacks', sets: 3, reps: '50s', repType: 'time', restPeriod: 25, rpe: 7 },
    ],
    'Friday'
);

const HOME_CIRCUIT_A = createDay(
    'home_circuit_a',
    'Home Circuit A',
    ['full_body', 'cardio'],
    38,
    [
        { id: 'pushups', sets: 4, reps: '10-15', restPeriod: 30, rpe: 7 },
        { id: 'goblet_squat', sets: 4, reps: '12', restPeriod: 30, rpe: 7 },
        { id: 'dumbbell_row', sets: 4, reps: '12', restPeriod: 30, rpe: 7 },
        { id: 'burpees', sets: 4, reps: '10', restPeriod: 40, rpe: 8 },
        { id: 'plank', sets: 3, reps: '40s', repType: 'time', restPeriod: 30, rpe: 7 },
    ],
    'Tuesday'
);

const HOME_CIRCUIT_B = createDay(
    'home_circuit_b',
    'Home Circuit B',
    ['quads', 'glutes', 'core', 'cardio'],
    40,
    [
        { id: 'lunge', sets: 4, reps: '12 each leg', restPeriod: 30, rpe: 8 },
        { id: 'romanian_deadlift', sets: 4, reps: '10-12', restPeriod: 45, rpe: 8 },
        { id: 'dumbbell_press', sets: 3, reps: '12', restPeriod: 45, rpe: 7 },
        { id: 'mountain_climber', sets: 4, reps: '30s', repType: 'time', restPeriod: 20, rpe: 8 },
        { id: 'jumping_jacks', sets: 4, reps: '45s', repType: 'time', restPeriod: 20, rpe: 8 },
    ],
    'Thursday'
);

const UPPER_STRENGTH = createDay(
    'upper_strength',
    'Upper Strength',
    ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    60,
    [
        { id: 'bench_press', sets: 5, reps: '5', restPeriod: 150, rpe: 8 },
        { id: 'pullups', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'overhead_press', sets: 4, reps: '6', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'bicep_curl', sets: 3, reps: '10-12', restPeriod: 60, rpe: 8 },
    ],
    'Monday'
);

const LOWER_STRENGTH = createDay(
    'lower_strength',
    'Lower Strength',
    ['quads', 'hamstrings', 'glutes', 'core'],
    62,
    [
        { id: 'squat', sets: 5, reps: '4-6', restPeriod: 150, rpe: 8 },
        { id: 'deadlift', sets: 4, reps: '4-5', restPeriod: 180, rpe: 8 },
        { id: 'romanian_deadlift', sets: 3, reps: '8', restPeriod: 120, rpe: 8 },
        { id: 'lunge', sets: 3, reps: '8 each leg', restPeriod: 90, rpe: 8 },
        { id: 'plank', sets: 3, reps: '50s', repType: 'time', restPeriod: 45, rpe: 7 },
    ],
    'Tuesday'
);
const UPPER_HYPERTROPHY = createDay(
    'upper_hypertrophy',
    'Upper Hypertrophy',
    ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    56,
    [
        { id: 'dumbbell_press', sets: 4, reps: '8-12', restPeriod: 90, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '10-12', restPeriod: 75, rpe: 8 },
        { id: 'pushups', sets: 3, reps: '15', restPeriod: 60, rpe: 8 },
        { id: 'bicep_curl', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
        { id: 'tricep_dip', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
    ],
    'Thursday'
);

const LOWER_HYPERTROPHY = createDay(
    'lower_hypertrophy',
    'Lower Hypertrophy',
    ['quads', 'hamstrings', 'glutes', 'cardio'],
    54,
    [
        { id: 'goblet_squat', sets: 4, reps: '12', restPeriod: 75, rpe: 8 },
        { id: 'romanian_deadlift', sets: 4, reps: '10-12', restPeriod: 90, rpe: 8 },
        { id: 'lunge', sets: 4, reps: '12 each leg', restPeriod: 75, rpe: 8 },
        { id: 'burpees', sets: 3, reps: '10-12', restPeriod: 60, rpe: 8 },
        { id: 'mountain_climber', sets: 3, reps: '35s', repType: 'time', restPeriod: 30, rpe: 8 },
    ],
    'Friday'
);

const PUSH_HEAVY = createDay(
    'push_heavy',
    'Push Heavy',
    ['chest', 'shoulders', 'triceps'],
    60,
    [
        { id: 'bench_press', sets: 5, reps: '5-6', restPeriod: 150, rpe: 8 },
        { id: 'overhead_press', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_press', sets: 4, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'tricep_dip', sets: 4, reps: '10-12', restPeriod: 75, rpe: 8 },
    ],
    'Monday'
);

const PULL_HEAVY = createDay(
    'pull_heavy',
    'Pull Heavy',
    ['back', 'biceps', 'forearms'],
    62,
    [
        { id: 'deadlift', sets: 4, reps: '4-5', restPeriod: 180, rpe: 8 },
        { id: 'pullups', sets: 5, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_row', sets: 5, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'bicep_curl', sets: 4, reps: '10-12', restPeriod: 60, rpe: 8 },
    ],
    'Tuesday'
);

const LEGS_HEAVY = createDay(
    'legs_heavy',
    'Legs Heavy',
    ['quads', 'hamstrings', 'glutes', 'core'],
    62,
    [
        { id: 'squat', sets: 5, reps: '5-6', restPeriod: 150, rpe: 8 },
        { id: 'romanian_deadlift', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'lunge', sets: 4, reps: '8 each leg', restPeriod: 90, rpe: 8 },
        { id: 'plank', sets: 4, reps: '55s', repType: 'time', restPeriod: 45, rpe: 8 },
    ],
    'Wednesday'
);

const CONDITIONING_DAY = createDay(
    'conditioning_day',
    'Conditioning Finisher',
    ['cardio', 'full_body', 'core'],
    42,
    [
        { id: 'burpees', sets: 6, reps: '10', restPeriod: 40, rpe: 9 },
        { id: 'mountain_climber', sets: 6, reps: '35s', repType: 'time', restPeriod: 20, rpe: 9 },
        { id: 'jumping_jacks', sets: 6, reps: '45s', repType: 'time', restPeriod: 20, rpe: 8 },
        { id: 'plank', sets: 4, reps: '60s', repType: 'time', restPeriod: 30, rpe: 8 },
    ],
    'Saturday'
);

const INTRO_TECHNIQUE_A = createDay(
    'intro_technique_a',
    'Technique Foundations A',
    ['full_body', 'core'],
    35,
    [
        { id: 'goblet_squat', sets: 3, reps: '10', restPeriod: 60, rpe: 6, notes: 'Use a light load and move with control.' },
        { id: 'pushups', sets: 3, reps: '8-10', restPeriod: 60, rpe: 6 },
        { id: 'dumbbell_row', sets: 3, reps: '10 each side', restPeriod: 60, rpe: 6 },
        { id: 'plank', sets: 3, reps: '30s', repType: 'time', restPeriod: 45, rpe: 6 },
        { id: 'jumping_jacks', sets: 3, reps: '30s', repType: 'time', restPeriod: 30, rpe: 6 },
    ],
    'Monday'
);

const INTRO_TECHNIQUE_B = createDay(
    'intro_technique_b',
    'Technique Foundations B',
    ['quads', 'glutes', 'back', 'core'],
    36,
    [
        { id: 'lunge', sets: 3, reps: '8 each leg', restPeriod: 60, rpe: 6 },
        { id: 'dumbbell_press', sets: 3, reps: '10', restPeriod: 60, rpe: 6 },
        { id: 'romanian_deadlift', sets: 3, reps: '10', restPeriod: 75, rpe: 6 },
        { id: 'mountain_climber', sets: 3, reps: '25s', repType: 'time', restPeriod: 30, rpe: 7 },
        { id: 'plank', sets: 2, reps: '40s', repType: 'time', restPeriod: 45, rpe: 6 },
    ],
    'Thursday'
);

const FULL_BODY_STRENGTH = createDay(
    'full_body_strength',
    'Full Body Strength',
    ['quads', 'chest', 'back', 'core'],
    58,
    [
        { id: 'squat', sets: 4, reps: '5-6', restPeriod: 150, rpe: 8 },
        { id: 'bench_press', sets: 4, reps: '5-6', restPeriod: 150, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '8', restPeriod: 90, rpe: 8 },
        { id: 'romanian_deadlift', sets: 3, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'plank', sets: 3, reps: '50s', repType: 'time', restPeriod: 45, rpe: 7 },
    ],
    'Wednesday'
);

const FULL_BODY_ENDURANCE = createDay(
    'full_body_endurance',
    'Full Body Endurance',
    ['full_body', 'cardio', 'core'],
    44,
    [
        { id: 'goblet_squat', sets: 4, reps: '14', restPeriod: 45, rpe: 7 },
        { id: 'pushups', sets: 4, reps: '12-15', restPeriod: 45, rpe: 7 },
        { id: 'dumbbell_row', sets: 4, reps: '12', restPeriod: 45, rpe: 7 },
        { id: 'jumping_jacks', sets: 4, reps: '55s', repType: 'time', restPeriod: 25, rpe: 8 },
        { id: 'plank', sets: 3, reps: '60s', repType: 'time', restPeriod: 30, rpe: 7 },
    ],
    'Saturday'
);

const UPPER_ENDURANCE = createDay(
    'upper_endurance',
    'Upper Endurance',
    ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    48,
    [
        { id: 'dumbbell_press', sets: 4, reps: '12-15', restPeriod: 60, rpe: 7 },
        { id: 'dumbbell_row', sets: 4, reps: '12-15', restPeriod: 60, rpe: 7 },
        { id: 'overhead_press', sets: 3, reps: '12', restPeriod: 60, rpe: 7 },
        { id: 'bicep_curl', sets: 3, reps: '15', restPeriod: 45, rpe: 7 },
        { id: 'tricep_dip', sets: 3, reps: '12-15', restPeriod: 45, rpe: 7 },
    ],
    'Tuesday'
);

const LOWER_ENDURANCE = createDay(
    'lower_endurance',
    'Lower Endurance',
    ['quads', 'hamstrings', 'glutes', 'cardio'],
    50,
    [
        { id: 'goblet_squat', sets: 4, reps: '15', restPeriod: 60, rpe: 7 },
        { id: 'lunge', sets: 4, reps: '14 each leg', restPeriod: 60, rpe: 7 },
        { id: 'romanian_deadlift', sets: 4, reps: '12', restPeriod: 75, rpe: 7 },
        { id: 'burpees', sets: 3, reps: '10', restPeriod: 60, rpe: 8 },
        { id: 'mountain_climber', sets: 4, reps: '40s', repType: 'time', restPeriod: 20, rpe: 8 },
    ],
    'Thursday'
);

const PUSH_VOLUME = createDay(
    'push_volume',
    'Push Volume',
    ['chest', 'shoulders', 'triceps'],
    58,
    [
        { id: 'bench_press', sets: 4, reps: '8-10', restPeriod: 105, rpe: 8 },
        { id: 'dumbbell_press', sets: 4, reps: '10-12', restPeriod: 90, rpe: 8 },
        { id: 'overhead_press', sets: 3, reps: '10', restPeriod: 90, rpe: 8 },
        { id: 'pushups', sets: 3, reps: '15', restPeriod: 60, rpe: 8 },
        { id: 'tricep_dip', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
    ],
    'Monday'
);

const PULL_VOLUME = createDay(
    'pull_volume',
    'Pull Volume',
    ['back', 'biceps', 'forearms'],
    60,
    [
        { id: 'deadlift', sets: 3, reps: '5', restPeriod: 180, rpe: 8 },
        { id: 'pullups', sets: 4, reps: '8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '10-12', restPeriod: 90, rpe: 8 },
        { id: 'bicep_curl', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
        { id: 'plank', sets: 3, reps: '50s', repType: 'time', restPeriod: 45, rpe: 7 },
    ],
    'Tuesday'
);

const LEGS_VOLUME = createDay(
    'legs_volume',
    'Legs Volume',
    ['quads', 'hamstrings', 'glutes', 'core'],
    60,
    [
        { id: 'squat', sets: 4, reps: '8', restPeriod: 120, rpe: 8 },
        { id: 'romanian_deadlift', sets: 4, reps: '8-10', restPeriod: 105, rpe: 8 },
        { id: 'lunge', sets: 4, reps: '10 each leg', restPeriod: 90, rpe: 8 },
        { id: 'goblet_squat', sets: 3, reps: '15', restPeriod: 75, rpe: 8 },
        { id: 'mountain_climber', sets: 3, reps: '35s', repType: 'time', restPeriod: 30, rpe: 8 },
    ],
    'Wednesday'
);

const CHEST_ARMS_DAY = createDay(
    'chest_arms_day',
    'Chest & Arms',
    ['chest', 'biceps', 'triceps', 'shoulders'],
    58,
    [
        { id: 'bench_press', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_press', sets: 4, reps: '8-10', restPeriod: 90, rpe: 8 },
        { id: 'pushups', sets: 3, reps: '15', restPeriod: 60, rpe: 8 },
        { id: 'bicep_curl', sets: 4, reps: '10-12', restPeriod: 60, rpe: 8 },
        { id: 'tricep_dip', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
    ],
    'Thursday'
);

const BACK_BICEPS_DAY = createDay(
    'back_biceps_day',
    'Back & Biceps',
    ['back', 'biceps', 'forearms', 'core'],
    60,
    [
        { id: 'deadlift', sets: 4, reps: '4-6', restPeriod: 180, rpe: 8 },
        { id: 'pullups', sets: 4, reps: '6-8', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_row', sets: 4, reps: '10', restPeriod: 90, rpe: 8 },
        { id: 'bicep_curl', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
        { id: 'plank', sets: 3, reps: '60s', repType: 'time', restPeriod: 45, rpe: 7 },
    ],
    'Friday'
);

const SHOULDERS_TRICEPS_DAY = createDay(
    'shoulders_triceps_day',
    'Shoulders & Triceps',
    ['shoulders', 'triceps', 'chest'],
    56,
    [
        { id: 'overhead_press', sets: 5, reps: '5-6', restPeriod: 120, rpe: 8 },
        { id: 'dumbbell_press', sets: 4, reps: '10', restPeriod: 90, rpe: 8 },
        { id: 'tricep_dip', sets: 4, reps: '12', restPeriod: 60, rpe: 8 },
        { id: 'pushups', sets: 3, reps: '15', restPeriod: 60, rpe: 8 },
        { id: 'mountain_climber', sets: 3, reps: '30s', repType: 'time', restPeriod: 30, rpe: 7 },
    ],
    'Saturday'
);

const LOWER_POWER = createDay(
    'lower_power',
    'Lower Power',
    ['quads', 'hamstrings', 'glutes', 'core'],
    64,
    [
        { id: 'squat', sets: 5, reps: '3-5', restPeriod: 180, rpe: 9 },
        { id: 'deadlift', sets: 4, reps: '3-4', restPeriod: 180, rpe: 9 },
        { id: 'romanian_deadlift', sets: 3, reps: '6', restPeriod: 120, rpe: 8 },
        { id: 'lunge', sets: 3, reps: '8 each leg', restPeriod: 90, rpe: 8 },
        { id: 'plank', sets: 3, reps: '60s', repType: 'time', restPeriod: 45, rpe: 8 },
    ],
    'Sunday'
);

const createProgram = (
    id: string,
    title: string,
    description: string,
    level: WorkoutProgram['level'],
    daysPerWeek: number,
    category: WorkoutProgram['category'],
    split: WorkoutProgram['split'],
    equipment: WorkoutProgram['equipment'],
    scheduleDays: WorkoutDay[],
    durationWeeks: number = 8
): WorkoutProgram => ({
    id,
    title,
    description,
    level,
    durationWeeks,
    daysPerWeek,
    equipment,
    category,
    split,
    tags: [level, category, split],
    schedule: {
        id: `plan_${id}`,
        userId: 'system',
        generatedAt: Date.now(),
        weekStartDate: Date.now(),
        userProfileSnapshot: {
            fitnessLevel: level,
            goals: ['general_fitness'],
            daysPerWeek,
            preferredDuration: 45,
            availableEquipment: equipment,
            targetAreas: ['full_body'],
            limitations: [],
            experienceYears: level === 'advanced' ? 4 : level === 'intermediate' ? 2 : 1,
        },
        days: scheduleDays,
        status: 'active',
    },
});

export const ALL_PROGRAMS: WorkoutProgram[] = [
    createProgram(
        'beg_foundation',
        'Full Body Foundation',
        'Beginner progression focused on movement quality, strength basics, and consistency.',
        'beginner',
        3,
        'strength',
        'full_body',
        ['bodyweight', 'dumbbells', 'barbell'],
        [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C],
        8
    ),
    createProgram(
        'beg_home',
        'Home Kickstart Circuit',
        'Bodyweight and dumbbell circuit structure for fat loss and weekly adherence.',
        'beginner',
        4,
        'fat_loss',
        'hybrid',
        ['bodyweight', 'dumbbells'],
        [HOME_CIRCUIT_A, HOME_CIRCUIT_B, FULL_BODY_A, CONDITIONING_DAY],
        6
    ),
    createProgram(
        'beg_intro_2day',
        'Starter Technique 2-Day',
        'Low-complexity onboarding plan to learn movement patterns and build consistency.',
        'beginner',
        2,
        'intro',
        'full_body',
        ['bodyweight', 'dumbbells'],
        [INTRO_TECHNIQUE_A, INTRO_TECHNIQUE_B],
        4
    ),
    createProgram(
        'beg_strength_onramp',
        'Beginner Strength On-Ramp',
        'Simple compound-focused progression with clear strength targets and controlled volume.',
        'beginner',
        3,
        'strength',
        'full_body',
        ['bodyweight', 'dumbbells', 'barbell'],
        [FULL_BODY_A, FULL_BODY_STRENGTH, FULL_BODY_C],
        8
    ),
    createProgram(
        'beg_fatloss_ramp',
        'Beginner Fat-Loss Ramp',
        'Higher-frequency beginner plan blending resistance work with interval conditioning.',
        'beginner',
        5,
        'fat_loss',
        'hybrid',
        ['bodyweight', 'dumbbells'],
        [HOME_CIRCUIT_A, FULL_BODY_ENDURANCE, HOME_CIRCUIT_B, CONDITIONING_DAY, FULL_BODY_A],
        8
    ),
    createProgram(
        'beg_upper_lower_intro',
        'Upper Lower Intro',
        'Introductory upper/lower split for users ready to move beyond full-body sessions.',
        'beginner',
        4,
        'intro',
        'upper_lower',
        ['bodyweight', 'dumbbells', 'barbell'],
        [UPPER_ENDURANCE, LOWER_ENDURANCE, UPPER_HYPERTROPHY, LOWER_HYPERTROPHY],
        8
    ),
    createProgram(
        'int_upper_lower',
        'Upper Lower Strength',
        'Classic split balancing compound strength work with hypertrophy accessory volume.',
        'intermediate',
        4,
        'strength',
        'upper_lower',
        ['barbell', 'dumbbells', 'bodyweight'],
        [UPPER_STRENGTH, LOWER_STRENGTH, UPPER_HYPERTROPHY, LOWER_HYPERTROPHY],
        10
    ),
    createProgram(
        'int_recomp',
        'Recomposition Hybrid',
        'Hybrid plan for recomposition: heavy lifts plus metabolic conditioning work.',
        'intermediate',
        4,
        'fat_loss',
        'hybrid',
        ['barbell', 'dumbbells', 'bodyweight'],
        [UPPER_STRENGTH, HOME_CIRCUIT_A, LOWER_HYPERTROPHY, CONDITIONING_DAY],
        8
    ),
    createProgram(
        'int_ppl_5day',
        'PPL Performance 5-Day',
        'Push/pull/legs structure with added volume sessions for balanced progression.',
        'intermediate',
        5,
        'hypertrophy',
        'ppl',
        ['barbell', 'dumbbells', 'bodyweight'],
        [PUSH_HEAVY, PULL_HEAVY, LEGS_HEAVY, PUSH_VOLUME, PULL_VOLUME],
        10
    ),
    createProgram(
        'int_strength_builder',
        'Intermediate Strength Builder',
        'Strength-centered week combining heavy compounds and support hypertrophy work.',
        'intermediate',
        5,
        'strength',
        'upper_lower',
        ['barbell', 'dumbbells', 'bodyweight'],
        [LOWER_STRENGTH, UPPER_STRENGTH, FULL_BODY_STRENGTH, LOWER_HYPERTROPHY, UPPER_HYPERTROPHY],
        12
    ),
    createProgram(
        'int_hypertrophy_5day',
        'Hypertrophy Builder 5-Day',
        'Moderate-high volume split to drive muscle growth while retaining movement quality.',
        'intermediate',
        5,
        'hypertrophy',
        'bro_split',
        ['barbell', 'dumbbells', 'bodyweight'],
        [PUSH_VOLUME, PULL_VOLUME, LEGS_VOLUME, CHEST_ARMS_DAY, BACK_BICEPS_DAY],
        10
    ),
    createProgram(
        'int_conditioning_hybrid',
        'Conditioning Hybrid 4-Day',
        'Endurance-forward blend of circuits and full-body strength maintenance.',
        'intermediate',
        4,
        'endurance',
        'hybrid',
        ['bodyweight', 'dumbbells', 'barbell'],
        [HOME_CIRCUIT_A, CONDITIONING_DAY, FULL_BODY_ENDURANCE, HOME_CIRCUIT_B],
        8
    ),
    createProgram(
        'int_dumbbell_athlete',
        'Dumbbell Athlete 4-Day',
        'Minimal-equipment athletic template with balanced upper/lower stimulus.',
        'intermediate',
        4,
        'strength',
        'hybrid',
        ['bodyweight', 'dumbbells'],
        [UPPER_ENDURANCE, LOWER_ENDURANCE, FULL_BODY_A, HOME_CIRCUIT_B],
        8
    ),
    createProgram(
        'int_upper_lower_plus',
        'Upper Lower Plus',
        'Upper/lower framework with a fifth conditioning slot to improve work capacity.',
        'intermediate',
        5,
        'strength',
        'upper_lower',
        ['barbell', 'dumbbells', 'bodyweight'],
        [UPPER_STRENGTH, LOWER_STRENGTH, UPPER_HYPERTROPHY, LOWER_HYPERTROPHY, CONDITIONING_DAY],
        10
    ),
    createProgram(
        'int_cut_6day',
        'Intermediate Cut 6-Day',
        'Higher training frequency combining intervals and resistance sessions for fat loss.',
        'intermediate',
        6,
        'fat_loss',
        'hybrid',
        ['barbell', 'dumbbells', 'bodyweight'],
        [HOME_CIRCUIT_A, PUSH_VOLUME, LEGS_VOLUME, HOME_CIRCUIT_B, PULL_VOLUME, CONDITIONING_DAY],
        8
    ),
    createProgram(
        'adv_power',
        'Powerbuilding Phase',
        'Advanced block mixing low-rep compounds with high-volume accessories.',
        'advanced',
        5,
        'strength',
        'hybrid',
        ['barbell', 'dumbbells', 'bodyweight'],
        [LOWER_STRENGTH, UPPER_STRENGTH, LOWER_HYPERTROPHY, UPPER_HYPERTROPHY, CONDITIONING_DAY],
        12
    ),
    createProgram(
        'adv_volume_ppl',
        'Volume PPL',
        'High-volume push/pull/legs structure for advanced hypertrophy progression.',
        'advanced',
        6,
        'hypertrophy',
        'ppl',
        ['barbell', 'dumbbells', 'bodyweight'],
        [PUSH_HEAVY, PULL_HEAVY, LEGS_HEAVY, UPPER_HYPERTROPHY, LOWER_HYPERTROPHY, CONDITIONING_DAY],
        12
    ),
    createProgram(
        'adv_bro_split',
        'Advanced Bro Split',
        'Body-part focused advanced split with high weekly volume and dedicated recovery windows.',
        'advanced',
        5,
        'hypertrophy',
        'bro_split',
        ['barbell', 'dumbbells', 'bodyweight'],
        [CHEST_ARMS_DAY, BACK_BICEPS_DAY, LEGS_VOLUME, SHOULDERS_TRICEPS_DAY, CONDITIONING_DAY],
        12
    ),
    createProgram(
        'adv_strength_peak',
        'Strength Peak 5-Day',
        'Intense advanced progression prioritizing maximal strength and neural adaptation.',
        'advanced',
        5,
        'strength',
        'hybrid',
        ['barbell', 'dumbbells', 'bodyweight'],
        [LOWER_POWER, UPPER_STRENGTH, LOWER_STRENGTH, PUSH_HEAVY, PULL_HEAVY],
        14
    ),
    createProgram(
        'adv_hypertrophy_6day',
        'Hypertrophy Specialization 6-Day',
        'Advanced high-volume specialization block targeting complete physique development.',
        'advanced',
        6,
        'hypertrophy',
        'bro_split',
        ['barbell', 'dumbbells', 'bodyweight'],
        [PUSH_VOLUME, PULL_VOLUME, LEGS_VOLUME, CHEST_ARMS_DAY, BACK_BICEPS_DAY, SHOULDERS_TRICEPS_DAY],
        12
    ),
    createProgram(
        'adv_cut_6day',
        'Cutting Block 6-Day',
        'Aggressive advanced fat-loss block using dense strength and conditioning sessions.',
        'advanced',
        6,
        'fat_loss',
        'hybrid',
        ['barbell', 'dumbbells', 'bodyweight'],
        [CONDITIONING_DAY, PUSH_VOLUME, HOME_CIRCUIT_A, PULL_VOLUME, LEGS_VOLUME, HOME_CIRCUIT_B],
        10
    ),
    createProgram(
        'adv_upper_lower_performance',
        'Upper Lower Performance 6-Day',
        'High-frequency upper/lower performance split with added push-pull density.',
        'advanced',
        6,
        'strength',
        'upper_lower',
        ['barbell', 'dumbbells', 'bodyweight'],
        [UPPER_STRENGTH, LOWER_POWER, UPPER_HYPERTROPHY, LOWER_HYPERTROPHY, PUSH_HEAVY, PULL_HEAVY],
        14
    ),
];

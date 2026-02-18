import { ALL_PROGRAMS } from '../../data/programs';
import type { WorkoutExercise, WorkoutProgram } from '../../types/workout';

const normalize = (value: string): string => value.trim().toLowerCase();

const programByTitle = new Map(ALL_PROGRAMS.map((program) => [normalize(program.title), program]));
const programById = new Map(ALL_PROGRAMS.map((program) => [program.id, program]));

const formatPrescription = (exercise: WorkoutExercise): string => {
    const reps = typeof exercise.reps === 'number' ? exercise.reps.toString() : exercise.reps;
    return `${exercise.sets}x${reps} ${exercise.repType}`;
};

export interface ProgramInsight {
    workoutDaysPerWeek: number;
    totalExercisesPerWeek: number;
    totalSetsPerWeek: number;
    averageSessionDuration: number;
    focusAreas: string[];
    equipment: string[];
    samplePrescriptions: string[];
}

export const getProgramByTitle = (title: string): WorkoutProgram | undefined => {
    if (!title) {
        return undefined;
    }

    return programByTitle.get(normalize(title));
};

export const getProgramById = (id: string): WorkoutProgram | undefined => {
    if (!id) {
        return undefined;
    }

    return programById.get(id);
};

export const buildProgramInsight = (program: WorkoutProgram): ProgramInsight => {
    const workoutDays = program.schedule.days.filter((day) => !day.isRestDay);
    const allExercises = workoutDays.flatMap((day) => day.mainWorkout);

    const totalSetsPerWeek = allExercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets), 0);
    const totalDuration = workoutDays.reduce((sum, day) => sum + Math.max(0, day.estimatedDuration), 0);

    const focusAreas = Array.from(
        new Set(workoutDays.flatMap((day) => day.focus))
    );

    const sampleDay = workoutDays[0];
    const samplePrescriptions = sampleDay
        ? sampleDay.mainWorkout.slice(0, 3).map((exercise) => `${exercise.name}: ${formatPrescription(exercise)}`)
        : [];

    return {
        workoutDaysPerWeek: workoutDays.length,
        totalExercisesPerWeek: allExercises.length,
        totalSetsPerWeek,
        averageSessionDuration: workoutDays.length > 0
            ? Math.round(totalDuration / workoutDays.length)
            : 0,
        focusAreas,
        equipment: program.equipment,
        samplePrescriptions,
    };
};

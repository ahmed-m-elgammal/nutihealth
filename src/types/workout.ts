export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'endurance' | 'strength' | 'general_fitness';
export type EquipmentType = 'bodyweight' | 'dumbbells' | 'barbell' | 'cables' | 'machines' | 'kettlebell' | 'resistance_band' | 'cardio_machine';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full_body' | 'cardio' | 'forearms' | 'low_back';
export type WorkoutFocus = 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'cardio' | 'power';
export type WorkoutSplit = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split' | 'custom' | 'hybrid';

export interface UserWorkoutProfile {
    fitnessLevel: FitnessLevel;
    goals: FitnessGoal[];
    daysPerWeek: number; // 3-7
    preferredDuration: number; // minutes (30, 45, 60, 90)
    availableEquipment: EquipmentType[];
    targetAreas: MuscleGroup[];
    limitations: string[]; // e.g., 'low_back_pain', 'knee_injury'
    experienceYears: number;
    splitPreference?: WorkoutSplit;
}

export interface DetailedExercise {
    id: string;
    name: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'mobility' | 'intro';
    targetMuscles: {
        primary: MuscleGroup[];
        secondary: MuscleGroup[];
    };
    equipment: EquipmentType[];
    difficulty: FitnessLevel;
    instructions: string[];
    formTips: string[];
    videoUrl?: string;
    thumbnailUrl?: string; // For UI display
}

export type RepType = 'reps' | 'time' | 'distance';

export interface ExerciseSetTarget {
    sets: number;
    reps: string | number; // "8-12" or 10 or "30s"
    repType: RepType;
    restPeriod: number; // seconds
    rpe?: number; // Rate of Perceived Exertion (1-10)
    weightGuidance?: string; // "bodyweight", "heavy (85% 1RM)", etc.
    notes?: string;
}

export interface WorkoutExercise extends DetailedExercise, ExerciseSetTarget {
    order: number;
    isSuperset?: boolean;
    supersetId?: string;
}

export interface WorkoutDay {
    id: string;
    dayOfWeek: string; // "Monday", "Tuesday", etc.
    title: string; // "Upper Body Power"
    focus: MuscleGroup[];
    estimatedDuration: number; // minutes
    warmup: WorkoutExercise[];
    mainWorkout: WorkoutExercise[];
    cooldown: WorkoutExercise[];
    notes?: string;
    isRestDay: boolean;
}

export interface WeeklyWorkoutPlan {
    id: string;
    userId: string;
    generatedAt: number; // timestamp
    weekStartDate: number; // timestamp
    userProfileSnapshot: UserWorkoutProfile; // Store profile used to generate this plan
    days: WorkoutDay[];
    status: 'active' | 'completed' | 'archived';
}

// Tracking Interfaces (V3 Enhanced)
export interface ExerciseSet {
    setNumber: number;
    targetReps: number;
    actualReps?: number;
    weight?: number;
    completed: boolean;
    rpe?: number; // 1-10
}

export interface TrackedExercise {
    exerciseId: string;
    exerciseName: string;
    sets: ExerciseSet[];
    notes?: string;
}

export interface WorkoutSession {
    id: string;
    planId: string;
    dayId: string;
    date: number; // timestamp
    exercises: TrackedExercise[];
    duration: number; // minutes
    feeling: 'great' | 'good' | 'average' | 'poor' | 'exhausted';
    notes?: string;
}

export interface PersonalRecord {
    exerciseId: string;
    weight: number;
    reps: number;
    date: number;
}

export interface UserStats {
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate?: number;
    personalRecords: PersonalRecord[];
    totalWorkouts: number;
}

export type ProgramLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProgramCategory = 'strength' | 'hypertrophy' | 'fat_loss' | 'intro' | 'endurance' | 'mobility';

export interface WorkoutProgram {
    id: string;
    title: string;
    description: string;
    level: ProgramLevel;
    durationWeeks: number;
    daysPerWeek: number;
    equipment: EquipmentType[];
    category: ProgramCategory;
    split: WorkoutSplit;
    tags: string[];
    schedule: WeeklyWorkoutPlan;
    thumbnailUrl?: string;
}

export interface Routine {
    id: string;
    title: string;
    description: string;
    level: ProgramLevel;
    durationMinutes: number;
    equipment: EquipmentType[];
    focus: MuscleGroup[];
    exercises: WorkoutExercise[];
    tags: string[];
}

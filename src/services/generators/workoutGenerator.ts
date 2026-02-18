import {
  DetailedExercise,
  UserWorkoutProfile,
  WeeklyWorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  MuscleGroup
} from '../../types/workout';
import { EXERCISE_DATABASE } from '../../database/exercises';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const STANDARD_WARMUP: WorkoutExercise[] = [
  {
    id: 'warmup_jumping_jacks',
    name: 'Jumping Jacks',
    category: 'cardio',
    targetMuscles: { primary: ['full_body'], secondary: [] },
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: ['Jump feet apart and arms up', 'Jump back together'],
    formTips: ['Stay light on feet'],
    sets: 1,
    reps: '60s',
    repType: 'time',
    restPeriod: 0,
    order: 0
  },
  {
    id: 'warmup_arm_circles',
    name: 'Arm Circles',
    category: 'mobility',
    targetMuscles: { primary: ['shoulders'], secondary: [] },
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: ['Rotate arms forward 15 times', 'Rotate backwards 15 times'],
    formTips: ['Full range of motion'],
    sets: 1,
    reps: '30s',
    repType: 'time',
    restPeriod: 0,
    order: 1
  }
];

const STANDARD_COOLDOWN: WorkoutExercise[] = [
  {
    id: 'cooldown_stretch',
    name: 'Full Body Stretch',
    category: 'flexibility',
    targetMuscles: { primary: ['full_body'], secondary: [] },
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: ['Hold each stretch for 20-30 seconds'],
    formTips: ['Breathe deeply'],
    sets: 1,
    reps: '5m',
    repType: 'time',
    restPeriod: 0,
    order: 0
  }
];

/**
 * Calculate a score (0-100) for how well an exercise matches a user's profile
 */
function calculateExerciseScore(exercise: DetailedExercise, profile: UserWorkoutProfile): number {
  let score = 0;

  // 1. Equipment Match (Critical)
  const hasEquipment = exercise.equipment.every(eq => profile.availableEquipment.includes(eq));
  if (!hasEquipment) return 0; // Filter out immediately
  score += 20;

  // 2. Difficulty Match (30 pts)
  if (exercise.difficulty === profile.fitnessLevel) {
    score += 30;
  } else if (
    (profile.fitnessLevel === 'intermediate' && exercise.difficulty === 'beginner') ||
    (profile.fitnessLevel === 'advanced' && exercise.difficulty === 'intermediate')
  ) {
    score += 15; // Still compatible
  } else {
    return 0; // Filter out inappropriate difficulty (e.g. beginner doing advanced)
  }

  // 3. Goal Alignment (25 pts)
  const category = exercise.category;
  const goals = profile.goals;

  if (category === 'cardio' && (goals.includes('weight_loss') || goals.includes('endurance'))) {
    score += 25;
  } else if (category === 'strength' && (goals.includes('muscle_gain') || goals.includes('strength'))) {
    score += 25;
  } else if (goals.includes('general_fitness')) {
    score += 25;
  } else {
    score += 10;
  }

  // 4. Target Area Match
  if (exercise.targetMuscles.primary.some(m => profile.targetAreas.includes(m))) {
    score += 10;
  }

  return score;
}

/**
 * Generate a specific workout session
 */
function generateSession(
  focusMuscles: MuscleGroup[],
  profile: UserWorkoutProfile,
  durationMinutes: number
): WorkoutExercise[] {
  // Filter eligible exercises
  let eligibleExercises = EXERCISE_DATABASE.map(ex => ({
    ...ex,
    score: calculateExerciseScore(ex, profile)
  })).filter(ex => ex.score > 0);

  // Filter by muscle focus
  if (focusMuscles.length > 0 && !focusMuscles.includes('full_body')) {
    eligibleExercises = eligibleExercises.filter(ex =>
      ex.targetMuscles.primary.some(m => focusMuscles.includes(m)) ||
      ex.category === 'core'
    );
  }

  // Sort by score
  eligibleExercises.sort((a, b) => b.score - a.score);

  // Select exercises based on duration (approx 4 mins per exercise inc rest)
  const targetExerciseCount = Math.floor(durationMinutes / 4);

  // improved selection logic to avoid duplicates if possible, or just slice for now
  const exercisesToTake = eligibleExercises.slice(0, targetExerciseCount);

  return exercisesToTake.map((ex, index) => ({
    ...ex,
    order: index,
    sets: 3,
    reps: profile.goals.includes('strength') ? '5-8' : '10-12',
    repType: ex.category === 'cardio' ? 'time' : 'reps',
    restPeriod: 60,
    rpe: 7
  }));
}

/**
 * Generate a full weekly plan
 */

/**
 * Generate a full weekly plan
 */
export function generateWeeklyPlan(profile: UserWorkoutProfile, userId: string): WeeklyWorkoutPlan {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error('generateWeeklyPlan requires a userId.');
  }

  const planId = generateId();
  const days: WorkoutDay[] = [];
  const startTimestamp = Date.now();

  // Determine Split Strategy
  let splitSchedule: { day: string, title: string, focus: MuscleGroup[] }[] = [];

  // Default to preference if set, otherwise Auto-detect based on days
  let strategy = profile.splitPreference;
  if (!strategy) {
    if (profile.daysPerWeek === 3) strategy = 'full_body';
    else if (profile.daysPerWeek === 4) strategy = 'upper_lower';
    else if (profile.daysPerWeek === 5) strategy = 'bro_split'; // or hybrid
    else strategy = 'ppl'; // 6 days
  }

  // Define Schedules based on Strategy
  switch (strategy) {
    case 'full_body':
      // 3 days typical, spread out
      splitSchedule = [
        { day: 'Monday', title: 'Full Body A', focus: ['full_body'] },
        { day: 'Wednesday', title: 'Full Body B', focus: ['full_body'] },
        { day: 'Friday', title: 'Full Body C', focus: ['full_body'] }
      ];
      break;

    case 'upper_lower':
      // 4 days typical
      splitSchedule = [
        { day: 'Monday', title: 'Upper Body Power', focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
        { day: 'Tuesday', title: 'Lower Body Power', focus: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { day: 'Thursday', title: 'Upper Body Hypertrophy', focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
        { day: 'Friday', title: 'Lower Body Hypertrophy', focus: ['quads', 'hamstrings', 'glutes', 'calves'] }
      ];
      break;

    case 'ppl':
      // Push Pull Legs (Usually 3 or 6 days)
      // Let's implement a rotating 6 day or 3 day mapping
      if (profile.daysPerWeek >= 4) {
        splitSchedule = [
          { day: 'Monday', title: 'Push (Chest/Shoulders/Triceps)', focus: ['chest', 'shoulders', 'triceps'] },
          { day: 'Tuesday', title: 'Pull (Back/Biceps)', focus: ['back', 'biceps'] },
          { day: 'Wednesday', title: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'] },
          { day: 'Thursday', title: 'Push (Chest/Shoulders/Triceps)', focus: ['chest', 'shoulders', 'triceps'] },
          { day: 'Friday', title: 'Pull (Back/Biceps)', focus: ['back', 'biceps'] },
          { day: 'Saturday', title: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'] }
        ];
      } else {
        splitSchedule = [
          { day: 'Monday', title: 'Push', focus: ['chest', 'shoulders', 'triceps'] },
          { day: 'Wednesday', title: 'Pull', focus: ['back', 'biceps'] },
          { day: 'Friday', title: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'] }
        ];
      }
      break;

    case 'bro_split':
      // Body Part Split
      splitSchedule = [
        { day: 'Monday', title: 'Chest Day', focus: ['chest'] },
        { day: 'Tuesday', title: 'Back Day', focus: ['back'] },
        { day: 'Wednesday', title: 'Shoulders', focus: ['shoulders'] },
        { day: 'Thursday', title: 'Legs', focus: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { day: 'Friday', title: 'Arms', focus: ['biceps', 'triceps'] }
      ];
      break;

    case 'hybrid':
    default:
      // Custom fallback logic similar to original
      splitSchedule = [
        { day: 'Monday', title: 'Lower Body', focus: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { day: 'Tuesday', title: 'Upper Body', focus: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
        { day: 'Thursday', title: 'Full Body', focus: ['full_body'] },
        { day: 'Friday', title: 'Mobility & Core', focus: ['core', 'full_body'] }
      ];
      break;
  }

  // Adjust for user's actual daysPerWeek if the preset doesn't match perfectly
  // (Simplification: We just take the first N days of the split if days < split length, 
  // or add generic days if days > split length. A real algo would be smarter.)

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  weekDays.forEach(dayName => {
    // Basic mapping: find the scheduled item for this day name
    // In a real generic system, we'd map index 0 -> First Day User Works Out, etc.
    const scheduleItem = splitSchedule.find(s => s.day === dayName);

    // Only generate if user actually wants to work out this many days? 
    // For now, we strictly follow the named days in the split. 
    // If the split has 5 days but user set 3, detailed logic would prune.
    // Here we trust the split definition implies the schedule.

    if (scheduleItem) {
      const exercises = generateSession(scheduleItem.focus, profile, profile.preferredDuration);

      days.push({
        id: generateId(),
        dayOfWeek: dayName,
        title: scheduleItem.title,
        focus: scheduleItem.focus,
        estimatedDuration: profile.preferredDuration,
        isRestDay: false,
        warmup: [...STANDARD_WARMUP],
        mainWorkout: exercises,
        cooldown: [...STANDARD_COOLDOWN]
      });
    } else {
      days.push({
        id: generateId(),
        dayOfWeek: dayName,
        title: 'Rest & Recovery',
        focus: [],
        estimatedDuration: 0,
        isRestDay: true,
        warmup: [],
        mainWorkout: [],
        cooldown: []
      });
    }
  });

  return {
    id: planId,
    userId: normalizedUserId,
    generatedAt: Date.now(),
    weekStartDate: startTimestamp,
    userProfileSnapshot: profile,
    days,
    status: 'active'
  };
}

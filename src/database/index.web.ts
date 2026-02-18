import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { migrations } from './migrations';

// Import all models (Must match index.ts)
import User from './models/User';
import Meal from './models/Meal';
import Food from './models/Food';
import CustomFood from './models/CustomFood';
import WaterLog from './models/WaterLog';
import WaterTarget from './models/WaterTarget';
import Workout from './models/Workout';
import WorkoutExercise from './models/WorkoutExercise';
import ExerciseSet from './models/ExerciseSet';
import Exercise from './models/Exercise';
import WorkoutTemplate from './models/WorkoutTemplate';
import TrainingProgram from './models/TrainingProgram';
import TemplateExercise from './models/TemplateExercise';
import WorkoutSchedule from './models/WorkoutSchedule';
import Recipe from './models/Recipe';
import MealPlan from './models/MealPlan';
import Habit from './models/Habit';
import HabitLog from './models/HabitLog';
import WeightLog from './models/WeightLog';
import Diet from './models/Diet';
import UserDiet from './models/UserDiet';
import MealTemplate from './models/MealTemplate';
import WeeklyGoalPlan from './models/WeeklyGoalPlan';

const adapter = new LokiJSAdapter({
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error: any) => {
    console.error('[Database] Loki adapter setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    User,
    Meal,
    Food,
    CustomFood,
    WaterLog,
    WaterTarget,
    Workout,
    WorkoutExercise,
    ExerciseSet,
    Exercise,
    WorkoutTemplate,
    TrainingProgram,
    TemplateExercise,
    WorkoutSchedule,
    Recipe,
    MealPlan,
    Habit,
    HabitLog,
    WeightLog,
    Diet,
    UserDiet,
    MealTemplate,
    WeeklyGoalPlan,
  ],
});

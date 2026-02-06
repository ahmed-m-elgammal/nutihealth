import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

// Import all models
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
import Recipe from './models/Recipe';
import MealPlan from './models/MealPlan';
import Habit from './models/Habit';
import HabitLog from './models/HabitLog';
import WeightLog from './models/WeightLog';

// Create the adapter
// TEMPORARILY DISABLED FOR EXPO GO COMPATIBILITY
// To use the database, you MUST run a Development Build (npx expo run:android)

// const adapter = new SQLiteAdapter({
//     schema,
//     migrations,
//     jsi: true, // Use JSI for better performance
//     onSetUpError: (error) => {
//         console.error('Database setup error:', error);
//     },
// });

// export const database = new Database({
//     adapter,
//     modelClasses: [
//         User,
//         Meal,
//         Food,
//         CustomFood,
//         WaterLog,
//         WaterTarget,
//         Workout,
//         WorkoutExercise,
//         ExerciseSet,
//         Exercise,
//         WorkoutTemplate,
//         Recipe,
//         MealPlan,
//         Habit,
//         HabitLog,
//         WeightLog,
//     ],
// });

// Export null for Expo Go
export const database = null;
console.warn("WatermelonDB is disabled in Expo Go. Use a Development Build for database functionality.");

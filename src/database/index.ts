import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { Platform } from 'react-native';
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

// Prefer native SQLite adapter for performance, but gracefully fall back to LokiJS
// so Expo Go (which lacks the Watermelon native module) and Web don't hard-crash.
// Prefer native SQLite adapter for performance, but gracefully fall back to LokiJS
// so Expo Go (which lacks the Watermelon native module) and Web don't hard-crash.
const createSQLiteAdapter = () => {
    try {
        return new SQLiteAdapter({
            schema,
            migrations,
            jsi: true, // Use JSI for better performance
            onSetUpError: (error) => {
                console.error('Database setup error:', error);
            },
        });
    } catch (e) {
        // This catch block handles synchronous errors during instantiation
        console.warn('[Database] SQLiteAdapter instantiation failed:', e);
        throw e;
    }
}

// Loki works on web and in bare JS environments (Expo Go). IndexedDB only exists on web.
const createLokiAdapter = () =>
    new LokiJSAdapter({
        schema,
        migrations,
        useWebWorker: false,
        useIncrementalIndexedDB: Platform.OS === 'web',
        dbName: 'nutrihealth-fallback',
        onSetUpError: (error: any) => {
            console.error('[Database] Loki adapter setup error:', error);
        },
    });

let adapter;
try {
    if (Platform.OS === 'web') {
        adapter = createLokiAdapter();
    } else {
        // Try native SQLite first
        try {
            adapter = createSQLiteAdapter();
        } catch (sqliteError) {
            console.warn('[Database] SQLite init failed (expected in Expo Go), falling back to LokiJS:', sqliteError);
            adapter = createLokiAdapter();
        }
    }
} catch (error) {
    console.warn('[Database] Final fallback to LokiJS adapter due to init failure:', error);
    adapter = createLokiAdapter();
}

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

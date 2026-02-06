import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 1,
    tables: [
        // User Profile
        tableSchema({
            name: 'users',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string', isOptional: true },
                { name: 'age', type: 'number' },
                { name: 'gender', type: 'string' }, // 'male', 'female', 'other'
                { name: 'height', type: 'number' }, // cm
                { name: 'weight', type: 'number' }, // kg
                { name: 'goal', type: 'string' }, // 'lose', 'gain', 'maintain'
                { name: 'activity_level', type: 'string' }, // 'sedentary', 'light', 'moderate', 'very_active', 'athlete'
                { name: 'target_weight', type: 'number', isOptional: true },
                { name: 'bmr', type: 'number' },
                { name: 'tdee', type: 'number' },
                { name: 'calorie_target', type: 'number' },
                { name: 'protein_target', type: 'number' },
                { name: 'carbs_target', type: 'number' },
                { name: 'fats_target', type: 'number' },
                { name: 'stats', type: 'string' }, // JSON: current_streak, total_workouts, etc.
                { name: 'preferences', type: 'string' }, // JSON: allergies, dietary_restrictions, theme
                { name: 'onboarding_completed', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Meals
        tableSchema({
            name: 'meals',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'meal_type', type: 'string' }, // 'breakfast', 'lunch', 'dinner', 'snack'
                { name: 'consumed_at', type: 'number', isIndexed: true },
                { name: 'photo_uri', type: 'string', isOptional: true },
                { name: 'total_calories', type: 'number' },
                { name: 'total_protein', type: 'number' },
                { name: 'total_carbs', type: 'number' },
                { name: 'total_fats', type: 'number' },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Individual Food Items
        tableSchema({
            name: 'foods',
            columns: [
                { name: 'meal_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'brand', type: 'string', isOptional: true },
                { name: 'barcode', type: 'string', isOptional: true },
                { name: 'serving_size', type: 'number' },
                { name: 'serving_unit', type: 'string' }, // 'g', 'ml', 'piece', etc.
                { name: 'quantity', type: 'number' },
                { name: 'calories', type: 'number' },
                { name: 'protein', type: 'number' },
                { name: 'carbs', type: 'number' },
                { name: 'fats', type: 'number' },
                { name: 'fiber', type: 'number', isOptional: true },
                { name: 'sugar', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Custom Foods Database
        tableSchema({
            name: 'custom_foods',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'brand', type: 'string', isOptional: true },
                { name: 'barcode', type: 'string', isOptional: true },
                { name: 'serving_size', type: 'number' },
                { name: 'serving_unit', type: 'string' },
                { name: 'calories', type: 'number' },
                { name: 'protein', type: 'number' },
                { name: 'carbs', type: 'number' },
                { name: 'fats', type: 'number' },
                { name: 'fiber', type: 'number', isOptional: true },
                { name: 'sugar', type: 'number', isOptional: true },
                { name: 'is_favorite', type: 'boolean' },
                { name: 'use_count', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Water Logs
        tableSchema({
            name: 'water_logs',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'amount', type: 'number' }, // ml
                { name: 'logged_at', type: 'number', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Dynamic Water Targets
        tableSchema({
            name: 'water_targets',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'date', type: 'number', isIndexed: true }, // timestamp for the day
                { name: 'base_target', type: 'number' },
                { name: 'workout_adjustment', type: 'number' },
                { name: 'weather_adjustment', type: 'number' },
                { name: 'total_target', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Workouts
        tableSchema({
            name: 'workouts',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'workout_type', type: 'string' }, // 'strength', 'cardio', 'mobility', 'custom'
                { name: 'started_at', type: 'number', isIndexed: true },
                { name: 'ended_at', type: 'number', isOptional: true },
                { name: 'duration', type: 'number' }, // minutes
                { name: 'total_volume', type: 'number', isOptional: true }, // kg for strength
                { name: 'calories_burned', type: 'number', isOptional: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'template_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Workout Exercises (exercises within a workout session)
        tableSchema({
            name: 'workout_exercises',
            columns: [
                { name: 'workout_id', type: 'string', isIndexed: true },
                { name: 'exercise_id', type: 'string', isIndexed: true },
                { name: 'order', type: 'number' },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Exercise Sets
        tableSchema({
            name: 'exercise_sets',
            columns: [
                { name: 'workout_exercise_id', type: 'string', isIndexed: true },
                { name: 'set_number', type: 'number' },
                { name: 'reps', type: 'number', isOptional: true },
                { name: 'weight', type: 'number', isOptional: true }, // kg
                { name: 'distance', type: 'number', isOptional: true }, // km for cardio
                { name: 'duration', type: 'number', isOptional: true }, // seconds
                { name: 'rpe', type: 'number', isOptional: true }, // Rate of Perceived Exertion (1-10)
                { name: 'is_warmup', type: 'boolean' },
                { name: 'is_pr', type: 'boolean' }, // Personal Record
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Exercise Library (Master list)
        tableSchema({
            name: 'exercises',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'category', type: 'string' }, // 'strength', 'cardio', 'mobility'
                { name: 'muscle_group', type: 'string' }, // 'chest', 'back', 'legs', etc.
                { name: 'equipment', type: 'string' }, // 'barbell', 'dumbbell', 'bodyweight', etc.
                { name: 'description', type: 'string', isOptional: true },
                { name: 'video_url', type: 'string', isOptional: true },
                { name: 'image_url', type: 'string', isOptional: true },
                { name: 'is_custom', type: 'boolean' },
                { name: 'user_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Workout Templates
        tableSchema({
            name: 'workout_templates',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'workout_type', type: 'string' },
                { name: 'exercises', type: 'string' }, // JSON array of exercise configs
                { name: 'is_favorite', type: 'boolean' },
                { name: 'use_count', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Recipes
        tableSchema({
            name: 'recipes',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'servings', type: 'number' },
                { name: 'prep_time', type: 'number', isOptional: true }, // minutes
                { name: 'cook_time', type: 'number', isOptional: true }, // minutes
                { name: 'ingredients', type: 'string' }, // JSON array
                { name: 'instructions', type: 'string' }, // JSON array of steps
                { name: 'photo_uri', type: 'string', isOptional: true },
                { name: 'calories_per_serving', type: 'number' },
                { name: 'protein_per_serving', type: 'number' },
                { name: 'carbs_per_serving', type: 'number' },
                { name: 'fats_per_serving', type: 'number' },
                { name: 'is_favorite', type: 'boolean' },
                { name: 'tags', type: 'string', isOptional: true }, // JSON array
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Meal Plans
        tableSchema({
            name: 'meal_plans',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'start_date', type: 'number' },
                { name: 'end_date', type: 'number' },
                { name: 'plan_data', type: 'string' }, // JSON with daily meals
                { name: 'is_active', type: 'boolean' },
                { name: 'is_ai_generated', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Habits
        tableSchema({
            name: 'habits',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'icon', type: 'string', isOptional: true },
                { name: 'color', type: 'string', isOptional: true },
                { name: 'frequency', type: 'string' }, // 'daily', 'weekly', 'custom'
                { name: 'frequency_config', type: 'string', isOptional: true }, // JSON: days of week, etc.
                { name: 'current_streak', type: 'number' },
                { name: 'best_streak', type: 'number' },
                { name: 'is_active', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Habit Logs
        tableSchema({
            name: 'habit_logs',
            columns: [
                { name: 'habit_id', type: 'string', isIndexed: true },
                { name: 'completed_at', type: 'number', isIndexed: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Weight Logs (for body metrics)
        tableSchema({
            name: 'weight_logs',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'weight', type: 'number' }, // kg
                { name: 'body_fat_percentage', type: 'number', isOptional: true },
                { name: 'muscle_mass', type: 'number', isOptional: true },
                { name: 'measurements', type: 'string', isOptional: true }, // JSON: chest, waist, etc.
                { name: 'photo_uri', type: 'string', isOptional: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'logged_at', type: 'number', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});

import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { DATABASE_SCHEMA_VERSION } from './schemaVersion';

export const schema = appSchema({
    version: DATABASE_SCHEMA_VERSION,
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
                { name: 'pantry_preferences', type: 'string', isOptional: true }, // JSON: pantry filters/preferences
                { name: 'workout_preferences', type: 'string', isOptional: true }, // JSON: workout setup profile
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
                { name: 'meal_type', type: 'string', isIndexed: true }, // 'breakfast', 'lunch', 'dinner', 'snack'
                { name: 'consumed_at', type: 'number', isIndexed: true },
                { name: 'photo_uri', type: 'string', isOptional: true },
                { name: 'total_calories', type: 'number' },
                { name: 'total_protein', type: 'number' },
                { name: 'total_carbs', type: 'number' },
                { name: 'total_fats', type: 'number' },
                { name: 'total_fiber', type: 'number' },
                { name: 'total_sugar', type: 'number' },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'cooked_from_recipe_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Individual Food Items
        tableSchema({
            name: 'foods',
            columns: [
                { name: 'meal_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string', isIndexed: true },
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
                { name: 'note', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number', isIndexed: true },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Custom Foods Database
        tableSchema({
            name: 'custom_foods',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string', isIndexed: true },
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
                { name: 'is_completed', type: 'boolean' },
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
                { name: 'program_id', type: 'string', isOptional: true, isIndexed: true },
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

        // Training Programs
        tableSchema({
            name: 'training_programs',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'level', type: 'string', isIndexed: true }, // 'beginner', 'intermediate', 'advanced'
                { name: 'duration_weeks', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Template Exercises (junction: workout_templates <-> exercises)
        tableSchema({
            name: 'template_exercises',
            columns: [
                { name: 'template_id', type: 'string', isIndexed: true },
                { name: 'exercise_id', type: 'string', isIndexed: true },
                { name: 'sets', type: 'number' },
                { name: 'reps', type: 'number' },
                { name: 'order', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Workout Schedules (user weekly mapping)
        tableSchema({
            name: 'workout_schedules',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'template_id', type: 'string', isIndexed: true },
                { name: 'day_of_week', type: 'string', isIndexed: true }, // 'Monday', 'Tuesday', etc.
                { name: 'intensity', type: 'string', isOptional: true }, // 'light', 'moderate', 'heavy'
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
                { name: 'source_platform', type: 'string', isOptional: true, isIndexed: true }, // cookpad, manual, etc.
                { name: 'external_id', type: 'string', isOptional: true, isIndexed: true }, // provider-specific recipe id
                { name: 'nutrition_confidence', type: 'number', isOptional: true }, // 0-1 confidence score
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Pantry Items
        tableSchema({
            name: 'pantry_items',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string', isIndexed: true },
                { name: 'normalized_name', type: 'string', isOptional: true, isIndexed: true },
                { name: 'quantity', type: 'number' },
                { name: 'unit', type: 'string' },
                { name: 'category', type: 'string', isOptional: true, isIndexed: true },
                { name: 'expiry_date', type: 'number', isOptional: true, isIndexed: true },
                { name: 'is_available', type: 'boolean', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Cookpad Recipe Cache
        tableSchema({
            name: 'cookpad_recipe_cache',
            columns: [
                { name: 'cookpad_id', type: 'string', isIndexed: true },
                { name: 'source_url', type: 'string' },
                { name: 'title', type: 'string' },
                { name: 'title_ar', type: 'string', isOptional: true },
                { name: 'author', type: 'string', isOptional: true },
                { name: 'category', type: 'string', isOptional: true },
                { name: 'tags', type: 'string', isOptional: true }, // JSON array
                { name: 'image_url', type: 'string', isOptional: true },
                { name: 'servings', type: 'number' },
                { name: 'prep_time', type: 'number', isOptional: true },
                { name: 'cook_time', type: 'number', isOptional: true },
                { name: 'total_time', type: 'number', isOptional: true },
                { name: 'ingredients', type: 'string' }, // JSON array
                { name: 'instructions', type: 'string' }, // JSON array
                { name: 'nutrition', type: 'string', isOptional: true }, // JSON object
                { name: 'raw_payload', type: 'string', isOptional: true }, // JSON payload for debugging
                { name: 'search_terms', type: 'string', isOptional: true }, // internal lookup terms
                { name: 'fetched_at', type: 'number', isIndexed: true },
                { name: 'expires_at', type: 'number', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Smart Cooker Suggestions
        tableSchema({
            name: 'smart_cooker_suggestions',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'pantry_item_ids', type: 'string' }, // JSON array
                { name: 'suggested_recipe_ids', type: 'string' }, // JSON array
                { name: 'source_platform', type: 'string' }, // cookpad, internal, hybrid
                { name: 'confidence_score', type: 'number', isOptional: true },
                { name: 'status', type: 'string', isOptional: true }, // pending, accepted, dismissed
                { name: 'metadata', type: 'string', isOptional: true }, // JSON
                { name: 'created_at', type: 'number', isIndexed: true },
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

        // Meal Templates - Reusable meal configurations
        tableSchema({
            name: 'meal_templates',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'meal_type', type: 'string', isIndexed: true }, // 'breakfast', 'lunch', 'dinner', 'snack'
                { name: 'foods_data', type: 'string' }, // JSON array of food items with quantities
                { name: 'total_calories', type: 'number' },
                { name: 'total_protein', type: 'number' },
                { name: 'total_carbs', type: 'number' },
                { name: 'total_fats', type: 'number' },
                { name: 'is_favorite', type: 'boolean' },
                { name: 'use_count', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Weekly Goal Plans - Day-specific macro targets
        tableSchema({
            name: 'weekly_goal_plans',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'plan_name', type: 'string' },
                { name: 'is_active', type: 'boolean', isIndexed: true },
                { name: 'start_date', type: 'number' },
                { name: 'end_date', type: 'number', isOptional: true },
                // Monday targets
                { name: 'monday_calories', type: 'number' },
                { name: 'monday_protein', type: 'number' },
                { name: 'monday_carbs', type: 'number' },
                { name: 'monday_fats', type: 'number' },
                // Tuesday targets
                { name: 'tuesday_calories', type: 'number' },
                { name: 'tuesday_protein', type: 'number' },
                { name: 'tuesday_carbs', type: 'number' },
                { name: 'tuesday_fats', type: 'number' },
                // Wednesday targets
                { name: 'wednesday_calories', type: 'number' },
                { name: 'wednesday_protein', type: 'number' },
                { name: 'wednesday_carbs', type: 'number' },
                { name: 'wednesday_fats', type: 'number' },
                // Thursday targets
                { name: 'thursday_calories', type: 'number' },
                { name: 'thursday_protein', type: 'number' },
                { name: 'thursday_carbs', type: 'number' },
                { name: 'thursday_fats', type: 'number' },
                // Friday targets
                { name: 'friday_calories', type: 'number' },
                { name: 'friday_protein', type: 'number' },
                { name: 'friday_carbs', type: 'number' },
                { name: 'friday_fats', type: 'number' },
                // Saturday targets
                { name: 'saturday_calories', type: 'number' },
                { name: 'saturday_protein', type: 'number' },
                { name: 'saturday_carbs', type: 'number' },
                { name: 'saturday_fats', type: 'number' },
                // Sunday targets
                { name: 'sunday_calories', type: 'number' },
                { name: 'sunday_protein', type: 'number' },
                { name: 'sunday_carbs', type: 'number' },
                { name: 'sunday_fats', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Diets
        tableSchema({
            name: 'diets',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'type', type: 'string' }, // 'preset', 'custom'
                { name: 'calorie_target', type: 'number' },
                { name: 'protein_target', type: 'number' },
                { name: 'carbs_target', type: 'number' },
                { name: 'fats_target', type: 'number' },
                { name: 'fiber_target', type: 'number', isOptional: true },
                { name: 'restrictions', type: 'string' }, // JSON array
                { name: 'is_active', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // User Diets (junction table)
        tableSchema({
            name: 'user_diets',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'diet_id', type: 'string', isIndexed: true },
                { name: 'start_date', type: 'number' },
                { name: 'end_date', type: 'number', isOptional: true },
                { name: 'is_active', type: 'boolean' },
                { name: 'target_weight', type: 'number', isOptional: true },
                { name: 'weekly_goal', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        // Workout Sessions
        tableSchema({
            name: 'workout_sessions',
            columns: [
                { name: 'user_id', type: 'string', isIndexed: true },
                { name: 'plan_id', type: 'string', isOptional: true },
                { name: 'day_id', type: 'string', isOptional: true },
                { name: 'template_id', type: 'string', isOptional: true },
                { name: 'started_at', type: 'number', isIndexed: true },
                { name: 'ended_at', type: 'number', isOptional: true },
                { name: 'duration_minutes', type: 'number' },
                { name: 'calories_burned', type: 'number', isOptional: true },
                { name: 'total_volume_kg', type: 'number', isOptional: true },
                { name: 'intensity', type: 'string', isOptional: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'exercises', type: 'string' }, // JSON
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});

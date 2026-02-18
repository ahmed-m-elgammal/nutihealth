import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                createTable({
                    name: 'diets',
                    columns: [
                        { name: 'name', type: 'string' },
                        { name: 'description', type: 'string', isOptional: true },
                        { name: 'type', type: 'string' },
                        { name: 'calorie_target', type: 'number' },
                        { name: 'protein_target', type: 'number' },
                        { name: 'carbs_target', type: 'number' },
                        { name: 'fats_target', type: 'number' },
                        { name: 'fiber_target', type: 'number', isOptional: true },
                        { name: 'restrictions', type: 'string' },
                        { name: 'is_active', type: 'boolean' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                createTable({
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
                addColumns({
                    table: 'exercise_sets',
                    columns: [
                        { name: 'is_completed', type: 'boolean' },
                    ],
                }),
            ],
        },
        {
            toVersion: 3,
            steps: [
                createTable({
                    name: 'meal_templates',
                    columns: [
                        { name: 'user_id', type: 'string', isIndexed: true },
                        { name: 'name', type: 'string' },
                        { name: 'description', type: 'string', isOptional: true },
                        { name: 'meal_type', type: 'string' },
                        { name: 'foods_data', type: 'string' },
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
                createTable({
                    name: 'weekly_goal_plans',
                    columns: [
                        { name: 'user_id', type: 'string', isIndexed: true },
                        { name: 'plan_name', type: 'string' },
                        { name: 'is_active', type: 'boolean', isIndexed: true },
                        { name: 'start_date', type: 'number' },
                        { name: 'end_date', type: 'number', isOptional: true },
                        // Monday
                        { name: 'monday_calories', type: 'number' },
                        { name: 'monday_protein', type: 'number' },
                        { name: 'monday_carbs', type: 'number' },
                        { name: 'monday_fats', type: 'number' },
                        // Tuesday
                        { name: 'tuesday_calories', type: 'number' },
                        { name: 'tuesday_protein', type: 'number' },
                        { name: 'tuesday_carbs', type: 'number' },
                        { name: 'tuesday_fats', type: 'number' },
                        // Wednesday
                        { name: 'wednesday_calories', type: 'number' },
                        { name: 'wednesday_protein', type: 'number' },
                        { name: 'wednesday_carbs', type: 'number' },
                        { name: 'wednesday_fats', type: 'number' },
                        // Thursday
                        { name: 'thursday_calories', type: 'number' },
                        { name: 'thursday_protein', type: 'number' },
                        { name: 'thursday_carbs', type: 'number' },
                        { name: 'thursday_fats', type: 'number' },
                        // Friday
                        { name: 'friday_calories', type: 'number' },
                        { name: 'friday_protein', type: 'number' },
                        { name: 'friday_carbs', type: 'number' },
                        { name: 'friday_fats', type: 'number' },
                        // Saturday
                        { name: 'saturday_calories', type: 'number' },
                        { name: 'saturday_protein', type: 'number' },
                        { name: 'saturday_carbs', type: 'number' },
                        { name: 'saturday_fats', type: 'number' },
                        // Sunday
                        { name: 'sunday_calories', type: 'number' },
                        { name: 'sunday_protein', type: 'number' },
                        { name: 'sunday_carbs', type: 'number' },
                        { name: 'sunday_fats', type: 'number' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 4,
            steps: [
                createTable({
                    name: 'training_programs',
                    columns: [
                        { name: 'name', type: 'string' },
                        { name: 'description', type: 'string', isOptional: true },
                        { name: 'level', type: 'string', isIndexed: true },
                        { name: 'duration_weeks', type: 'number' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'workout_templates',
                    columns: [
                        { name: 'program_id', type: 'string', isOptional: true, isIndexed: true },
                    ],
                }),
                createTable({
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
                createTable({
                    name: 'workout_schedules',
                    columns: [
                        { name: 'user_id', type: 'string', isIndexed: true },
                        { name: 'template_id', type: 'string', isIndexed: true },
                        { name: 'day_of_week', type: 'string', isIndexed: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 5,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [
                        { name: 'workout_preferences', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
    ],
});

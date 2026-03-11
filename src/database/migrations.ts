import { addColumns, createTable, schemaMigrations, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

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
                    columns: [{ name: 'is_completed', type: 'boolean' }],
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
                        { name: 'meal_type', type: 'string', isIndexed: true },
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
                    columns: [{ name: 'program_id', type: 'string', isOptional: true, isIndexed: true }],
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
                    columns: [{ name: 'workout_preferences', type: 'string', isOptional: true }],
                }),
            ],
        },
        {
            toVersion: 6,
            steps: [],
        },
        {
            toVersion: 7,
            steps: [
                unsafeExecuteSql('CREATE INDEX IF NOT EXISTS meals_consumed_at_idx ON meals (consumed_at);'),
                unsafeExecuteSql('CREATE INDEX IF NOT EXISTS water_logs_logged_at_idx ON water_logs (logged_at);'),
                unsafeExecuteSql('CREATE INDEX IF NOT EXISTS foods_created_at_idx ON foods (created_at);'),
            ],
        },
        {
            toVersion: 8,
            steps: [
                addColumns({
                    table: 'foods',
                    columns: [{ name: 'note', type: 'string', isOptional: true }],
                }),
            ],
        },
        {
            toVersion: 9,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [{ name: 'pantry_preferences', type: 'string', isOptional: true }],
                }),
                addColumns({
                    table: 'recipes',
                    columns: [
                        { name: 'source_platform', type: 'string', isOptional: true, isIndexed: true },
                        { name: 'external_id', type: 'string', isOptional: true, isIndexed: true },
                        { name: 'nutrition_confidence', type: 'number', isOptional: true },
                    ],
                }),
                addColumns({
                    table: 'meals',
                    columns: [{ name: 'cooked_from_recipe_id', type: 'string', isOptional: true, isIndexed: true }],
                }),
                createTable({
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
                createTable({
                    name: 'cookpad_recipe_cache',
                    columns: [
                        { name: 'cookpad_id', type: 'string', isIndexed: true },
                        { name: 'source_url', type: 'string' },
                        { name: 'title', type: 'string' },
                        { name: 'title_ar', type: 'string', isOptional: true },
                        { name: 'author', type: 'string', isOptional: true },
                        { name: 'category', type: 'string', isOptional: true },
                        { name: 'tags', type: 'string', isOptional: true },
                        { name: 'image_url', type: 'string', isOptional: true },
                        { name: 'servings', type: 'number' },
                        { name: 'prep_time', type: 'number', isOptional: true },
                        { name: 'cook_time', type: 'number', isOptional: true },
                        { name: 'total_time', type: 'number', isOptional: true },
                        { name: 'ingredients', type: 'string' },
                        { name: 'instructions', type: 'string' },
                        { name: 'nutrition', type: 'string', isOptional: true },
                        { name: 'raw_payload', type: 'string', isOptional: true },
                        { name: 'search_terms', type: 'string', isOptional: true },
                        { name: 'fetched_at', type: 'number', isIndexed: true },
                        { name: 'expires_at', type: 'number', isIndexed: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                createTable({
                    name: 'smart_cooker_suggestions',
                    columns: [
                        { name: 'user_id', type: 'string', isIndexed: true },
                        { name: 'pantry_item_ids', type: 'string' },
                        { name: 'suggested_recipe_ids', type: 'string' },
                        { name: 'source_platform', type: 'string' },
                        { name: 'confidence_score', type: 'number', isOptional: true },
                        { name: 'status', type: 'string', isOptional: true },
                        { name: 'metadata', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number', isIndexed: true },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                unsafeExecuteSql(
                    'CREATE UNIQUE INDEX IF NOT EXISTS cookpad_recipe_cache_cookpad_id_uq ON cookpad_recipe_cache (cookpad_id);',
                ),
                unsafeExecuteSql(
                    'CREATE INDEX IF NOT EXISTS pantry_items_user_available_idx ON pantry_items (user_id, is_available);',
                ),
                unsafeExecuteSql(
                    'CREATE INDEX IF NOT EXISTS pantry_items_user_category_idx ON pantry_items (user_id, category);',
                ),
                unsafeExecuteSql(
                    'CREATE INDEX IF NOT EXISTS recipes_external_source_idx ON recipes (source_platform, external_id);',
                ),
            ],
        },
        {
            toVersion: 10,
            steps: [
                addColumns({
                    table: 'meals',
                    columns: [
                        { name: 'total_fiber', type: 'number' },
                        { name: 'total_sugar', type: 'number' },
                    ],
                }),
                unsafeExecuteSql(
                    'UPDATE meals SET total_fiber = COALESCE((SELECT SUM(COALESCE(fiber, 0) * quantity) FROM foods WHERE foods.meal_id = meals.id), 0), total_sugar = COALESCE((SELECT SUM(COALESCE(sugar, 0) * quantity) FROM foods WHERE foods.meal_id = meals.id), 0);',
                ),
            ],
        },
        {
            toVersion: 11,
            steps: [
                addColumns({
                    table: 'workout_schedules',
                    columns: [{ name: 'intensity', type: 'string', isOptional: true }],
                }),
            ],
        },
        {
            toVersion: 12,
            steps: [
                createTable({
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
                        { name: 'exercises', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
    ],
});

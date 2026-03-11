-- 00-base-schema.sql

CREATE TABLE IF NOT EXISTS public.users (
    id text primary key,
    user_id text,
    name text,
    email text,
    age numeric,
    gender text,
    height numeric,
    weight numeric,
    goal text,
    activity_level text,
    target_weight numeric,
    bmr numeric,
    tdee numeric,
    calorie_target numeric,
    protein_target numeric,
    carbs_target numeric,
    fats_target numeric,
    stats text,
    preferences text,
    pantry_preferences text,
    workout_preferences text,
    onboarding_completed boolean,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.meals (
    id text primary key,
    user_id text,
    name text,
    meal_type text,
    consumed_at bigint,
    photo_uri text,
    total_calories numeric,
    total_protein numeric,
    total_carbs numeric,
    total_fats numeric,
    total_fiber numeric,
    total_sugar numeric,
    notes text,
    cooked_from_recipe_id text,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.foods (
    id text primary key,
    meal_id text,
    name text,
    brand text,
    barcode text,
    serving_size numeric,
    serving_unit text,
    quantity numeric,
    calories numeric,
    protein numeric,
    carbs numeric,
    fats numeric,
    fiber numeric,
    sugar numeric,
    note text,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.custom_foods (
    id text primary key,
    user_id text,
    name text,
    brand text,
    barcode text,
    serving_size numeric,
    serving_unit text,
    calories numeric,
    protein numeric,
    carbs numeric,
    fats numeric,
    fiber numeric,
    sugar numeric,
    is_favorite boolean,
    use_count numeric,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.water_logs (
    id text primary key,
    user_id text,
    amount numeric,
    logged_at bigint,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.water_targets (
    id text primary key,
    user_id text,
    date bigint,
    base_target numeric,
    workout_adjustment numeric,
    weather_adjustment numeric,
    total_target numeric,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.workouts (
    id text primary key,
    user_id text,
    name text,
    workout_type text,
    started_at bigint,
    ended_at bigint,
    duration numeric,
    total_volume numeric,
    calories_burned numeric,
    notes text,
    template_id text,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id text primary key,
    workout_id text,
    exercise_id text,
    "order" numeric,
    notes text,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id text primary key,
    workout_exercise_id text,
    set_number numeric,
    reps numeric,
    weight numeric,
    distance numeric,
    duration numeric,
    rpe numeric,
    is_warmup boolean,
    is_pr boolean,
    is_completed boolean,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id text primary key,
    user_id text,
    name text,
    description text,
    servings numeric,
    prep_time numeric,
    cook_time numeric,
    ingredients text,
    instructions text,
    photo_uri text,
    calories_per_serving numeric,
    protein_per_serving numeric,
    carbs_per_serving numeric,
    fats_per_serving numeric,
    is_favorite boolean,
    tags text,
    source_platform text,
    external_id text,
    nutrition_confidence numeric,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.meal_plans (
    id text primary key,
    user_id text,
    name text,
    description text,
    start_date bigint,
    end_date bigint,
    plan_data text,
    is_active boolean,
    is_ai_generated boolean,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.habits (
    id text primary key,
    user_id text,
    name text,
    description text,
    icon text,
    color text,
    frequency text,
    frequency_config text,
    current_streak numeric,
    best_streak numeric,
    is_active boolean,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
    id text primary key,
    habit_id text,
    completed_at bigint,
    notes text,
    created_at bigint,
    updated_at bigint
);

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id text primary key,
    user_id text,
    weight numeric,
    body_fat_percentage numeric,
    muscle_mass numeric,
    measurements text,
    photo_uri text,
    notes text,
    logged_at bigint,
    created_at bigint,
    updated_at bigint
);

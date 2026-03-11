-- NutriHealth direct-client sync RLS policies
-- Run in Supabase SQL editor after critical-hardening.sql.
-- Uses public.users.user_id (auth uid as text) for ownership checks.

alter table if exists public.users
    add column if not exists user_id text;

-- Enable RLS on sync tables
alter table public.users enable row level security;
alter table public.meals enable row level security;
alter table public.foods enable row level security;
alter table public.custom_foods enable row level security;
alter table public.water_logs enable row level security;
alter table public.water_targets enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.weight_logs enable row level security;

-- users
drop policy if exists users_self_access on public.users;
create policy users_self_access
on public.users
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

-- direct user_id tables
drop policy if exists meals_owner_access on public.meals;
create policy meals_owner_access
on public.meals
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists custom_foods_owner_access on public.custom_foods;
create policy custom_foods_owner_access
on public.custom_foods
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists water_logs_owner_access on public.water_logs;
create policy water_logs_owner_access
on public.water_logs
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists water_targets_owner_access on public.water_targets;
create policy water_targets_owner_access
on public.water_targets
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists workouts_owner_access on public.workouts;
create policy workouts_owner_access
on public.workouts
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists recipes_owner_access on public.recipes;
create policy recipes_owner_access
on public.recipes
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists meal_plans_owner_access on public.meal_plans;
create policy meal_plans_owner_access
on public.meal_plans
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists habits_owner_access on public.habits;
create policy habits_owner_access
on public.habits
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists weight_logs_owner_access on public.weight_logs;
create policy weight_logs_owner_access
on public.weight_logs
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

-- related tables without direct user_id
drop policy if exists foods_owner_access on public.foods;
create policy foods_owner_access
on public.foods
for all
using (
    exists (
        select 1
        from public.meals m
        where m.id = foods.meal_id
          and m.user_id = auth.uid()::text
    )
)
with check (
    exists (
        select 1
        from public.meals m
        where m.id = foods.meal_id
          and m.user_id = auth.uid()::text
    )
);

drop policy if exists workout_exercises_owner_access on public.workout_exercises;
create policy workout_exercises_owner_access
on public.workout_exercises
for all
using (
    exists (
        select 1
        from public.workouts w
        where w.id = workout_exercises.workout_id
          and w.user_id = auth.uid()::text
    )
)
with check (
    exists (
        select 1
        from public.workouts w
        where w.id = workout_exercises.workout_id
          and w.user_id = auth.uid()::text
    )
);

drop policy if exists exercise_sets_owner_access on public.exercise_sets;
create policy exercise_sets_owner_access
on public.exercise_sets
for all
using (
    exists (
        select 1
        from public.workout_exercises we
        join public.workouts w on w.id = we.workout_id
        where we.id = exercise_sets.workout_exercise_id
          and w.user_id = auth.uid()::text
    )
)
with check (
    exists (
        select 1
        from public.workout_exercises we
        join public.workouts w on w.id = we.workout_id
        where we.id = exercise_sets.workout_exercise_id
          and w.user_id = auth.uid()::text
    )
);

drop policy if exists habit_logs_owner_access on public.habit_logs;
create policy habit_logs_owner_access
on public.habit_logs
for all
using (
    exists (
        select 1
        from public.habits h
        where h.id = habit_logs.habit_id
          and h.user_id = auth.uid()::text
    )
)
with check (
    exists (
        select 1
        from public.habits h
        where h.id = habit_logs.habit_id
          and h.user_id = auth.uid()::text
    )
);

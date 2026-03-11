-- NutriHealth critical Supabase hardening
-- Run this before/alongside rls-policies.sql in Supabase SQL editor.
-- This script targets the currently synced tables in src/services/api/sync.ts.

-- 1) Align users table with auth identity without forcing primary key changes.
alter table if exists public.users
    add column if not exists user_id text;

update public.users
set user_id = id
where user_id is null
  and id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

create unique index if not exists users_user_id_unique_idx
    on public.users (user_id)
    where user_id is not null;

create index if not exists users_user_id_idx
    on public.users (user_id);

-- 2) Deduplicate water targets and enforce one target/day/user.
with ranked as (
    select
        ctid,
        row_number() over (
            partition by user_id, date
            order by updated_at desc nulls last, created_at desc nulls last
        ) as row_num
    from public.water_targets
)
delete from public.water_targets wt
using ranked r
where wt.ctid = r.ctid
  and r.row_num > 1;

create unique index if not exists water_targets_user_date_unique_idx
    on public.water_targets (user_id, date);

-- 3) Remove orphan rows in child tables prior to adding FK cascades.
delete from public.foods f
where not exists (
    select 1 from public.meals m where m.id = f.meal_id
);

delete from public.workout_exercises we
where not exists (
    select 1 from public.workouts w where w.id = we.workout_id
);

delete from public.exercise_sets es
where not exists (
    select 1 from public.workout_exercises we where we.id = es.workout_exercise_id
);

delete from public.habit_logs hl
where not exists (
    select 1 from public.habits h where h.id = hl.habit_id
);

-- 4) Enforce parent/child referential integrity with cascade deletes.
do $$
begin
    if not exists (
        select 1
        from information_schema.key_column_usage kcu
        join information_schema.table_constraints tc
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
          and tc.table_name = 'foods'
          and kcu.column_name = 'meal_id'
    ) then
        alter table public.foods
            add constraint foods_meal_id_fkey
            foreign key (meal_id)
            references public.meals (id)
            on delete cascade;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.key_column_usage kcu
        join information_schema.table_constraints tc
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
          and tc.table_name = 'workout_exercises'
          and kcu.column_name = 'workout_id'
    ) then
        alter table public.workout_exercises
            add constraint workout_exercises_workout_id_fkey
            foreign key (workout_id)
            references public.workouts (id)
            on delete cascade;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.key_column_usage kcu
        join information_schema.table_constraints tc
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
          and tc.table_name = 'exercise_sets'
          and kcu.column_name = 'workout_exercise_id'
    ) then
        alter table public.exercise_sets
            add constraint exercise_sets_workout_exercise_id_fkey
            foreign key (workout_exercise_id)
            references public.workout_exercises (id)
            on delete cascade;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from information_schema.key_column_usage kcu
        join information_schema.table_constraints tc
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
          and tc.table_name = 'habit_logs'
          and kcu.column_name = 'habit_id'
    ) then
        alter table public.habit_logs
            add constraint habit_logs_habit_id_fkey
            foreign key (habit_id)
            references public.habits (id)
            on delete cascade;
    end if;
end $$;

-- 5) Sync performance indexes.
create index if not exists meals_user_updated_at_idx on public.meals (user_id, updated_at);
create index if not exists custom_foods_user_updated_at_idx on public.custom_foods (user_id, updated_at);
create index if not exists water_logs_user_updated_at_idx on public.water_logs (user_id, updated_at);
create index if not exists water_targets_user_updated_at_idx on public.water_targets (user_id, updated_at);
create index if not exists workouts_user_updated_at_idx on public.workouts (user_id, updated_at);
create index if not exists recipes_user_updated_at_idx on public.recipes (user_id, updated_at);
create index if not exists meal_plans_user_updated_at_idx on public.meal_plans (user_id, updated_at);
create index if not exists habits_user_updated_at_idx on public.habits (user_id, updated_at);
create index if not exists weight_logs_user_updated_at_idx on public.weight_logs (user_id, updated_at);
create index if not exists users_user_id_updated_at_idx on public.users (user_id, updated_at);

create index if not exists foods_meal_updated_at_idx on public.foods (meal_id, updated_at);
create index if not exists workout_exercises_workout_updated_at_idx on public.workout_exercises (workout_id, updated_at);
create index if not exists exercise_sets_workout_exercise_updated_at_idx on public.exercise_sets (workout_exercise_id, updated_at);
create index if not exists habit_logs_habit_updated_at_idx on public.habit_logs (habit_id, updated_at);

-- 6) Keep updated_at monotonic for synced rows.
create or replace function public.nh_now_ms()
returns bigint
language sql
volatile
as $$
    select floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

create or replace function public.nh_touch_updated_at_ms()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := public.nh_now_ms();
    return new;
end;
$$;

drop trigger if exists nh_touch_users_updated_at on public.users;
create trigger nh_touch_users_updated_at
before update on public.users
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_meals_updated_at on public.meals;
create trigger nh_touch_meals_updated_at
before update on public.meals
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_foods_updated_at on public.foods;
create trigger nh_touch_foods_updated_at
before update on public.foods
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_custom_foods_updated_at on public.custom_foods;
create trigger nh_touch_custom_foods_updated_at
before update on public.custom_foods
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_water_logs_updated_at on public.water_logs;
create trigger nh_touch_water_logs_updated_at
before update on public.water_logs
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_water_targets_updated_at on public.water_targets;
create trigger nh_touch_water_targets_updated_at
before update on public.water_targets
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_workouts_updated_at on public.workouts;
create trigger nh_touch_workouts_updated_at
before update on public.workouts
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_workout_exercises_updated_at on public.workout_exercises;
create trigger nh_touch_workout_exercises_updated_at
before update on public.workout_exercises
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_exercise_sets_updated_at on public.exercise_sets;
create trigger nh_touch_exercise_sets_updated_at
before update on public.exercise_sets
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_recipes_updated_at on public.recipes;
create trigger nh_touch_recipes_updated_at
before update on public.recipes
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_meal_plans_updated_at on public.meal_plans;
create trigger nh_touch_meal_plans_updated_at
before update on public.meal_plans
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_habits_updated_at on public.habits;
create trigger nh_touch_habits_updated_at
before update on public.habits
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_habit_logs_updated_at on public.habit_logs;
create trigger nh_touch_habit_logs_updated_at
before update on public.habit_logs
for each row execute procedure public.nh_touch_updated_at_ms();

drop trigger if exists nh_touch_weight_logs_updated_at on public.weight_logs;
create trigger nh_touch_weight_logs_updated_at
before update on public.weight_logs
for each row execute procedure public.nh_touch_updated_at_ms();

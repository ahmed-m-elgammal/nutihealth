import { database } from '../database';
import gifsData from '../../gifs_data.json';
import { Q } from '@nozbe/watermelondb';
import { ALL_PROGRAMS } from '../data/programs';
import Exercise from './models/Exercise';
import TemplateExercise from './models/TemplateExercise';
import TrainingProgram from './models/TrainingProgram';
import WorkoutSchedule from './models/WorkoutSchedule';
import WorkoutTemplate from './models/WorkoutTemplate';
import { waitForDatabaseReady } from './ready';

/**
 * Seed exercises into the database
 */
export async function seedExercises() {
    console.log('[Seed] Starting exercise seed...');

    const exercisesCollection = database.get('exercises');
    const existingCount = await exercisesCollection.query().fetchCount();

    if (existingCount > 50) { // Check if we have a significant number of exercises already
        console.log('[Seed] Exercises already seeded, skipping...');
        return;
    }

    // Helper to infer equipment from title
    const inferEquipment = (title: string): string => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('dumbbell')) return 'dumbbell';
        if (lowerTitle.includes('barbell')) return 'barbell';
        if (lowerTitle.includes('kettlebell')) return 'kettlebell';
        if (lowerTitle.includes('cable')) return 'cable';
        if (lowerTitle.includes('machine') || lowerTitle.includes('ergometer')) return 'machine';
        if (lowerTitle.includes('band')) return 'resistance_band';
        if (lowerTitle.includes('smith')) return 'machine';
        if (lowerTitle.includes('plate')) return 'other';
        if (lowerTitle.includes('ball')) return 'other';
        if (lowerTitle.includes('rope')) return 'other';
        if (lowerTitle.includes('suspension') || lowerTitle.includes('trx')) return 'suspension';
        return 'bodyweight'; // Default
    };

    // Helper to map body part
    const mapBodyPart = (part: string): string => {
        const map: Record<string, string> = {
            'waist': 'core',
            'upper legs': 'legs',
            'back': 'back',
            'lower legs': 'calves',
            'chest': 'chest',
            'upper arms': 'arms',
            'cardio': 'cardio',
            'shoulders': 'shoulders',
            'lower arms': 'forearms',
            'neck': 'neck'
        };
        return map[part] || 'full_body';
    };

    const batchedExercises: any[] = [];

    // Process GIF data
    gifsData.forEach((item: any) => {
        batchedExercises.push({
            name: item.title,
            category: 'strength', // generic default, could be improved
            equipment: inferEquipment(item.title),
            muscleGroup: mapBodyPart(item.body_part),
            videoUrl: item.gif_url,
            imageUrl: item.gif_url,
            isCustom: false
        });
    });

    // Batch insert
    await database.write(async () => {
        const batchSize = 100;
        for (let i = 0; i < batchedExercises.length; i += batchSize) {
            const batch = batchedExercises.slice(i, i + batchSize);
            const promises = batch.map(exercise =>
                exercisesCollection.prepareCreate((record: any) => {
                    record.name = exercise.name;
                    record.category = exercise.category;
                    record.equipment = exercise.equipment;
                    record.muscleGroup = exercise.muscleGroup;
                    record.videoUrl = exercise.videoUrl;
                    record.imageUrl = exercise.imageUrl;
                    record.isCustom = exercise.isCustom;
                })
            );
            await database.batch(...promises);
        }
    });

    console.log(`[Seed] ✓ Seeded ${batchedExercises.length} exercises from GIF data`);
}

const WORKOUT_DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

const normalizeExerciseName = (name: string): string => name.trim().toLowerCase();

const mapWorkoutCategoryToExerciseCategory = (category: string): string => {
    if (category === 'strength' || category === 'cardio' || category === 'mobility') return category;
    return 'strength';
};

const mapWorkoutEquipmentToExerciseEquipment = (equipment: string[] = []): string => {
    const primary = equipment[0] || 'bodyweight';
    if (primary === 'dumbbells') return 'dumbbell';
    if (primary === 'machines') return 'machine';
    if (primary === 'cables') return 'cable';
    return primary;
};

const parseRepTarget = (reps: number | string): number => {
    if (typeof reps === 'number') {
        return Math.max(0, reps);
    }

    const match = String(reps).match(/\d+/);
    return Math.max(0, match ? parseInt(match[0], 10) : 0);
};

/**
 * Seed relational workout programs/templates/schedules source data
 */
export async function seedWorkoutPrograms() {
    console.log('[Seed] Starting workout programs seed...');

    const trainingProgramsCollection = database.get<TrainingProgram>('training_programs');
    const exercisesCollection = database.get<Exercise>('exercises');
    const workoutTemplatesCollection = database.get<WorkoutTemplate>('workout_templates');
    const templateExercisesCollection = database.get<TemplateExercise>('template_exercises');
    const workoutSchedulesCollection = database.get<WorkoutSchedule>('workout_schedules');

    const existingExercises = await exercisesCollection.query().fetch();
    const exerciseByName = new Map<string, Exercise>();

    existingExercises.forEach((exercise) => {
        const key = normalizeExerciseName(exercise.name);
        if (!exerciseByName.has(key)) {
            exerciseByName.set(key, exercise);
        }
    });

    await database.write(async () => {
        const activeProgramNames = new Set(ALL_PROGRAMS.map((program) => program.title));
        const existingPrograms = await trainingProgramsCollection.query().fetch();

        for (const existingProgram of existingPrograms) {
            if (activeProgramNames.has(existingProgram.name)) {
                continue;
            }

            const templatesToDelete = await workoutTemplatesCollection
                .query(Q.where('program_id', existingProgram.id))
                .fetch();

            const templateIds = templatesToDelete.map((template) => template.id);
            if (templateIds.length > 0) {
                const staleTemplateExercises = await templateExercisesCollection
                    .query(Q.where('template_id', Q.oneOf(templateIds)))
                    .fetch();
                const staleSchedules = await workoutSchedulesCollection
                    .query(Q.where('template_id', Q.oneOf(templateIds)))
                    .fetch();

                await Promise.all(staleTemplateExercises.map((item) => item.destroyPermanently()));
                await Promise.all(staleSchedules.map((schedule) => schedule.destroyPermanently()));
                await Promise.all(templatesToDelete.map((template) => template.destroyPermanently()));
            }

            await existingProgram.destroyPermanently();
        }

        for (const program of ALL_PROGRAMS) {
            const existingProgramRecords = await trainingProgramsCollection
                .query(Q.where('name', program.title))
                .fetch();

            const trainingProgram = existingProgramRecords[0]
                ? await existingProgramRecords[0].update((record) => {
                    record.description = program.description;
                    record.level = program.level;
                    record.durationWeeks = program.durationWeeks;
                })
                : await trainingProgramsCollection.create((record) => {
                    record.name = program.title;
                    record.description = program.description;
                    record.level = program.level;
                    record.durationWeeks = program.durationWeeks;
                });

            const existingTemplates = await workoutTemplatesCollection
                .query(
                    Q.where('program_id', trainingProgram.id),
                    Q.sortBy('created_at', Q.asc)
                )
                .fetch();

            for (let dayIndex = 0; dayIndex < program.schedule.days.length; dayIndex += 1) {
                const day = program.schedule.days[dayIndex];
                const dayOfWeek = WORKOUT_DAYS[dayIndex % WORKOUT_DAYS.length];
                const exerciseConfig = day.mainWorkout.map((exercise, order) => ({
                    exerciseId: exercise.id,
                    sets: Math.max(1, exercise.sets || 1),
                    reps: exercise.reps,
                    repType: exercise.repType,
                    restPeriod: Math.max(0, exercise.restPeriod || 0),
                    rpe: exercise.rpe,
                    notes: exercise.notes,
                    weightGuidance: exercise.weightGuidance,
                    duration: exercise.repType === 'time' ? parseRepTarget(exercise.reps) : undefined,
                    isSuperset: exercise.isSuperset,
                    supersetId: exercise.supersetId,
                    order,
                }));

                const existingTemplate = existingTemplates[dayIndex];
                const template = existingTemplate
                    ? await existingTemplate.update((record) => {
                        record.userId = 'system';
                        record.programId = trainingProgram.id;
                        record.name = day.title || `Day ${dayIndex + 1}`;
                        record.description = `${program.title} - ${dayOfWeek}`;
                        record.workoutType = program.category || 'strength';
                        record.exercises = exerciseConfig as any;
                        record.isFavorite = false;
                    })
                    : await workoutTemplatesCollection.create((record) => {
                        record.userId = 'system';
                        record.programId = trainingProgram.id;
                        record.name = day.title || `Day ${dayIndex + 1}`;
                        record.description = `${program.title} - ${dayOfWeek}`;
                        record.workoutType = program.category || 'strength';
                        record.exercises = exerciseConfig as any;
                        record.isFavorite = false;
                        record.useCount = 0;
                    });

                const existingTemplateExercises = await templateExercisesCollection
                    .query(Q.where('template_id', template.id))
                    .fetch();
                await Promise.all(existingTemplateExercises.map((item) => item.destroyPermanently()));

                for (let order = 0; order < day.mainWorkout.length; order += 1) {
                    const exercise = day.mainWorkout[order];
                    const exerciseNameKey = normalizeExerciseName(exercise.name);
                    let resolvedExercise = exerciseByName.get(exerciseNameKey);

                    if (!resolvedExercise) {
                        resolvedExercise = await exercisesCollection.create((record) => {
                            record.name = exercise.name;
                            record.category = mapWorkoutCategoryToExerciseCategory(exercise.category);
                            record.muscleGroup = exercise.targetMuscles.primary[0] || 'full_body';
                            record.equipment = mapWorkoutEquipmentToExerciseEquipment(exercise.equipment as string[]);
                            record.description = exercise.instructions[0] || '';
                            record.videoUrl = exercise.videoUrl || exercise.thumbnailUrl;
                            record.imageUrl = exercise.thumbnailUrl || exercise.videoUrl;
                            record.isCustom = false;
                            record.userId = 'system';
                        });
                        exerciseByName.set(exerciseNameKey, resolvedExercise);
                    }

                    await templateExercisesCollection.create((record) => {
                        record.templateId = template.id;
                        record.exerciseId = resolvedExercise.id;
                        record.sets = Math.max(1, exercise.sets || 1);
                        record.reps = parseRepTarget(exercise.reps);
                        record.order = order;
                    });
                }
            }
        }
    });

    console.log(`[Seed] ✓ Synced ${ALL_PROGRAMS.length} workout programs with detailed templates`);
}

/**
 * Seed 20+ comprehensive diet templates into the database
 */
export async function seedDietTemplates() {
    console.log('[Seed] Starting diet templates seed...');

    const dietsCollection = database.get('diets');
    const existingCount = await dietsCollection.query().fetchCount();

    if (existingCount > 0) {
        console.log('[Seed] Diet templates already seeded, skipping...');
        return;
    }

    const diets = [
        // WEIGHT LOSS PLANS (5)
        {
            name: 'Calorie Deficit',
            description: 'Moderate calorie reduction for steady weight loss',
            type: 'preset',
            calorieTarget: 1600,
            proteinTarget: 120,
            carbsTarget: 150,
            fatsTarget: 53,
            fiberTarget: 25,
            restrictions: JSON.stringify(['None - flexible eating'])
        },
        // ... (rest of the diet templates remain the same, truncated for brevity in this replacement) 
        // I will re-include the generated diet templates in the actual file content below to ensure nothing is lost.
        {
            name: 'Low Carb Weight Loss',
            description: 'Reduced carbs for faster fat burning',
            type: 'preset',
            calorieTarget: 1500,
            proteinTarget: 130,
            carbsTarget: 75,
            fatsTarget: 83,
            fiberTarget: 20,
            restrictions: JSON.stringify(['Low carb', 'No sugar', 'No grains'])
        },
        {
            name: 'Intermittent Fasting 16:8',
            description: '16-hour fast, 8-hour eating window',
            type: 'preset',
            calorieTarget: 1700,
            proteinTarget: 140,
            carbsTarget: 130,
            fatsTarget: 70,
            fiberTarget: 30,
            restrictions: JSON.stringify(['Fasting 16hrs', 'Eat between 12pm-8pm'])
        },
        {
            name: 'Keto Diet',
            description: 'Very low-carb, high-fat for ketosis',
            type: 'preset',
            calorieTarget: 1800,
            proteinTarget: 110,
            carbsTarget: 20,
            fatsTarget: 140,
            fiberTarget: 15,
            restrictions: JSON.stringify(['Very low carb', 'No sugar', 'No grains', 'No fruit'])
        },
        {
            name: 'Mediterranean Weight Loss',
            description: 'Heart-healthy, calorie-controlled Mediterranean',
            type: 'preset',
            calorieTarget: 1650,
            proteinTarget: 85,
            carbsTarget: 165,
            fatsTarget: 73,
            fiberTarget: 35,
            restrictions: JSON.stringify(['Whole grains', 'Healthy fats', 'Limited red meat'])
        },
        // ADDING REST OF DIETS HERE TO ENSURE INTEGRITY
        {
            name: 'Lean Bulk',
            description: 'Controlled surplus for lean muscle gain',
            type: 'preset',
            calorieTarget: 2800,
            proteinTarget: 210,
            carbsTarget: 315,
            fatsTarget: 87,
            fiberTarget: 40,
            restrictions: JSON.stringify(['High protein', 'Quality carbs'])
        },
        {
            name: 'Power Bulk',
            description: 'Higher calorie surplus for maximum muscle',
            type: 'preset',
            calorieTarget: 3500,
            proteinTarget: 220,
            carbsTarget: 438,
            fatsTarget: 117,
            fiberTarget: 45,
            restrictions: JSON.stringify(['Very high protein', 'High carbs'])
        },
        {
            name: 'Strength Training Diet',
            description: 'Optimized for powerlifting and strength',
            type: 'preset',
            calorieTarget: 3200,
            proteinTarget: 200,
            carbsTarget: 400,
            fatsTarget: 100,
            fiberTarget: 38,
            restrictions: JSON.stringify(['High protein', 'Complex carbs', 'Moderate fats'])
        },
        {
            name: 'Bodybuilding Cut', description: 'High protein, moderate deficit for preserving muscle',
            type: 'preset',
            calorieTarget: 2200,
            proteinTarget: 220,
            carbsTarget: 165,
            fatsTarget: 73,
            fiberTarget: 35,
            restrictions: JSON.stringify(['Very high protein', 'Low fat', 'Moderate carbs'])
        },
        {
            name: 'Endurance Athlete',
            description: 'High carbs for endurance sports',
            type: 'preset',
            calorieTarget: 3000,
            proteinTarget: 150,
            carbsTarget: 450,
            fatsTarget: 83,
            fiberTarget: 40,
            restrictions: JSON.stringify(['Very high carbs', 'Moderate protein'])
        },
        {
            name: 'CrossFit Performance',
            description: 'Balanced macros for high-intensity training',
            type: 'preset',
            calorieTarget: 2800,
            proteinTarget: 175,
            carbsTarget: 315,
            fatsTarget: 93,
            fiberTarget: 35,
            restrictions: JSON.stringify(['Balanced macros', 'Whole foods'])
        },
        {
            name: 'Olympic Athlete',
            description: 'Very high calorie for elite performance',
            type: 'preset',
            calorieTarget: 4000,
            proteinTarget: 200,
            carbsTarget: 550,
            fatsTarget: 133,
            fiberTarget: 50,
            restrictions: JSON.stringify(['Very high calories', 'Performance focused'])
        },
        {
            name: 'Diabetic-Friendly',
            description: 'Low GI, blood sugar management',
            type: 'preset',
            calorieTarget: 1900,
            proteinTarget: 95,
            carbsTarget: 190,
            fatsTarget: 70,
            fiberTarget: 40,
            restrictions: JSON.stringify(['Low GI carbs', 'No sugar', 'High fiber'])
        },
        {
            name: 'Heart Healthy',
            description: 'Low saturated fat, cholesterol control',
            type: 'preset',
            calorieTarget: 2000,
            proteinTarget: 100,
            carbsTarget: 250,
            fatsTarget: 55,
            fiberTarget: 40,
            restrictions: JSON.stringify(['Low saturated fat', 'No trans fats', 'Omega-3 rich'])
        },
        {
            name: 'Low FODMAP',
            description: 'For IBS and digestive issues',
            type: 'preset',
            calorieTarget: 2100,
            proteinTarget: 105,
            carbsTarget: 260,
            fatsTarget: 70,
            fiberTarget: 25,
            restrictions: JSON.stringify(['Low FODMAP', 'Gentle on digestion'])
        },
        {
            name: 'Gluten-Free',
            description: 'Celiac-safe, no gluten',
            type: 'preset',
            calorieTarget: 2000,
            proteinTarget: 100,
            carbsTarget: 250,
            fatsTarget: 67,
            fiberTarget: 30,
            restrictions: JSON.stringify(['No gluten', 'No wheat/barley/rye'])
        },
        {
            name: 'Vegan',
            description: 'Plant-based, no animal products',
            type: 'preset',
            calorieTarget: 2000,
            proteinTarget: 100,
            carbsTarget: 275,
            fatsTarget: 55,
            fiberTarget: 50,
            restrictions: JSON.stringify(['No animal products', 'Plant-based only'])
        },
        {
            name: 'Vegetarian',
            description: 'No meat, includes dairy and eggs',
            type: 'preset',
            calorieTarget: 2100,
            proteinTarget: 105,
            carbsTarget: 263,
            fatsTarget: 70,
            fiberTarget: 40,
            restrictions: JSON.stringify(['No meat', 'Dairy and eggs OK'])
        },
        {
            name: 'Pescatarian',
            description: 'Seafood, no other meat',
            type: 'preset',
            calorieTarget: 2200,
            proteinTarget: 110,
            carbsTarget: 275,
            fatsTarget: 73,
            fiberTarget: 35,
            restrictions: JSON.stringify(['Seafood OK', 'No meat/poultry'])
        },
        {
            name: 'Paleo',
            description: 'Whole foods, no processed',
            type: 'preset',
            calorieTarget: 2100,
            proteinTarget: 130,
            carbsTarget: 175,
            fatsTarget: 93,
            fiberTarget: 35,
            restrictions: JSON.stringify(['No grains', 'No legumes', 'No dairy', 'Whole foods'])
        },
        {
            name: 'Carnivore',
            description: 'Animal products only',
            type: 'preset',
            calorieTarget: 2400,
            proteinTarget: 180,
            carbsTarget: 0,
            fatsTarget: 178,
            fiberTarget: 0,
            restrictions: JSON.stringify(['Animal products only', 'No plants'])
        },
        {
            name: 'Flexitarian',
            description: 'Mostly plant-based with occasional meat',
            type: 'preset',
            calorieTarget: 2000,
            proteinTarget: 100,
            carbsTarget: 250,
            fatsTarget: 67,
            fiberTarget: 40,
            restrictions: JSON.stringify(['Mostly plants', 'Occasional meat'])
        },
        {
            name: 'Balanced',
            description: 'General health and wellness',
            type: 'preset',
            calorieTarget: 2200,
            proteinTarget: 165,
            carbsTarget: 220,
            fatsTarget: 73,
            fiberTarget: 30,
            restrictions: JSON.stringify(['None - flexible eating'])
        },
        {
            name: 'Maintenance',
            description: 'Maintain current weight',
            type: 'preset',
            calorieTarget: 2400,
            proteinTarget: 120,
            carbsTarget: 300,
            fatsTarget: 80,
            fiberTarget: 30,
            restrictions: JSON.stringify(['None - maintain weight'])
        },
    ];

    await database.write(async () => {
        for (const diet of diets) {
            await dietsCollection.create((record: any) => {
                record.name = diet.name;
                record.description = diet.description;
                record.type = diet.type;
                record.calorieTarget = diet.calorieTarget;
                record.proteinTarget = diet.proteinTarget;
                record.carbsTarget = diet.carbsTarget;
                record.fatsTarget = diet.fatsTarget;
                record.fiberTarget = diet.fiberTarget;
                record.restrictions = diet.restrictions;
                record.isActive = false;
            });
        }
    });

    console.log(`[Seed] ✓ Seeded ${diets.length} diet templates`);
}

/**
 * Run all seeds
 */
export async function runSeeds() {
    try {
        await waitForDatabaseReady();
        console.log('[Seed] Running database seeds...');
        await seedExercises();
        await seedWorkoutPrograms();
        await seedDietTemplates();
        console.log('[Seed] ✓ All seeds completed successfully');
    } catch (error) {
        console.error('[Seed] ✗ Error running seeds:', error);
        throw error;
    }
}

export default {
    seedExercises,
    seedWorkoutPrograms,
    seedDietTemplates,
    runSeeds,
};

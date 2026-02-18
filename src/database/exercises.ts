import { DetailedExercise } from '../types/workout';

export const EXERCISE_DATABASE: DetailedExercise[] = [
    // --- CHEST ---
    {
        id: 'pushups_standard',
        name: 'Push-ups',
        category: 'strength',
        targetMuscles: {
            primary: ['chest', 'triceps'],
            secondary: ['shoulders', 'core']
        },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Start in a nice plank position.',
            'Lower your body until your chest nearly touches the floor.',
            'Push yourself back up.'
        ],
        formTips: ['Keep your core tight.', 'Don\'t let your hips sag.']
    },
    {
        id: 'bench_press_barbell',
        name: 'Barbell Bench Press',
        category: 'strength',
        targetMuscles: {
            primary: ['chest'],
            secondary: ['triceps', 'shoulders']
        },
        equipment: ['barbell'],
        difficulty: 'intermediate',
        instructions: [
            'Lie back on a flat bench.',
            'Grip the bar slightly wider than shoulder-width.',
            'Lower the bar to your chest.',
            'Press back up to the starting position.'
        ],
        formTips: ['Keep your feet flat on the floor.', 'Don\'t bounce the bar off your chest.']
    },
    {
        id: 'dumbbell_flys',
        name: 'Dumbbell Flys',
        category: 'strength',
        targetMuscles: {
            primary: ['chest'],
            secondary: ['shoulders']
        },
        equipment: ['dumbbells'],
        difficulty: 'intermediate',
        instructions: [
            'Lie on a flat bench with a dumbbell in each hand.',
            'Start with arms extended above your chest, palms facing each other.',
            'Lower weights in an arc out to sides.',
            'Bring weights back together at the top.'
        ],
        formTips: ['Keep a slight bend in your elbows.', 'Don\'t go too deep to protect shoulders.']
    },

    // --- BACK ---
    {
        id: 'pullups',
        name: 'Pull-ups',
        category: 'strength',
        targetMuscles: {
            primary: ['back', 'biceps'],
            secondary: ['shoulders', 'core']
        },
        equipment: ['bodyweight'], // Or pullup bar technically
        difficulty: 'intermediate',
        instructions: [
            'Grab the pull-up bar with your palms facing away from you.',
            'Pull yourself up until your chin is above the bar.',
            'Lower yourself back down with control.'
        ],
        formTips: ['Full range of motion.', 'Don\'t swing your legs.']
    },
    {
        id: 'dumbbell_rows',
        name: 'One-Arm Dumbbell Row',
        category: 'strength',
        targetMuscles: {
            primary: ['back'],
            secondary: ['biceps', 'shoulders']
        },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Place one knee and hand on a bench.',
            'Hold a dumbbell in the other hand.',
            'Pull the dumbbell up to your side.',
            'Lower it back down.'
        ],
        formTips: ['Keep your back flat.', 'Squeeze your back muscles at the top.']
    },
    {
        id: 'deadlift_barbell',
        name: 'Barbell Deadlift',
        category: 'strength',
        targetMuscles: {
            primary: ['back', 'hamstrings', 'glutes'],
            secondary: ['core', 'forearms']
        },
        equipment: ['barbell'],
        difficulty: 'advanced',
        instructions: [
            'Stand with feet hip-width apart, barbell over mid-foot.',
            'Hinge at hips to grab the bar.',
            'Keep back straight and chest up.',
            'Drive through heels to stand up straight.',
            'Lower bar with control.'
        ],
        formTips: ['Keep bar close to legs.', 'Don\'t round your back.']
    },

    // --- LEGS ---
    {
        id: 'squat_bodyweight',
        name: 'Bodyweight Squats',
        category: 'strength',
        targetMuscles: {
            primary: ['quads', 'glutes'],
            secondary: ['hamstrings', 'core']
        },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Stand with feet shoulder-width apart.',
            'Lower your hips back and down as if sitting in a chair.',
            'Keep your chest up and back straight.',
            'Push through your heels to return to standing.'
        ],
        formTips: ['Knees should track over toes.', 'Go as deep as your mobility allows.']
    },
    {
        id: 'squat_barbell',
        name: 'Barbell Back Squat',
        category: 'strength',
        targetMuscles: {
            primary: ['quads', 'glutes'],
            secondary: ['hamstrings', 'core', 'low_back']
        },
        equipment: ['barbell'],
        difficulty: 'intermediate',
        instructions: [
            'Place barbell on upper back.',
            'Stand feet shoulder-width apart.',
            'Squat down until thighs are parallel to floor.',
            'Drive back up.'
        ],
        formTips: ['Keep chest up.', 'Brace your core.']
    },
    {
        id: 'lunges_dumbbells',
        name: 'Dumbbell Lunges',
        category: 'strength',
        targetMuscles: {
            primary: ['quads', 'glutes'],
            secondary: ['hamstrings', 'calves']
        },
        equipment: ['dumbbells'],
        difficulty: 'intermediate',
        instructions: [
            'Stand holding dumbbells at sides.',
            'Step forward with one leg and lower hips.',
            'Both knees should be at 90 degrees.',
            'Push back to starting position.'
        ],
        formTips: ['Keep torso upright.', 'Don\'t let front knee cave in.']
    },

    // --- SHOULDERS ---
    {
        id: 'overhead_press_dumbbell',
        name: 'Seated Dumbbell Press',
        category: 'strength',
        targetMuscles: {
            primary: ['shoulders'],
            secondary: ['triceps']
        },
        equipment: ['dumbbells'],
        difficulty: 'intermediate',
        instructions: [
            'Sit on a bench with back support.',
            'Hold dumbbells at shoulder height.',
            'Press dumbbells up until arms are extended.',
            'Lower back to shoulder height.'
        ],
        formTips: ['Don\'t arch your back excessively.', 'Control the weight.']
    },
    {
        id: 'lateral_raises',
        name: 'Dumbbell Lateral Raises',
        category: 'strength',
        targetMuscles: {
            primary: ['shoulders'], // Side delts
            secondary: []
        },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Stand with dumbbells at sides.',
            'Raise arms out to sides until shoulder height.',
            'Lower back down with control.'
        ],
        formTips: ['Lead with elbows.', 'Don\'t swing the weight.']
    },

    // --- ARMS ---
    {
        id: 'bicep_curls_dumbbell',
        name: 'Dumbbell Bicep Curls',
        category: 'strength',
        targetMuscles: {
            primary: ['biceps'],
            secondary: ['forearms']
        },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Stand holding dumbbells at sides, palms forward.',
            'Curl weights up towards shoulders.',
            'Lower back down.'
        ],
        formTips: ['Keep elbows tucked at sides.', 'Don\'t use momentum.']
    },
    {
        id: 'tricep_dips',
        name: 'Tricep Dips (Bench)',
        category: 'strength',
        targetMuscles: {
            primary: ['triceps'],
            secondary: ['chest', 'shoulders']
        },
        equipment: ['bodyweight'], // Bench/Chair
        difficulty: 'beginner',
        instructions: [
            'Sit on edge of bench, hands next to hips.',
            'Slide hips off bench, supporting weight with hands.',
            'Lower hips by bending elbows.',
            'Push back up.'
        ],
        formTips: ['Keep back close to bench.', 'Don\'t flare elbows out too much.']
    },

    // --- CORE ---
    {
        id: 'plank',
        name: 'Plank',
        category: 'core', // often treated as strength category but specific focus
        targetMuscles: {
            primary: ['core'],
            secondary: ['shoulders']
        },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Start in a push-up position but on your forearms.',
            'Keep your body in a straight line from head to heels.',
            'Hold this position.'
        ],
        formTips: ['Don\'t let hips sag or pike up.', 'Breathe normally.']
    },
    {
        id: 'russian_twists',
        name: 'Russian Twists',
        category: 'core',
        targetMuscles: {
            primary: ['core'], // Obliques
            secondary: []
        },
        equipment: ['bodyweight'],
        difficulty: 'intermediate',
        instructions: [
            'Sit on floor, lean back slightly, lift feet.',
            'Twist torso from side to side.',
            'Touch floor on each side.'
        ],
        formTips: ['Keep back straight.', 'Rotate from torso, not just arms.']
    },

    // --- CARDIO ---
    {
        id: 'jumping_jacks',
        name: 'Jumping Jacks',
        category: 'cardio',
        targetMuscles: {
            primary: ['full_body', 'cardio'],
            secondary: ['calves', 'shoulders']
        },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Stand with feet together, hands at sides.',
            'Jump feet apart and raise arms overhead.',
            'Jump feet back together and lower arms.'
        ],
        formTips: ['Stay light on your feet.', 'Keep a steady rhythm.']
    },
    {
        id: 'burpees',
        name: 'Burpees',
        category: 'cardio',
        targetMuscles: {
            primary: ['full_body', 'cardio'],
            secondary: ['chest', 'quads', 'core']
        },
        equipment: ['bodyweight'],
        difficulty: 'advanced',
        instructions: [
            'Stand tall.',
            'Drop to squat, kick feet back to push-up position.',
            'Do a push-up (optional).',
            'Jump feet back to squat.',
            'Jump up into the air.'
        ],
        formTips: ['Pace yourself.', 'Maintain form on the push-up.']
    }
];

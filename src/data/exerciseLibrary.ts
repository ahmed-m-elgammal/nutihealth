import { DetailedExercise } from '../types/workout';

export const EXERCISE_LIBRARY: DetailedExercise[] = [
    // --- CHEST ---
    {
        id: 'bench_press',
        name: 'Barbell Bench Press',
        category: 'strength',
        targetMuscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
        equipment: ['barbell'],
        difficulty: 'intermediate',
        instructions: [
            'Lie flat on a bench and grip the barbell with hands slightly wider than shoulder-width.',
            'Unrack the bar and lower it slowly to your mid-chest while keeping your elbows at a 45-degree angle.',
            'Push the bar back up explosively until your arms are fully extended, maintaining a slight arch in your back.'
        ],
        formTips: [
            'Keep your feet planted firmly on the ground for stability.',
            'Maintain a natural arch in your lower back but keep your glutes on the bench.',
            'Don\'t bounce the bar off your chest.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif'
    },
    {
        id: 'pushups',
        name: 'Push-ups',
        category: 'strength',
        targetMuscles: { primary: ['chest'], secondary: ['shoulders', 'triceps', 'core'] },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Start in a high plank position with your hands slightly wider than shoulder-width.',
            'Lower your body by bending your elbows until your chest nearly touches the floor.',
            'Push through your palms to return to the starting position, keeping your body in a straight line.'
        ],
        formTips: [
            'Gaze slightly ahead of your hands to keep a neutral neck.',
            'Engage your core and glutes to prevent your hips from sagging.',
            'Full range of motion is key—all the way down, all the way up.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif'
    },
    {
        id: 'dumbbell_press',
        name: 'Dumbbell Chest Press',
        category: 'strength',
        targetMuscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Lie on a flat bench holding dumbbells at chest level with palms facing forward.',
            'Press the dumbbells upward until your arms are extended but not locked.',
            'Lower the weights slowly and under control until they are level with your chest.'
        ],
        formTips: [
            'Keep the dumbbells moving in a slight arc to maximize chest contraction.',
            'Control the descent to protect your shoulders.',
            'Ensure your wrists stay strong and don\'t bend backward.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press.gif'
    },

    // --- BACK ---
    {
        id: 'pullups',
        name: 'Pull-ups',
        category: 'strength',
        targetMuscles: { primary: ['back'], secondary: ['biceps', 'forearms'] },
        equipment: ['bodyweight'],
        difficulty: 'intermediate',
        instructions: [
            'Grasp a pull-up bar with an overhand grip (palms facing away), slightly wider than shoulders.',
            'Pull your body upward by driving your elbows down until your chin clears the bar.',
            'Lower yourself slowly until your arms are fully extended again.'
        ],
        formTips: [
            'Imagine pulling the bar down to you rather than you up to the bar.',
            'Keep your shoulder blades retracted and depressed (down and back).',
            'Avoid using momentum or swinging your legs.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif'
    },
    {
        id: 'dumbbell_row',
        name: 'One-Arm Dumbbell Row',
        category: 'strength',
        targetMuscles: { primary: ['back'], secondary: ['biceps', 'shoulders'] },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Place one hand and one knee on a bench for support.',
            'Keep your back flat and pull the dumbbell up to your hip, driving with your elbow.',
            'Lower the weight with a full stretch at the bottom without letting your shoulder drop excessively.'
        ],
        formTips: [
            'Focus on pulling with your back muscles, not just your arm.',
            'Keep your elbow close to your body during the movement.',
            'Maintain a neutral spine throughout the set.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif'
    },
    {
        id: 'deadlift',
        name: 'Barbell Deadlift',
        category: 'strength',
        targetMuscles: { primary: ['back', 'glutes', 'hamstrings'], secondary: ['core', 'forearms'] },
        equipment: ['barbell'],
        difficulty: 'advanced',
        instructions: [
            'Stand with feet hip-width apart, bar over mid-foot. Hinge at the hips and grip the bar.',
            'Keep your back flat, chest up, and pull the slack out of the bar.',
            'Drive through your heels to stand up, keeping the bar close to your shins.',
            'Hinge back down until the bar passes your knees, then lower to the floor.'
        ],
        formTips: [
            'Brace your core as if someone is about to punch you.',
            'Keep your neck neutral—don\'t look up at the mirror.',
            'Deadlifts are a hinge, not a squat.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif'
    },

    // --- LEGS ---
    {
        id: 'squat',
        name: 'Barbell Back Squat',
        category: 'strength',
        targetMuscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
        equipment: ['barbell'],
        difficulty: 'intermediate',
        instructions: [
            'Rest the barbell on your upper traps. Stand with feet slightly wider than shoulder-width.',
            'Lower your hips back and down, keeping your chest up and weight on your heels.',
            'Descend until your thighs are at least parallel to the floor, then drive back up to the start.'
        ],
        formTips: [
            'Inhale and brace your core before you descend.',
            'Keep your knees tracking in line with your toes.',
            'Think about "spreading the floor" with your feet to engage your glutes.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Back-Squat.gif'
    },
    {
        id: 'lunge',
        name: 'Walking Lunges',
        category: 'strength',
        targetMuscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
        equipment: ['bodyweight', 'dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Step forward with one leg and lower your hips until both knees are bent at a 90-degree angle.',
            'Ensure your front knee is directly above your ankle.',
            'Step through with your back leg to move into the next lunge step.'
        ],
        formTips: [
            'Keep your torso upright and core engaged.',
            'Don\'t let your front knee cave inward.',
            'Take a wide enough step to maintain balance.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Walking-Lunge.gif'
    },

    // --- SHOULDERS ---
    {
        id: 'overhead_press',
        name: 'Overhead Press',
        category: 'strength',
        targetMuscles: { primary: ['shoulders'], secondary: ['triceps', 'chest'] },
        equipment: ['barbell', 'dumbbells'],
        difficulty: 'intermediate',
        instructions: [
            'Stand with feet shoulder-width apart, holding the bar at upper chest height.',
            'Press the bar directly overhead until your arms are fully locked out.',
            'Lower the bar back to the starting position with control.'
        ],
        formTips: [
            'Squeeze your glutes and abs to protect your lower back.',
            'Move your head "through the window" once the bar clears your forehead.',
            'Keep your forearms vertical throughout the movement.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Overhead-Press.gif'
    },

    // --- ARMS ---
    {
        id: 'bicep_curl',
        name: 'Dumbbell Bicep Curls',
        category: 'strength',
        targetMuscles: { primary: ['biceps'], secondary: ['forearms'] },
        equipment: ['dumbbells'],
        difficulty: 'beginner',
        instructions: [
            'Stand holding a dumbbell in each hand with palms facing forward.',
            'Keep your elbows close to your torso and curl the weights while contracting your biceps.',
            'Lower the dumbbells back to the starting position slowly.'
        ],
        formTips: [
            'Avoid using your back or shoulders to swing the weight.',
            'Full range of motion: all the way down to a full stretch.',
            'Keep your wrists neutral and strong.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif'
    },
    {
        id: 'tricep_dip',
        name: 'Bench Dips',
        category: 'strength',
        targetMuscles: { primary: ['triceps'], secondary: ['shoulders', 'chest'] },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Sit on the edge of a bench and place your hands next to your hips.',
            'Step your feet forward and support your weight with your hands.',
            'Lower your body by bending your elbows, then push back up.'
        ],
        formTips: [
            'Keep your back close to the bench.',
            'Keep your elbows tucked in, not flared out.',
            'Go until your upper arms are roughly parallel to the floor.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dip.gif'
    },

    // --- CORE & ACCESSORIES ---
    {
        id: 'plank',
        name: 'Forearm Plank',
        category: 'core',
        targetMuscles: { primary: ['core'], secondary: ['shoulders', 'glutes'] },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Start on your forearms with elbows under shoulders and legs extended.',
            'Brace your abs, squeeze your glutes, and keep your body in a straight line.',
            'Hold while breathing steadily through your nose.'
        ],
        formTips: [
            'Avoid letting your hips sag or pike up.',
            'Imagine pulling your elbows toward your toes to create full-body tension.',
            'Keep your neck neutral and gaze slightly forward.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Plank.gif'
    },
    {
        id: 'goblet_squat',
        name: 'Goblet Squat',
        category: 'strength',
        targetMuscles: { primary: ['quads', 'glutes'], secondary: ['core', 'hamstrings'] },
        equipment: ['dumbbells', 'kettlebell'],
        difficulty: 'beginner',
        instructions: [
            'Hold a dumbbell or kettlebell at chest height with elbows tucked.',
            'Sit down between your hips while keeping your chest tall.',
            'Drive through mid-foot and stand back up.'
        ],
        formTips: [
            'Keep your ribcage stacked over your pelvis.',
            'Push knees out in line with your toes.',
            'Pause briefly in the bottom for control.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Goblet-Squat.gif'
    },
    {
        id: 'romanian_deadlift',
        name: 'Romanian Deadlift',
        category: 'strength',
        targetMuscles: { primary: ['hamstrings', 'glutes'], secondary: ['low_back', 'forearms'] },
        equipment: ['barbell', 'dumbbells'],
        difficulty: 'intermediate',
        instructions: [
            'Stand tall with a slight knee bend and weight held in front of your thighs.',
            'Hinge at the hips while keeping a neutral spine and bar close to legs.',
            'Lower until you feel a strong hamstring stretch, then drive hips forward.'
        ],
        formTips: [
            'Do not turn this into a squat; hinge from the hips.',
            'Keep shoulders packed and lats engaged.',
            'Stop where spinal position remains neutral.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Romanian-Deadlift.gif'
    },
    {
        id: 'mountain_climber',
        name: 'Mountain Climbers',
        category: 'cardio',
        targetMuscles: { primary: ['core', 'cardio'], secondary: ['shoulders', 'quads'] },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Start in a strong high-plank position with hands under shoulders.',
            'Drive one knee toward your chest, then quickly switch legs.',
            'Keep hips level and maintain a controlled rhythm.'
        ],
        formTips: [
            'Avoid bouncing your hips.',
            'Brace your core and keep shoulders away from ears.',
            'Speed up only after form stays solid.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-Climber.gif'
    },

    // --- CARDIO / HIIT ---
    {
        id: 'burpees',
        name: 'Burpees',
        category: 'cardio',
        targetMuscles: { primary: ['full_body'], secondary: ['cardio'] },
        equipment: ['bodyweight'],
        difficulty: 'intermediate',
        instructions: [
            'From a standing position, drop into a squat and place your hands on the floor.',
            'Kick your feet back into a plank position and perform a push-up.',
            'Jump your feet back to your hands and jump explosively into the air.'
        ],
        formTips: [
            'Land softly on the balls of your feet.',
            'Maintain a solid plank—don\'t let your back arch.',
            'Keep a steady, sustainable pace.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.gif'
    },
    {
        id: 'jumping_jacks',
        name: 'Jumping Jacks',
        category: 'cardio',
        targetMuscles: { primary: ['full_body'], secondary: ['cardio'] },
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
            'Stand with feet together and hands at your sides.',
            'Jump while spreading your legs and raising your arms overhead.',
            'Jump back to the starting position.'
        ],
        formTips: [
            'Keep your knees slightly bent when landing.',
            'Stay light on your feet.',
            'Maintain a rhythmic motion.'
        ],
        thumbnailUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jack.gif'
    }
];

export const getExercises = () => EXERCISE_LIBRARY;
export const getExerciseById = (id: string) => EXERCISE_LIBRARY.find(e => e.id === id);

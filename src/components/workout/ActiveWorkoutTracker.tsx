import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, FlatList, TextInput } from 'react-native';
import { EquipmentType, MuscleGroup, WorkoutDay, WorkoutExercise, WorkoutSession, TrackedExercise } from '../../types/workout';
import { ExerciseCard } from './ExerciseCard';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutMutations } from '../../query/mutations/useWorkoutMutations';
import { useExercises } from '../../query/queries/useExercises';
import Exercise from '../../database/models/Exercise';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface ActiveWorkoutTrackerProps {
    day: WorkoutDay;
    onFinishWorkout: (result: WorkoutSession) => void;
    onCancel: () => void;
}

const EXERCISE_CATEGORIES: WorkoutExercise['category'][] = [
    'strength',
    'cardio',
    'flexibility',
    'core',
    'mobility',
    'intro',
];

const EQUIPMENT_MAP: Record<string, EquipmentType> = {
    bodyweight: 'bodyweight',
    dumbbell: 'dumbbells',
    dumbbells: 'dumbbells',
    barbell: 'barbell',
    cable: 'cables',
    cables: 'cables',
    machine: 'machines',
    machines: 'machines',
    kettlebell: 'kettlebell',
    resistance_band: 'resistance_band',
    cardio_machine: 'cardio_machine',
};

const MUSCLE_GROUPS: MuscleGroup[] = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core',
    'full_body',
    'cardio',
    'forearms',
    'low_back',
];

const resolveExerciseCategory = (value?: string): WorkoutExercise['category'] => {
    const normalized = value?.toLowerCase() || '';
    return EXERCISE_CATEGORIES.includes(normalized as WorkoutExercise['category'])
        ? normalized as WorkoutExercise['category']
        : 'strength';
};

const resolveEquipment = (value?: string): EquipmentType => {
    if (!value) {
        return 'bodyweight';
    }

    return EQUIPMENT_MAP[value.toLowerCase()] || 'bodyweight';
};

const resolveMuscleGroup = (value?: string): MuscleGroup => {
    const normalized = value?.toLowerCase() || '';
    return MUSCLE_GROUPS.includes(normalized as MuscleGroup)
        ? normalized as MuscleGroup
        : 'full_body';
};

const mapLibraryExerciseToWorkoutExercise = (
    exercise: Exercise,
    order: number
): WorkoutExercise => ({
    id: exercise.id,
    name: exercise.name,
    category: resolveExerciseCategory(exercise.category),
    targetMuscles: {
        primary: [resolveMuscleGroup(exercise.muscleGroup)],
        secondary: [],
    },
    equipment: [resolveEquipment(exercise.equipment)],
    difficulty: 'beginner',
    instructions: [exercise.description || 'Perform each repetition with control.'],
    formTips: ['Keep a stable core and controlled movement.'],
    videoUrl: exercise.videoUrl || undefined,
    thumbnailUrl: exercise.imageUrl || undefined,
    sets: 3,
    reps: 10,
    repType: 'reps',
    restPeriod: 60,
    order,
});

export const ActiveWorkoutTracker: React.FC<ActiveWorkoutTrackerProps> = ({
    day,
    onFinishWorkout,
    onCancel
}) => {
    const [startTime] = useState(Date.now());
    const [isSaving, setIsSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { createWorkout } = useWorkoutMutations();
    const { exercises } = useExercises();
    const { user } = useCurrentUser();

    const [plannedExercises, setPlannedExercises] = useState<WorkoutExercise[]>(day.mainWorkout);
    const [trackedExercises, setTrackedExercises] = useState<TrackedExercise[]>(() =>
        day.mainWorkout.map(ex => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            sets: []
        }))
    );

    // Timer State
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [restTimer, setRestTimer] = useState(0);
    const [isResting, setIsResting] = useState(false);

    useEffect(() => {
        setPlannedExercises(day.mainWorkout);
        setTrackedExercises(
            day.mainWorkout.map((exercise) => ({
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                sets: [],
            }))
        );
        setElapsedSeconds(0);
        setRestTimer(0);
        setIsResting(false);
    }, [day.id, day.mainWorkout]);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
            if (isResting && restTimer > 0) {
                setRestTimer(prev => {
                    if (prev <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [isResting, restTimer]);

    const handleCompleteSet = (
        exerciseIndex: number,
        setIndex: number,
        reps: number,
        weight?: number,
        rpe?: number
    ) => {
        const exercise = plannedExercises[exerciseIndex];
        if (!exercise) {
            return;
        }

        const targetReps = typeof exercise.reps === 'string'
            ? parseInt(exercise.reps, 10) || 0
            : exercise.reps;

        setTrackedExercises((previous) => {
            const nextTracked = [...previous];
            const currentExercise = nextTracked[exerciseIndex];
            if (!currentExercise) {
                return previous;
            }

            const nextSetNumber = setIndex + 1;
            const existingSetIndex = currentExercise.sets.findIndex((set) => set.setNumber === nextSetNumber);
            const payload = {
                setNumber: nextSetNumber,
                targetReps,
                actualReps: reps,
                weight,
                rpe,
                completed: true,
            };

            if (existingSetIndex >= 0) {
                currentExercise.sets[existingSetIndex] = payload;
            } else {
                currentExercise.sets.push(payload);
            }

            return nextTracked;
        });

        if (exercise.restPeriod > 0) {
            setRestTimer(exercise.restPeriod);
            setIsResting(true);
        }
    };

    const handleFinish = () => {
        // Basic validation: Check if at least one set is logged
        const totalSets = trackedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);

        if (totalSets === 0) {
            Alert.alert('Empty Workout', 'You haven\'t logged any sets yet. Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finish Anyway', onPress: submitWorkout }
            ]);
        } else {
            submitWorkout();
        }
    };

    const submitWorkout = async () => {
        setIsSaving(true);
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
        const result: WorkoutSession = {
            id: `session_${Date.now()}`,
            planId: 'current-plan', // in real app, get from props
            dayId: day.id,
            date: Date.now(),
            duration,
            exercises: trackedExercises,
            feeling: 'good' // could ask user
        };

        try {
            await createWorkout(result, user?.id || 'user_default', day.title);
            onFinishWorkout(result);
        } catch (error) {
            Alert.alert('Error', 'Failed to save workout. Please try again.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddExercise = (exercise: Exercise) => {
        const mappedExercise = mapLibraryExerciseToWorkoutExercise(exercise, plannedExercises.length);
        setPlannedExercises((previous) => [...previous, mappedExercise]);
        setTrackedExercises((previous) => [
            ...previous,
            {
                exerciseId: mappedExercise.id,
                exerciseName: mappedExercise.name,
                sets: []
            }
        ]);
        setShowAddModal(false);
    };

    const handleRemoveExercise = (index: number) => {
        Alert.alert('Remove Exercise', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: () => {
                    setPlannedExercises((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
                    setTrackedExercises((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
                }
            }
        ]);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const activeExerciseIndex = trackedExercises.findIndex((exercise, index) => {
        const planned = plannedExercises[index];
        return planned ? exercise.sets.length < planned.sets : false;
    });

    return (
        <>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel}>
                        <Ionicons name="close" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={styles.headerTitle}>
                        <Text style={styles.title}>{day.title}</Text>
                        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleFinish} disabled={isSaving}>
                        <Text style={[styles.finishLink, isSaving && { opacity: 0.5 }]}>{isSaving ? 'Saving...' : 'Finish'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Exercises List */}
                <ScrollView contentContainerStyle={styles.content}>
                    {trackedExercises.map((tracked, index) => {
                        const plannedExercise = plannedExercises[index];
                        if (!plannedExercise) {
                            return null;
                        }

                        return (
                            <ExerciseCard
                                key={(tracked.exerciseId || 'new') + index}
                                exercise={plannedExercise}
                                isActive={activeExerciseIndex === -1 || activeExerciseIndex === index}
                                completedSets={tracked.sets}
                                onCompleteSet={(setIndex, reps, weight, rpe) => handleCompleteSet(index, setIndex, reps, weight, rpe)}
                                onRemove={() => handleRemoveExercise(index)}
                            />
                        );
                    })}

                    <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                        <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
                        <Text style={styles.addButtonText}>Add Exercise</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.finishButton} onPress={handleFinish} disabled={isSaving}>
                        <Text style={styles.finishButtonText}>Complete Workout</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Rest Timer Modal / Overlay */}
                {isResting && (
                    <View style={styles.restOverlay}>
                        <Text style={styles.restLabel}>Resting...</Text>
                        <Text style={styles.restTime}>{formatTime(restTimer)}</Text>
                        <TouchableOpacity style={styles.skipButton} onPress={() => setIsResting(false)}>
                            <Text style={styles.skipText}>Skip Rest</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Exercise</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    <FlatList
                        data={exercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.exerciseItem} onPress={() => handleAddExercise(item as Exercise)}>
                                <Text style={styles.exerciseName}>{item.name}</Text>
                                <Text style={styles.exerciseCategory}>{item.category}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: 50, // Safe area top
    },
    headerTitle: {
        alignItems: 'center'
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    timer: {
        fontSize: 14,
        color: '#4F46E5',
        fontVariant: ['tabular-nums']
    },
    finishLink: {
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: 16,
    },
    content: {
        paddingBottom: 40,
    },
    finishButton: {
        backgroundColor: '#10B981',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    finishButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    restOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8
    },
    restLabel: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    restTime: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums']
    },
    skipButton: {
        backgroundColor: '#374151',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    skipText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600'
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderStyle: 'dashed',
        borderRadius: 12,
        marginBottom: 8,
    },
    addButtonText: {
        marginLeft: 8,
        color: '#4F46E5',
        fontWeight: '600'
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 16
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeText: { color: '#EF4444', fontSize: 16 },
    searchInput: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    exerciseItem: { padding: 16, backgroundColor: 'white', marginBottom: 8, borderRadius: 8 },
    exerciseName: { fontWeight: 'bold', fontSize: 16 },
    exerciseCategory: { color: '#6B7280', fontSize: 14 }
});

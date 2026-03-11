import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Save, Trash2 } from 'lucide-react-native';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWaterStore } from '../../store/waterStore';
import { logWorkout } from '../../services/api/workouts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseSelector } from '../../components/workout/ExerciseSelector';

type Set = {
    reps: string;
    weight: string;
};

type ExerciseLog = {
    id: string; // temp id
    name: string;
    exerciseId?: string; // Links to DB
    gifUrl?: string;
    sets: Set[];
};

export default function LogWorkoutModal() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const calculateDynamicTarget = useWaterStore((state) => state.calculateDynamicTarget);
    const [workoutName, setWorkoutName] = useState('Evening Workout');
    const [exercises, setExercises] = useState<ExerciseLog[]>([]);

    // Selector State
    const [isSelectorVisible, setIsSelectorVisible] = useState(false);
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

    const handleAddExercise = () => {
        setIsSelectorVisible(true);
        setEditingExerciseIndex(null); // New exercise
    };

    const handleReplaceExercise = (index: number) => {
        setEditingExerciseIndex(index);
        setIsSelectorVisible(true);
    };

    const onSelectExercise = (exercise: any) => {
        if (editingExerciseIndex !== null) {
            // Replace existing
            const newExercises = [...exercises];
            newExercises[editingExerciseIndex] = {
                ...newExercises[editingExerciseIndex],
                name: exercise.name,
                exerciseId: exercise.id,
                gifUrl: exercise.imageUrl, // Store GIF URL for display
            };
            setExercises(newExercises);
        } else {
            // Add new
            const newExercise: ExerciseLog = {
                id: Date.now().toString(),
                name: exercise.name,
                exerciseId: exercise.id,
                gifUrl: exercise.imageUrl,
                sets: [{ reps: '10', weight: '0' }],
            };
            setExercises([...exercises, newExercise]);
        }
        setIsSelectorVisible(false);
    };

    const handleAddSet = (exerciseId: string) => {
        setExercises(
            exercises.map((ex) => {
                if (ex.id === exerciseId) {
                    // carry over previous set weight/reps
                    const lastSet = ex.sets[ex.sets.length - 1];
                    return {
                        ...ex,
                        sets: [
                            ...ex.sets,
                            {
                                reps: lastSet ? lastSet.reps : '10',
                                weight: lastSet ? lastSet.weight : '0',
                            },
                        ],
                    };
                }
                return ex;
            }),
        );
    };

    const handleUpdateSet = (exerciseId: string, setIndex: number, field: keyof Set, value: string) => {
        setExercises(
            exercises.map((ex) => {
                if (ex.id === exerciseId) {
                    const newSets = [...ex.sets];
                    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
                    return { ...ex, sets: newSets };
                }
                return ex;
            }),
        );
    };

    const handleSaveWorkout = async () => {
        if (!user?.id) return;
        if (exercises.length === 0) {
            Alert.alert('Empty Workout', 'Please add at least one exercise.');
            return;
        }

        const hasMissingExercise = exercises.some((exercise) => !exercise.exerciseId);
        if (hasMissingExercise) {
            Alert.alert('Exercise missing', 'Please select a valid exercise for every block before saving.');
            return;
        }

        try {
            const endedAt = Date.now();
            const startedAt = endedAt - 60 * 60 * 1000;
            const formattedExercises = exercises.map((ex) => ({
                exerciseId: ex.exerciseId as string,
                name: ex.name,
                sets: ex.sets.map((s) => ({
                    reps: parseInt(s.reps) || 0,
                    weight: parseFloat(s.weight) || 0,
                })),
            }));

            await logWorkout({
                userId: user.id,
                name: workoutName,
                startedAt,
                endedAt,
                exercises: formattedExercises,
            });

            await calculateDynamicTarget(undefined, Math.round((endedAt - startedAt) / 60000));

            router.back();
        } catch (error) {
            console.error('Failed to log workout:', error);
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    if (isSelectorVisible) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <ExerciseSelector onSelect={onSelectExercise} onClose={() => setIsSelectorVisible(false)} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between border-b border-neutral-100 px-6 py-4">
                <Text className="text-xl font-bold">Log Workout</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X size={24} color="#525252" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-6">
                <View className="mb-6">
                    <Text className="mb-1 text-sm text-neutral-500">Workout Name</Text>
                    <TextInput
                        className="border-b border-neutral-200 pb-2 text-2xl font-bold text-neutral-900"
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        placeholder="Workout Name"
                    />
                </View>

                {exercises.map((exercise, index) => (
                    <View key={exercise.id} className="mb-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                        <View className="mb-4 flex-row items-center justify-between">
                            <TouchableOpacity
                                className="mr-4 flex-1 flex-row items-center"
                                onPress={() => handleReplaceExercise(index)}
                            >
                                {exercise.gifUrl && (
                                    <Image
                                        source={{ uri: exercise.gifUrl }}
                                        className="mr-3 h-12 w-12 rounded-md bg-neutral-200"
                                        resizeMode="cover"
                                    />
                                )}
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
                                        {exercise.name || 'Select Exercise'}
                                    </Text>
                                    <Text className="text-xs font-medium text-primary-600">Click to change</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    const newExercises = exercises.filter((_, i) => i !== index);
                                    setExercises(newExercises);
                                }}
                            >
                                <Trash2 size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-2 flex-row px-2">
                            <Text className="w-8 text-center text-xs font-semibold text-neutral-500">#</Text>
                            <Text className="flex-1 text-center text-xs font-semibold text-neutral-500">kg</Text>
                            <Text className="flex-1 text-center text-xs font-semibold text-neutral-500">Reps</Text>
                        </View>

                        {exercise.sets.map((set, setIndex) => (
                            <View key={setIndex} className="mb-2 flex-row items-center gap-3">
                                <View className="w-8 items-center justify-center">
                                    <Text className="text-xs font-semibold text-neutral-400">{setIndex + 1}</Text>
                                </View>
                                <TextInput
                                    className="h-10 flex-1 rounded-lg border border-neutral-200 bg-white text-center font-medium shadow-sm"
                                    value={set.weight}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    onChangeText={(v) => handleUpdateSet(exercise.id, setIndex, 'weight', v)}
                                />
                                <TextInput
                                    className="h-10 flex-1 rounded-lg border border-neutral-200 bg-white text-center font-medium shadow-sm"
                                    value={set.reps}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    onChangeText={(v) => handleUpdateSet(exercise.id, setIndex, 'reps', v)}
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            className="mt-3 flex-row items-center justify-center rounded-lg border border-neutral-200 bg-white py-2"
                            onPress={() => handleAddSet(exercise.id)}
                        >
                            <Plus size={16} color="#525252" />
                            <Text className="ml-1 text-sm font-semibold text-neutral-600">Add Set</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    className="dashed mb-8 flex-row items-center justify-center rounded-2xl border-2 border-primary-100 bg-white py-5 active:bg-primary-50"
                    onPress={handleAddExercise}
                >
                    <View className="mr-3 rounded-full bg-primary-100 p-2">
                        <Plus size={20} color="#059669" />
                    </View>
                    <Text className="text-lg font-bold text-primary-700">Add Exercise</Text>
                </TouchableOpacity>
            </ScrollView>

            <View className="border-t border-neutral-100 bg-white p-6">
                <TouchableOpacity
                    className="flex-row items-center justify-center rounded-2xl bg-neutral-900 py-4 shadow-lg transition-all active:scale-95"
                    onPress={handleSaveWorkout}
                >
                    <Save size={20} color="white" />
                    <Text className="ml-2 text-lg font-bold text-white">Finish Workout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

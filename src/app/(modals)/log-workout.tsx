import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Save, Trash2 } from 'lucide-react-native';
import { useUserStore } from '../../store/userStore';
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
    const { user } = useUserStore();
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
                gifUrl: exercise.imageUrl // Store GIF URL for display
            };
            setExercises(newExercises);
        } else {
            // Add new
            const newExercise: ExerciseLog = {
                id: Date.now().toString(),
                name: exercise.name,
                exerciseId: exercise.id,
                gifUrl: exercise.imageUrl,
                sets: [{ reps: '10', weight: '0' }]
            };
            setExercises([...exercises, newExercise]);
        }
        setIsSelectorVisible(false);
    };

    const handleAddSet = (exerciseId: string) => {
        setExercises(exercises.map(ex => {
            if (ex.id === exerciseId) {
                // carry over previous set weight/reps
                const lastSet = ex.sets[ex.sets.length - 1];
                return {
                    ...ex,
                    sets: [...ex.sets, {
                        reps: lastSet ? lastSet.reps : '10',
                        weight: lastSet ? lastSet.weight : '0'
                    }]
                };
            }
            return ex;
        }));
    };

    const handleUpdateSet = (exerciseId: string, setIndex: number, field: keyof Set, value: string) => {
        setExercises(exercises.map(ex => {
            if (ex.id === exerciseId) {
                const newSets = [...ex.sets];
                newSets[setIndex] = { ...newSets[setIndex], [field]: value };
                return { ...ex, sets: newSets };
            }
            return ex;
        }));
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
            const formattedExercises = exercises.map(ex => ({
                exerciseId: ex.exerciseId as string,
                name: ex.name,
                sets: ex.sets.map(s => ({
                    reps: parseInt(s.reps) || 0,
                    weight: parseFloat(s.weight) || 0,
                }))
            }));

            await logWorkout({
                userId: user.id,
                name: workoutName,
                startedAt: Date.now() - 3600000,
                endedAt: Date.now(),
                exercises: formattedExercises
            });

            router.back();
        } catch (error) {
            console.error('Failed to log workout:', error);
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    if (isSelectorVisible) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <ExerciseSelector
                    onSelect={onSelectExercise}
                    onClose={() => setIsSelectorVisible(false)}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100">
                <Text className="text-xl font-bold">Log Workout</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X size={24} color="#525252" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-6">
                <View className="mb-6">
                    <Text className="text-neutral-500 text-sm mb-1">Workout Name</Text>
                    <TextInput
                        className="text-2xl font-bold text-neutral-900 border-b border-neutral-200 pb-2"
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        placeholder="Workout Name"
                    />
                </View>

                {exercises.map((exercise, index) => (
                    <View key={exercise.id} className="mb-6 bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
                        <View className="flex-row items-center justify-between mb-4">
                            <TouchableOpacity
                                className="flex-1 flex-row items-center mr-4"
                                onPress={() => handleReplaceExercise(index)}
                            >
                                {exercise.gifUrl && (
                                    <Image
                                        source={{ uri: exercise.gifUrl }}
                                        className="w-12 h-12 rounded-md mr-3 bg-neutral-200"
                                        resizeMode="cover"
                                    />
                                )}
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-neutral-900" numberOfLines={1}>
                                        {exercise.name || 'Select Exercise'}
                                    </Text>
                                    <Text className="text-xs text-primary-600 font-medium">Click to change</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => {
                                const newExercises = exercises.filter((_, i) => i !== index);
                                setExercises(newExercises);
                            }}>
                                <Trash2 size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row mb-2 px-2">
                            <Text className="w-8 text-xs font-semibold text-neutral-500 text-center">#</Text>
                            <Text className="flex-1 text-xs font-semibold text-neutral-500 text-center">kg</Text>
                            <Text className="flex-1 text-xs font-semibold text-neutral-500 text-center">Reps</Text>
                        </View>

                        {exercise.sets.map((set, setIndex) => (
                            <View key={setIndex} className="flex-row items-center mb-2 gap-3">
                                <View className="w-8 items-center justify-center">
                                    <Text className="font-semibold text-neutral-400 text-xs">{setIndex + 1}</Text>
                                </View>
                                <TextInput
                                    className="flex-1 bg-white h-10 rounded-lg border border-neutral-200 text-center font-medium shadow-sm"
                                    value={set.weight}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    onChangeText={(v) => handleUpdateSet(exercise.id, setIndex, 'weight', v)}
                                />
                                <TextInput
                                    className="flex-1 bg-white h-10 rounded-lg border border-neutral-200 text-center font-medium shadow-sm"
                                    value={set.reps}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    onChangeText={(v) => handleUpdateSet(exercise.id, setIndex, 'reps', v)}
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            className="mt-3 flex-row items-center justify-center py-2 bg-white border border-neutral-200 rounded-lg"
                            onPress={() => handleAddSet(exercise.id)}
                        >
                            <Plus size={16} color="#525252" />
                            <Text className="ml-1 font-semibold text-neutral-600 text-sm">Add Set</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    className="flex-row items-center justify-center py-5 bg-white rounded-2xl border-2 border-primary-100 dashed mb-8 active:bg-primary-50"
                    onPress={handleAddExercise}
                >
                    <View className="bg-primary-100 p-2 rounded-full mr-3">
                        <Plus size={20} color="#059669" />
                    </View>
                    <Text className="font-bold text-primary-700 text-lg">Add Exercise</Text>
                </TouchableOpacity>
            </ScrollView>

            <View className="p-6 border-t border-neutral-100 bg-white">
                <TouchableOpacity
                    className="bg-neutral-900 py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-95 transition-all"
                    onPress={handleSaveWorkout}
                >
                    <Save size={20} color="white" />
                    <Text className="ml-2 text-white font-bold text-lg">Finish Workout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

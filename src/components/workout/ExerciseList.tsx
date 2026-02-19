import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import SetRepInput from './SetRepInput';

export type TrackerSet = { reps: string; weight: string; completed: boolean };
export type TrackerExercise = {
    id: string;
    name: string;
    sets: TrackerSet[];
};

type ExerciseListProps = {
    exercises: TrackerExercise[];
    onMoveExercise: (index: number, direction: 'up' | 'down') => void;
    onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<TrackerSet>) => void;
};

export default function ExerciseList({ exercises, onMoveExercise, onUpdateSet }: ExerciseListProps) {
    return (
        <FlashList
            data={exercises}
            estimatedItemSize={160}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
                const done = item.sets.every((set) => set.completed);

                return (
                    <View
                        style={{
                            marginTop: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: '#fff',
                            padding: 10,
                            opacity: done ? 0.75 : 1,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#0f172a', fontWeight: '700', flex: 1 }}>{item.name}</Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Pressable onPress={() => onMoveExercise(index, 'up')} style={{ padding: 4 }}>
                                    <ArrowUp size={16} color="#64748b" />
                                </Pressable>
                                <Pressable onPress={() => onMoveExercise(index, 'down')} style={{ padding: 4 }}>
                                    <ArrowDown size={16} color="#64748b" />
                                </Pressable>
                            </View>
                        </View>

                        {item.sets.map((set, setIndex) => (
                            <SetRepInput
                                key={`${item.id}-${setIndex}`}
                                setNumber={setIndex + 1}
                                reps={set.reps}
                                weight={set.weight}
                                completed={set.completed}
                                onChangeReps={(value) => onUpdateSet(index, setIndex, { reps: value })}
                                onChangeWeight={(value) => onUpdateSet(index, setIndex, { weight: value })}
                                onToggleComplete={() => onUpdateSet(index, setIndex, { completed: !set.completed })}
                            />
                        ))}
                    </View>
                );
            }}
        />
    );
}

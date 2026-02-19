import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { X } from 'lucide-react-native';
import { WorkoutDay } from '../../types/workout';
import WorkoutTimer from './WorkoutTimer';
import ExerciseList, { TrackerExercise, TrackerSet } from './ExerciseList';
import RestTimer from './RestTimer';
import WorkoutCompletionCelebration from './WorkoutCompletionCelebration';
import { triggerHaptic } from '../../utils/haptics';

type WorkoutTrackerModalProps = {
    visible: boolean;
    day: WorkoutDay | null;
    onClose: () => void;
    onFinish: (summary: { durationMinutes: number; calories: number; totalVolume: number }) => void;
};

const createInitialSets = (count: number): TrackerSet[] =>
    Array.from({ length: count }).map(() => ({ reps: '', weight: '', completed: false }));

export default function WorkoutTrackerModal({ visible, day, onClose, onFinish }: WorkoutTrackerModalProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showRest, setShowRest] = useState(false);
    const [restSeed, setRestSeed] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [exercises, setExercises] = useState<TrackerExercise[]>([]);

    useEffect(() => {
        if (!visible || !day) return;
        setElapsedSeconds(0);
        setShowRest(false);
        setShowCompletion(false);
        setExercises(
            day.mainWorkout.map((exercise) => ({
                id: exercise.id,
                name: exercise.name,
                sets: createInitialSets(exercise.sets || 3),
            })),
        );
    }, [day, visible]);

    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [visible]);

    const allDone = useMemo(
        () => exercises.length > 0 && exercises.every((exercise) => exercise.sets.every((set) => set.completed)),
        [exercises],
    );

    useEffect(() => {
        if (allDone && visible) {
            triggerHaptic('heavy').catch(() => undefined);
            setShowCompletion(true);
        }
    }, [allDone, visible]);

    const totalVolume = useMemo(
        () =>
            exercises.reduce(
                (sum, exercise) =>
                    sum +
                    exercise.sets.reduce((setSum, set) => {
                        const reps = Number(set.reps) || 0;
                        const weight = Number(set.weight) || 0;
                        return setSum + reps * weight;
                    }, 0),
                0,
            ),
        [exercises],
    );

    const estimatedDuration = day?.estimatedDuration || 45;
    const estimatedCalories = Math.round((elapsedSeconds / 60) * 8);

    const moveExercise = (index: number, direction: 'up' | 'down') => {
        setExercises((prev) => {
            const next = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= next.length) return prev;
            const [item] = next.splice(index, 1);
            next.splice(targetIndex, 0, item);
            return next;
        });
    };

    const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<TrackerSet>) => {
        setExercises((prev) => {
            const next = [...prev];
            const exercise = next[exerciseIndex];
            if (!exercise) return prev;
            const set = exercise.sets[setIndex];
            if (!set) return prev;

            const beforeCompleted = set.completed;
            exercise.sets[setIndex] = { ...set, ...patch };
            if (!beforeCompleted && exercise.sets[setIndex].completed) {
                setShowRest(true);
                setRestSeed((seed) => seed + 1);
            }

            return next;
        });
    };

    if (!day) return null;

    return (
        <>
            <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingTop: 46 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>{day.title}</Text>
                        <Pressable onPress={onClose} style={{ padding: 6 }}>
                            <X size={20} color="#334155" />
                        </Pressable>
                    </View>

                    <WorkoutTimer elapsedSeconds={elapsedSeconds} estimatedDurationMinutes={estimatedDuration} />

                    {showRest ? <RestTimer key={restSeed} seconds={40} onDone={() => setShowRest(false)} /> : null}

                    <FlashList
                        data={[0]}
                        estimatedItemSize={600}
                        renderItem={() => (
                            <ExerciseList exercises={exercises} onMoveExercise={moveExercise} onUpdateSet={updateSet} />
                        )}
                    />
                </View>
            </Modal>

            <WorkoutCompletionCelebration
                visible={showCompletion}
                durationMinutes={Math.max(1, Math.round(elapsedSeconds / 60))}
                calories={estimatedCalories}
                totalVolume={Math.round(totalVolume)}
                onClose={() => {
                    setShowCompletion(false);
                    onFinish({
                        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
                        calories: estimatedCalories,
                        totalVolume: Math.round(totalVolume),
                    });
                }}
            />
        </>
    );
}

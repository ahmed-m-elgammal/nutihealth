import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { WorkoutExercise, ExerciseSet } from '../../types/workout';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo

interface ExerciseCardProps {
    exercise: WorkoutExercise & { imageUrl?: string; videoUrl?: string };
    onCompleteSet: (setIndex: number, reps: number, weight?: number, rpe?: number) => void;
    completedSets: ExerciseSet[];
    isActive: boolean;
    onRemove?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    onCompleteSet,
    completedSets,
    isActive,
    onRemove
}) => {
    const [expanded, setExpanded] = useState(false);

    // State for current set input
    const currentSetIndex = completedSets.length;
    const targetReps = typeof exercise.reps === 'string' ? exercise.reps : exercise.reps.toString();
    const [repsInput, setRepsInput] = useState(targetReps);
    const [weightInput, setWeightInput] = useState('');
    const [rpeInput, setRpeInput] = useState('7');

    const handleComplete = () => {
        const reps = parseInt(repsInput) || 0;
        const weight = parseFloat(weightInput) || undefined;
        const rpe = parseInt(rpeInput) || undefined;
        onCompleteSet(currentSetIndex, reps, weight, rpe);
        // Reset for next set
        setRepsInput(targetReps);
    };

    const isCompleted = completedSets.length >= exercise.sets;

    return (
        <View style={[styles.card, isActive && styles.activeCard, isCompleted && styles.completedCard]}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.target}>
                        {exercise.sets} x {exercise.reps} {exercise.repType} • {exercise.restPeriod}s rest
                    </Text>
                    {exercise.weightGuidance && (
                        <Text style={styles.guidance}>Load: {exercise.weightGuidance}</Text>
                    )}
                    {exercise.rpe && (
                        <Text style={styles.guidance}>Target Effort: RPE {exercise.rpe}</Text>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {onRemove && (
                        <TouchableOpacity onPress={onRemove} style={{ marginRight: 12 }}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : expanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={isCompleted ? "#10B981" : "#6B7280"}
                    />
                </View>
            </TouchableOpacity>

            {/* Expanded Details */}
            {(expanded || isActive) && (
                <View style={styles.details}>
                    <View style={styles.tags}>
                        <Text style={styles.tag}>{exercise.category}</Text>
                        <Text style={styles.tag}>{exercise.difficulty}</Text>
                    </View>

                    {exercise.thumbnailUrl && (
                        <Image
                            source={{ uri: exercise.imageUrl || exercise.videoUrl || exercise.thumbnailUrl }}
                            style={styles.gif}
                            contentFit="contain"
                            transition={1000}
                        />
                    )}

                    <Text style={styles.instructionLabel}>Instructions:</Text>
                    {exercise.instructions.map((inst, i) => (
                        <Text key={i} style={styles.instruction}>• {inst}</Text>
                    ))}

                    {exercise.notes ? (
                        <Text style={styles.noteText}>{exercise.notes}</Text>
                    ) : null}

                    {exercise.formTips && exercise.formTips.length > 0 && (
                        <>
                            <Text style={[styles.instructionLabel, { marginTop: 12 }]}>Pro Tips:</Text>
                            {exercise.formTips.map((tip, i) => (
                                <Text key={i} style={styles.instruction}>💡 {tip}</Text>
                            ))}
                        </>
                    )}

                    {/* Active Set Logging */}
                    {!isCompleted && isActive && (
                        <View style={styles.inputContainer}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Reps</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={repsInput}
                                        onChangeText={setRepsInput}
                                        placeholder={targetReps}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Weight (lbs)</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="decimal-pad"
                                        value={weightInput}
                                        onChangeText={setWeightInput}
                                        placeholder="0"
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                                    <Text style={styles.inputLabel}>RPE</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={rpeInput}
                                        onChangeText={setRpeInput}
                                        placeholder="7"
                                    />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.logButton} onPress={handleComplete}>
                                <Text style={styles.logButtonText}>Log Set {currentSetIndex + 1}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* History/Progress */}
                    <View style={styles.history}>
                        {completedSets.map((set, i) => (
                            <View key={i} style={styles.historyItem}>
                                <Text style={styles.historyText}>
                                    Set {i + 1}: {set.actualReps} reps
                                    {set.weight && ` @ ${set.weight}lbs`}
                                    {set.rpe && ` (RPE ${set.rpe})`}
                                </Text>
                                <Ionicons name="checkmark" size={16} color="#10B981" />
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginVertical: 8,
        marginHorizontal: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    activeCard: {
        borderColor: '#4F46E5',
        borderWidth: 2,
    },
    completedCard: {
        opacity: 0.8,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    target: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    guidance: {
        fontSize: 12,
        color: '#4B5563',
        marginTop: 2,
    },
    details: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
    },
    tags: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    tag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        fontSize: 12,
        color: '#4B5563',
        textTransform: 'capitalize',
    },
    instructionLabel: {
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 14,
    },
    instruction: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 2,
    },
    noteText: {
        marginTop: 8,
        fontSize: 13,
        color: '#374151',
        fontStyle: 'italic',
    },
    inputContainer: {
        marginTop: 16,
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 8,
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    inputGroup: {
        flex: 1,
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4F46E5',
        marginBottom: 4
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderRadius: 6,
        padding: 8,
        fontSize: 16,
    },
    logButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    logButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    history: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        marginBottom: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    historyText: {
        fontSize: 12,
        color: '#047857',
        marginRight: 4
    },
    gif: {
        width: '100%',
        height: 200,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 16,
    }
});

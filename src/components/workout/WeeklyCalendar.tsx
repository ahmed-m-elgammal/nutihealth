import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { WeeklyWorkoutPlan, WorkoutDay } from '../../types/workout';

interface WeeklyCalendarProps {
    plan: WeeklyWorkoutPlan;
    onDayPress: (day: WorkoutDay) => void;
    activeDayId?: string;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ plan, onDayPress, activeDayId }) => {
    // Simplified theme usage
    const colors = {
        primary: '#4F46E5',
        background: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        card: '#F3F4F6',
        border: '#E5E7EB',
        success: '#10B981',
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Weekly Schedule</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {plan.days.map((day) => {
                    const isActive = day.id === activeDayId;
                    const isRest = day.isRestDay;
                    const totalSets = day.mainWorkout.reduce((sum, exercise) => sum + Math.max(1, exercise.sets), 0);
                    const exercisePreview = day.mainWorkout
                        .slice(0, 2)
                        .map((exercise) => exercise.name)
                        .join(' • ');

                    return (
                        <TouchableOpacity
                            key={day.id}
                            style={[
                                styles.dayCard,
                                isActive && { borderColor: colors.primary, borderWidth: 2 },
                                isRest && { opacity: 0.7 }
                            ]}
                            onPress={() => onDayPress(day)}
                        >
                            <Text style={styles.dayName}>{day.dayOfWeek.substring(0, 3)}</Text>

                            <View style={styles.infoContainer}>
                                {isRest ? (
                                    <Text style={[styles.dayTitle, { color: colors.textSecondary }]}>Rest</Text>
                                ) : (
                                    <>
                                        <Text style={styles.dayTitle} numberOfLines={2}>{day.title}</Text>
                                        <Text style={styles.duration}>{day.estimatedDuration} min</Text>
                                        <Text style={styles.exerciseCount}>{day.mainWorkout.length} Exercises • {totalSets} Sets</Text>
                                        {exercisePreview ? (
                                            <Text style={styles.exercisePreview} numberOfLines={2}>{exercisePreview}</Text>
                                        ) : null}
                                    </>
                                )}
                            </View>

                            {isActive && (
                                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.badgeText}>Active</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        paddingHorizontal: 16,
        color: '#1F2937',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    dayCard: {
        width: 120,
        height: 140,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'space-between',
    },
    dayName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    dayTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    duration: {
        fontSize: 12,
        color: '#4B5563',
    },
    exerciseCount: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2
    },
    exercisePreview: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
        lineHeight: 14,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

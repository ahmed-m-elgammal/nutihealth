import React from 'react';
import { Pressable, Text, View } from 'react-native';

type TodayWorkout = {
    name: string;
    muscleGroups: string[];
    duration: number;
    calories: number;
    intensity: string;
};

type TodayWorkoutCardProps = {
    workout?: TodayWorkout;
    isRestDay: boolean;
    onStartWorkout: () => void;
    onPlanWeek: () => void;
};

export default function TodayWorkoutCard({ workout, isRestDay, onStartWorkout, onPlanWeek }: TodayWorkoutCardProps) {
    return (
        <View
            style={{
                marginTop: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#dbeafe',
                backgroundColor: '#fff',
                padding: 14,
                elevation: 2,
            }}
        >
            {isRestDay || !workout ? (
                <>
                    <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 20 }}>Rest Day</Text>
                    <Text style={{ color: '#64748b', marginTop: 6 }}>Recover and prepare for your next session.</Text>
                    <Pressable
                        onPress={onPlanWeek}
                        android_ripple={{ color: 'rgba(59,130,246,0.15)' }}
                        style={{
                            marginTop: 12,
                            borderRadius: 12,
                            backgroundColor: '#2563eb',
                            alignItems: 'center',
                            paddingVertical: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Plan this week</Text>
                    </Pressable>
                </>
            ) : (
                <>
                    <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 20 }}>{workout.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {workout.muscleGroups.map((muscle) => (
                            <View
                                key={muscle}
                                style={{
                                    borderRadius: 999,
                                    backgroundColor: '#f1f5f9',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                }}
                            >
                                <Text style={{ color: '#334155', fontSize: 11, fontWeight: '600' }}>{muscle}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={{ color: '#475569', marginTop: 10 }}>
                        {workout.duration} min • {workout.calories} kcal • {workout.intensity}
                    </Text>

                    <Pressable
                        onPress={onStartWorkout}
                        android_ripple={{ color: 'rgba(220,252,231,0.3)' }}
                        style={{
                            marginTop: 12,
                            borderRadius: 12,
                            backgroundColor: '#16a34a',
                            alignItems: 'center',
                            paddingVertical: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '800' }}>Start Workout</Text>
                    </Pressable>
                </>
            )}
        </View>
    );
}

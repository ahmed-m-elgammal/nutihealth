import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';

type WorkoutCompletionCelebrationProps = {
    visible: boolean;
    durationMinutes: number;
    calories: number;
    totalVolume: number;
    onClose: () => void;
};

export default function WorkoutCompletionCelebration({
    visible,
    durationMinutes,
    calories,
    totalVolume,
    onClose,
}: WorkoutCompletionCelebrationProps) {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.6)', justifyContent: 'center', padding: 20 }}>
                <Animated.View entering={ZoomIn.duration(300)} style={{ alignItems: 'center' }}>
                    <Trophy size={56} color="#f59e0b" />
                </Animated.View>
                <Animated.View
                    entering={FadeInDown.delay(80).duration(320)}
                    style={{
                        marginTop: 12,
                        borderRadius: 16,
                        backgroundColor: '#fff',
                        padding: 16,
                    }}
                >
                    <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 20, textAlign: 'center' }}>
                        Workout Complete 🎉
                    </Text>
                    <Text style={{ marginTop: 10, color: '#334155' }}>Duration: {durationMinutes} min</Text>
                    <Text style={{ marginTop: 4, color: '#334155' }}>Calories: {calories} kcal</Text>
                    <Text style={{ marginTop: 4, color: '#334155' }}>Total volume: {totalVolume} kg</Text>

                    <Pressable
                        onPress={onClose}
                        android_ripple={{ color: 'rgba(220,252,231,0.2)' }}
                        style={{
                            marginTop: 14,
                            borderRadius: 12,
                            backgroundColor: '#16a34a',
                            alignItems: 'center',
                            paddingVertical: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

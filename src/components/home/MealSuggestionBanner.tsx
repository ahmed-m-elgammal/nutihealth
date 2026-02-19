import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerHaptic } from '../../utils/haptics';

type MealSuggestionBannerProps = {
    visible: boolean;
    mealName: string;
    targetCalories: number;
    onLogMeal: () => void;
    onDismiss: () => void;
};

export default function MealSuggestionBanner({
    visible,
    mealName,
    targetCalories,
    onLogMeal,
    onDismiss,
}: MealSuggestionBannerProps) {
    if (!visible) return null;

    return (
        <LinearGradient
            colors={['#16a34a', '#22c55e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ marginTop: 12, borderRadius: 16, padding: 14 }}
        >
            <Text style={{ color: '#dcfce7', fontWeight: '600', fontSize: 12 }}>Suggested next meal</Text>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{mealName}</Text>
            <Text style={{ color: '#f0fdf4', marginTop: 3 }}>{targetCalories} kcal target</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                    onPress={() => {
                        triggerHaptic('medium').catch(() => undefined);
                        onLogMeal();
                    }}
                    android_ripple={{ color: '#dcfce7' }}
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#15803d', fontWeight: '700' }}>Log This Meal</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        triggerHaptic('light').catch(() => undefined);
                        onDismiss();
                    }}
                    android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                    style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' }}
                >
                    <Text style={{ color: '#ecfccb', fontWeight: '600' }}>Dismiss</Text>
                </Pressable>
            </View>
        </LinearGradient>
    );
}

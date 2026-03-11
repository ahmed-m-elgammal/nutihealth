import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../hooks/useColors';
import { useMealSuggestionActions } from '../../hooks/useMealSuggestionActions';

type MealSuggestionBannerProps = {
    visible: boolean;
    mealName: string;
    targetCalories: number;
    onLogMeal: () => void;
    onDismiss: () => void;
    onSmartCooker?: () => void;
};

export default function MealSuggestionBanner({
    visible,
    mealName,
    targetCalories,
    onLogMeal,
    onDismiss,
    onSmartCooker,
}: MealSuggestionBannerProps) {
    const colors = useColors();
    const { handleDismiss, handleLogMeal, handleSmartCooker } = useMealSuggestionActions({
        onLogMeal,
        onDismiss,
        onSmartCooker,
    });
    if (!visible) return null;
    const theme = {
        gradient: [colors.brand.primary[600] as string, colors.brand.primary[500] as string] as const,
        label: colors.brand.primary[100] as string,
        title: colors.text.inverse,
        subtitle: colors.brand.primary[50] as string,
        primaryBg: colors.surface.surface,
        primaryText: colors.brand.primary[700] as string,
        primaryRipple: colors.brand.primary[100] as string,
        pantryBg: colors.brand.accent[50] as string,
        pantryText: colors.brand.accent[600] as string,
        pantryRipple: colors.brand.accent[100] as string,
        dismissText: colors.brand.primary[100] as string,
    };

    return (
        <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ marginTop: 12, borderRadius: 16, padding: 14 }}
        >
            <Text style={{ color: theme.label, fontWeight: '600', fontSize: 12 }}>Suggested next meal</Text>
            <Text style={{ color: theme.title, fontWeight: '700', fontSize: 18, marginTop: 2 }}>{mealName}</Text>
            <Text style={{ color: theme.subtitle, marginTop: 3 }}>{targetCalories} kcal target</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <Pressable
                    onPress={handleLogMeal}
                    android_ripple={{ color: theme.primaryRipple }}
                    style={{
                        backgroundColor: theme.primaryBg,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: theme.primaryText, fontWeight: '700' }}>Log This Meal</Text>
                </Pressable>

                {onSmartCooker ? (
                    <Pressable
                        onPress={handleSmartCooker}
                        android_ripple={{ color: theme.pantryRipple }}
                        style={{
                            backgroundColor: theme.pantryBg,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={{ color: theme.pantryText, fontWeight: '700' }}>Open Smart Cooker</Text>
                    </Pressable>
                ) : null}

                <Pressable
                    onPress={handleDismiss}
                    android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                    style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' }}
                >
                    <Text style={{ color: theme.dismissText, fontWeight: '600' }}>Dismiss</Text>
                </Pressable>
            </View>
        </LinearGradient>
    );
}

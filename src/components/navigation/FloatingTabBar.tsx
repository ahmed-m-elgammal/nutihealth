import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Chrome, Utensils, Dumbbell, TrendingUp, GlassWater, User } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';
import { useColors } from '../../hooks/useColors';
import { designTokens } from '../../theme/design-tokens';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    index: Chrome,
    meals: Utensils,
    workouts: Dumbbell,
    progress: TrendingUp,
    water: GlassWater,
    profile: User,
};

type TabBarProps = {
    state: any;
    descriptors: any;
    navigation: any;
};

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
    const { width } = useWindowDimensions();
    const colors = useColors();
    const containerWidth = Math.min(width - designTokens.spacing.lg * 1.5, 500);
    const itemWidth = containerWidth / state.routes.length;
    const indicatorX = useSharedValue(state.index * itemWidth);

    indicatorX.value = withSpring(state.index * itemWidth, {
        damping: 20,
        stiffness: 180,
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
    }));

    return (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', bottom: designTokens.spacing.lg, width: '100%', alignItems: 'center' }}
        >
            <BlurView
                intensity={20}
                tint="default"
                style={{
                    width: containerWidth,
                    borderRadius: designTokens.borderRadius.full,
                    overflow: 'hidden',
                    backgroundColor: colors.surface.surface,
                    shadowColor: colors.text.primary,
                    shadowOffset: { width: 0, height: designTokens.spacing.sm },
                    shadowOpacity: 0.15,
                    shadowRadius: 18,
                    elevation: designTokens.elevation[4],
                }}
            >
                <View style={{ flexDirection: 'row', padding: 6 }}>
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                left: 6,
                                top: 6,
                                width: itemWidth - 2,
                                height: 52,
                                borderRadius: designTokens.borderRadius.full,
                                backgroundColor: colors.brand.primary[600],
                            },
                            animatedStyle,
                        ]}
                    />
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const label = options.title ?? route.name;
                        const isFocused = state.index === index;
                        const Icon = ICONS[route.name] ?? Chrome;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                triggerHaptic('light').catch(() => undefined);
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={route.key}
                                onPress={onPress}
                                android_ripple={{ color: 'rgba(22,163,74,0.16)', borderless: false }}
                                style={{
                                    width: itemWidth,
                                    height: 52,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    overflow: 'hidden',
                                    borderRadius: designTokens.borderRadius.full,
                                }}
                            >
                                <Icon size={18} color={isFocused ? colors.text.inverse : colors.text.secondary} />
                                {isFocused && (
                                    <Text style={{ color: colors.text.inverse, fontSize: 10, fontWeight: '600' }}>
                                        {label}
                                    </Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}

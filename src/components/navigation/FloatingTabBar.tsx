import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Chrome, Utensils, Dumbbell, TrendingUp, GlassWater, User } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

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
    const containerWidth = Math.min(width - 24, 500);
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
            style={{ position: 'absolute', bottom: 16, width: '100%', alignItems: 'center' }}
        >
            <BlurView
                intensity={20}
                tint="light"
                style={{
                    width: containerWidth,
                    borderRadius: 9999,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 18,
                    elevation: 8,
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
                                borderRadius: 9999,
                                backgroundColor: '#16a34a',
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
                                    borderRadius: 9999,
                                }}
                            >
                                <Icon size={18} color={isFocused ? '#ffffff' : '#4b5563'} />
                                {isFocused && (
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{label}</Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}

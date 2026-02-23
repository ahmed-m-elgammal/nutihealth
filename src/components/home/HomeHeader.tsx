import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, UserCircle2 } from 'lucide-react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type HomeHeaderProps = {
    userName: string;
    streak: number;
    onAvatarPress: () => void;
};

export default function HomeHeader({ userName, streak, onAvatarPress }: HomeHeaderProps) {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const dateLabel = useMemo(
        () =>
            new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            }),
        [],
    );

    const pulse = useSharedValue(1);

    useEffect(() => {
        if (streak <= 0) return;

        pulse.value = withRepeat(
            withSequence(withTiming(1.04, { duration: 300 }), withTiming(1, { duration: 500 })),
            -1,
            false,
        );
    }, [pulse, streak]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    return (
        <LinearGradient
            colors={['#15803d', '#22c55e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 16 }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#dcfce7', fontSize: 13, fontWeight: '600' }}>{greeting}</Text>
                    <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700', marginTop: 4 }}>{userName}</Text>
                    <Text style={{ color: '#dcfce7', fontSize: 12, marginTop: 6 }}>{dateLabel}</Text>
                </View>

                <Pressable
                    onPress={() => {
                        triggerHaptic('light').catch(() => undefined);
                        onAvatarPress();
                    }}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
                    accessibilityRole="button"
                    style={{ borderRadius: 9999, overflow: 'hidden' }}
                >
                    <UserCircle2 size={42} color="#ffffff" />
                </Pressable>
            </View>

            {streak > 0 && (
                <Animated.View
                    style={[
                        {
                            marginTop: 12,
                            alignSelf: 'flex-start',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 9999,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        },
                        pulseStyle,
                    ]}
                >
                    <Flame size={14} color="#fde68a" />
                    <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 12 }}>{streak}-day streak</Text>
                </Animated.View>
            )}
        </LinearGradient>
    );
}

import React, { createContext, useContext, useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import { cn } from '../../utils/cn';

const SCREEN_WIDTH = 420;

type SkeletonContextValue = { shimmerX: SharedValue<number> };
const SkeletonContext = createContext<SkeletonContextValue | null>(null);

export function SkeletonAnimationProvider({ children }: { children: React.ReactNode }) {
    const shimmerX = useSharedValue(-SCREEN_WIDTH);

    useEffect(() => {
        shimmerX.value = withRepeat(withTiming(SCREEN_WIDTH, { duration: 1300, easing: Easing.linear }), -1, false);
    }, [shimmerX]);

    return <SkeletonContext.Provider value={{ shimmerX }}>{children}</SkeletonContext.Provider>;
}

function useSkeletonAnimation() {
    return useContext(SkeletonContext);
}

export interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
    className?: string;
}

export function Skeleton({ width, height, borderRadius = 12, style, className }: SkeletonProps) {
    const context = useSkeletonAnimation();

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: context?.shimmerX.value ?? 0 }],
    }));

    return (
        <View className={cn('overflow-hidden bg-muted', className)} style={[{ width, height, borderRadius }, style]}>
            {context ? (
                <Animated.View
                    style={[{ position: 'absolute', top: 0, bottom: 0, width: SCREEN_WIDTH }, animatedStyle]}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            ) : null}
        </View>
    );
}

export default Skeleton;

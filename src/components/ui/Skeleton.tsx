import React, { useEffect } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
    /** Custom className for styling */
    className?: string;
}

/**
 * Skeleton loading component with pulse animation.
 * Better UX alternative to ActivityIndicator spinners.
 * 
 * Style dimensions using className (e.g., "w-full h-20" or "w-24 h-24")
 * 
 * @example
 * <Skeleton className="w-full h-20 rounded-md" />
 * 
 * @example
 * <Skeleton className="w-24 h-24 rounded-full" /> // Circle
 */
export function Skeleton({ className }: SkeletonProps) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, {
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            className={cn('bg-muted', className)}
            style={animatedStyle}
        />
    );
}

export default Skeleton;

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';

interface SwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    className?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function Switch({
    value,
    onValueChange,
    disabled = false,
    className = ''
}: SwitchProps) {
    const translateX = useSharedValue(value ? 20 : 0);

    React.useEffect(() => {
        translateX.value = withSpring(value ? 20 : 0, {
            damping: 15,
            stiffness: 150,
        });
    }, [value]);

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const handlePress = () => {
        if (!disabled) {
            onValueChange(!value);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            className={`
        w-12 h-6 rounded-full p-0.5
        ${value ? 'bg-primary-500' : 'bg-neutral-300'}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `.trim()}
        >
            <AnimatedView
                className="w-5 h-5 rounded-full bg-white shadow-sm"
                style={thumbStyle}
            />
        </Pressable>
    );
}

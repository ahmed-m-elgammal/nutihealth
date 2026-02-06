import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
}

export function Input({
    label,
    error,
    icon,
    containerClassName = '',
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const borderColor = useSharedValue(0);

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(
            borderColor.value === 1 ? '#22c55e' : error ? '#ef4444' : '#e5e5e5',
            { duration: 200 }
        ),
    }));

    const handleFocus = () => {
        setIsFocused(true);
        borderColor.value = 1;
    };

    const handleBlur = () => {
        setIsFocused(false);
        borderColor.value = 0;
    };

    return (
        <View className={`${containerClassName}`}>
            {label && (
                <Text className="text-neutral-700 font-caption text-sm mb-2">
                    {label}
                </Text>
            )}

            <Animated.View
                className="flex-row items-center bg-white border-2 rounded-xl px-4 py-3"
                style={borderStyle}
            >
                {icon && <View className="mr-2">{icon}</View>}

                <TextInput
                    {...props}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="flex-1 font-body text-base text-neutral-900"
                    placeholderTextColor="#a3a3a3"
                />
            </Animated.View>

            {error && (
                <Text className="text-error text-sm mt-1 ml-1">
                    {error}
                </Text>
            )}
        </View>
    );
}

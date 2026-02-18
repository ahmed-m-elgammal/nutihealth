import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';
import { cn } from '../../utils/cn';

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    accessibilityHint?: string;
}

/**
 * Input component with semantic colors and built-in error states.
 * Minimum 44px height for touch accessibility.
 * 
 * @example
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   error={errors.email}
 *   accessibilityHint="Enter your email address for login"
 * />
 */
export function Input({
    label,
    error,
    icon,
    containerClassName,
    className,
    accessibilityLabel,
    accessibilityHint,
    ...props
}: InputProps) {
    const borderColor = useSharedValue(0);

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(
            borderColor.value === 1
                ? 'hsl(var(--ring))'
                : error
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--input))',
            { duration: 200 }
        ),
    }));

    const handleFocus = () => {
        borderColor.value = 1;
    };

    const handleBlur = () => {
        borderColor.value = 0;
    };

    // Generate accessibility label from label prop if not provided
    const inputAccessibilityLabel = accessibilityLabel || label || 'Input field';

    return (
        <View className={cn(containerClassName)}>
            {label && (
                <Text className="text-sm font-medium leading-none text-foreground mb-2">
                    {label}
                </Text>
            )}

            <Animated.View
                className={cn(
                    'flex-row items-center bg-background border-2 rounded-md px-4 h-11',
                    error && 'border-destructive'
                )}
                style={borderStyle}
            >
                {icon && <View className="mr-2">{icon}</View>}

                <TextInput
                    {...props}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={cn(
                        'flex-1 font-body text-base text-foreground',
                        className
                    )}
                    placeholderTextColor="hsl(var(--muted-foreground))"
                    accessible={true}
                    accessibilityLabel={inputAccessibilityLabel}
                    accessibilityHint={accessibilityHint}
                    accessibilityState={{ disabled: props.editable === false }}
                />
            </Animated.View>

            {error && (
                <View
                    accessible={true}
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                >
                    <Text className="text-destructive text-sm mt-1 ml-1">
                        {error}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default Input;

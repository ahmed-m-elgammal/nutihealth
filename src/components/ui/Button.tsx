import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
}

export default function Button({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
}: ButtonProps) {
    const baseClasses = 'rounded-lg items-center justify-center';

    const variantClasses = {
        primary: 'bg-primary-500',
        secondary: 'bg-secondary-500',
        outline: 'border-2 border-primary-500 bg-transparent',
    };

    const sizeClasses = {
        sm: 'px-3 py-2',
        md: 'px-4 py-3',
        lg: 'px-6 py-4',
    };

    const textVariantClasses = {
        primary: 'text-white font-semibold',
        secondary: 'text-white font-semibold',
        outline: 'text-primary-500 font-semibold',
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const opacity = disabled || loading ? 0.5 : 1;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={{ opacity }}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? '#22c55e' : '#ffffff'} />
            ) : (
                <Text className={`${textVariantClasses[variant]} ${textSizeClasses[size]}`}>
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}

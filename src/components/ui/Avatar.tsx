import React from 'react';
import { View, Image, Text } from 'react-native';

interface AvatarProps {
    uri?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeStyles = {
    sm: { container: 'w-8 h-8', text: 'text-sm' },
    md: { container: 'w-12 h-12', text: 'text-base' },
    lg: { container: 'w-16 h-16', text: 'text-xl' },
    xl: { container: 'w-24 h-24', text: 'text-3xl' },
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function Avatar({
    uri,
    name = 'User',
    size = 'md',
    className = ''
}: AvatarProps) {
    const styles = sizeStyles[size];

    return (
        <View className={`
      ${styles.container}
      rounded-full
      bg-primary-100
      items-center
      justify-center
      overflow-hidden
      ${className}
    `.trim()}>
            {uri ? (
                <Image
                    source={{ uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
            ) : (
                <Text className={`${styles.text} text-primary-600 font-heading font-bold`}>
                    {getInitials(name)}
                </Text>
            )}
        </View>
    );
}

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface HeaderProps {
    userName: string;
    showDate?: boolean;
    dateText?: string;
    variant?: 'gradient' | 'solid';
}

export default function Header({ userName, showDate = false, dateText, variant = 'solid' }: HeaderProps) {
    const router = useRouter();

    // Get time-based greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const containerClass = variant === 'gradient'
        ? 'bg-gradient-to-br from-primary-600 to-teal-600 px-6 pt-4 pb-6'
        : 'px-6 pt-4 pb-6';

    const greetingTextClass = variant === 'gradient'
        ? 'text-primary-100 font-medium text-sm'
        : 'text-neutral-500 font-medium text-sm';

    const nameTextClass = variant === 'gradient'
        ? 'text-white font-bold text-2xl'
        : 'text-neutral-900 font-bold text-2xl';

    const dateTextClass = variant === 'gradient'
        ? 'text-primary-200 text-xs mt-1'
        : 'text-neutral-400 text-xs mt-1';

    const avatarContainerClass = variant === 'gradient'
        ? 'w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/30'
        : 'w-10 h-10 bg-primary-100 rounded-full items-center justify-center border border-primary-200';

    const avatarTextClass = variant === 'gradient'
        ? 'text-white font-bold'
        : 'text-primary-700 font-bold';

    return (
        <View className={containerClass}>
            <View className="flex-row justify-between items-center">
                <View>
                    <Text className={greetingTextClass}>{greeting},</Text>
                    <Text className={nameTextClass}>{userName}</Text>
                    {showDate && dateText && (
                        <Text className={dateTextClass}>{dateText}</Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <View className={avatarContainerClass}>
                        <Text className={avatarTextClass}>{userName[0]}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

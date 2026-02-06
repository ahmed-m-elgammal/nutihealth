import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Coffee, Utensils } from 'lucide-react-native';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    const IconComponent = icon === 'utensils' ? Utensils : Coffee;

    return (
        <View className="flex-1 items-center justify-center p-8">
            <View className="bg-gray-100 rounded-full p-6 mb-4">
                <IconComponent size={48} color="#9CA3AF" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">{title}</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>
            {actionLabel && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="bg-primary-500 rounded-lg px-6 py-3"
                >
                    <Text className="text-white font-semibold">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

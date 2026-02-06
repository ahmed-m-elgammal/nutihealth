import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}

export default function QuickAction({ icon, label, onPress }: QuickActionProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => {
                scale.value = withSpring(0.92, { damping: 10, stiffness: 400 });
            }}
            onPressOut={() => {
                scale.value = withSpring(1, { damping: 10, stiffness: 400 });
            }}
            className="items-center w-[22%]"
        >
            <Animated.View style={animatedStyle} className="w-full items-center">
                <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-md border border-neutral-100 mb-2">
                    {icon}
                </View>
                <Text className="text-neutral-600 text-xs font-medium text-center">
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

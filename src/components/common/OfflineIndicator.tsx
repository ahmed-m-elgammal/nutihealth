import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export default function OfflineIndicator() {
    const insets = useSafeAreaInsets();
    const [isOffline, setIsOffline] = useState(false);
    const progress = useSharedValue(0);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        progress.value = withTiming(isOffline ? 1 : 0, { duration: 220 });
    }, [isOffline, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: -36 + progress.value * 36 }],
    }));

    if (!isOffline) {
        return null;
    }

    return (
        <Animated.View
            style={[animatedStyle, { top: insets.top }]}
            className="absolute left-0 right-0 z-50 h-9 flex-row items-center justify-center bg-amber-500"
        >
            <View className="flex-row items-center gap-2">
                <WifiOff size={14} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">No internet connection</Text>
            </View>
        </Animated.View>
    );
}

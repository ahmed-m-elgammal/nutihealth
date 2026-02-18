import React from 'react';
import { RefreshControl, View, StyleSheet } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

type CollapsibleHeaderScrollViewProps = {
    header: React.ReactNode;
    children: React.ReactNode;
    headerHeight?: number;
    refreshing?: boolean;
    onRefresh?: () => void;
};

export default function CollapsibleHeaderScrollView({
    header,
    children,
    headerHeight = 180,
    refreshing = false,
    onRefresh,
}: CollapsibleHeaderScrollViewProps) {
    const scrollY = useSharedValue(0);

    const headerStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, headerHeight * 0.75], [1, 0.2], Extrapolation.CLAMP);
        const translateY = interpolate(
            scrollY.value,
            [0, headerHeight],
            [0, -headerHeight * 0.25],
            Extrapolation.CLAMP,
        );
        const scale = interpolate(scrollY.value, [0, headerHeight], [1, 0.96], Extrapolation.CLAMP);

        return {
            opacity,
            transform: [{ translateY }, { scale }],
        };
    });

    return (
        <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            onScroll={(event) => {
                scrollY.value = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        >
            <Animated.View style={[styles.headerWrap, { minHeight: headerHeight }, headerStyle]}>
                {header}
            </Animated.View>
            <View>{children}</View>
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 120,
    },
    headerWrap: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
});

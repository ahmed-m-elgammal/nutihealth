import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '../../utils/haptics';

type PlanFeaturesTabsProps = {
    tabs?: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
};

export default function PlanFeaturesTabs({
    tabs = ['Meals', 'Carb Cycle', 'Prep'],
    activeTab,
    onTabChange,
}: PlanFeaturesTabsProps) {
    const { t } = useTranslation();
    const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
    const indicatorX = useSharedValue(0);
    const indicatorW = useSharedValue(0);

    useEffect(() => {
        const layout = layouts[activeTab];
        if (!layout) return;
        indicatorX.value = withSpring(layout.x, { damping: 18, stiffness: 180 });
        indicatorW.value = withSpring(layout.width, { damping: 18, stiffness: 180 });
    }, [activeTab, indicatorW, indicatorX, layouts]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
        width: indicatorW.value,
    }));

    const onTabLayout = (tab: string) => (event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setLayouts((prev) => ({ ...prev, [tab]: { x, width } }));
    };

    const getTabLabel = (tab: string) => {
        if (tab === 'Meals') return t('plans.tabs.meals');
        if (tab === 'Carb Cycle') return t('plans.tabs.carbCycle');
        if (tab === 'Prep') return t('plans.tabs.prep');
        return tab;
    };

    return (
        <View style={{ marginTop: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row' }}>
                {tabs.map((tab) => (
                    <Pressable
                        key={tab}
                        onLayout={onTabLayout(tab)}
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            onTabChange(tab);
                        }}
                        android_ripple={{ color: 'rgba(22,163,74,0.14)' }}
                        style={{ paddingVertical: 12, paddingHorizontal: 14 }}
                    >
                        <Text style={{ color: activeTab === tab ? '#0f172a' : '#64748b', fontWeight: '700' }}>
                            {getTabLabel(tab)}
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: '#16a34a' }, indicatorStyle]} />
        </View>
    );
}

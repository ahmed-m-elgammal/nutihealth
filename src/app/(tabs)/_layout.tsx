import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';

const renderTabBar = (props: Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]) => (
    <FloatingTabBar {...props} />
);

export default function TabLayout() {
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
            tabBar={renderTabBar}
        >
            <Tabs.Screen name="index" options={{ title: t('tabs.main') }} />
            <Tabs.Screen name="meals" options={{ title: t('tabs.meals') }} />
            <Tabs.Screen name="workouts" options={{ title: t('tabs.workouts') }} />
            <Tabs.Screen name="plans" options={{ title: t('tabs.goalsPlans') }} />
            <Tabs.Screen name="water" options={{ title: t('tabs.water') }} />
            <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
            <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
        </Tabs>
    );
}

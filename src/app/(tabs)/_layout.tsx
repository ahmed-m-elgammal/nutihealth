import { Tabs } from 'expo-router';
import React from 'react';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';

const renderTabBar = (props: Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]) => (
    <FloatingTabBar {...props} />
);

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
            tabBar={renderTabBar}
        >
            <Tabs.Screen name="index" options={{ title: 'Today' }} />
            <Tabs.Screen name="meals" options={{ title: 'Meals' }} />
            <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
            <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
            <Tabs.Screen name="water" options={{ title: 'Water' }} />
            <Tabs.Screen name="profile" options={{ title: 'Me' }} />
            <Tabs.Screen
                name="plans"
                options={{
                    href: null,
                    title: 'Plans',
                }}
            />
        </Tabs>
    );
}

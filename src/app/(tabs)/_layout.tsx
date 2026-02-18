import { Tabs } from 'expo-router';
import React from 'react';
import { Chrome as Home, Utensils, User, TrendingUp, Dumbbell } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#059669', headerShown: false }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Today',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="meals"
                options={{
                    title: 'Meals',
                    tabBarIcon: ({ color }) => <Utensils size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="workouts"
                options={{
                    title: 'Workouts',
                    tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progress',
                    tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            {/* Hidden tabs - accessible via navigation but not in tab bar */}
            <Tabs.Screen
                name="water"
                options={{
                    href: null, // Hide from tab bar
                    title: 'Water',
                }}
            />
            <Tabs.Screen
                name="plans"
                options={{
                    href: null, // Hide from tab bar
                    title: 'Plans',
                }}
            />
        </Tabs>
    );
}

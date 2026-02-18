import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="personal-info" />
            <Stack.Screen name="goals" />
            <Stack.Screen name="activity-level" />
            <Stack.Screen name="dietary-preferences" />
            <Stack.Screen name="finish" />
        </Stack>
    );
}

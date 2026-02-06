import { Stack } from 'expo-router';
import React from 'react';
import '../../global.css';

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="(modals)/add-meal"
                options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/food-search"
                options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/barcode-scanner"
                options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
                name="(modals)/ai-food-detect"
                options={{ presentation: 'modal', headerShown: false }}
            />
        </Stack>
    );
}

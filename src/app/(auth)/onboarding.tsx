import React from 'react';
import { Redirect } from 'expo-router';

export default function LegacyOnboardingScreen() {
    return <Redirect href="/onboarding/welcome" />;
}

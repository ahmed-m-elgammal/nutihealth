import React from 'react';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import StitchFoodSearchModal from '../../components/meals/StitchFoodSearchModal';

export default function FoodSearchScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#10221c' }}>
            <StitchFoodSearchModal onClose={() => router.back()} />
        </SafeAreaView>
    );
}

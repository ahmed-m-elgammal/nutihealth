import React from 'react';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import FoodSearchModal from '../../components/meals/FoodSearchModal';

export default function FoodSearchScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <FoodSearchModal onClose={() => router.back()} />
        </SafeAreaView>
    );
}

import React from 'react';
import { Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AddMealSheet from '../../components/meals/AddMealSheet';

export default function AddMealModalScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <AddMealSheet
                onOpenSearch={() => router.push('/(modals)/food-search')}
                onOpenScan={() => router.push('/(modals)/barcode-scanner')}
                onOpenAiDetect={() => router.push('/(modals)/ai-food-detect')}
                onSaveMeal={() => {
                    Alert.alert('Meal saved', 'Your meal session was saved.');
                    router.back();
                }}
            />
        </SafeAreaView>
    );
}

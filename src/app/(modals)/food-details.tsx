import React, { useMemo } from 'react';
import { Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FoodDetailModal from '../../components/meals/FoodDetailModal';

export default function FoodDetailsModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ food?: string }>();

    const food = useMemo(() => {
        try {
            if (params.food) {
                const parsed = JSON.parse(params.food);
                return {
                    name: parsed.name || 'Food',
                    brand: parsed.brand || 'Unknown brand',
                    calories: Number(parsed.calories) || 0,
                    protein: Number(parsed.protein) || 0,
                    carbs: Number(parsed.carbs) || 0,
                    fats: Number(parsed.fats) || 0,
                };
            }
        } catch {
            // fallback below
        }

        return {
            name: 'Food',
            brand: 'Unknown brand',
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };
    }, [params.food]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <FoodDetailModal
                food={food}
                onSave={() => {
                    Alert.alert('Saved', 'Food entry updated.');
                    router.back();
                }}
                onRemove={() => {
                    Alert.alert('Removed', 'Food removed from meal.');
                    router.back();
                }}
            />
        </SafeAreaView>
    );
}

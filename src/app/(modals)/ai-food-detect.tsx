import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Camera, Check, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { identifyFoodFromImage } from '../../services/ai/foodDetection';
import { DetectedFood } from '../../types/food';

export default function AIFoodDetectModal() {
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DetectedFood | null>(null);
    const [portionMultiplier, setPortionMultiplier] = useState(1);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const pickImage = async () => {
        try {
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                // MediaTypeOptions is still present and avoids TS errors on current Expo SDK
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.6,
                base64: true,
                // ⚡ Limit image size for performance
                exif: false,
            });

            if (!pickerResult.canceled) {
                const asset = pickerResult.assets[0];
                setImage(asset.uri);
                if (asset.base64) {
                    setImageBase64(asset.base64);
                    analyzeImage(asset.base64);
                } else {
                    Alert.alert('Error', 'Could not process image data');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const analyzeImage = async (base64: string) => {
        setIsLoading(true);
        setResult(null); // Clear previous result
        setAnalysisError(null);
        try {
            const data = await identifyFoodFromImage(base64);
            setResult(data);
        } catch (error: any) {
            const message = error?.message || 'Failed to analyze image';
            setAnalysisError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Memoize nutrition card data to avoid recalculating on every render
    const nutritionCards = useMemo(
        () => [
            {
                label: 'Calories',
                value: result ? Math.round(result.calories * portionMultiplier) : 0,
                bgColor: 'bg-neutral-50',
                borderColor: 'border-neutral-200',
                textColor: 'text-neutral-500',
                valueColor: 'text-neutral-900',
                unit: '',
            },
            {
                label: 'Protein',
                value: result ? Math.round(result.protein * portionMultiplier) : 0,
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                textColor: 'text-blue-600',
                valueColor: 'text-blue-900',
                unit: 'g',
            },
            {
                label: 'Carbs',
                value: result ? Math.round(result.carbs * portionMultiplier) : 0,
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                textColor: 'text-orange-600',
                valueColor: 'text-orange-900',
                unit: 'g',
            },
            {
                label: 'Fats',
                value: result ? Math.round(result.fats * portionMultiplier) : 0,
                bgColor: 'bg-purple-50',
                borderColor: 'border-purple-200',
                textColor: 'text-purple-600',
                valueColor: 'text-purple-900',
                unit: 'g',
            },
        ],
        [result, portionMultiplier],
    );

    const handleSave = useCallback(() => {
        if (!result) return;

        // Apply portion multiplier to nutrition values
        const foodItem = {
            name: result.name,
            calories: Math.round(result.calories * portionMultiplier),
            protein: Math.round(result.protein * portionMultiplier),
            carbs: Math.round(result.carbs * portionMultiplier),
            fats: Math.round(result.fats * portionMultiplier),
            fiber: result.fiber ? Math.round(result.fiber * portionMultiplier) : 0,
            sugar: result.sugar ? Math.round(result.sugar * portionMultiplier) : 0,
            servingSize: portionMultiplier,
            servingUnit: 'serving',
            quantity: 1,
            source: result.source,
        };

        router.replace({
            pathname: '/(modals)/food-details',
            params: { food: JSON.stringify(foodItem) },
        });
    }, [result, portionMultiplier, router]);

    return (
        <SafeAreaView className="flex-1 bg-black">
            <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="text-xl font-bold text-white">AI Food Lens</Text>
                <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-neutral-800 p-2">
                    <X size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center">
                {image ? (
                    <View className="relative h-full w-full">
                        <Image source={{ uri: image }} className="h-3/4 w-full bg-neutral-900" resizeMode="contain" />

                        {isLoading && (
                            <View className="absolute inset-0 items-center justify-center bg-black/50">
                                <ActivityIndicator size="large" color="#059669" />
                                <Text className="mt-4 font-semibold text-white">Analyzing food...</Text>
                            </View>
                        )}

                        {analysisError && !isLoading && !result && (
                            <View className="absolute bottom-0 w-full rounded-t-3xl bg-white p-6">
                                <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <Text className="mb-1 text-sm font-semibold text-red-700">Detection Failed</Text>
                                    <Text className="text-xs text-red-600">{analysisError}</Text>
                                </View>

                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        className="flex-1 items-center rounded-xl bg-neutral-100 py-4"
                                        onPress={() => {
                                            setImage(null);
                                            setImageBase64(null);
                                            setAnalysisError(null);
                                            setResult(null);
                                        }}
                                    >
                                        <Text className="font-semibold text-neutral-700">Choose Another</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-[2] items-center rounded-xl bg-primary-600 py-4"
                                        onPress={() => {
                                            if (imageBase64) {
                                                analyzeImage(imageBase64);
                                            }
                                        }}
                                    >
                                        <Text className="font-bold text-white">Retry Analysis</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {result && !isLoading && (
                            <ScrollView
                                className="absolute bottom-0 w-full rounded-t-3xl bg-white"
                                contentContainerStyle={{ padding: 24 }}
                            >
                                {/* Confidence & Source Indicators */}
                                <View className="mb-3 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <Text className="mr-2 text-xs text-neutral-500">Confidence</Text>
                                        <View
                                            className={`rounded-full px-2 py-1 ${result.confidence > 0.7 ? 'bg-green-100' : result.confidence > 0.5 ? 'bg-yellow-100' : 'bg-orange-100'}`}
                                        >
                                            <Text
                                                className={`text-xs font-semibold ${result.confidence > 0.7 ? 'text-green-700' : result.confidence > 0.5 ? 'text-yellow-700' : 'text-orange-700'}`}
                                            >
                                                {Math.round(result.confidence * 100)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        className={`rounded-full px-2 py-1 ${result.source === 'database' ? 'bg-blue-100' : result.source === 'api' ? 'bg-purple-100' : 'bg-gray-100'}`}
                                    >
                                        <Text
                                            className={`text-xs ${result.source === 'database' ? 'text-blue-700' : result.source === 'api' ? 'text-purple-700' : 'text-gray-700'}`}
                                        >
                                            {result.source === 'database'
                                                ? '📊 DB'
                                                : result.source === 'api'
                                                  ? '🌐 USDA'
                                                  : '📝 Estimate'}
                                        </Text>
                                    </View>
                                </View>

                                <Text className="mb-1 text-sm text-neutral-500">Detected</Text>
                                <Text className="mb-4 text-2xl font-bold text-neutral-900">{result.name}</Text>

                                {/* Warning for low confidence or estimates */}
                                {(result.needsUserConfirmation || result.source === 'estimate') && (
                                    <View className="mb-4 flex-row items-center rounded-xl border border-amber-200 bg-amber-50 p-3">
                                        <AlertCircle size={16} color="#d97706" />
                                        <Text className="ml-2 flex-1 text-xs text-amber-700">
                                            {result.source === 'estimate'
                                                ? 'Using estimated nutrition - verify before logging'
                                                : 'Low confidence - please review nutrition data'}
                                        </Text>
                                    </View>
                                )}

                                {/* Portion Size Selector */}
                                <View className="mb-4">
                                    <Text className="mb-2 font-semibold text-neutral-700">Portion Size</Text>
                                    <View className="flex-row gap-2">
                                        {[0.5, 1, 1.5, 2].map((multiplier) => (
                                            <TouchableOpacity
                                                key={multiplier}
                                                onPress={() => setPortionMultiplier(multiplier)}
                                                className={`flex-1 rounded-xl border-2 py-3 ${
                                                    portionMultiplier === multiplier
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-neutral-200 bg-white'
                                                }`}
                                            >
                                                <Text
                                                    className={`text-center font-semibold ${
                                                        portionMultiplier === multiplier
                                                            ? 'text-primary-700'
                                                            : 'text-neutral-600'
                                                    }`}
                                                >
                                                    {multiplier}x
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Nutrition Display - Optimized with proper keys */}
                                <View className="mb-6 flex-row gap-3">
                                    {nutritionCards.map((card) => (
                                        <View
                                            key={card.label}
                                            className={`flex-1 ${card.bgColor} rounded-xl border p-3 ${card.borderColor}`}
                                        >
                                            <Text className={`${card.textColor} mb-1 text-center text-xs`}>
                                                {card.label}
                                            </Text>
                                            <Text className={`text-center text-lg font-bold ${card.valueColor}`}>
                                                {card.value}
                                                {card.unit}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Action Buttons */}
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        className="flex-1 items-center rounded-xl bg-neutral-100 py-4"
                                        onPress={() => {
                                            setImage(null);
                                            setImageBase64(null);
                                            setResult(null);
                                            setAnalysisError(null);
                                            setPortionMultiplier(1);
                                        }}
                                    >
                                        <Text className="font-semibold text-neutral-700">Try Again</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-[2] flex-row items-center justify-center rounded-xl bg-primary-600 py-4"
                                        onPress={handleSave}
                                    >
                                        <Check size={20} color="white" />
                                        <Text className="ml-2 font-bold text-white">Log Food</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                ) : (
                    <View className="items-center">
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-neutral-800">
                            <Camera size={40} color="#9ca3af" />
                        </View>
                        <Text className="mb-8 px-10 text-center text-neutral-400">
                            Take a photo of your meal and let AI analyze the nutrition facts for you.
                        </Text>
                        <TouchableOpacity className="rounded-full bg-white px-8 py-4" onPress={pickImage}>
                            <Text className="font-bold text-black">Select Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

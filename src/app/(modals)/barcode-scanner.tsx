import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFoodByBarcode, extractNutrition } from '../../services/api/openFoodFacts';

const SCAN_COOLDOWN_MS = 1500;

export default function BarcodeScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const lastScanTimestampRef = useRef(0);
    const resetScanner = useCallback(() => {
        setScanned(false);
        setLoading(false);
    }, []);

    if (!permission) {
        return (
            <View className="flex-1 items-center justify-center bg-black">
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (!permission.granted) {
        const canAskAgain = permission.canAskAgain;

        return (
            <View className="flex-1 items-center justify-center bg-white p-4">
                <Text className="mb-2 text-center text-lg font-semibold text-neutral-900">
                    Camera permission needed
                </Text>
                <Text className="mb-6 text-center text-neutral-600">Barcode scanning requires camera access.</Text>

                {canAskAgain ? (
                    <TouchableOpacity onPress={requestPermission} className="rounded-lg bg-blue-500 px-4 py-3">
                        <Text className="font-semibold text-white">Grant Permission</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            Linking.openSettings().catch(() => undefined);
                        }}
                        className="rounded-lg bg-blue-500 px-4 py-3"
                    >
                        <Text className="font-semibold text-white">Open Settings</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => router.replace('/(modals)/food-search')}
                    className="mt-4 rounded-lg bg-neutral-100 px-4 py-3"
                >
                    <Text className="font-semibold text-neutral-700">Enter Food Manually</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-gray-500">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        const now = Date.now();
        if (scanned || loading || now - lastScanTimestampRef.current < SCAN_COOLDOWN_MS) {
            return;
        }

        const normalizedCode = data.trim();
        if (!normalizedCode) {
            return;
        }

        lastScanTimestampRef.current = now;
        setScanned(true);
        setLoading(true);

        try {
            const product = await getFoodByBarcode(normalizedCode);
            if (product) {
                const foodItem = extractNutrition(product);

                router.replace({
                    pathname: '/(modals)/food-details',
                    params: { food: JSON.stringify(foodItem) },
                });
            } else {
                Alert.alert('Product Not Found', "We couldn't find this barcode. You can search manually instead.", [
                    {
                        text: 'Scan Again',
                        onPress: resetScanner,
                    },
                    {
                        text: 'Manual Search',
                        onPress: () => router.replace('/(modals)/food-search'),
                    },
                    {
                        text: 'Cancel',
                        onPress: () => router.back(),
                        style: 'cancel',
                    },
                ]);
            }
        } catch (error) {
            Alert.alert('Scan failed', 'Unable to fetch product data right now.', [
                {
                    text: 'Try Again',
                    onPress: resetScanner,
                },
                {
                    text: 'Manual Search',
                    onPress: () => router.replace('/(modals)/food-search'),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => router.back(),
                },
            ]);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <SafeAreaView className="flex-1">
                <TouchableOpacity onPress={() => router.back()} className="m-4 self-start rounded-full bg-black/50 p-2">
                    <X color="white" size={24} />
                </TouchableOpacity>
                <View className="flex-1 items-center justify-center">
                    <View className="relative h-64 w-64 rounded-xl border-2 border-white/50">
                        {loading && (
                            <View className="absolute inset-0 items-center justify-center rounded-xl bg-black/60">
                                <ActivityIndicator size="large" color="white" />
                                <Text className="mt-2 font-medium text-white">Fetching details...</Text>
                            </View>
                        )}
                    </View>
                    <Text className="mt-4 rounded-full bg-black/50 px-4 py-1 font-bold text-white">Scan a barcode</Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/(modals)/food-search')}
                        className="mt-4 rounded-full bg-white/90 px-4 py-2"
                    >
                        <Text className="font-semibold text-neutral-900">Manual Search</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

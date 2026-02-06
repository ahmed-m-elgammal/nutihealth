import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';

export default function BarcodeScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 items-center justify-center bg-white p-4">
                <Text className="text-center mb-4">We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-blue-500 p-3 rounded-lg">
                    <Text className="text-white">Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-gray-500">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={({ data }) => {
                    console.log("Scanned:", data);
                    // Handle scan
                    router.back();
                }}
            />
            <SafeAreaView className="flex-1">
                <TouchableOpacity onPress={() => router.back()} className="m-4 bg-black/50 p-2 rounded-full self-start">
                    <X color="white" size={24} />
                </TouchableOpacity>
                <View className="flex-1 justify-center items-center">
                    <View className="w-64 h-64 border-2 border-white/50 rounded-xl" />
                    <Text className="text-white mt-4 font-bold bg-black/50 px-4 py-1 rounded-full">Scan a barcode</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

// Simple fallback for SafeAreaView if not imported above
function SafeAreaView({ children, className }) {
    return <View className={className} style={{ paddingTop: 50 }}>{children}</View>
}

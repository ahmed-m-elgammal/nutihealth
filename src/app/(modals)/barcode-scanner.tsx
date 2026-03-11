import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { Flashlight, Image as ImageIcon, ScanLine, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extractNutrition, getFoodByBarcode } from '../../services/api/openFoodFacts';

const SCAN_COOLDOWN_MS = 1500;

const COLORS = {
    primary: '#10b77f',
    bgDark: '#10221c',
    textMain: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
};

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
            <View style={styles.permissionRoot}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.permissionSubtitle}>Preparing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        const canAskAgain = permission.canAskAgain;

        return (
            <View style={styles.permissionRoot}>
                <Text style={styles.permissionTitle}>Camera permission needed</Text>
                <Text style={styles.permissionSubtitle}>Barcode scanning requires camera access.</Text>

                {canAskAgain ? (
                    <TouchableOpacity onPress={requestPermission} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            Linking.openSettings().catch(() => undefined);
                        }}
                        style={styles.primaryButton}
                    >
                        <Text style={styles.primaryButtonText}>Open Settings</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => router.replace('/(modals)/food-search')} style={styles.ghostButton}>
                    <Text style={styles.ghostButtonText}>Manual Search</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
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
        <View style={styles.screenRoot}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            <SafeAreaView style={StyleSheet.absoluteFillObject}>
                <BlurView intensity={24} tint="dark" style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeIconButton}>
                        <X color={COLORS.textMain} size={20} />
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>Scan Barcode</Text>
                    <View style={styles.topBarSpacer} />
                </BlurView>

                <View style={styles.scanAreaWrap}>
                    <View style={styles.scanWindow}>
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />
                        <View style={styles.scanLine} />

                        {loading ? (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Fetching details...</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.bottomPanelWrap}>
                    <BlurView intensity={32} tint="dark" style={styles.bottomPanel}>
                        <Text style={styles.bottomTitle}>Point camera at a barcode</Text>
                        <Text style={styles.bottomSubtitle}>Align the code within the frame to scan</Text>

                        <View style={styles.controlsRow}>
                            <TouchableOpacity style={styles.iconControl} onPress={() => undefined}>
                                <ImageIcon color={COLORS.textMain} size={20} />
                            </TouchableOpacity>
                            <View style={styles.scanButtonCenter}>
                                <ScanLine color={COLORS.primary} size={34} />
                            </View>
                            <TouchableOpacity style={styles.iconControl} onPress={() => undefined}>
                                <Flashlight color={COLORS.textMain} size={20} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => router.replace('/(modals)/food-search')}
                            style={styles.manualSearchButton}
                        >
                            <Text style={styles.manualSearchText}>Manual Search</Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screenRoot: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionRoot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgDark,
        padding: 20,
    },
    permissionTitle: {
        marginBottom: 8,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    permissionSubtitle: {
        marginBottom: 18,
        textAlign: 'center',
        color: COLORS.textSecondary,
    },
    primaryButton: {
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 8,
    },
    primaryButtonText: {
        color: COLORS.bgDark,
        fontWeight: '800',
    },
    ghostButton: {
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'rgba(30,41,59,0.9)',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    ghostButtonText: {
        color: COLORS.textMain,
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: 10,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    topBar: {
        marginHorizontal: 16,
        marginTop: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248,250,252,0.12)',
        backgroundColor: 'rgba(16,34,28,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,34,28,0.55)',
    },
    topBarTitle: {
        color: COLORS.textMain,
        fontSize: 16,
        fontWeight: '800',
    },
    topBarSpacer: {
        width: 36,
        height: 36,
    },
    scanAreaWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanWindow: {
        width: 270,
        height: 270,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 10,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 10,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 10,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 10,
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(16,183,127,0.5)',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
        backgroundColor: 'rgba(16,34,28,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 8,
        color: COLORS.textMain,
        fontWeight: '600',
    },
    bottomPanelWrap: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    bottomPanel: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(51,65,85,0.8)',
        backgroundColor: 'rgba(16,34,28,0.8)',
        paddingHorizontal: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    bottomTitle: {
        color: COLORS.textMain,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    bottomSubtitle: {
        marginTop: 4,
        color: COLORS.textSecondary,
        fontSize: 13,
        textAlign: 'center',
    },
    controlsRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    iconControl: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30,41,59,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(51,65,85,1)',
    },
    scanButtonCenter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,183,127,0.14)',
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    manualSearchButton: {
        marginTop: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(16,183,127,0.4)',
        backgroundColor: 'rgba(16,183,127,0.18)',
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    manualSearchText: {
        color: COLORS.textMain,
        fontWeight: '700',
    },
});

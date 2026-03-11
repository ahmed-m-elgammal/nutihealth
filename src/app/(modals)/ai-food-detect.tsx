import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AlertCircle, Camera, Check, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePostHog } from 'posthog-react-native';
import { identifyFoodFromImage } from '../../services/ai/foodDetection';
import { DetectedFood } from '../../types/food';

const COLORS = {
    primary: '#10b77f',
    bgDark: '#10221c',
    cardDark: '#1e293b',
    textMain: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    panelDark: '#0f172a',
};

export default function AIFoodDetectModal() {
    const router = useRouter();
    const posthog = usePostHog();
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DetectedFood | null>(null);
    const [portionMultiplier, setPortionMultiplier] = useState(1);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const openSettingsPrompt = useCallback((message: string) => {
        Alert.alert('Permission required', message, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Open Settings',
                onPress: () => {
                    Linking.openSettings().catch(() => undefined);
                },
            },
        ]);
    }, []);

    const ensureMediaLibraryPermission = useCallback(async () => {
        const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (existing.granted) {
            return true;
        }

        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (requested.granted) {
            return true;
        }

        if (!requested.canAskAgain) {
            openSettingsPrompt('Allow photo library access to analyze food images.');
        } else {
            Alert.alert('Permission required', 'Photo library access is required to select an image.');
        }

        return false;
    }, [openSettingsPrompt]);

    const ensureCameraPermission = useCallback(async () => {
        const existing = await ImagePicker.getCameraPermissionsAsync();
        if (existing.granted) {
            return true;
        }

        const requested = await ImagePicker.requestCameraPermissionsAsync();
        if (requested.granted) {
            return true;
        }

        if (!requested.canAskAgain) {
            openSettingsPrompt('Allow camera access to capture food photos for AI analysis.');
        } else {
            Alert.alert('Permission required', 'Camera access is required to take a food photo.');
        }

        return false;
    }, [openSettingsPrompt]);

    const pickImage = async () => {
        try {
            const hasPermission = await ensureMediaLibraryPermission();
            if (!hasPermission) {
                return;
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.6,
                base64: true,
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

    const captureImage = async () => {
        try {
            const hasPermission = await ensureCameraPermission();
            if (!hasPermission) {
                return;
            }

            const cameraResult = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.6,
                base64: true,
                exif: false,
            });

            if (!cameraResult.canceled) {
                const asset = cameraResult.assets[0];
                setImage(asset.uri);
                if (asset.base64) {
                    setImageBase64(asset.base64);
                    analyzeImage(asset.base64);
                } else {
                    Alert.alert('Error', 'Could not process image data');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to capture image');
        }
    };

    const analyzeImage = async (base64: string) => {
        setIsLoading(true);
        setResult(null);
        setAnalysisError(null);
        try {
            const data = await identifyFoodFromImage(base64);
            setResult(data);
            posthog.capture('ai_food_detected', {
                food_name: data.name,
                confidence: data.confidence,
                source: data.source,
            });
        } catch (error: any) {
            const message = error?.message || 'Failed to analyze image';
            setAnalysisError(message);
            posthog.capture('$exception', {
                $exception_list: [
                    {
                        type: 'AIDetectionError',
                        value: message,
                    },
                ],
                screen: 'ai-food-detect',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const nutritionCards = useMemo(
        () => [
            {
                label: 'Calories',
                value: result ? Math.round(result.calories * portionMultiplier) : 0,
                unit: '',
            },
            {
                label: 'Protein',
                value: result ? Math.round(result.protein * portionMultiplier) : 0,
                unit: 'g',
            },
            {
                label: 'Carbs',
                value: result ? Math.round(result.carbs * portionMultiplier) : 0,
                unit: 'g',
            },
            {
                label: 'Fats',
                value: result ? Math.round(result.fats * portionMultiplier) : 0,
                unit: 'g',
            },
        ],
        [result, portionMultiplier],
    );

    const handleSave = useCallback(() => {
        if (!result) return;

        posthog.capture('ai_food_logged', {
            food_name: result.name,
            portion_multiplier: portionMultiplier,
            calories: Math.round(result.calories * portionMultiplier),
            source: result.source,
        });

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
    }, [result, portionMultiplier, router, posthog]);

    const confidenceTone =
        result && result.confidence > 0.7
            ? { backgroundColor: 'rgba(16,183,127,0.2)', color: COLORS.primary }
            : result && result.confidence > 0.5
              ? { backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' }
              : { backgroundColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <Text style={styles.headerTitle}>AI Food Detect</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerCloseButton}>
                    <X size={22} color={COLORS.textMain} />
                </TouchableOpacity>
            </View>

            <View style={styles.contentWrap}>
                {image ? (
                    <View style={styles.imageStage}>
                        <Image
                            source={{ uri: image }}
                            style={styles.imagePreview}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={200}
                        />

                        {isLoading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Analyzing food...</Text>
                            </View>
                        )}

                        {analysisError && !isLoading && !result && (
                            <View style={styles.errorSheet}>
                                <View style={styles.errorBanner}>
                                    <Text style={styles.errorTitle}>Detection Failed</Text>
                                    <Text style={styles.errorMessage}>{analysisError}</Text>
                                </View>

                                <View style={styles.rowActions}>
                                    <TouchableOpacity
                                        style={styles.secondaryAction}
                                        onPress={() => {
                                            setImage(null);
                                            setImageBase64(null);
                                            setAnalysisError(null);
                                            setResult(null);
                                        }}
                                    >
                                        <Text style={styles.secondaryActionText}>Choose Another</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.primaryAction}
                                        onPress={() => {
                                            if (imageBase64) {
                                                analyzeImage(imageBase64);
                                            }
                                        }}
                                    >
                                        <Text style={styles.primaryActionText}>Retry Analysis</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {result && !isLoading && (
                            <ScrollView style={styles.resultSheet} contentContainerStyle={styles.resultSheetContent}>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                        backgroundColor: 'rgba(251,191,36,0.10)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(251,191,36,0.30)',
                                        borderRadius: 10,
                                        padding: 10,
                                        marginBottom: 14,
                                    }}
                                >
                                    <AlertCircle size={14} color="#fbbf24" style={{ marginTop: 2 }} />
                                    <Text style={{ flex: 1, color: '#94a3b8', fontSize: 12, lineHeight: 17 }}>
                                        AI estimates — verify calories with packaging. Not medical or dietary advice.
                                        Adjust portion size if the detected food differs from what you ate.
                                    </Text>
                                </View>

                                <View style={styles.resultTopRow}>
                                    <View style={styles.rowPillWrap}>
                                        <Text style={styles.metaLabel}>Confidence</Text>
                                        <View
                                            style={[
                                                styles.metaPill,
                                                { backgroundColor: confidenceTone.backgroundColor },
                                            ]}
                                        >
                                            <Text style={[styles.metaPillText, { color: confidenceTone.color }]}>
                                                {Math.round(result.confidence * 100)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.metaPill, styles.sourcePill]}>
                                        <Text style={styles.sourceText}>
                                            {result.source === 'database'
                                                ? 'Database'
                                                : result.source === 'api'
                                                  ? 'USDA'
                                                  : 'Estimate'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.matchBadge}>
                                    <Check size={13} color={COLORS.primary} />
                                    <Text style={styles.matchBadgeText}>Match Found</Text>
                                </View>

                                <Text style={styles.detectedLabel}>Detected</Text>
                                <Text style={styles.detectedName}>{result.name}</Text>

                                {(result.needsUserConfirmation || result.source === 'estimate') && (
                                    <View style={styles.warningBanner}>
                                        <AlertCircle size={16} color="#fbbf24" />
                                        <Text style={styles.warningText}>
                                            {result.source === 'estimate'
                                                ? 'Using estimated nutrition - verify before logging'
                                                : 'Low confidence - please review nutrition data'}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.calorieRow}>
                                    <View>
                                        <Text style={styles.metaLabel}>Estimated Calories</Text>
                                        <Text style={styles.calorieValue}>
                                            {Math.round(result.calories * portionMultiplier)}{' '}
                                            <Text style={styles.kcalUnit}>kcal</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.portionBlock}>
                                    <Text style={styles.portionLabel}>Portion Size</Text>
                                    <View style={styles.portionOptionsRow}>
                                        {[0.5, 1, 1.5, 2].map((multiplier) => {
                                            const active = portionMultiplier === multiplier;
                                            return (
                                                <TouchableOpacity
                                                    key={multiplier}
                                                    onPress={() => setPortionMultiplier(multiplier)}
                                                    style={[styles.portionOption, active && styles.portionOptionActive]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.portionOptionText,
                                                            active && styles.portionOptionTextActive,
                                                        ]}
                                                    >
                                                        {multiplier}x
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View style={styles.nutritionRow}>
                                    {nutritionCards.map((card) => (
                                        <View key={card.label} style={styles.nutritionCard}>
                                            <Text style={styles.nutritionLabel}>{card.label}</Text>
                                            <Text style={styles.nutritionValue}>
                                                {card.value}
                                                {card.unit}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.footerActions}>
                                    <TouchableOpacity
                                        style={styles.takeNewPhotoButton}
                                        onPress={() => {
                                            setImage(null);
                                            setImageBase64(null);
                                            setResult(null);
                                            setAnalysisError(null);
                                            setPortionMultiplier(1);
                                        }}
                                    >
                                        <Text style={styles.takeNewPhotoText}>Take New Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.logMealButton} onPress={handleSave}>
                                        <Check size={18} color={COLORS.bgDark} />
                                        <Text style={styles.logMealText}>Log This Meal</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyStateWrap}>
                        <View style={styles.emptyIconCircle}>
                            <Camera size={40} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyStateText}>
                            Take a photo of your meal and let AI analyze the nutrition facts for you.
                        </Text>
                        <View style={styles.emptyActionsRow}>
                            <TouchableOpacity style={styles.emptyActionButton} onPress={captureImage}>
                                <Text style={styles.emptyActionText}>Take Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.emptySecondaryButton} onPress={pickImage}>
                                <Text style={styles.emptySecondaryText}>Select Photo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerSpacer: {
        width: 40,
        height: 40,
    },
    headerTitle: {
        color: COLORS.textMain,
        fontSize: 18,
        fontWeight: '800',
    },
    headerCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30,41,59,0.72)',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    contentWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageStage: {
        position: 'relative',
        width: '100%',
        height: '100%',
    },
    imagePreview: {
        width: '100%',
        height: '74%',
        backgroundColor: COLORS.panelDark,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,34,28,0.6)',
    },
    loadingText: {
        marginTop: 14,
        color: COLORS.textMain,
        fontWeight: '700',
    },
    errorSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardDark,
        padding: 20,
        gap: 12,
    },
    errorBanner: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.4)',
        backgroundColor: 'rgba(127,29,29,0.3)',
        padding: 12,
    },
    errorTitle: {
        marginBottom: 4,
        color: '#fecaca',
        fontSize: 12,
        fontWeight: '700',
    },
    errorMessage: {
        color: '#fca5a5',
        fontSize: 12,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryAction: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'transparent',
        paddingVertical: 12,
    },
    secondaryActionText: {
        color: COLORS.textMain,
        fontWeight: '700',
    },
    primaryAction: {
        flex: 2,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
    },
    primaryActionText: {
        color: COLORS.bgDark,
        fontWeight: '800',
    },
    resultSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: COLORS.cardDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    resultSheetContent: {
        padding: 20,
        paddingBottom: 24,
    },
    resultTopRow: {
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowPillWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaLabel: {
        color: COLORS.textSecondary,
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    metaPill: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    metaPillText: {
        fontSize: 11,
        fontWeight: '800',
    },
    sourcePill: {
        backgroundColor: 'rgba(51,65,85,0.85)',
    },
    sourceText: {
        color: COLORS.textMain,
        fontSize: 11,
        fontWeight: '700',
    },
    matchBadge: {
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 8,
        backgroundColor: 'rgba(16,183,127,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 4,
    },
    matchBadgeText: {
        color: COLORS.primary,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detectedLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    detectedName: {
        marginBottom: 10,
        color: COLORS.textMain,
        fontSize: 24,
        fontWeight: '800',
    },
    warningBanner: {
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.45)',
        backgroundColor: 'rgba(120,53,15,0.3)',
        padding: 10,
        gap: 8,
    },
    warningText: {
        flex: 1,
        color: '#fde68a',
        fontSize: 12,
    },
    calorieRow: {
        marginBottom: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 12,
    },
    calorieValue: {
        marginTop: 4,
        color: COLORS.primary,
        fontSize: 34,
        fontWeight: '800',
        lineHeight: 38,
    },
    kcalUnit: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    portionBlock: {
        marginBottom: 12,
    },
    portionLabel: {
        marginBottom: 8,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    portionOptionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    portionOption: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.panelDark,
        paddingVertical: 10,
        alignItems: 'center',
    },
    portionOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(16,183,127,0.16)',
    },
    portionOptionText: {
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    portionOptionTextActive: {
        color: COLORS.primary,
    },
    nutritionRow: {
        marginBottom: 14,
        flexDirection: 'row',
        gap: 8,
    },
    nutritionCard: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(51,65,85,0.9)',
        backgroundColor: 'rgba(15,23,42,0.5)',
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    nutritionLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    nutritionValue: {
        marginTop: 3,
        color: COLORS.textMain,
        fontSize: 18,
        fontWeight: '800',
    },
    footerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    takeNewPhotoButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'transparent',
        paddingVertical: 13,
    },
    takeNewPhotoText: {
        color: COLORS.textMain,
        fontWeight: '700',
    },
    logMealButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        paddingVertical: 13,
        gap: 8,
    },
    logMealText: {
        color: COLORS.bgDark,
        fontWeight: '800',
    },
    emptyStateWrap: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyIconCircle: {
        marginBottom: 20,
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.cardDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyStateText: {
        marginBottom: 24,
        textAlign: 'center',
        color: COLORS.textSecondary,
    },
    emptyActionsRow: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
    },
    emptyActionButton: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 999,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 13,
    },
    emptyActionText: {
        color: COLORS.bgDark,
        fontWeight: '800',
    },
    emptySecondaryButton: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardDark,
        paddingHorizontal: 20,
        paddingVertical: 13,
    },
    emptySecondaryText: {
        color: COLORS.textMain,
        fontWeight: '700',
    },
});

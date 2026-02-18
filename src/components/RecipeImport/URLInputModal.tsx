import React, { useEffect, useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface URLInputModalProps {
    visible: boolean;
    value: string;
    isLoading: boolean;
    errorMessage?: string | null;
    onChangeValue: (value: string) => void;
    onSubmit: () => void;
    onRetry?: () => void;
    onClose: () => void;
}

/**
 * Material-style bottom sheet for recipe URL input.
 */
export function URLInputModal({
    visible,
    value,
    isLoading,
    errorMessage,
    onChangeValue,
    onSubmit,
    onRetry,
    onClose,
}: URLInputModalProps) {
    const { t } = useTranslation();
    const translateY = useRef(new Animated.Value(420)).current;

    useEffect(() => {
        if (!visible) {
            translateY.setValue(420);
            return;
        }

        Animated.spring(translateY, {
            toValue: 0,
            tension: 70,
            friction: 12,
            useNativeDriver: true,
        }).start();
    }, [translateY, visible]);

    const canSubmit = useMemo(() => value.trim().length > 0 && !isLoading, [value, isLoading]);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 justify-end"
            >
                <Pressable
                    className="flex-1 bg-black/45"
                    onPress={() => {
                        if (!isLoading) {
                            onClose();
                        }
                    }}
                />

                <Animated.View
                    style={{ transform: [{ translateY }] }}
                    className="bg-white rounded-t-3xl px-6 pt-6 pb-8"
                >
                    <View className="w-12 h-1.5 rounded-full bg-neutral-200 self-center mb-5" />

                    <Text className="text-xl font-bold text-neutral-900 mb-2">
                        {t('recipeImport.urlModal.title')}
                    </Text>
                    <Text className="text-neutral-500 mb-4">
                        {t('recipeImport.urlModal.subtitle')}
                    </Text>

                    <View className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 mb-3">
                        <TextInput
                            value={value}
                            onChangeText={onChangeValue}
                            editable={!isLoading}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            placeholder={t('recipeImport.urlModal.placeholder')}
                            placeholderTextColor="#a3a3a3"
                            className="text-base text-neutral-900"
                        />
                    </View>

                    {!!errorMessage && (
                        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                            <Text className="text-red-600 text-sm">{errorMessage}</Text>
                            {!!onRetry && (
                                <Pressable onPress={onRetry} className="mt-2 self-start">
                                    <Text className="text-red-700 font-semibold">
                                        {t('recipeImport.actions.retry')}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    <View className="flex-row gap-3">
                        <Pressable
                            disabled={isLoading}
                            className={`flex-1 rounded-xl py-3 items-center border ${
                                isLoading ? 'border-neutral-200 bg-neutral-100' : 'border-neutral-300 bg-white'
                            }`}
                            onPress={onClose}
                        >
                            <Text className="font-semibold text-neutral-700">
                                {t('recipeImport.actions.cancel')}
                            </Text>
                        </Pressable>

                        <Pressable
                            disabled={!canSubmit}
                            className={`flex-[1.3] rounded-xl py-3 items-center ${
                                canSubmit ? 'bg-primary-500' : 'bg-primary-300'
                            }`}
                            onPress={onSubmit}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="font-bold text-white">
                                    {t('recipeImport.actions.import')}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default URLInputModal;
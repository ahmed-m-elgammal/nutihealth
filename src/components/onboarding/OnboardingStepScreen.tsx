import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { ScreenLayout } from '../layout/ScreenLayout';
import { Button } from '../ui/Button';
import { Body, Heading, Subheading } from '../ui/Typography';
import { triggerHaptic } from '../../utils/haptics';
import { useOnboardingStore } from '../../store/onboardingStore';
import { cn } from '../../utils/cn';

interface OnboardingStepScreenProps {
    stepLabel?: string;
    currentStep?: number;
    totalSteps?: number;
    title: string;
    description: string;
    actionLabel: string;
    onActionPress: () => void;
    onBackPress?: () => void;
    actionDisabled?: boolean;
    actionLoading?: boolean;
    children: React.ReactNode;
    contentClassName?: string;
}

export function OnboardingStepScreen({
    stepLabel,
    currentStep,
    totalSteps,
    title,
    description,
    actionLabel,
    onActionPress,
    onBackPress,
    actionDisabled = false,
    actionLoading = false,
    children,
    contentClassName,
}: OnboardingStepScreenProps) {
    const storeCurrentStep = useOnboardingStore((state) => state.currentStep);
    const storeTotalSteps = useOnboardingStore((state) => state.totalSteps);
    const resolvedCurrentStep = currentStep ?? storeCurrentStep;
    const resolvedTotalSteps = totalSteps ?? storeTotalSteps;
    const progressPercent = Math.min(1, Math.max(0, resolvedCurrentStep / Math.max(1, resolvedTotalSteps)));
    const animatedProgress = useRef(new Animated.Value(progressPercent)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: progressPercent,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [animatedProgress, progressPercent]);

    const handleActionPress = () => {
        triggerHaptic('light').catch(() => undefined);
        onActionPress();
    };

    return (
        <ScreenLayout className="bg-background" edges={['top']} noPadding>
            <View className="border-b border-border px-6 py-4">
                <View className="flex-row items-center">
                    {onBackPress ? (
                        <TouchableOpacity
                            onPress={onBackPress}
                            className="-ml-2 h-10 w-10 items-center justify-center"
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                            activeOpacity={0.7}
                        >
                            <ChevronLeft size={24} className="text-foreground" />
                        </TouchableOpacity>
                    ) : (
                        <View className="w-10" />
                    )}

                    <View className="flex-1 px-4">
                        <Subheading className="text-center text-base">
                            {stepLabel || `Step ${resolvedCurrentStep} of ${resolvedTotalSteps}`}
                        </Subheading>
                        <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                            <Animated.View
                                style={{
                                    height: '100%',
                                    width: animatedProgress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                }}
                                className="rounded-full bg-primary"
                            />
                        </View>
                    </View>

                    <View className="w-10" />
                </View>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <Heading className="mb-2">{title}</Heading>
                <Body className="mb-6 text-muted-foreground">{description}</Body>

                <View className={cn('gap-4', contentClassName)}>{children}</View>
            </ScrollView>

            <View className="border-t border-border bg-background px-6 py-4">
                <Button
                    size="lg"
                    onPress={handleActionPress}
                    disabled={actionDisabled}
                    loading={actionLoading}
                    className="w-full"
                >
                    {actionLabel}
                </Button>
            </View>
        </ScreenLayout>
    );
}

export default OnboardingStepScreen;

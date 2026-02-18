import React, { useEffect, useMemo, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Ruler, Weight } from 'lucide-react-native';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Heading, Body } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export default function CompleteProfileModal() {
    const router = useRouter();
    const params = useLocalSearchParams<{ next?: string }>();
    const { user, isLoading } = useCurrentUser();

    const nextRoute = useMemo(() => {
        if (!params.next || typeof params.next !== 'string') return null;
        try {
            return decodeURIComponent(params.next);
        } catch {
            return params.next;
        }
    }, [params.next]);

    const [height, setHeight] = useState(user?.height && user.height > 0 ? String(user.height) : '');
    const [weight, setWeight] = useState(user?.weight && user.weight > 0 ? String(user.weight) : '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setHeight(user.height && user.height > 0 ? String(user.height) : '');
        setWeight(user.weight && user.weight > 0 ? String(user.weight) : '');
    }, [user?.id]);

    const handleSave = async () => {
        const parsedHeight = parseFloat(height);
        const parsedWeight = parseFloat(weight);

        if (!parsedHeight || parsedHeight < 100 || parsedHeight > 250) {
            Alert.alert('Invalid height', 'Enter a valid height between 100 and 250 cm.');
            return;
        }

        if (!parsedWeight || parsedWeight < 30 || parsedWeight > 300) {
            Alert.alert('Invalid weight', 'Enter a valid weight between 30 and 300 kg.');
            return;
        }

        if (!user) {
            Alert.alert('Profile unavailable', 'Please restart onboarding.');
            return;
        }

        setIsSaving(true);
        try {
            await user.updateProfile({
                height: parsedHeight,
                weight: parsedWeight,
                preferences: {
                    ...user.preferences,
                    needsBodyMetrics: false,
                },
            });

            if (nextRoute) {
                router.replace(nextRoute as any);
            } else {
                router.back();
            }
        } catch (error) {
            Alert.alert('Update failed', (error as Error).message || 'Please try again.');
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <ScreenLayout className="bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#10b981" />
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout className="bg-background" edges={['top']}>
            <View className="flex-row items-center mb-6">
                <Button variant="ghost" size="icon" onPress={() => router.back()} className="-ml-2 mr-2">
                    <ChevronLeft size={24} className="text-foreground" />
                </Button>
                <View className="flex-1">
                    <Heading>Add Body Metrics</Heading>
                    <Body className="text-muted-foreground mt-1">
                        Add height and weight to personalize meal and workout targets.
                    </Body>
                </View>
            </View>

            <View className="space-y-5">
                <View className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                        placeholder="e.g. 175"
                        keyboardType="numeric"
                        value={height}
                        onChangeText={setHeight}
                        icon={<Ruler size={18} className="text-muted-foreground" />}
                    />
                </View>

                <View className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                        placeholder="e.g. 72"
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                        icon={<Weight size={18} className="text-muted-foreground" />}
                    />
                </View>
            </View>

            <View className="mt-8">
                <Button size="lg" onPress={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? 'Saving...' : 'Save and Continue'}
                </Button>
            </View>
        </ScreenLayout>
    );
}

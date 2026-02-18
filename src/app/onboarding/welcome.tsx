import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Droplet, Sparkles, Target } from 'lucide-react-native';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { Body, Heading, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <ScreenLayout className="bg-background" edges={['top']} noPadding>
            <View className="flex-1 px-6 pb-6 pt-10">
                <View className="items-center">
                    <View className="mb-6 rounded-full bg-primary/15 p-5">
                        <Sparkles size={48} className="text-primary" />
                    </View>

                    <Heading className="text-center">Welcome to NutriHealth</Heading>
                    <Body className="mt-3 text-center text-muted-foreground">
                        Personalized nutrition, hydration, and fitness targets built around your goals.
                    </Body>
                </View>

                <Card className="mt-8 border-border bg-card">
                    <CardContent className="gap-4 p-5">
                        <View className="flex-row items-center">
                            <View className="mr-3 rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
                                <Target size={18} className="text-emerald-600" />
                            </View>
                            <View className="flex-1">
                                <Subheading className="text-base">Goal-based nutrition</Subheading>
                                <Body className="text-sm text-muted-foreground">Calories and macros tailored to you.</Body>
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View className="mr-3 rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                                <Droplet size={18} className="text-blue-600" />
                            </View>
                            <View className="flex-1">
                                <Subheading className="text-base">Adaptive hydration</Subheading>
                                <Body className="text-sm text-muted-foreground">Water goals based on weight and activity.</Body>
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View className="mr-3 rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
                                <Activity size={18} className="text-orange-600" />
                            </View>
                            <View className="flex-1">
                                <Subheading className="text-base">Progress tracking</Subheading>
                                <Body className="text-sm text-muted-foreground">Stay consistent with simple daily tracking.</Body>
                            </View>
                        </View>
                    </CardContent>
                </Card>

                <View className="mt-auto pt-8">
                    <Body className="mb-3 text-center text-sm text-muted-foreground">
                        Setup takes about 1 minute.
                    </Body>
                    <Button
                        size="lg"
                        className="w-full"
                        onPress={() => router.push('/onboarding/personal-info')}
                    >
                        Get Started
                    </Button>
                </View>
            </View>
        </ScreenLayout>
    );
}

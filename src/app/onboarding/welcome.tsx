import React, { useState } from 'react';
import { Linking, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Droplet, Sparkles, Target } from 'lucide-react-native';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { Body, Heading, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { storage } from '../../utils/storage-adapter';

export default function WelcomeScreen() {
    const router = useRouter();
    const [consentGiven, setConsentGiven] = useState(false);

    return (
        <ScreenLayout className="bg-background" edges={['top', 'bottom']} noPadding>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
                <View className="flex-1 px-6 pb-8 pt-12">
                    <View className="mt-8 items-center">
                        <View className="mb-8 rounded-full border border-primary/30 bg-primary/20 p-6 shadow-sm shadow-primary/20">
                            <Sparkles size={56} className="text-primary" strokeWidth={1.5} />
                        </View>

                        <Heading className="text-center font-display text-4xl">
                            Welcome to
                            <Heading className="font-display text-4xl text-primary"> NutriHealth</Heading>
                        </Heading>
                        <Body className="mt-4 px-4 text-center text-base text-muted-foreground">
                            Personalized nutrition, hydration, and fitness targets built around your unique goals.
                        </Body>
                    </View>

                    <View className="mt-12 gap-4">
                        <Card className="overflow-hidden border-border/50 bg-card/80">
                            <CardContent className="flex-row items-center p-4">
                                <View className="mr-4 rounded-xl bg-emerald-500/10 p-3">
                                    <Target size={24} className="text-emerald-500" strokeWidth={2} />
                                </View>
                                <View className="flex-1">
                                    <Subheading className="text-lg">Goal-based nutrition</Subheading>
                                    <Body className="text-sm text-muted-foreground">
                                        Calories and macros tailored to you.
                                    </Body>
                                </View>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-border/50 bg-card/80">
                            <CardContent className="flex-row items-center p-4">
                                <View className="mr-4 rounded-xl bg-blue-500/10 p-3">
                                    <Droplet size={24} className="text-blue-500" strokeWidth={2} />
                                </View>
                                <View className="flex-1">
                                    <Subheading className="text-lg">Adaptive hydration</Subheading>
                                    <Body className="text-sm text-muted-foreground">
                                        Water goals based on weight and activity.
                                    </Body>
                                </View>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-border/50 bg-card/80">
                            <CardContent className="flex-row items-center p-4">
                                <View className="mr-4 rounded-xl bg-orange-500/10 p-3">
                                    <Activity size={24} className="text-orange-500" strokeWidth={2} />
                                </View>
                                <View className="flex-1">
                                    <Subheading className="text-lg">Progress tracking</Subheading>
                                    <Body className="text-sm text-muted-foreground">
                                        Stay consistent with simple daily tracking.
                                    </Body>
                                </View>
                            </CardContent>
                        </Card>
                    </View>

                    <View className="mt-auto pt-10">
                        <Body className="mb-4 text-center text-sm font-medium text-muted-foreground">
                            Setup takes about 1 minute.
                        </Body>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                marginBottom: 16,
                                paddingHorizontal: 4,
                            }}
                        >
                            <Checkbox
                                value={consentGiven}
                                onValueChange={setConsentGiven}
                                accessibilityLabel="I agree to the Privacy Policy"
                            />
                            <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: '#94a3b8' }}>
                                I have read and agree to the{' '}
                                <Text
                                    style={{ color: '#10b981', textDecorationLine: 'underline' }}
                                    onPress={() => Linking.openURL('https://nutrihealth.app/privacy')}
                                >
                                    Privacy Policy
                                </Text>
                                . I understand my health data will be stored on this device.
                            </Text>
                        </View>
                        <Button
                            size="lg"
                            className="h-14 w-full rounded-full text-lg shadow-md shadow-primary/20"
                            disabled={!consentGiven}
                            onPress={async () => {
                                await storage.setItem(
                                    'gdpr_consent_v1',
                                    JSON.stringify({
                                        givenAt: new Date().toISOString(),
                                        version: 1,
                                    }),
                                );
                                router.push('/onboarding/personal-info');
                            }}
                        >
                            Get Started
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}

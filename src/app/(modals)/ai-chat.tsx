import React, { useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Send, Bot, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useActiveDiet } from '../../query/queries/useDiets';
import { useDailyTotals } from '../../hooks/useDailyTotals';
import { useAIChat, type UIChatMessage } from '../../hooks/useAIChat';
import { usePostHog } from 'posthog-react-native';
import { config } from '../../constants/config';

export default function AIChatModal() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const { dailyTotals } = useDailyTotals(new Date(), user?.id);
    const { data: activeUserDiet } = useActiveDiet(user?.id);
    const posthog = usePostHog();

    const scrollViewRef = useRef<ScrollView>(null);
    const {
        messages,
        setMessages,
        inputText,
        setInputText,
        isLoading,
        createMessage,
        handleSend: originalHandleSend,
        sendQuickAction,
        chatError,
    } = useAIChat([]);

    const handleSend = useCallback(() => {
        if (inputText.trim()) {
            posthog.capture('ai_coach_message_sent', {
                message_length: inputText.trim().length,
            });
        }
        originalHandleSend();
    }, [inputText, originalHandleSend, posthog]);

    // Build user context for AI
    const getUserContext = useCallback(() => {
        const activeDiet = activeUserDiet?.diet;
        const context = {
            name: user?.name || 'User',
            goal: user?.goal || 'general fitness',
            calorieTarget: user?.calorieTarget || activeDiet?.calorieTarget || 2000,
            proteinTarget: user?.proteinTarget || activeDiet?.proteinTarget || 150,
            carbsTarget: user?.carbsTarget || activeDiet?.carbsTarget || 200,
            fatsTarget: user?.fatsTarget || activeDiet?.fatsTarget || 65,
            currentStats: {
                calories: dailyTotals.calories,
                protein: dailyTotals.protein,
                carbs: dailyTotals.carbs,
                fats: dailyTotals.fats,
            },
            activeDiet: activeDiet
                ? {
                      name: activeDiet.name,
                      description: activeDiet.description,
                  }
                : null,
        };

        let contextString = `User Profile: ${context.name}, Goal: ${context.goal}.\n`;
        contextString += `Daily Targets: ${context.calorieTarget} cal, ${context.proteinTarget}g protein, ${context.carbsTarget}g carbs, ${context.fatsTarget}g fats.\n`;

        if (context.currentStats) {
            contextString += `Today's Progress: ${Math.round(context.currentStats.calories)} cal (${Math.round((context.currentStats.calories / context.calorieTarget) * 100)}%), `;
            contextString += `${Math.round(context.currentStats.protein)}g protein, ${Math.round(context.currentStats.carbs)}g carbs, ${Math.round(context.currentStats.fats)}g fats.\n`;
        }

        if (context.activeDiet) {
            contextString += `Active Diet: ${context.activeDiet.name} - ${context.activeDiet.description}\n`;
        }

        return contextString;
    }, [activeUserDiet, dailyTotals, user]);

    useEffect(() => {
        const initialMessages: UIChatMessage[] = [
            createMessage(
                'system',
                `You are an expert AI Nutrition Coach & Fitness Trainer. Here's your client's info:\n${getUserContext()}\nBe encouraging, specific, and practical. Reference their current progress when relevant.`,
            ),
            createMessage(
                'assistant',
                `Hi ${user?.name || 'there'}! 👋 I'm your AI Nutrition Coach. I can see you're${activeUserDiet?.diet ? ` following the ${activeUserDiet.diet.name}` : ' on a fitness journey'}. How can I help you today?`,
            ),
        ];

        // Initial greeting with context
        setMessages((previous) => {
            const hasUserMessages = previous.some((message) => message.role === 'user');
            if (hasUserMessages) {
                const nextMessages =
                    previous[0]?.role === 'system'
                        ? [initialMessages[0], ...previous.slice(1)]
                        : [initialMessages[0], ...previous];
                return nextMessages;
            }

            return initialMessages;
        });
    }, [user?.name, activeUserDiet, getUserContext, createMessage]);

    useEffect(() => {
        const timeoutId = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        return () => clearTimeout(timeoutId);
    }, [messages, isLoading]);

    if (!config.features.enableAI) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white p-6">
                <Text className="mb-3 text-lg font-bold text-neutral-900">AI feature unavailable</Text>
                <Text className="mb-4 text-center text-neutral-500">AI coach is disabled in this environment.</Text>
                <TouchableOpacity className="rounded-xl bg-neutral-900 px-4 py-3" onPress={() => router.back()}>
                    <Text className="font-semibold text-white">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="z-10 flex-row items-center justify-between border-b border-neutral-100 bg-white px-6 py-4">
                <View className="flex-row items-center gap-3">
                    <View className="rounded-full bg-primary-100 p-2">
                        <Bot size={24} color="#059669" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-neutral-900">AI Coach</Text>
                        <View className="flex-row items-center gap-1">
                            <View className="h-2 w-2 rounded-full bg-green-500" />
                            <Text className="text-xs text-neutral-500">Online</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-neutral-100 p-2">
                    <X size={20} color="#525252" />
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 bg-neutral-50 px-4 py-4"
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {chatError ? (
                    <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <Text className="text-sm font-semibold text-amber-900">Connection issue</Text>
                        <Text className="mt-1 text-sm text-amber-800">{chatError}</Text>
                    </View>
                ) : null}

                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        className={`mb-4 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-primary-600">
                                <Sparkles size={14} color="white" />
                            </View>
                        )}
                        <View
                            className={`max-w-[80%] rounded-2xl p-4 ${
                                msg.role === 'user'
                                    ? 'rounded-tr-none bg-neutral-900'
                                    : 'rounded-tl-none border border-neutral-200 bg-white shadow-sm'
                            }`}
                        >
                            <Text className={msg.role === 'user' ? 'text-white' : 'text-neutral-800'}>
                                {msg.content}
                            </Text>
                        </View>
                    </View>
                ))}

                {isLoading && (
                    <View className="mb-4 flex-row items-center justify-start">
                        <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-primary-600">
                            <Sparkles size={14} color="white" />
                        </View>
                        <View className="rounded-2xl rounded-tl-none border border-neutral-200 bg-white p-4 shadow-sm">
                            <ActivityIndicator size="small" color="#059669" />
                        </View>
                    </View>
                )}

                {__DEV__ && (
                    <View className="mt-4 border-t border-neutral-200 pt-4">
                        <Text className="mb-2 text-center text-xs text-neutral-400">API Connection Tests</Text>
                        <View className="flex-row justify-center gap-2">
                            <TouchableOpacity
                                testID="ai-chat-test-groq"
                                onPress={() =>
                                    sendQuickAction(
                                        "Test: Please respond with 'Groq API is working!' if you receive this.",
                                    )
                                }
                                className="rounded-full bg-purple-100 px-3 py-1"
                            >
                                <Text className="text-xs font-medium text-purple-700">Test Groq</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setMessages((prev) => [
                                        ...prev,
                                        createMessage(
                                            'assistant',
                                            'To test Hugging Face, please use the Food Detection feature (Camera).',
                                        ),
                                    ]);
                                }}
                                className="rounded-full bg-orange-100 px-3 py-1"
                            >
                                <Text className="text-xs font-medium text-orange-700">Test Hugging Face</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="border-t border-neutral-100 bg-white p-4"
            >
                <View className="flex-row items-center gap-3">
                    <TextInput
                        className="flex-1 rounded-full border border-neutral-200 bg-neutral-100 px-5 py-3 text-neutral-900"
                        placeholder="Ask for advice, recipes, or tips..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        testID="ai-chat-send"
                        onPress={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className={`h-12 w-12 items-center justify-center rounded-full ${
                            isLoading || !inputText.trim() ? 'bg-neutral-200' : 'bg-primary-600'
                        }`}
                    >
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

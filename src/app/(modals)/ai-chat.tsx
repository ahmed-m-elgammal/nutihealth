import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Send, Bot, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatWithCoach, ChatMessage } from '../../services/ai/groq';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';
import { useActiveDiet } from '../../query/queries/useDiets';

export default function AIChatModal() {
    const router = useRouter();
    const { user } = useUserStore();
    const { dailyTotals } = useMealStore();
    const { data: activeUserDiet } = useActiveDiet(user?.id);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Build user context for AI
    const getUserContext = () => {
        const activeDiet = activeUserDiet?.diet;
        const context = {
            name: user?.name || 'User',
            goal: user?.goal || 'general fitness',
            calorieTarget: user?.calorieTarget || activeDiet?.calorieTarget || 2000,
            proteinTarget: user?.proteinTarget || activeDiet?.proteinTarget || 150,
            carbsTarget: user?.carbsTarget || activeDiet?.carbsTarget || 200,
            fatsTarget: user?.fatsTarget || activeDiet?.fatsTarget || 65,
            currentStats: dailyTotals ? {
                calories: dailyTotals.calories,
                protein: dailyTotals.protein,
                carbs: dailyTotals.carbs,
                fats: dailyTotals.fats
            } : null,
            activeDiet: activeDiet ? {
                name: activeDiet.name,
                description: activeDiet.description
            } : null
        };

        let contextString = `User Profile: ${context.name}, Goal: ${context.goal}.\n`;
        contextString += `Daily Targets: ${context.calorieTarget} cal, ${context.proteinTarget}g protein, ${context.carbsTarget}g carbs, ${context.fatsTarget}g fats.\n`;

        if (context.currentStats) {
            contextString += `Today's Progress: ${Math.round(context.currentStats.calories)} cal (${Math.round(context.currentStats.calories / context.calorieTarget * 100)}%), `;
            contextString += `${Math.round(context.currentStats.protein)}g protein, ${Math.round(context.currentStats.carbs)}g carbs, ${Math.round(context.currentStats.fats)}g fats.\n`;
        }

        if (context.activeDiet) {
            contextString += `Active Diet: ${context.activeDiet.name} - ${context.activeDiet.description}\n`;
        }

        return contextString;
    };

    useEffect(() => {
        // Initial greeting with context
        const userContext = getUserContext();
        setMessages([
            {
                role: 'system',
                content: `You are an expert AI Nutrition Coach & Fitness Trainer. Here's your client's info:\n${userContext}\nBe encouraging, specific, and practical. Reference their current progress when relevant.`
            },
            {
                role: 'assistant',
                content: `Hi ${user?.name || 'there'}! 👋 I'm your AI Nutrition Coach. I can see you're${activeUserDiet?.diet ? ` following the ${activeUserDiet.diet.name}` : ' on a fitness journey'}. How can I help you today?`
            }
        ]);
    }, [user?.name]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: inputText.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Scroll to bottom
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const responseContent = await chatWithCoach([...messages, userMsg]);
            const botMsg: ChatMessage = { role: 'assistant', content: responseContent };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: ChatMessage = { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const sendQuickAction = async (prompt: string) => {
        setInputText(prompt);
        setTimeout(handleSend, 100);
    };


    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white z-10">
                <View className="flex-row items-center gap-3">
                    <View className="bg-primary-100 p-2 rounded-full">
                        <Bot size={24} color="#059669" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-neutral-900">AI Coach</Text>
                        <View className="flex-row items-center gap-1">
                            <View className="w-2 h-2 bg-green-500 rounded-full" />
                            <Text className="text-neutral-500 text-xs">Online</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.back()} className="bg-neutral-100 p-2 rounded-full">
                    <X size={20} color="#525252" />
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4 py-4 bg-neutral-50"
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {messages.map((msg, index) => (
                    <View
                        key={index}
                        className={`mb-4 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <View className="w-8 h-8 rounded-full bg-primary-600 items-center justify-center mr-2 mt-1">
                                <Sparkles size={14} color="white" />
                            </View>
                        )}
                        <View
                            className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                ? 'bg-neutral-900 rounded-tr-none'
                                : 'bg-white border border-neutral-200 rounded-tl-none shadow-sm'
                                }`}
                        >
                            <Text className={msg.role === 'user' ? 'text-white' : 'text-neutral-800'}>
                                {msg.content}
                            </Text>
                        </View>
                    </View>
                ))}

                {isLoading && (
                    <View className="flex-row justify-start mb-4 items-center">
                        <View className="w-8 h-8 rounded-full bg-primary-600 items-center justify-center mr-2">
                            <Sparkles size={14} color="white" />
                        </View>
                        <View className="bg-white border border-neutral-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                            <ActivityIndicator size="small" color="#059669" />
                        </View>
                    </View>
                )}

                {/* Debug / Test Section */}
                <View className="mt-4 pt-4 border-t border-neutral-200">
                    <Text className="text-xs text-neutral-400 text-center mb-2">API Connection Tests</Text>
                    <View className="flex-row justify-center gap-2">
                        <TouchableOpacity
                            onPress={() => sendQuickAction("Test: Please respond with 'Groq API is working!' if you receive this.")}
                            className="bg-purple-100 px-3 py-1 rounded-full"
                        >
                            <Text className="text-xs text-purple-700 font-medium">Test Groq</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setMessages(prev => [...prev, { role: 'assistant', content: "To test Hugging Face, please use the Food Detection feature (Camera)." }]);
                            }}
                            className="bg-orange-100 px-3 py-1 rounded-full"
                        >
                            <Text className="text-xs text-orange-700 font-medium">Test Hugging Face</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="border-t border-neutral-100 bg-white p-4"
            >
                <View className="flex-row items-center gap-3">
                    <TextInput
                        className="flex-1 bg-neutral-100 rounded-full px-5 py-3 text-neutral-900 border border-neutral-200"
                        placeholder="Ask for advice, recipes, or tips..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className={`w-12 h-12 rounded-full items-center justify-center ${isLoading || !inputText.trim() ? 'bg-neutral-200' : 'bg-primary-600'
                            }`}
                    >
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

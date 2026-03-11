import { useCallback, useEffect, useRef, useState } from 'react';
import { AIChatServiceError, chatWithCoach, type ChatMessage } from '../services/ai/groq';
import { handleError } from '../utils/errors';

export type UIChatMessage = ChatMessage & {
    id: string;
};

interface SendMessageOptions {
    clearInput?: boolean;
}

const MAX_HISTORY_PAIRS = 20;
const MAX_HISTORY_MESSAGES = MAX_HISTORY_PAIRS * 2;

export function useAIChat(initialMessages: UIChatMessage[] = []) {
    const [messages, setMessages] = useState<UIChatMessage[]>(initialMessages);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<UIChatMessage[]>(initialMessages);
    const isLoadingRef = useRef(false);
    const messageIdCounterRef = useRef(0);
    const [chatError, setChatError] = useState<string | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const createMessage = useCallback((role: ChatMessage['role'], content: string): UIChatMessage => {
        messageIdCounterRef.current += 1;
        return {
            id: `${Date.now()}-${messageIdCounterRef.current}`,
            role,
            content,
        };
    }, []);

    const buildChatRequestMessages = useCallback((currentMessages: UIChatMessage[]): ChatMessage[] => {
        const trimmedMessages = currentMessages.filter((message) => message.content?.trim());
        if (trimmedMessages.length === 0) {
            return [];
        }

        const systemIndex = trimmedMessages.findIndex((message) => message.role === 'system');
        const systemMessage = systemIndex >= 0 ? trimmedMessages[systemIndex] : null;
        const nonSystemMessages = trimmedMessages.filter((_, index) => index !== systemIndex);
        const recentMessages = nonSystemMessages.slice(-MAX_HISTORY_MESSAGES);
        const windowedMessages = systemMessage ? [systemMessage, ...recentMessages] : recentMessages;

        return windowedMessages.map(({ role, content }) => ({ role, content }));
    }, []);

    const sendMessage = useCallback(
        async (rawMessage: string, options: SendMessageOptions = { clearInput: true }) => {
            const trimmedMessage = rawMessage.trim();
            if (!trimmedMessage || isLoadingRef.current) {
                return;
            }

            setChatError(null);
            const userMsg = createMessage('user', trimmedMessage);
            setMessages((prev) => {
                const nextMessages = [...prev, userMsg];
                messagesRef.current = nextMessages;
                return nextMessages;
            });

            if (options.clearInput !== false) {
                setInputText('');
            }

            isLoadingRef.current = true;
            setIsLoading(true);

            try {
                const responseContent = await chatWithCoach(buildChatRequestMessages(messagesRef.current));
                const botMsg = createMessage('assistant', responseContent);
                setMessages((prev) => {
                    const nextMessages = [...prev, botMsg];
                    messagesRef.current = nextMessages;
                    return nextMessages;
                });
            } catch (error) {
                handleError(error, 'useAIChat.sendMessage');
                const message =
                    error instanceof AIChatServiceError
                        ? error.message
                        : "Something went wrong on our end. We've been notified and are looking into it.";
                setChatError(message);
            } finally {
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        },
        [buildChatRequestMessages, createMessage],
    );

    const handleSend = useCallback(async () => {
        await sendMessage(inputText, { clearInput: true });
    }, [inputText, sendMessage]);

    const sendQuickAction = useCallback(
        async (prompt: string) => {
            await sendMessage(prompt, { clearInput: false });
        },
        [sendMessage],
    );

    return {
        messages,
        setMessages,
        inputText,
        setInputText,
        isLoading,
        createMessage,
        handleSend,
        sendQuickAction,
        chatError,
    };
}

export default useAIChat;

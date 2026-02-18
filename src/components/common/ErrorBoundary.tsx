import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackTitle?: string;
    fallbackMessage?: string;
    retryLabel?: string;
    onRetry?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Reusable React error boundary for isolated screen recovery.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[ErrorBoundary] Caught render error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
        this.props.onRetry?.();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const {
            fallbackTitle = 'Something went wrong',
            fallbackMessage = 'An unexpected error occurred. You can retry this screen.',
            retryLabel = 'Try Again',
        } = this.props;

        return (
            <View className="flex-1 items-center justify-center bg-white p-6">
                <View className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-6">
                    <Text className="text-red-700 text-xl font-bold mb-2">{fallbackTitle}</Text>
                    <Text className="text-red-700/90 leading-6 mb-4">{fallbackMessage}</Text>
                    {!!this.state.error?.message && (
                        <Text className="text-red-600 text-xs mb-4">{this.state.error.message}</Text>
                    )}

                    <Pressable
                        onPress={this.handleRetry}
                        className="bg-red-600 rounded-xl py-3 items-center"
                    >
                        <Text className="text-white font-bold">{retryLabel}</Text>
                    </Pressable>
                </View>
            </View>
        );
    }
}

export default ErrorBoundary;
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface ScreenErrorBoundaryProps {
    children: React.ReactNode;
    screenName?: string;
    fallback?: React.ReactNode;
}

interface ScreenErrorBoundaryState {
    hasError: boolean;
}

export default class ScreenErrorBoundary extends React.Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
    constructor(props: ScreenErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ScreenErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[ScreenErrorBoundary]', this.props.screenName, error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        if (this.props.fallback) {
            return this.props.fallback;
        }

        return (
            <View className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <Text className="text-lg font-semibold text-red-700">
                    Failed to load {this.props.screenName ?? 'screen'}
                </Text>
                <Pressable className="mt-3 self-start rounded-lg bg-red-600 px-4 py-2" onPress={this.handleRetry}>
                    <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }
}

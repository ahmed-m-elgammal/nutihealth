import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export interface RootErrorBoundaryProps {
    children: React.ReactNode;
    onRetry?: () => void;
    onClearCache?: () => void;
    supportEmail?: string;
}

interface RootErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
    constructor(props: RootErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[RootErrorBoundary]', error, errorInfo);
    }

    private handleRetry = () => {
        this.props.onRetry?.();
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View className="flex-1 items-center justify-center bg-background px-6">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle size={30} color="#dc2626" />
                </View>
                <Text className="text-center text-2xl font-bold text-foreground">Something went wrong</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    An unexpected error occurred. Please try again.
                </Text>

                <Pressable className="mt-6 w-full rounded-xl bg-primary py-3" onPress={this.handleRetry}>
                    <Text className="text-center font-semibold text-primary-foreground">Try Again</Text>
                </Pressable>

                {this.props.onClearCache && (
                    <Pressable
                        className="mt-3 w-full rounded-xl border border-border bg-card py-3"
                        onPress={this.props.onClearCache}
                    >
                        <Text className="text-center font-semibold text-foreground">Clear App Data</Text>
                    </Pressable>
                )}

                {this.props.supportEmail && (
                    <Text
                        className="mt-4 text-center text-sm text-primary underline"
                        onPress={() => void Linking.openURL(`mailto:${this.props.supportEmail}`)}
                    >
                        {this.props.supportEmail}
                    </Text>
                )}

                {__DEV__ && this.state.error && (
                    <ScrollView className="mt-6 max-h-52 w-full rounded-xl bg-card p-3">
                        <Text className="font-mono text-xs text-red-500">{this.state.error.message}</Text>
                        <Text className="mt-2 font-mono text-[11px] text-muted-foreground">
                            {this.state.error.stack}
                        </Text>
                    </ScrollView>
                )}
            </View>
        );
    }
}

import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Page Not Found' }} />
            <View className="flex-1 items-center justify-center bg-background p-6">
                <AlertCircle size={64} className="mb-4 text-muted-foreground" />
                <Text className="mb-2 text-2xl font-bold text-foreground">Page Not Found</Text>
                <Text className="mb-8 text-center text-muted-foreground">
                    The screen you're looking for doesn't exist.
                </Text>
                <Link href="/(tabs)" className="text-lg font-semibold text-primary">
                    Go to Home →
                </Link>
            </View>
        </>
    );
}

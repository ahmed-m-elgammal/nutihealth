import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
    // The _layout.tsx handles all routing logic based on auth state.
    // This component is just a placeholder while the root layout decides where to go.

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={{ marginTop: 20, color: 'gray' }}>Initializing...</Text>
        </View>
    );
}

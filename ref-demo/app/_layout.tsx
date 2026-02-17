import 'react-native-gesture-handler';
import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContext } from '@/context/AppContext';

const linking = {
  prefixes: ['https://ref.app', 'ref://'],
  config: {
    screens: {
      'invite-accept': 'invite/:userId',
    },
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
            linking={linking}
          >
            <Stack.Screen name="auth/login" options={{ title: 'Sign In', headerShown: true }} />
            <Stack.Screen name="auth/register" options={{ title: 'Create Account', headerShown: true }} />
            <Stack.Screen name="push" options={{ title: 'Match Friends', headerShown: true }} />
            <Stack.Screen name="pull" options={{ title: 'Request Match', headerShown: true }} />
            <Stack.Screen name="discover" options={{ title: 'Discover', headerShown: true }} />
            <Stack.Screen name="matches" options={{ title: 'Matches', headerShown: true }} />
            <Stack.Screen name="invite" options={{ title: 'Invite Friends', headerShown: true }} />
            <Stack.Screen name="invite-accept" options={{ title: 'Join Ref', headerShown: true }} />
            <Stack.Screen name="friends" options={{ title: 'Friends', headerShown: true }} />
            <Stack.Screen name="friend-detail" options={{ title: 'Friend', headerShown: true }} />
          </Stack>
        </AppContext>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

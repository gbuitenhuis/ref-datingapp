import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { AppContext } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';

const linking = {
  prefixes: ['https://ref.app', 'ref://'],
  config: {
    screens: {
      'invite-accept': 'invite/:userId',
    },
  },
};

export default function RootLayout() {
  useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext>
          <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              headerBackVisible: false,
              headerTitle: '',
            }}
            linking={linking}
          >
            <Stack.Screen
              name="auth/login"
              options={{ title: 'Sign In', headerShown: true, headerLeft: () => null }}
            />
            <Stack.Screen
              name="auth/register"
              options={{ title: 'Create Account', headerShown: true, headerLeft: () => null }}
            />
            <Stack.Screen
              name="onboarding/welcome"
              options={{ title: 'Complete Profile', headerShown: true, headerLeft: () => null }}
            />
            <Stack.Screen name="push" options={{ title: 'Introduce', headerShown: false }} />
            <Stack.Screen name="pull" options={{ title: 'Get Introduced', headerShown: false }} />
            <Stack.Screen name="discover" options={{ title: 'Discover', headerShown: false }} />
            <Stack.Screen name="matches" options={{ title: 'Matches', headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
            <Stack.Screen name="inbox" options={{ title: 'For You', headerShown: false }} />
            <Stack.Screen name="invite" options={{ title: 'Invite Friends', headerShown: false }} />
            <Stack.Screen
              name="invite-accept"
              options={{ title: 'Join Ref', headerShown: true, headerLeft: () => null }}
            />
            <Stack.Screen name="friends" options={{ title: 'Friends', headerShown: false }} />
            <Stack.Screen name="friend-detail" options={{ title: 'Friend', headerShown: false }} />
            <Stack.Screen name="chat" options={{ title: 'Chat', headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
          </Stack>
          </ToastProvider>
        </AppContext>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function IndexScreen() {
  const router = useRouter();
  const { isOnboarded, isAuthLoading, currentUser } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || isAuthLoading) return;
    if (currentUser) {
      router.replace(!isOnboarded ? '/onboarding/welcome' : '/home');
    }
  }, [isOnboarded, isAuthLoading, currentUser, ready, router]);

  if (isAuthLoading || !ready || currentUser) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Wordmark */}
      <View style={styles.top}>
        <Text style={styles.wordmark}>Ref.</Text>
      </View>

      {/* Hero */}
      <View style={styles.middle}>
        <Text style={styles.headline}>Meet through{'\n'}someone you trust.</Text>
        <Text style={styles.sub}>
          Ref is a private introduction network.{'\n'}Your friends know who could be right for you.
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.bottom}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/register')}>
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.ghostButtonText}>I already have an account</Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 28,
  },

  top: {
    paddingTop: 20,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.brand,
  },

  middle: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  headline: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 46,
  },
  sub: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 25,
  },

  bottom: {
    paddingBottom: 28,
    gap: 10,
  },
  primaryButton: {
    height: 56,
    backgroundColor: Colors.brand,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  ghostButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';
import { Input } from '@/components/ui/Input';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteUserId?: string | string[] }>();
  const { login, sendPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const inviteUserId = Array.isArray(params.inviteUserId)
    ? params.inviteUserId[0]
    : params.inviteUserId;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result) {
        if (inviteUserId) {
          router.replace(
            result.isOnboarded
              ? { pathname: '/invite-accept', params: { userId: inviteUserId } }
              : { pathname: '/onboarding/welcome', params: { inviteUserId } },
          );
        } else {
          router.replace(result.isOnboarded ? '/home' : '/onboarding/welcome');
        }
      } else {
        Alert.alert('Sign in failed', 'Check your email and password and try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.prompt(
        'Forgot password',
        'Enter your email address and we\'ll send you a reset link.',
        async (enteredEmail) => {
          if (!enteredEmail?.trim()) return;
          await sendPasswordReset(enteredEmail.trim().toLowerCase());
          Alert.alert('Reset link sent', 'Check your email for a password reset link.');
        },
        'plain-text',
        '',
        'email-address',
      );
      return;
    }
    Alert.alert(
      'Forgot password',
      `We'll send a reset link to ${email.trim().toLowerCase()}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            await sendPasswordReset(email.trim().toLowerCase());
            Alert.alert('Reset link sent', 'Check your email for a password reset link.');
          },
        },
      ],
    );
  };

  const goToRegister = () => {
    if (inviteUserId) {
      router.push({ pathname: '/auth/register', params: { inviteUserId } });
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />
            <Pressable style={styles.forgotWrap} onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account yet? </Text>
            <Pressable onPress={goToRegister} disabled={loading} style={styles.footerLink}>
              <Text style={styles.link}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 6 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: { gap: 16 },
  forgotWrap: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 4 },
  forgotText: { fontSize: 13, fontWeight: '600', color: Colors.brand },
  primaryButton: {
    height: 56,
    backgroundColor: Colors.brand,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { paddingVertical: 12, paddingHorizontal: 4 },
  link: { fontSize: 14, color: Colors.brand, fontWeight: '700' },
});

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteUserId?: string | string[] }>();
  const { register } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inviteUserId = Array.isArray(params.inviteUserId)
    ? params.inviteUserId[0]
    : params.inviteUserId;

  const isFormComplete = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password],
  );

  const handleRegister = async () => {
    setError('');
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();
    if (!trimEmail || !trimPass) {
      setError('Please fill in your email and password.');
      return;
    }
    if (trimPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(trimEmail, trimPass);
      if (result) {
        router.replace(
          inviteUserId
            ? { pathname: '/onboarding/welcome', params: { inviteUserId } }
            : '/onboarding/welcome',
        );
        return;
      }
      setError('Could not create account. This email may already be registered.');
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    if (inviteUserId) {
      router.push({ pathname: '/auth/login', params: { inviteUserId } });
    } else {
      router.push('/auth/login');
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
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Join through a trusted mutual connection.
            </Text>
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!loading}
              error={error}
            />
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              (!isFormComplete || loading) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={!isFormComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={goToLogin} disabled={loading} style={styles.footerLink}>
              <Text style={styles.link}>Sign in</Text>
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
  buttonDisabled: { opacity: 0.45 },
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

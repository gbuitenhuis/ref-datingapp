import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Heart, Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ref-backend.vercel.app';

export default function InviteAcceptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const { showToast } = useToast();
  const { currentUser, addFriendById, logout } = useApp();
  const [inviterProfile, setInviterProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const inviterId = useMemo(() => {
    const raw = params.userId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.userId]);

  const isSelfInvite = !!currentUser && !!inviterProfile && currentUser.id === inviterProfile.id;
  const currentUserLabel = currentUser?.name?.trim() || 'Your account';
  const currentUserStatus = currentUser?.relationshipStatus === 'not-single' ? 'Not single' : 'Single';

  useEffect(() => {
    const loadInviterProfile = async () => {
      if (!inviterId) { showToast('Invalid invite link', 'error'); router.replace('/'); return; }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/profiles/${inviterId}`);
        if (res.ok) {
          setInviterProfile(await res.json());
        } else {
          showToast('User not found', 'error');
          router.replace('/');
        }
      } catch {
        showToast('Failed to load profile', 'error');
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    void loadInviterProfile();
  }, [inviterId]);

  const handleAccept = async () => {
    if (!currentUser || !inviterProfile) return;
    if (isSelfInvite) { showToast('You cannot add yourself as a friend', 'info'); return; }
    setAccepting(true);
    try {
      await addFriendById(inviterProfile.id);
      router.replace({ pathname: '/home', params: { connected: inviterProfile.name || 'your friend' } });
    } catch {
      showToast('Failed to add friend — please try again', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    router.replace({
      pathname: '/auth/login',
      params: inviterProfile ? { inviteUserId: inviterProfile.id } : {},
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.centerText}>Loading invite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!inviterProfile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.centerText}>Invalid invite link</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = (name?: string) => name?.trim() || 'Someone';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>

        {/* Inviter hero */}
        <View style={styles.hero}>
          <Avatar photo={inviterProfile.photo} name={inviterProfile.name} userId={inviterProfile.id} size="2xl" ring />
          <Text style={styles.heroName}>
            {displayName(inviterProfile.name)}
            {inviterProfile.age ? `, ${inviterProfile.age}` : ''}
          </Text>
          <Text style={styles.heroInviteText}>
            invited you to join Ref
          </Text>
        </View>

        {/* Value prop */}
        <View style={styles.valueCard}>
          <View style={styles.valueRow}>
            <View style={[styles.valueIconWrap, { backgroundColor: Colors.brandLight }]}>
              <Heart size={16} color={Colors.brand} />
            </View>
            <Text style={styles.valueText}>Meet people through trusted mutual connections.</Text>
          </View>
          <View style={styles.valueRow}>
            <View style={[styles.valueIconWrap, { backgroundColor: '#EEF4FF' }]}>
              <Users size={16} color={Colors.accent} />
            </View>
            <Text style={styles.valueText}>Your friends know who could be right for you.</Text>
          </View>
        </View>

        {/* Signed-in account */}
        {currentUser ? (
          <View style={styles.accountCard}>
            <View style={styles.accountCardBody}>
              <Text style={styles.accountEyebrow}>Signed in as</Text>
              <Text style={styles.accountName}>{currentUserLabel}</Text>
              <Text style={styles.accountMeta}>{currentUserStatus}</Text>
            </View>
            <Pressable onPress={() => void handleSwitchAccount()}>
              <Text style={styles.switchText}>Switch account</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {currentUser ? (
            <Pressable
              style={[styles.acceptButton, (accepting || isSelfInvite) && styles.acceptButtonDisabled]}
              onPress={() => void handleAccept()}
              disabled={accepting || isSelfInvite}
            >
              {accepting
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Check size={18} color={Colors.white} />}
              <Text style={styles.acceptButtonText}>
                {isSelfInvite ? 'This is your invite link' : 'Accept invite'}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={styles.acceptButton}
                onPress={() => router.push({ pathname: '/auth/login', params: { inviteUserId: inviterProfile.id } })}
              >
                <Text style={styles.acceptButtonText}>Sign in to accept</Text>
              </Pressable>
              <Pressable
                style={styles.ghostButton}
                onPress={() => router.push({ pathname: '/auth/register', params: { inviteUserId: inviterProfile.id } })}
              >
                <Text style={styles.ghostButtonText}>
                  New to Ref? <Text style={styles.ghostButtonAccent}>Create an account</Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1, padding: 24,
    justifyContent: 'center', gap: 20,
    maxWidth: 480, width: '100%', alignSelf: 'center',
  },

  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  centerText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },

  hero: { alignItems: 'center', gap: 10 },
  heroName: { fontSize: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.3, textAlign: 'center' },
  heroInviteText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  valueCard: {
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, padding: 16, gap: 12,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  valueText: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },

  accountCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, padding: 14,
  },
  accountCardBody: { flex: 1, gap: 2 },
  accountEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.textSecondary },
  accountName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  accountMeta: { fontSize: 13, color: Colors.textSecondary },
  switchText: { fontSize: 13, fontWeight: '700', color: Colors.brand },

  actions: { gap: 10 },
  acceptButton: {
    height: 56, borderRadius: 14,
    backgroundColor: Colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.brand, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  acceptButtonDisabled: { opacity: 0.5 },
  acceptButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  ghostButton: { paddingVertical: 8, alignItems: 'center' },
  ghostButtonText: { fontSize: 14, color: Colors.textSecondary },
  ghostButtonAccent: { color: Colors.brand, fontWeight: '700' },
});

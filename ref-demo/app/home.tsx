import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bell,
  Heart,
  HelpCircle,
  Link,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { AppTabBar } from '@/components/AppTabBar';
import { Avatar } from '@/components/ui/Avatar';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ connected?: string | string[] }>();
  const { currentUser, logout, isAuthLoading } = useApp();

  const [menuVisible, setMenuVisible] = useState(false);
  const [whyRefVisible, setWhyRefVisible] = useState(false);
  const [profilePromptVisible, setProfilePromptVisible] = useState(false);

  const profileSnoozedKey = currentUser ? `@ref_profile_prompt_snoozed_${currentUser.id}` : null;

  useEffect(() => {
    if (!currentUser || !profileSnoozedKey) return;
    const isIncomplete = !currentUser.photo || !currentUser.bio;
    if (!isIncomplete) { setProfilePromptVisible(false); return; }
    AsyncStorage.getItem(profileSnoozedKey).then((val) => {
      if (val) {
        const snoozedUntil = new Date(val);
        if (snoozedUntil > new Date()) { setProfilePromptVisible(false); return; }
      }
      setProfilePromptVisible(true);
    });
  }, [currentUser?.id, currentUser?.photo, currentUser?.bio]);

  const connectedName = Array.isArray(params.connected)
    ? params.connected[0]
    : params.connected;

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace('/auth/login');
    }
  }, [currentUser, isAuthLoading, router]);

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const menuItems = [
    { icon: User, label: 'Edit Profile', onPress: () => { setMenuVisible(false); router.push('/edit-profile'); } },
    { icon: Settings, label: 'Settings', onPress: () => { setMenuVisible(false); router.push('/settings'); } },
    { icon: Shield, label: 'Privacy & Safety', onPress: () => { setMenuVisible(false); router.push('/settings'); } },
    { icon: HelpCircle, label: 'Why Ref?', onPress: () => { setMenuVisible(false); setWhyRefVisible(true); } },
    { icon: LogOut, label: 'Sign out', onPress: handleLogout, destructive: true },
  ];

  if (isAuthLoading || !currentUser) {
    return (
      <SafeAreaView style={styles.loader} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.wordmark}>Ref.</Text>
            <Text style={styles.name}>{currentUser.name ?? 'friend'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/inbox')}>
              <Bell size={20} color={Colors.text} />
            </Pressable>
            <Pressable onPress={() => setMenuVisible(true)}>
              <Avatar
                photo={currentUser.photo}
                name={currentUser.name}
                userId={currentUser.id}
                size="md"
              />
            </Pressable>
          </View>
        </View>

        {/* Profile completeness prompt */}
        {profilePromptVisible && (
          <View style={styles.profilePrompt}>
            <View style={styles.profilePromptLeft}>
              <Text style={styles.profilePromptTitle}>Complete your profile</Text>
              <Text style={styles.profilePromptText}>
                {!currentUser.photo ? 'Add a photo so people know who you are.' : 'Add a short bio to help friends introduce you.'}
              </Text>
            </View>
            <View style={styles.profilePromptActions}>
              <Pressable
                style={styles.profilePromptBtn}
                onPress={() => { router.push('/edit-profile'); }}
              >
                <Text style={styles.profilePromptBtnText}>Complete</Text>
              </Pressable>
              <Pressable
                style={styles.profilePromptDismiss}
                onPress={() => {
                  setProfilePromptVisible(false);
                  if (profileSnoozedKey) {
                    const snoozedUntil = new Date();
                    snoozedUntil.setDate(snoozedUntil.getDate() + 3);
                    void AsyncStorage.setItem(profileSnoozedKey, snoozedUntil.toISOString());
                  }
                }}
              >
                <Text style={styles.profilePromptDismissText}>Later</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Invite accepted banner */}
        {connectedName ? (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>You're now friends with {connectedName} 🎉</Text>
            <Text style={styles.successText}>You can now make introductions through each other.</Text>
            <Pressable
              style={styles.successButton}
              onPress={() => router.push({ pathname: '/friends', params: { connected: connectedName } })}
            >
              <Text style={styles.successButtonText}>View Friends</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Invite — above the pills */}
        <View style={styles.inviteSection}>
          <View style={styles.inviteCopy}>
            <Text style={styles.inviteTitle}>Invite friends</Text>
            <Text style={styles.inviteText}>The more people you know on Ref, the more introductions you can make.</Text>
          </View>
          <Pressable style={styles.inviteButton} onPress={() => router.push('/invite')}>
            <Link size={15} color={Colors.white} />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </Pressable>
        </View>

        {/* Core actions */}
        <View style={styles.coreGrid}>
          <Pressable
            style={({ pressed }) => [styles.coreCard, pressed && styles.coreCardPressed]}
            onPress={() => router.push('/push')}
          >
            <View style={[styles.coreIconWrap, { backgroundColor: Colors.brand }]}>
              <Users size={22} color={Colors.white} />
            </View>
            <Text style={styles.coreTitle}>Introduce</Text>
            <Text style={styles.coreSub}>Set two single friends up with each other.</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.coreCard, pressed && styles.coreCardPressed]}
            onPress={() => router.push('/pull')}
          >
            <View style={[styles.coreIconWrap, { backgroundColor: Colors.accent }]}>
              <Heart size={22} color={Colors.white} fill={Colors.white} />
            </View>
            <Text style={styles.coreTitle}>Get introduced</Text>
            <Text style={styles.coreSub}>Ask a friend to set you up with someone from their circle.</Text>
          </Pressable>
        </View>

        {/* Secondary nav */}
        <View style={styles.secondaryGrid}>
          <Pressable
            style={({ pressed }) => [styles.secondaryCard, pressed && styles.secondaryCardPressed]}
            onPress={() => router.push('/friends')}
          >
            <View style={styles.secondaryHeader}>
              <Users size={17} color={Colors.brand} />
              <Text style={styles.secondaryTitle}>Friends</Text>
            </View>
            <Text style={styles.secondaryText}>Your circle and who can introduce you.</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryCard, pressed && styles.secondaryCardPressed]}
            onPress={() => router.push('/inbox')}
          >
            <View style={styles.secondaryHeader}>
              <Bell size={17} color={Colors.brand} />
              <Text style={styles.secondaryTitle}>For You</Text>
            </View>
            <Text style={styles.secondaryText}>Introductions, matches, and requests.</Text>
          </Pressable>
        </View>

      </View>

      <AppTabBar />

      {/* Why Ref modal */}
      <Modal visible={whyRefVisible} transparent animationType="fade" onRequestClose={() => setWhyRefVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setWhyRefVisible(false)}>
          <Pressable style={styles.whyModal} onPress={() => {}}>
            <View style={styles.whyModalHeader}>
              <View>
                <Text style={styles.whyEyebrow}>About Ref</Text>
                <Text style={styles.whyTitle}>Why Ref?</Text>
                <Text style={styles.whySubtitle}>People make better matches than algorithms.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setWhyRefVisible(false)}>
                <X size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.whyLeadCard}>
              <Text style={styles.whyLead}>
                Ref makes something people already do feel natural and easy.
              </Text>
            </View>
            <View style={styles.whySectionCard}>
              <Text style={styles.whySectionLabel}>Why it works</Text>
              <Text style={styles.whyBody}>
                People ask friends for introductions all the time. Ref just makes that easier.
              </Text>
            </View>
            <View style={styles.whySectionCard}>
              <Text style={styles.whySectionTitle}>Who should I add?</Text>
              <Text style={styles.whyBody}>
                Anyone whose judgment in people you trust — your inner circle, an old colleague, a
                neighbour you clicked with.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Profile menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuProfile}>
                <Avatar
                  photo={currentUser.photo}
                  name={currentUser.name}
                  userId={currentUser.id}
                  size="lg"
                />
                <View>
                  <Text style={styles.menuName}>{currentUser.name}</Text>
                  <Text style={styles.menuEmail}>{currentUser.email ?? ''}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setMenuVisible(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.menuDivider} />
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuItem, item.destructive && styles.menuItemDestructive]}
                onPress={item.onPress}
              >
                <item.icon size={19} color={item.destructive ? Colors.error : Colors.text} />
                <Text style={[styles.menuItemText, item.destructive && styles.menuItemTextDestructive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { flex: 1, gap: 1 },
  wordmark: { fontSize: 20, fontWeight: '800', color: Colors.brand, letterSpacing: -0.3 },
  name: { fontSize: 19, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile prompt — compact inline bar
  profilePrompt: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profilePromptLeft: { flex: 1, gap: 1 },
  profilePromptTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  profilePromptText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  profilePromptActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  profilePromptBtn: {
    height: 30, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: Colors.brand, justifyContent: 'center',
  },
  profilePromptBtnText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  profilePromptDismiss: {
    height: 30, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center',
  },
  profilePromptDismissText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // Success banner
  successBanner: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  successText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  successButton: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.success,
    justifyContent: 'center',
  },
  successButtonText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // Core grid
  coreGrid: { flexDirection: 'row', gap: 14, flex: 1 },
  coreCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: Colors.brand,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  coreCardPressed: { opacity: 0.85 },
  coreIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  coreTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  coreSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Secondary grid
  secondaryGrid: { flexDirection: 'row', gap: 12 },
  secondaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  secondaryCardPressed: { opacity: 0.85 },
  secondaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  secondaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  secondaryText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },

  // Invite — compact
  inviteSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.brandLight,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteCopy: { flex: 1, gap: 2 },
  inviteTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  inviteText: { fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.brand,
  },
  inviteButtonText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  whyModal: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  whyModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  whyEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.brand },
  whyTitle: { fontSize: 26, fontWeight: '700', color: Colors.text },
  whySubtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  whyLeadCard: { borderRadius: 18, padding: 16, backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder },
  whyLead: { fontSize: 15, lineHeight: 23, color: Colors.text, fontWeight: '600' },
  whySectionCard: { gap: 8, borderRadius: 18, padding: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  whySectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.brand },
  whySectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  whyBody: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary },

  // Profile menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menu: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22 },
  menuProfile: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  menuName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  menuEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 22, marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 22 },
  menuItemDestructive: { marginTop: 4 },
  menuItemText: { fontSize: 16, color: Colors.text },
  menuItemTextDestructive: { color: Colors.error },
});

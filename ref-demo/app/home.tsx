import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Heart, Link, Users, LogOut, User, Settings, HelpCircle, Shield, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, matches, friends, logout } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);

  const pendingMatches = useMemo(
    () => matches.filter((match) => match.status === 'pending'),
    [matches],
  );
  const newMatches = useMemo(
    () => matches.filter((match) => match.status === 'matched'),
    [matches],
  );

  const greeting = currentUser?.relationshipStatus === 'single'
    ? 'Ready to find your match?'
    : 'Help your friends find love';

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setMenuVisible(false);
    // TODO: Navigate to edit profile screen
    Alert.alert('Coming Soon', 'Profile editing will be available soon!');
  };

  const menuItems = [
    {
      icon: User,
      label: 'Edit Profile',
      onPress: handleEditProfile,
    },
    {
      icon: Settings,
      label: 'Settings',
      onPress: () => {
        setMenuVisible(false);
        Alert.alert('Coming Soon', 'Settings will be available soon!');
      },
    },
    {
      icon: Shield,
      label: 'Privacy & Safety',
      onPress: () => {
        setMenuVisible(false);
        Alert.alert('Coming Soon', 'Privacy settings will be available soon!');
      },
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onPress: () => {
        setMenuVisible(false);
        Alert.alert('Coming Soon', 'Help center will be available soon!');
      },
    },
    {
      icon: LogOut,
      label: 'Logout',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hello, {currentUser?.name ?? 'Friend'}</Text>
            <Text style={styles.subtitle}>{greeting}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.profileButton} onPress={() => setMenuVisible(true)}>
              {currentUser?.photo ? (
                <Image source={{ uri: currentUser.photo }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profileFallback}>
                  <User size={18} color={Colors.textSecondary} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {(pendingMatches.length > 0 || newMatches.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Activity</Text>
            </View>

            {newMatches.length > 0 && (
              <Pressable
                style={[styles.card, styles.newMatchCard]}
                onPress={() => router.push('/matches')}
              >
                <Heart size={24} color={Colors.secondary} fill={Colors.secondary} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardTitle}>
                    You have {newMatches.length} new match{newMatches.length === 1 ? '' : 'es'}!
                  </Text>
                  <Text style={styles.cardSubtitle}>Tap to view</Text>
                </View>
              </Pressable>
            )}

            {pendingMatches.length > 0 && (
              <Pressable
                style={styles.card}
                onPress={() => router.push('/discover')}
              >
                <Users size={24} color={Colors.accent} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardTitle}>
                    {pendingMatches.length} person{pendingMatches.length === 1 ? '' : 's'} waiting
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {pendingMatches[0].matchedBy.name} thinks you might like them
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionCard} onPress={() => router.push('/push')}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}
              >
                <Users size={32} color={Colors.white} />
              </View>
              <Text style={styles.actionTitle}>Push</Text>
              <Text style={styles.actionSubtitle}>Match two friends together</Text>
            </Pressable>

            <Pressable style={styles.actionCard} onPress={() => router.push('/pull')}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.accent }]}>
                <Heart size={32} color={Colors.white} fill={Colors.white} />
              </View>
              <Text style={styles.actionTitle}>Pull</Text>
              <Text style={styles.actionSubtitle}>Ask a friend to match you</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.card} onPress={() => router.push('/friends')}>
            <View style={styles.iconCircle}>
              <Users size={24} color={Colors.secondary} />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.cardTitle}>Friends</Text>
              <Text style={styles.cardSubtitle}>
                {friends.length} connection{friends.length === 1 ? '' : 's'}
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.inviteButton} onPress={() => router.push('/invite')}>
            <Link size={20} color={Colors.secondary} />
            <Text style={styles.inviteText}>Invite Friends</Text>
          </Pressable>
        </View>

        {currentUser?.relationshipStatus === 'single' && pendingMatches.length > 0 && (
          <Pressable
            style={styles.discoverButton}
            onPress={() => router.push('/discover')}
          >
            <Text style={styles.discoverButtonText}>Start Discovering</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable 
          style={styles.menuOverlay} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View style={styles.menuProfileSection}>
                {currentUser?.photo ? (
                  <Image source={{ uri: currentUser.photo }} style={styles.menuProfilePhoto} />
                ) : (
                  <View style={styles.menuProfileFallback} />
                )}
                <View>
                  <Text style={styles.menuName}>{currentUser?.name}</Text>
                  <Text style={styles.menuEmail}>{currentUser?.email}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.menuCloseButton}
                onPress={() => setMenuVisible(false)}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuDivider} />

            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  item.destructive && styles.menuItemDestructive
                ]}
                onPress={item.onPress}
              >
                <item.icon 
                  size={20} 
                  color={item.destructive ? Colors.error : Colors.text} 
                />
                <Text 
                  style={[
                    styles.menuItemText,
                    item.destructive && styles.menuItemTextDestructive
                  ]}
                >
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
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profileFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newMatchCard: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  cardTextGroup: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  discoverButton: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoverButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  menuProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuProfilePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  menuProfileFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.border,
  },
  menuName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  menuEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  menuItemDestructive: {
    marginTop: 8,
  },
  menuItemTextDestructive: {
    color: Colors.error,
  },
});

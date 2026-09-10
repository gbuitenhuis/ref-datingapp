import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, ChevronRight, Lock, Mail, Shield, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, logout, deleteAccount } = useApp();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      showToast('Notifications are not supported in this browser', 'info');
      return;
    }
    if (notifPermission === 'denied') {
      showToast('Notifications blocked — please enable them in browser settings', 'info');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      showToast('Notifications enabled', 'success');
      new Notification('Ref notifications enabled', { body: 'You\'ll be notified of new intros and messages.' });
    } else {
      showToast('Notifications not enabled', 'info');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, profile, and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const ok = await deleteAccount();
            setDeleting(false);
            if (!ok) {
              showToast('Could not delete account — please try again', 'error');
              return;
            }
            await logout();
            router.replace('/auth/login');
          },
        },
      ],
    );
  };

  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: Mail,
          label: 'Email address',
          value: (currentUser as any)?.email ?? '',
          onPress: () => showToast('Email cannot be changed', 'info'),
        },
        {
          icon: Lock,
          label: 'Change password',
          onPress: () => showToast('A reset link will be sent to your email', 'info'),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Browser notifications',
          value: notifPermission === 'granted' ? 'On' : notifPermission === 'denied' ? 'Blocked' : 'Off',
          onPress: handleEnableNotifications,
        },
      ],
    },
    {
      title: 'Privacy & Safety',
      items: [
        {
          icon: Shield,
          label: 'Privacy controls',
          onPress: () => showToast('Privacy controls coming soon', 'info'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backNav} onPress={() => router.back()}>
          <ChevronLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={item.onPress}
                  >
                    <View style={styles.rowIconWrap}>
                      <item.icon size={16} color={Colors.brand} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      {item.value ? <Text style={styles.rowValue}>{item.value}</Text> : null}
                    </View>
                    <ChevronRight size={15} color={Colors.textTertiary} />
                  </Pressable>
                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danger zone</Text>
          <View style={styles.sectionCard}>
            <Pressable
              style={({ pressed }) => [styles.row, styles.deleteRow, pressed && styles.rowPressed]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color={Colors.error} style={{ marginRight: 4 }} />
                : <View style={[styles.rowIconWrap, styles.deleteIcon]}>
                    <Trash2 size={16} color={Colors.error} />
                  </View>}
              <View style={styles.rowContent}>
                <Text style={styles.deleteLabel}>Delete account</Text>
                <Text style={styles.deleteSub}>Permanently removes all data</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>Ref — people make better matches than algorithms.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 24,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 16 },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  title: { fontSize: 30, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  rowPressed: { opacity: 0.7 },
  rowIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowValue: { fontSize: 13, color: Colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 64 },

  deleteRow: {},
  deleteIcon: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  deleteLabel: { fontSize: 15, fontWeight: '600', color: Colors.error },
  deleteSub: { fontSize: 13, color: Colors.textTertiary },

  footer: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center',
    paddingTop: 8,
  },
});

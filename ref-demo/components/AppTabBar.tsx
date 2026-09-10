import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { Bell, House, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const TABS = [
  { label: 'Home', path: '/home', icon: House },
  { label: 'Friends', path: '/friends', icon: Users },
  { label: 'For You', path: '/inbox', icon: Bell },
];

function TabItem({
  tab,
  active,
  badge,
  onPress,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = tab.icon;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 20,
    }).start();
  };

  return (
    <Animated.View style={[styles.itemWrap, { transform: [{ scale }] }]}>
      <Pressable
        style={[styles.item, active && styles.itemActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.iconWrap}>
          <Icon size={18} color={active ? Colors.white : Colors.textSecondary} />
          {badge != null && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { currentUser, pushSuggestions, pullSuggestions, pullRequests, unreadMessageCount } = useApp();

  const inboxBadge = useMemo(() => {
    const intros = [
      ...pullSuggestions.filter(
        (i) => (i.requester.id === currentUser?.id || i.candidate.id === currentUser?.id)
          && i.finalStatus === 'pending',
      ),
      ...pushSuggestions.filter(
        (i) => (i.target.id === currentUser?.id || i.candidate.id === currentUser?.id)
          && i.finalStatus === 'pending',
      ),
    ].length;
    const requests = pullRequests.filter((r) => r.role === 'incoming').length;
    return intros + requests + unreadMessageCount;
  }, [currentUser?.id, pushSuggestions, pullSuggestions, pullRequests, unreadMessageCount]);

  const bottomPad = Math.max(16, insets.bottom);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.path}
            tab={tab}
            active={pathname === tab.path}
            badge={tab.path === '/inbox' ? inboxBadge : undefined}
            onPress={() => router.replace(tab.path)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 6,
    gap: 6,
    shadowColor: Colors.brand,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  itemWrap: {
    flex: 1,
  },
  item: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    backgroundColor: Colors.brand,
    shadowColor: Colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: Colors.white,
  },
});

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Plus, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AppTabBar } from '@/components/AppTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { User } from '@/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ref-backend.vercel.app';

type DiscoverCandidate = User & { mutualFriendsCount: number };
type PublicFriend = { id: string; name: string; photo?: string };

export default function DiscoverScreen() {
  const { showToast } = useToast();
  const {
    currentUser,
    friends,
    friendRequests,
    outgoingRequests,
    refreshFriends,
    sendFriendRequest,
    getLastApiError,
  } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    void refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const loadCandidates = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); return; }
    if (friends.length === 0) { setCandidates([]); setLoading(false); return; }
    if (isRefresh) { setRefreshing(true); await refreshFriends(); }
    else setLoading(true);
    try {
      const existingFriendIds = new Set(friends.map((f) => f.id));
      const incomingRequestIds = new Set(friendRequests.map((r) => r.from.id));
      const outgoingRequestIds = new Set(outgoingRequests.map((r) => r.to.id));
      const candidateMap = new Map<string, DiscoverCandidate>();

      const responses = await Promise.all(
        friends.map(async (friend) => {
          const res = await fetch(`${API_BASE_URL}/friends/${friend.id}`);
          if (!res.ok) return [] as PublicFriend[];
          const result = (await res.json()) as { items?: PublicFriend[] };
          return result.items ?? [];
        }),
      );

      responses.forEach((list) => {
        list.forEach((person) => {
          if (
            !person.id ||
            person.id === currentUser.id ||
            existingFriendIds.has(person.id) ||
            incomingRequestIds.has(person.id) ||
            outgoingRequestIds.has(person.id)
          ) return;
          const existing = candidateMap.get(person.id);
          if (existing) { existing.mutualFriendsCount += 1; return; }
          candidateMap.set(person.id, {
            id: person.id,
            name: person.name?.trim() || 'Unnamed person',
            photo: person.photo ?? '',
            relationshipStatus: 'not-single',
            mutualFriendsCount: 1,
          });
        });
      });

      setCandidates(
        Array.from(candidateMap.values()).sort((a, b) => {
          if (b.mutualFriendsCount !== a.mutualFriendsCount) return b.mutualFriendsCount - a.mutualFriendsCount;
          return a.name.localeCompare(b.name);
        }),
      );
    } catch {
      showToast('Could not load people near your network right now', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, friends, friendRequests, outgoingRequests]);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);

  const visibleCandidates = useMemo(
    () => candidates.filter((c) => !skippedIds.includes(c.id)),
    [candidates, skippedIds],
  );

  const handleAddFriend = async (candidate: DiscoverCandidate) => {
    setSubmittingId(candidate.id);
    const ok = await sendFriendRequest(candidate);
    setSubmittingId(null);
    if (!ok) {
      const err = getLastApiError() ?? '';
      if (err.includes('Already friends') || err.includes('already exists')) {
        setCandidates((prev) => prev.filter((item) => item.id !== candidate.id));
        showToast(`You're already connected with ${candidate.name}`, 'info');
      } else {
        showToast('Could not send friend request — please try again', 'error');
      }
      return;
    }
    setCandidates((prev) => prev.filter((item) => item.id !== candidate.id));
    showToast(`Friend request sent to ${candidate.name} 🎉`, 'success');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.loadingText}>Finding people close to your network...</Text>
        </View>
        <AppTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadCandidates(true)} tintColor={Colors.brand} />}
      >

        <Text style={styles.wordmark}>Ref.</Text>
        <Text style={styles.pageTitle}>Discover</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>People you may know</Text>
          <Text style={styles.sectionDesc}>
            People close to your network, ranked by mutual connections.
          </Text>

          {visibleCandidates.length === 0 ? (
            <Text style={styles.emptyText}>No new people right now</Text>
          ) : visibleCandidates.map((candidate, i) => {
            const submitting = submittingId === candidate.id;
            return (
              <Fragment key={candidate.id}>
                <View style={styles.row}>
                  <Avatar photo={candidate.photo} name={candidate.name} userId={candidate.id} size="sm" />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{candidate.name}</Text>
                    <Text style={styles.rowSub}>
                      {candidate.mutualFriendsCount} mutual friend{candidate.mutualFriendsCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.skipBtn}
                      onPress={() => setSkippedIds((prev) => [...prev, candidate.id])}
                      disabled={submitting}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
                    >
                      <X size={15} color={Colors.textTertiary} />
                    </Pressable>
                    <Pressable
                      style={[styles.addBtn, submitting && styles.addBtnDisabled]}
                      onPress={() => void handleAddFriend(candidate)}
                      disabled={submitting}
                      hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Plus size={15} color={Colors.white} />}
                    </Pressable>
                  </View>
                </View>
                {i < visibleCandidates.length - 1 && <View style={styles.divider} />}
              </Fragment>
            );
          })}
        </View>
      </ScrollView>
      <AppTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 28,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    padding: 18,
  },
  headerTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  headerCopy: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  wordmark: { fontSize: 16, fontWeight: '800', color: Colors.brand, letterSpacing: -0.2 },
  pageTitle: { fontSize: 30, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },

  section: { gap: 0 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  sectionDesc: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 19,
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.7 },

  emptyText: { fontSize: 14, color: Colors.textTertiary, paddingTop: 2 },
});

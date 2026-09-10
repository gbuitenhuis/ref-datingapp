import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { Check, Heart, Sparkles, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { AppTabBar } from '@/components/AppTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'intros' | 'matches' | 'requests';

export default function ForYouScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    currentUser,
    pushSuggestions,
    pullSuggestions,
    pullRequests,
    matches,
    respondToPushSuggestion,
    respondToPullSuggestion,
    refreshFriends,
    refreshAll,
    lastMessages,
    unreadMessageCount,
  } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('intros');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const dismissedKey = currentUser?.id ? `@ref_for_you_ignored_${currentUser.id}` : null;

  useEffect(() => {
    const load = async () => {
      if (!dismissedKey) { setDismissedIds([]); return; }
      try {
        const val = await AsyncStorage.getItem(dismissedKey);
        setDismissedIds(val ? JSON.parse(val) : []);
      } catch { setDismissedIds([]); }
    };
    void load();
  }, [dismissedKey]);

  const persistDismissed = async (nextIds: string[]) => {
    setDismissedIds(nextIds);
    if (!dismissedKey) return;
    try { await AsyncStorage.setItem(dismissedKey, JSON.stringify(nextIds)); } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const displayName = (name?: string) => name?.trim() || 'Someone';

  const introducedToYou = useMemo(
    () =>
      [
        ...pullSuggestions.filter(
          (i) => i.requester.id === currentUser?.id && i.finalStatus === 'pending' && i.requesterStatus === 'pending',
        ),
        ...pushSuggestions.filter(
          (i) => i.target.id === currentUser?.id && i.finalStatus === 'pending' && i.targetStatus === 'pending',
        ),
        ...pullSuggestions.filter(
          (i) => i.candidate.id === currentUser?.id && i.finalStatus === 'pending' && i.candidateStatus === 'pending',
        ),
        ...pushSuggestions.filter(
          (i) => i.candidate.id === currentUser?.id && i.finalStatus === 'pending' && i.candidateStatus === 'pending',
        ),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [currentUser?.id, pullSuggestions, pushSuggestions],
  );

  const yourMatches = useMemo(
    () => matches.filter((m) => m.status === 'matched'),
    [matches],
  );

  const friendsAskingForHelp = useMemo(
    () =>
      pullRequests
        .filter((r) => r.role === 'incoming' && !dismissedIds.includes(r.id))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [dismissedIds, pullRequests],
  );

  const myPullRequests = useMemo(
    () =>
      pullRequests
        .filter((r) => r.role === 'outgoing')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [pullRequests],
  );

  const handlePullSuggestionResponse = async (id: string, action: 'accept' | 'decline') => {
    setProcessingId(id);
    const ok = await respondToPullSuggestion(id, action);
    setProcessingId(null);
    if (ok) showToast(action === 'accept' ? 'Introduction accepted! 🎉' : 'Declined', action === 'accept' ? 'success' : 'info');
    else showToast('Something went wrong — please try again', 'error');
  };

  const handlePushSuggestionResponse = async (id: string, action: 'accept' | 'decline') => {
    setProcessingId(id);
    const ok = await respondToPushSuggestion(id, action);
    setProcessingId(null);
    if (ok) showToast(action === 'accept' ? 'Introduction accepted! 🎉' : 'Declined', action === 'accept' ? 'success' : 'info');
    else showToast('Something went wrong — please try again', 'error');
  };

  const handleIgnoreRequest = (requestId: string) => {
    void persistDismissed([...dismissedIds, requestId]);
    showToast('Request hidden', 'info');
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'intros', label: 'Intros', count: introducedToYou.length },
    { key: 'matches', label: 'Matches', count: yourMatches.length + unreadMessageCount },
    { key: 'requests', label: 'Requests', count: friendsAskingForHelp.length + myPullRequests.filter(r => r.status !== 'completed').length },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.wordmarkHeader}>
        <Text style={styles.wordmark}>Ref.</Text>
      </View>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
            {t.count > 0 && (
              <View style={[styles.tabBadge, activeTab === t.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === t.key && styles.tabBadgeTextActive]}>
                  {t.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.brand} />}
      >
        {/* Introductions tab */}
        {activeTab === 'intros' && (
          <View style={styles.section}>
            {introducedToYou.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Sparkles size={24} color={Colors.brand} />
                </View>
                <Text style={styles.emptyTitle}>No introductions yet</Text>
                <Text style={styles.emptySub}>When a friend introduces you to someone, they'll appear here.</Text>
              </View>
            ) : introducedToYou.map((item: any, i: number) => {
              const isPull = 'requesterStatus' in item;
              const person = item.candidate?.id === currentUser?.id
                ? (item.requester ?? item.target)
                : item.candidate;
              const by = item.matchmaker;
              const note = isPull
                ? (item.requester?.id === currentUser?.id ? item.noteToRequester : item.noteToCandidate)
                : (item.target?.id === currentUser?.id ? item.noteToTarget : item.noteToCandidate);
              return (
                <Fragment key={item.id}>
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <Avatar photo={person?.photo} name={person?.name} userId={person?.id} size="md" />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{displayName(person?.name)}</Text>
                        <Text style={styles.cardSub}>Introduced by {displayName(by?.name)}</Text>
                        {note ? <Text style={styles.cardNote}>"{note}"</Text> : null}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable
                        style={styles.declineBtn}
                        onPress={() => isPull
                          ? handlePullSuggestionResponse(item.id, 'decline')
                          : handlePushSuggestionResponse(item.id, 'decline')}
                        disabled={processingId === item.id}
                      >
                        <X size={16} color={Colors.textSecondary} />
                        <Text style={styles.declineBtnText}>Pass</Text>
                      </Pressable>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => isPull
                          ? handlePullSuggestionResponse(item.id, 'accept')
                          : handlePushSuggestionResponse(item.id, 'accept')}
                        disabled={processingId === item.id}
                      >
                        {processingId === item.id
                          ? <ActivityIndicator size="small" color={Colors.white} />
                          : <>
                              <Check size={16} color={Colors.white} />
                              <Text style={styles.acceptBtnText}>Accept intro</Text>
                            </>}
                      </Pressable>
                    </View>
                  </View>
                  {i < introducedToYou.length - 1 && <View style={styles.divider} />}
                </Fragment>
              );
            })}
          </View>
        )}

        {/* Matches tab */}
        {activeTab === 'matches' && (
          <View style={styles.section}>
            {yourMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Heart size={24} color={Colors.brand} />
                </View>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptySub}>When you and another person both accept an intro, you'll match here.</Text>
              </View>
            ) : yourMatches.map((match, i) => (
              <Fragment key={match.id}>
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => router.push({
                    pathname: '/chat',
                    params: {
                      matchId: match.id,
                      otherName: match.user.name,
                      otherPhoto: match.user.photo ?? '',
                      otherUserId: match.user.id,
                      otherBio: match.user.bio ?? '',
                      otherAge: match.user.age ? String(match.user.age) : '',
                    },
                  })}
                >
                  <View style={styles.cardRow}>
                    <Avatar photo={match.user.photo} name={match.user.name} userId={match.user.id} size="md" />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{displayName(match.user.name)}</Text>
                      {lastMessages[match.id] ? (
                        <Text style={styles.cardSub} numberOfLines={1}>
                          {lastMessages[match.id].senderId === currentUser?.id ? 'You: ' : ''}
                          {lastMessages[match.id].text}
                        </Text>
                      ) : match.user.bio ? (
                        <Text style={styles.cardSub} numberOfLines={1}>{match.user.bio}</Text>
                      ) : null}
                      {!lastMessages[match.id] && <Text style={styles.cardMeta}>Tap to message</Text>}
                    </View>
                  </View>
                </Pressable>
                {i < yourMatches.length - 1 && <View style={styles.divider} />}
              </Fragment>
            ))}
          </View>
        )}

        {/* Requests tab */}
        {activeTab === 'requests' && (
          <View style={styles.section}>
            {friendsAskingForHelp.length === 0 && myPullRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Sparkles size={24} color={Colors.brand} />
                </View>
                <Text style={styles.emptyTitle}>No requests right now</Text>
                <Text style={styles.emptySub}>When a friend asks you to introduce them to someone, you'll see it here.</Text>
              </View>
            ) : (
              <>
                {friendsAskingForHelp.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Friends asking for help</Text>
                    {friendsAskingForHelp.map((req, i) => (
                      <Fragment key={req.id}>
                        <View style={styles.card}>
                          <View style={styles.cardRow}>
                            <Avatar photo={req.requester.photo} name={req.requester.name} userId={req.requester.id} size="md" />
                            <View style={styles.cardInfo}>
                              <Text style={styles.cardName}>{displayName(req.requester.name)}</Text>
                              <Text style={styles.cardSub}>Asking you to introduce them</Text>
                            </View>
                            <Pressable
                              style={styles.dismissBtn}
                              onPress={() => handleIgnoreRequest(req.id)}
                            >
                              <X size={14} color={Colors.textTertiary} />
                            </Pressable>
                          </View>
                          <Pressable
                            style={styles.acceptBtn}
                            onPress={() => router.push({ pathname: '/push', params: { pullRequestId: req.id, preselectedId: req.requester.id } })}
                          >
                            <Sparkles size={16} color={Colors.white} />
                            <Text style={styles.acceptBtnText}>Introduce {displayName(req.requester.name)}</Text>
                          </Pressable>
                        </View>
                        {i < friendsAskingForHelp.length - 1 && <View style={styles.divider} />}
                      </Fragment>
                    ))}
                  </>
                )}

                {myPullRequests.length > 0 && (
                  <>
                    {friendsAskingForHelp.length > 0 && <View style={[styles.divider, { marginVertical: 16 }]} />}
                    <Text style={styles.sectionLabel}>My intro requests</Text>
                    {myPullRequests.map((req, i) => {
                      const statusLabel = req.status === 'pending' ? 'Waiting for response' : req.status === 'active' ? 'In progress' : 'Done';
                      const statusColor = req.status === 'completed' ? Colors.textTertiary : req.status === 'active' ? Colors.accent : Colors.brand;
                      return (
                        <Fragment key={req.id}>
                          <View style={styles.card}>
                            <View style={styles.cardRow}>
                              <Avatar photo={req.matchmaker.photo} name={req.matchmaker.name} userId={req.matchmaker.id} size="md" />
                              <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{displayName(req.matchmaker.name)}</Text>
                                <Text style={styles.cardSub}>You asked them to introduce you</Text>
                                <Text style={[styles.cardMeta, { color: statusColor }]}>{statusLabel}</Text>
                              </View>
                            </View>
                          </View>
                          {i < myPullRequests.length - 1 && <View style={styles.divider} />}
                        </Fragment>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
      <AppTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  wordmarkHeader: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 4 },
  wordmark: { fontSize: 16, fontWeight: '800', color: Colors.brand, letterSpacing: -0.2 },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 6,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    borderColor: Colors.brand,
    backgroundColor: Colors.brand,
  },
  tabLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.white },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  tabBadgeTextActive: { color: Colors.white },

  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 120,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  section: { gap: 0 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', color: Colors.textSecondary,
    marginBottom: 4,
  },

  card: {
    paddingVertical: 14,
    gap: 12,
  },
  cardPressed: { opacity: 0.7 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardNote: { fontSize: 13, color: Colors.brand, fontStyle: 'italic', lineHeight: 18 },
  cardMeta: { fontSize: 12, color: Colors.brand, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: Colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    shadowColor: Colors.brand, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  declineBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  dismissBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Link as LinkIcon, Search, Users, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { AppTabBar } from '@/components/AppTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import { Friend } from '@/types';

type FlowMode = 'introduce' | 'get-introduced' | undefined;

export default function FriendsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{
    connected?: string | string[];
    mode?: string | string[];
    selectedFriendId?: string | string[];
  }>();
  const {
    friends,
    friendRequests,
    refreshFriends,
    acceptFriendRequest,
    declineFriendRequest,
    createPushRequest,
    createPullRequest,
    sendFriendRequest,
    findFriendByPhone,
    areFriends,
    isRequestPending,
  } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [phoneResult, setPhoneResult] = useState<import('@/types').User | null>(null);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [phoneNotFound, setPhoneNotFound] = useState(false);

  const connectedName = Array.isArray(params.connected) ? params.connected[0] : params.connected;
  const mode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) as FlowMode;
  const selectedFriendId = Array.isArray(params.selectedFriendId)
    ? params.selectedFriendId[0]
    : params.selectedFriendId;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refreshFriends(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFriends();
    setRefreshing(false);
  };

  const getDisplayName = (f: Friend) => f.name?.trim() || 'Someone';
  const getStatusLabel = (f: Friend) =>
    f.name?.trim()
      ? f.relationshipStatus === 'single' ? 'Single' : 'Not single'
      : 'Profile not completed yet';

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const aHas = Boolean(a.name?.trim());
        const bHas = Boolean(b.name?.trim());
        if (aHas !== bHas) return aHas ? -1 : 1;
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }),
    [friends],
  );

  const selectedFriend = useMemo(
    () => sortedFriends.find((f) => f.id === selectedFriendId) ?? null,
    [sortedFriends, selectedFriendId],
  );

  const listFriends = useMemo(() => {
    let base = sortedFriends;
    if (mode === 'introduce' && selectedFriendId) {
      base = base.filter((f) => f.id !== selectedFriendId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter((f) => getDisplayName(f).toLowerCase().includes(q));
    }
    return base;
  }, [mode, selectedFriendId, sortedFriends, searchQuery]);

  const clearFlow = () => router.replace('/friends');

  const handleFriendPress = async (friend: Friend) => {
    if (!mode) {
      router.push({ pathname: '/friend-detail', params: { id: friend.id } });
      return;
    }
    if (submitting) return;

    if (mode === 'introduce') {
      if (!selectedFriend) {
        router.replace({ pathname: '/friends', params: { mode: 'introduce', selectedFriendId: friend.id } });
        return;
      }
      setSubmitting(true);
      const ok = await createPushRequest(selectedFriend, [friend]);
      setSubmitting(false);
      if (!ok) { showToast('Could not create the introduction — please try again', 'error'); return; }
      showToast(`Introduction sent to ${getDisplayName(selectedFriend)} 🎉`, 'success');
      clearFlow();
      return;
    }

    if (mode === 'get-introduced') {
      setSubmitting(true);
      const ok = await createPullRequest(friend);
      setSubmitting(false);
      if (!ok) { showToast('Could not send this request — please try again', 'error'); return; }
      showToast(`${getDisplayName(friend)} can now introduce you 🎉`, 'success');
      clearFlow();
    }
  };

  const handlePhoneSearch = async () => {
    const q = phoneQuery.trim();
    if (!q || phoneSearching) return;
    setPhoneResult(null);
    setPhoneNotFound(false);
    setPhoneSearching(true);
    const user = await findFriendByPhone(q);
    setPhoneSearching(false);
    if (user) { setPhoneResult(user); }
    else { setPhoneNotFound(true); }
  };

  const handleAddPhoneResult = async () => {
    if (!phoneResult || submitting) return;
    setSubmitting(true);
    const ok = await sendFriendRequest(phoneResult);
    setSubmitting(false);
    if (ok) {
      showToast(`Friend request sent to ${phoneResult.name || 'user'} 🎉`, 'success');
      setPhoneResult(null);
      setPhoneQuery('');
    } else {
      showToast('Could not send request — they may already be in your network', 'error');
    }
  };

  const isFullyEmpty = sortedFriends.length === 0 && friendRequests.length === 0;

  if (isFullyEmpty) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.pageTitle}>Friends</Text>
          <Text style={styles.emptyStateText}>
            Invite people you know to start making introductions.
          </Text>
          <Pressable style={styles.inviteBtn} onPress={() => router.push('/invite')}>
            <LinkIcon size={15} color={Colors.white} />
            <Text style={styles.inviteBtnText}>Invite friends</Text>
          </Pressable>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.brand} />}
      >

        {/* Success banner */}
        {connectedName ? (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>Connected with {connectedName}</Text>
            <Text style={styles.successText}>You are now in each other's network.</Text>
          </View>
        ) : null}

        {/* Normal mode */}
        {!mode && (
          <>
            <View style={styles.pageHeader}>
              <View style={styles.pageTitleGroup}>
                <Text style={styles.wordmark}>Ref.</Text>
                <Text style={styles.pageTitle}>Friends</Text>
                <Text style={styles.pageSubtitle}>Your network</Text>
              </View>
              <View style={styles.pageActions}>
                <Pressable style={styles.actionChip} onPress={() => router.push('/discover')}>
                  <Users size={13} color={Colors.textSecondary} />
                  <Text style={styles.actionChipText}>Discover</Text>
                </Pressable>
                <Pressable style={styles.actionChipPrimary} onPress={() => router.push('/invite')}>
                  <LinkIcon size={13} color={Colors.white} />
                  <Text style={styles.actionChipPrimaryText}>Invite</Text>
                </Pressable>
              </View>
            </View>

            {/* Search bar */}
            {sortedFriends.length >= 5 && (
              <View style={styles.searchWrap}>
                <Search size={15} color={Colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends…"
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>
            )}

            {/* Find by phone */}
            <View style={styles.phoneSection}>
              <Text style={styles.sectionLabel}>Find by phone number</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="+31 6 12345678"
                  placeholderTextColor={Colors.textTertiary}
                  value={phoneQuery}
                  onChangeText={(v) => { setPhoneQuery(v); setPhoneResult(null); setPhoneNotFound(false); }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  onSubmitEditing={() => void handlePhoneSearch()}
                  returnKeyType="search"
                />
                <Pressable
                  style={[styles.phoneSearchBtn, (!phoneQuery.trim() || phoneSearching) && styles.phoneSearchBtnDisabled]}
                  onPress={() => void handlePhoneSearch()}
                  disabled={!phoneQuery.trim() || phoneSearching}
                >
                  {phoneSearching
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={styles.phoneSearchBtnText}>Find</Text>}
                </Pressable>
              </View>
              {phoneResult && (
                <View style={styles.row}>
                  <Avatar photo={phoneResult.photo} name={phoneResult.name} userId={phoneResult.id} size="sm" />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{phoneResult.name?.trim() || 'Ref user'}</Text>
                    <Text style={styles.rowSub}>
                      {areFriends(phoneResult.id) ? 'Already friends' : isRequestPending(phoneResult.id) ? 'Request sent' : 'Found on Ref'}
                    </Text>
                  </View>
                  {!areFriends(phoneResult.id) && !isRequestPending(phoneResult.id) && (
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => void handleAddPhoneResult()}
                      disabled={submitting}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Check size={14} color={Colors.white} />}
                    </Pressable>
                  )}
                </View>
              )}
              {phoneNotFound && (
                <Text style={styles.emptyText}>No Ref user found with that number</Text>
              )}
            </View>

            {listFriends.length > 0 ? listFriends.map((f, i) => (
              <Fragment key={f.id}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => void handleFriendPress(f)}
                >
                  <Avatar photo={f.photo} name={f.name} userId={f.id} size="sm" />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{getDisplayName(f)}</Text>
                    <Text style={styles.rowSub}>{getStatusLabel(f)}</Text>
                  </View>
                  <ChevronRight size={15} color={Colors.textTertiary} />
                </Pressable>
                {i < listFriends.length - 1 && <View style={styles.divider} />}
              </Fragment>
            )) : (
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No friends match your search' : 'No friends yet'}
              </Text>
            )}

            {/* Friend requests */}
            {friendRequests.length > 0 && (
              <View style={styles.requestsSection}>
                <Text style={styles.sectionLabel}>
                  Requests ({friendRequests.length})
                </Text>
                {friendRequests.map((req, i) => (
                  <Fragment key={req.id}>
                    <View style={styles.row}>
                      <Avatar photo={req.from.photo} name={req.from.name} userId={req.from.id} size="sm" />
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{getDisplayName(req.from)}</Text>
                        <Text style={styles.rowSub}>{getStatusLabel(req.from)}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <Pressable
                          style={styles.acceptBtn}
                          onPress={() => acceptFriendRequest(req.id)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
                        >
                          <Check size={14} color={Colors.white} />
                        </Pressable>
                        <Pressable
                          style={styles.declineBtn}
                          onPress={() => declineFriendRequest(req.id)}
                          hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
                        >
                          <X size={14} color={Colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>
                    {i < friendRequests.length - 1 && <View style={styles.divider} />}
                  </Fragment>
                ))}
              </View>
            )}
          </>
        )}

        {/* Flow mode */}
        {mode && (
          <>
            <Pressable style={styles.backNav} onPress={clearFlow}>
              <ChevronLeft size={18} color={Colors.textSecondary} />
              <Text style={styles.backNavText}>Cancel</Text>
            </Pressable>
            <View style={styles.flowHeader}>
              <Text style={styles.pageTitle}>
                {mode === 'introduce'
                  ? selectedFriend ? 'Choose another friend' : 'Choose a friend'
                  : 'Choose a friend'}
              </Text>
              <Text style={styles.flowDesc}>
                {mode === 'introduce'
                  ? selectedFriend
                    ? `Set up with ${getDisplayName(selectedFriend)}.`
                    : 'Pick the first friend you want to help.'
                  : 'Pick someone who can introduce you.'}
              </Text>
              {selectedFriend && (
                <View style={styles.selectedRow}>
                  <Avatar photo={selectedFriend.photo} name={selectedFriend.name} userId={selectedFriend.id} size="sm" />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{getDisplayName(selectedFriend)}</Text>
                    <Text style={styles.rowSub}>Selected</Text>
                  </View>
                  <Pressable onPress={clearFlow}>
                    <Text style={styles.changeText}>Change</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.flowSection}>
              <Text style={styles.sectionLabel}>Your friends</Text>
              {listFriends.map((f, i) => (
                <Fragment key={f.id}>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={() => void handleFriendPress(f)}
                  >
                    <Avatar photo={f.photo} name={f.name} userId={f.id} size="sm" />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{getDisplayName(f)}</Text>
                      <Text style={styles.rowSub}>{getStatusLabel(f)}</Text>
                    </View>
                    {submitting
                      ? <ActivityIndicator size="small" color={Colors.brand} />
                      : <ChevronRight size={15} color={Colors.brand} />}
                  </Pressable>
                  {i < listFriends.length - 1 && <View style={styles.divider} />}
                </Fragment>
              ))}
            </View>
          </>
        )}

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
    gap: 0,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  pageTitleGroup: { gap: 2 },
  wordmark: { fontSize: 16, fontWeight: '800', color: Colors.brand, letterSpacing: -0.2 },
  pageTitle: { fontSize: 30, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary },
  pageActions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 4 },

  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 44, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  actionChipPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 44, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: Colors.brand,
  },
  actionChipPrimaryText: { fontSize: 12, fontWeight: '600', color: Colors.white },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13,
  },
  rowPressed: { opacity: 0.65 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textSecondary },

  emptyText: { fontSize: 14, color: Colors.textTertiary, paddingTop: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  requestsSection: { marginTop: 36 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  flowHeader: { gap: 8, marginBottom: 32 },
  flowDesc: { fontSize: 15, color: Colors.textSecondary, lineHeight: 21 },
  flowSection: {},
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  changeText: { fontSize: 13, fontWeight: '600', color: Colors.brand },
  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 16 },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  successBanner: {
    marginBottom: 28,
    padding: 16, borderRadius: 14,
    backgroundColor: Colors.successLight,
    borderWidth: 1, borderColor: Colors.successBorder,
    gap: 3,
  },
  successTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  successText: { fontSize: 13, color: Colors.textSecondary },

  emptyState: {
    flex: 1, paddingHorizontal: 24, paddingTop: 60, gap: 14,
  },
  emptyStateText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, maxWidth: 280 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    height: 44, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: Colors.brand, marginTop: 4,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  phoneSection: { marginBottom: 24, gap: 10 },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  phoneInput: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 15, color: Colors.text,
  },
  phoneSearchBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
  },
  phoneSearchBtnDisabled: { opacity: 0.5 },
  phoneSearchBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 44, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
});

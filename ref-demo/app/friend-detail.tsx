import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Flag, Heart, UserCheck, UserPlus, Users, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { Friend, User } from '@/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ref-backend.vercel.app';

export default function FriendDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; suggestion?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isSuggestion = (Array.isArray(params.suggestion) ? params.suggestion[0] : params.suggestion) === 'true';

  const { showToast } = useToast();
  const {
    currentUser,
    friends,
    suggestedFriends,
    sendFriendRequest,
    reportUser,
    createPullRequest,
    areFriends,
    isRequestPending,
    getFriendById,
  } = useApp();

  const selectedUser: Friend | User | undefined = useMemo(() => {
    if (!id) return undefined;
    if (isSuggestion) return suggestedFriends.find((u) => u.id === id);
    return getFriendById(id);
  }, [getFriendById, id, isSuggestion, suggestedFriends]);

  const alreadyFriends = selectedUser ? areFriends(selectedUser.id) : false;
  const requestPending = selectedUser ? isRequestPending(selectedUser.id) : false;
  const selectedUserId = selectedUser?.id;
  const currentUserId = currentUser?.id;

  const [theirFriends, setTheirFriends] = useState<User[]>([]);
  const [loadingTheirFriends, setLoadingTheirFriends] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Record<string, true>>({});
  const [sendingPull, setSendingPull] = useState(false);
  const [pullSent, setPullSent] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<'inappropriate_behavior' | 'fake_or_spam'>('inappropriate_behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const loadTheirFriends = async () => {
      if (!alreadyFriends || !selectedUserId) { setTheirFriends([]); return; }
      setLoadingTheirFriends(true);
      try {
        const res = await fetch(`${API_BASE_URL}/friends/${selectedUserId}`);
        if (!res.ok) return;
        const result = await res.json();
        const items: User[] = (result.items ?? []).filter(
          (item: User) => item.id !== selectedUserId && item.id !== currentUserId,
        );
        setTheirFriends(items);
      } catch {}
      finally { setLoadingTheirFriends(false); }
    };
    void loadTheirFriends();
  }, [alreadyFriends, currentUserId, selectedUserId]);

  const computeMutualFriends = (userId: string) => {
    const f = friends.find((item) => item.id === userId);
    if (f?.mutualFriendsCount) return f.mutualFriendsCount;
    const friendIds = new Set(
      friends.flatMap((item) => item.friendsOfFriend?.map((fof) => fof.id) ?? []),
    );
    return friendIds.has(userId) ? 1 : 0;
  };

  if (!selectedUser) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>User not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color={Colors.white} />
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const displayName = (name?: string) => name?.trim() || 'Unnamed';
  const mutualCount = computeMutualFriends(selectedUser.id);

  const handleAddFriend = async (user: User) => {
    if (requestPending) return;
    const ok = await sendFriendRequest(user);
    if (!ok) { showToast('Could not send request — please try again', 'error'); return; }
    setInvitedIds((prev) => ({ ...prev, [user.id]: true }));
    showToast(`Friend request sent to ${displayName(user.name)} 🎉`, 'success');
  };

  const handlePull = async () => {
    if (!alreadyFriends || sendingPull) return;
    setSendingPull(true);
    const ok = await createPullRequest(selectedUser);
    setSendingPull(false);
    if (!ok) { showToast(`Could not ask ${displayName(selectedUser.name)} — please try again`, 'error'); return; }
    setPullSent(true);
    showToast(`Asked ${displayName(selectedUser.name)} to introduce you 🎉`, 'success');
  };

  const handleSubmitReport = async () => {
    if (!selectedUser || submittingReport) return;
    setSubmittingReport(true);
    const ok = await reportUser(selectedUser.id, reportReason, reportDetails.trim());
    setSubmittingReport(false);
    if (!ok) { showToast('Could not submit report — please try again', 'error'); return; }
    setReportVisible(false);
    setReportReason('inappropriate_behavior');
    setReportDetails('');
    showToast('Report submitted — thank you', 'success');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Back nav */}
        <Pressable style={styles.backNav} onPress={() => router.back()}>
          <ChevronLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar photo={selectedUser.photo} name={selectedUser.name} userId={selectedUser.id} size="2xl" ring />
          <Text style={styles.heroName}>{displayName(selectedUser.name)}</Text>
          {selectedUser.age ? <Text style={styles.heroAge}>{selectedUser.age}</Text> : null}
          <View style={[
            styles.statusBadge,
            selectedUser.relationshipStatus === 'single' ? styles.statusBadgeSingle : styles.statusBadgeNotSingle,
          ]}>
            <View style={[
              styles.statusDot,
              selectedUser.relationshipStatus === 'single' ? styles.dotSingle : styles.dotNotSingle,
            ]} />
            <Text style={styles.statusText}>
              {selectedUser.relationshipStatus === 'single' ? 'Single' : 'Not single'}
            </Text>
          </View>
          {selectedUser.bio ? <Text style={styles.heroBio}>{selectedUser.bio}</Text> : null}
          {mutualCount > 0 ? (
            <Text style={styles.mutualText}>
              {mutualCount} mutual friend{mutualCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        {/* Add friend CTA */}
        {!alreadyFriends ? (
          <Pressable
            style={[styles.addFriendButton, requestPending && styles.addFriendButtonSent]}
            onPress={() => void handleAddFriend(selectedUser)}
            disabled={requestPending}
          >
            <UserPlus size={17} color={Colors.white} />
            <Text style={styles.addFriendText}>
              {requestPending ? 'Request Sent' : 'Add Friend'}
            </Text>
          </Pressable>
        ) : null}

        {/* Actions (Push / Pull) */}
        {alreadyFriends ? (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Do something together</Text>
            <Text style={styles.sectionSub}>
              Use this friendship to make or ask for an introduction.
            </Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [styles.actionCard, styles.actionCardPush, pressed && styles.actionCardPressed]}
                onPress={() =>
                  router.push({ pathname: '/push', params: { preselectedId: selectedUser.id } })
                }
              >
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.brandLight }]}>
                  <UserCheck size={20} color={Colors.brand} />
                </View>
                <Text style={styles.actionTitle}>Introduce</Text>
                <Text style={styles.actionSub}>Suggest {displayName(selectedUser.name)} to someone</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  (sendingPull || pullSent) && styles.actionCardDone,
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => void handlePull()}
                disabled={sendingPull || pullSent}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: '#EEF4FF' }]}>
                  {sendingPull
                    ? <ActivityIndicator color={Colors.accent} size="small" />
                    : <Heart size={20} color={Colors.accent} />}
                </View>
                <Text style={styles.actionTitle}>Ask for intro</Text>
                <Text style={styles.actionSub}>
                  {pullSent
                    ? `Asked ${displayName(selectedUser.name)}`
                    : `Ask ${displayName(selectedUser.name)} to match you`}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Report */}
        <Pressable style={styles.reportRow} onPress={() => setReportVisible(true)}>
          <Flag size={14} color={Colors.textSecondary} />
          <Text style={styles.reportText}>Report user</Text>
        </Pressable>

        {/* Their Friends */}
        {alreadyFriends ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Their Friends</Text>
            <Text style={styles.sectionSub}>
              People {displayName(selectedUser.name)} is connected with
            </Text>
            {loadingTheirFriends && theirFriends.length === 0 ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.brand} />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : theirFriends.length === 0 ? (
              <View style={styles.emptyFriends}>
                <Users size={28} color={Colors.textSecondary} />
                <Text style={styles.emptyFriendsText}>No friends to show</Text>
              </View>
            ) : (
              <View style={styles.friendList}>
                {loadingTheirFriends ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={Colors.brand} size="small" />
                    <Text style={styles.inlineLoadingText}>Refreshing...</Text>
                  </View>
                ) : null}
                {theirFriends.map((fof) => {
                  const isAlreadyFriend = areFriends(fof.id);
                  const isPending = invitedIds[fof.id] || isRequestPending(fof.id);
                  return (
                    <Pressable
                      key={fof.id}
                      style={({ pressed }) => [styles.friendRow, pressed && styles.friendRowPressed]}
                      onPress={() => router.push({ pathname: '/friend-detail', params: { id: fof.id } })}
                    >
                      <Avatar photo={fof.photo} name={fof.name} userId={fof.id} size="md" />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{displayName(fof.name)}</Text>
                        <View style={styles.statusRow}>
                          <View style={[
                            styles.statusDot,
                            fof.relationshipStatus === 'single' ? styles.dotSingle : styles.dotNotSingle,
                          ]} />
                          <Text style={styles.statusText}>
                            {fof.relationshipStatus === 'single' ? 'Single' : 'Not single'}
                          </Text>
                        </View>
                      </View>
                      {isAlreadyFriend ? (
                        <View style={styles.badgeFriends}>
                          <Text style={styles.badgeFriendsText}>Friends</Text>
                        </View>
                      ) : isPending ? (
                        <View style={styles.badgePending}>
                          <Text style={styles.badgePendingText}>Sent</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.addBtn}
                          onPress={(e) => { e.stopPropagation(); void handleAddFriend(fof); }}
                        >
                          <UserPlus size={15} color={Colors.brand} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.lockedSection}>
            <Users size={24} color={Colors.textSecondary} />
            <Text style={styles.lockedText}>
              Add {displayName(selectedUser.name)} as a friend to see their connections
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Report modal */}
      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setReportVisible(false)}>
          <Pressable style={styles.reportModal} onPress={() => {}}>
            <View style={styles.reportModalHeader}>
              <View style={styles.reportModalTitleWrap}>
                <Text style={styles.reportEyebrow}>Safety</Text>
                <Text style={styles.reportModalTitle}>Report user</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setReportVisible(false)}>
                <X size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportLabel}>Reason</Text>
              <View style={styles.reasonList}>
                {(['inappropriate_behavior', 'fake_or_spam'] as const).map((reason) => (
                  <Pressable
                    key={reason}
                    style={[styles.reasonChip, reportReason === reason && styles.reasonChipSelected]}
                    onPress={() => setReportReason(reason)}
                  >
                    <Text style={[styles.reasonText, reportReason === reason && styles.reasonTextSelected]}>
                      {reason === 'inappropriate_behavior' ? 'Inappropriate behavior' : 'Fake or spam'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportLabel}>Short note</Text>
              <TextInput
                style={styles.reportInput}
                placeholder="Anything we should know?"
                placeholderTextColor={Colors.textTertiary}
                multiline
                value={reportDetails}
                onChangeText={setReportDetails}
                maxLength={500}
              />
            </View>

            <Pressable
              style={[styles.reportSubmitBtn, submittingReport && styles.reportSubmitBtnDisabled]}
              onPress={() => void handleSubmitReport()}
              disabled={submittingReport}
            >
              {submittingReport
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.reportSubmitText}>Submit report</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 20,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: Colors.background },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 44, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: Colors.brand,
  },
  backButtonText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  hero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  heroName: { fontSize: 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  heroAge: { fontSize: 16, color: Colors.textSecondary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 99, borderWidth: 1,
  },
  statusBadgeSingle: { backgroundColor: '#EDFDF5', borderColor: '#A7EAC6' },
  statusBadgeNotSingle: { backgroundColor: '#EEF4FF', borderColor: '#C7D7F8' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotSingle: { backgroundColor: Colors.success },
  dotNotSingle: { backgroundColor: Colors.accent },
  statusText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  heroBio: { fontSize: 15, textAlign: 'center', color: Colors.textSecondary, lineHeight: 22, maxWidth: 300 },
  mutualText: { fontSize: 13, color: Colors.textSecondary },

  addFriendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
    backgroundColor: Colors.brand,
    shadowColor: Colors.brand, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  addFriendButtonSent: { backgroundColor: Colors.success },
  addFriendText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  actionsSection: { gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, padding: 16, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    gap: 6,
  },
  actionCardPush: { borderColor: Colors.brandBorder, backgroundColor: Colors.brandLight },
  actionCardDone: { opacity: 0.65 },
  actionCardPressed: { opacity: 0.8 },
  actionIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  actionSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 4,
  },
  reportText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  emptyFriends: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyFriendsText: { fontSize: 13, color: Colors.textSecondary },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  inlineLoadingText: { fontSize: 13, color: Colors.textSecondary },

  friendList: {
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceMuted, padding: 10, gap: 8,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  friendRowPressed: { opacity: 0.8 },
  friendInfo: { flex: 1, gap: 3 },
  friendName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeFriends: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99, backgroundColor: Colors.success,
  },
  badgeFriendsText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  badgePending: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99, backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
  },
  badgePendingText: { fontSize: 11, fontWeight: '700', color: Colors.brand },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },

  lockedSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, padding: 16,
  },
  lockedText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  reportModal: {
    width: '100%', maxWidth: 460,
    borderRadius: 24, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    padding: 20, gap: 16,
  },
  reportModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  reportModalTitleWrap: { flex: 1, gap: 3 },
  reportEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: Colors.brand },
  reportModalTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  reportSection: { gap: 8 },
  reportLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  reasonList: { gap: 8 },
  reasonChip: {
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 14,
  },
  reasonChipSelected: { borderColor: Colors.brandBorder, backgroundColor: Colors.brandLight },
  reasonText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reasonTextSelected: { color: Colors.brand },
  reportInput: {
    minHeight: 100, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.text, textAlignVertical: 'top',
  },
  reportSubmitBtn: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  reportSubmitBtnDisabled: { opacity: 0.5 },
  reportSubmitText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

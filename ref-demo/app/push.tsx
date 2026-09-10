import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check, Info, Sparkles, UserCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { Friend } from '@/types';

function wantsGender(lookingFor?: string, gender?: string): boolean {
  if (!lookingFor || !gender) return true;
  if (lookingFor === 'everyone') return true;
  if (lookingFor === 'men') return gender === 'man';
  if (lookingFor === 'women') return gender === 'woman';
  return true;
}

function isCompatible(a: Friend | null, b: Friend): boolean {
  if (!a) return true;
  const aWantsB = wantsGender(a.lookingFor, b.gender);
  const bWantsA = wantsGender(b.lookingFor, a.gender);
  return aWantsB && bWantsA;
}

const NOTE_MAX = 200;

export default function PushScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ preselectedId?: string | string[]; pullRequestId?: string | string[] }>();
  const { friends, createPushRequest, addPullSuggestion } = useApp();

  const preselectedId = Array.isArray(params.preselectedId)
    ? params.preselectedId[0]
    : params.preselectedId;

  const pullRequestId = Array.isArray(params.pullRequestId)
    ? params.pullRequestId[0]
    : params.pullRequestId;

  const singleFriends = useMemo(
    () => friends.filter((f) => f.relationshipStatus === 'single'),
    [friends],
  );

  // When fulfilling a pull request, the requester may not be in singleFriends if their
  // status isn't set yet — search all friends so the preselection always works.
  const preselectedFriend = useMemo(
    () => preselectedId ? (friends.find((f) => f.id === preselectedId) ?? null) : null,
    [friends, preselectedId],
  );

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(
    preselectedId ? (friends.find((f) => f.id === preselectedId) ?? null) : null,
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [noteToTarget, setNoteToTarget] = useState('');
  const [noteToCandidate, setNoteToCandidate] = useState('');
  const [incompatibleTipId, setIncompatibleTipId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectableCandidates = useMemo(
    () => singleFriends.filter((f) => f.id !== selectedFriend?.id),
    [singleFriends, selectedFriend?.id],
  );

  const selectedCandidate = useMemo(
    () => selectableCandidates.find((f) => f.id === selectedCandidateId) ?? null,
    [selectableCandidates, selectedCandidateId],
  );

  const canSend = !!selectedFriend && !!selectedCandidate && !submitting;

  const displayName = (f: Friend) => f.name?.trim() || 'Unnamed friend';

  const handleSend = async () => {
    if (!selectedFriend || !selectedCandidate || submitting) return;
    setSubmitting(true);

    let ok: boolean;
    if (pullRequestId) {
      // Fulfilling a pull request: create a pull suggestion linked to the request
      ok = await addPullSuggestion(pullRequestId, selectedCandidate, noteToTarget, noteToCandidate);
    } else {
      // Unsolicited push intro
      ok = await createPushRequest(selectedFriend, [selectedCandidate], noteToTarget, noteToCandidate);
    }

    setSubmitting(false);
    if (!ok) {
      showToast('Could not send this introduction — please try again', 'error');
      return;
    }
    showToast(`${displayName(selectedFriend)} & ${displayName(selectedCandidate)} introduced 🎉`, 'success');
    router.replace('/home');
  };

  const listToShow = selectedFriend ? selectableCandidates : singleFriends;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Pressable style={styles.backNav} onPress={() => router.back()}>
          <ChevronLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <UserCheck size={18} color={Colors.brand} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Introduce</Text>
            <Text style={styles.headerTitle}>
              {pullRequestId
                ? `Who should meet ${displayName(selectedFriend ?? preselectedFriend)}?`
                : selectedFriend ? 'Choose another friend' : 'Choose one friend to start'}
            </Text>
            <Text style={styles.headerSub}>
              {pullRequestId
                ? `Pick a single friend to introduce to ${displayName(selectedFriend ?? preselectedFriend)}.`
                : selectedFriend
                  ? `Pick the second friend to set up with ${displayName(selectedFriend)}.`
                  : 'Pick the first friend you want to help.'}
            </Text>
          </View>
        </View>

        {/* Selected friend chip */}
        {selectedFriend ? (
          <View style={styles.selectedChip}>
            <Avatar photo={selectedFriend.photo} name={selectedFriend.name} userId={selectedFriend.id} size="sm" />
            <View style={styles.selectedChipInfo}>
              <Text style={styles.selectedChipLabel}>{pullRequestId ? 'Introducing' : 'Friend 1'}</Text>
              <Text style={styles.selectedChipName}>{displayName(selectedFriend)}</Text>
            </View>
            {!pullRequestId && (
              <Pressable
                style={styles.changeChip}
                onPress={() => { setSelectedFriend(null); setSelectedCandidateId(null); setNoteToTarget(''); setNoteToCandidate(''); }}
              >
                <ChevronLeft size={12} color={Colors.brand} />
                <Text style={styles.changeChipText}>Change</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* Sparkle hint + note when both selected */}
        {selectedFriend && selectedCandidate ? (
          <>
            <View style={styles.matchBanner}>
              <Sparkles size={14} color={Colors.brand} />
              <Text style={styles.matchBannerText}>
                {displayName(selectedFriend)} × {displayName(selectedCandidate)} — ready to introduce!
              </Text>
            </View>
            <View style={styles.noteWrap}>
              <Text style={styles.noteLabel}>
                Note to {displayName(selectedFriend)} <Text style={styles.noteOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder={`Hey ${displayName(selectedFriend)}, I think you'd really click with…`}
                placeholderTextColor={Colors.textTertiary}
                value={noteToTarget}
                onChangeText={(t) => setNoteToTarget(t.slice(0, NOTE_MAX))}
                multiline
                numberOfLines={3}
                maxLength={NOTE_MAX}
                textAlignVertical="top"
              />
              <Text style={styles.noteCount}>{noteToTarget.length}/{NOTE_MAX}</Text>
            </View>
            <View style={styles.noteWrap}>
              <Text style={styles.noteLabel}>
                Note to {displayName(selectedCandidate)} <Text style={styles.noteOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder={`Hey ${displayName(selectedCandidate)}, I know someone I think you'd love…`}
                placeholderTextColor={Colors.textTertiary}
                value={noteToCandidate}
                onChangeText={(t) => setNoteToCandidate(t.slice(0, NOTE_MAX))}
                multiline
                numberOfLines={3}
                maxLength={NOTE_MAX}
                textAlignVertical="top"
              />
              <Text style={styles.noteCount}>{noteToCandidate.length}/{NOTE_MAX}</Text>
            </View>
          </>
        ) : null}

        {/* Friend list */}
        <View style={styles.list}>
          {listToShow.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No single friends yet</Text>
              <Text style={styles.emptySub}>Add single friends to start making introductions.</Text>
            </View>
          ) : (
            listToShow.map((f) => {
              const isSelected = selectedFriend ? selectedCandidate?.id === f.id : false;
              const compatible = isCompatible(selectedFriend, f);
              const showTip = incompatibleTipId === f.id;
              return (
                <View key={f.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.friendCard,
                      isSelected && styles.friendCardSelected,
                      pressed && styles.friendCardPressed,
                      !compatible && styles.friendCardIncompatible,
                    ]}
                    onPress={() => {
                      if (!compatible && selectedFriend) {
                        setIncompatibleTipId(showTip ? null : f.id);
                        return;
                      }
                      setIncompatibleTipId(null);
                      if (!selectedFriend) {
                        setSelectedFriend(f);
                        setSelectedCandidateId(null);
                      } else {
                        setSelectedCandidateId(f.id);
                      }
                    }}
                  >
                    <Avatar photo={f.photo} name={f.name} userId={f.id} size="md" ring={isSelected} />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{displayName(f)}</Text>
                      {!compatible && selectedFriend ? (
                        <Text style={styles.incompatibleLabel}>
                          Not a match for {displayName(selectedFriend)}
                        </Text>
                      ) : (
                        <Text style={styles.friendStatus}>Single</Text>
                      )}
                    </View>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Check size={14} color={Colors.white} />
                      </View>
                    ) : !compatible && selectedFriend ? (
                      <Info size={16} color={Colors.textTertiary} />
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </Pressable>
                  {showTip && (
                    <View style={styles.incompatibleTip}>
                      <Text style={styles.incompatibleTipText}>
                        {displayName(f)} and {displayName(selectedFriend!)} are looking for different genders — they wouldn't be a match.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={[styles.ctaWrap, { bottom: Math.max(24, insets.bottom + 8) }]}>
        <Pressable
          style={[styles.ctaButton, !canSend && styles.ctaButtonDisabled]}
          disabled={!canSend}
          onPress={() => void handleSend()}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.ctaText}>
              {canSend
                ? `Introduce ${displayName(selectedFriend!)} & ${displayName(selectedCandidate!)}`
                : 'Introduce them'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 12 },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 14,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  headerCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    padding: 18,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.brand },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 1 },

  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    padding: 12,
  },
  selectedChipInfo: { flex: 1, gap: 1 },
  selectedChipLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.brand },
  selectedChipName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.white,
  },
  changeChipText: { fontSize: 12, fontWeight: '700', color: Colors.brand },

  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  matchBannerText: { fontSize: 13, fontWeight: '600', color: Colors.brand, flex: 1 },

  noteWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 8,
  },
  noteLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  noteOptional: { fontWeight: '400', color: Colors.textTertiary },
  noteInput: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 72,
    paddingTop: 0,
  },
  noteCount: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right' },

  list: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceMuted,
    padding: 10,
    gap: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendCardSelected: {
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
  },
  friendCardPressed: { opacity: 0.8 },
  friendCardIncompatible: { opacity: 0.4 },
  friendInfo: { flex: 1, gap: 2 },
  friendName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  friendStatus: { fontSize: 12, color: Colors.textSecondary },
  incompatibleLabel: { fontSize: 11, color: Colors.textTertiary },
  incompatibleTip: {
    marginTop: 4,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  incompatibleTipText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  ctaWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  ctaButtonDisabled: { opacity: 0.45 },
  ctaText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});

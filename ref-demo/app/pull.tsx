import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';

export default function PullScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ matchmakerId?: string | string[] }>();
  const { friends, pullRequests, createPullRequest } = useApp();

  const initialMatchmakerId = Array.isArray(params.matchmakerId)
    ? params.matchmakerId[0]
    : params.matchmakerId;

  const [selectedId, setSelectedId] = useState<string | null>(initialMatchmakerId ?? null);
  const [isSending, setIsSending] = useState(false);

  const matchmakers = useMemo(
    () => friends.filter((f) => f.relationshipStatus === 'not-single'),
    [friends],
  );

  const outgoing = useMemo(
    () =>
      pullRequests
        .filter((r) => r.role === 'outgoing')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [pullRequests],
  );

  const requestStatusByMatchmaker = useMemo(() => {
    const map = new Map<string, 'pending' | 'active' | 'completed'>();
    outgoing.forEach((r) => {
      const current = map.get(r.matchmaker.id);
      if (!current) { map.set(r.matchmaker.id, r.status); return; }
      if (current === 'completed' && r.status !== 'completed') map.set(r.matchmaker.id, r.status);
      if (current === 'pending' && r.status === 'active') map.set(r.matchmaker.id, 'active');
    });
    return map;
  }, [outgoing]);

  const selectedMatchmaker = useMemo(
    () => matchmakers.find((f) => f.id === selectedId) ?? null,
    [matchmakers, selectedId],
  );

  const displayName = (name?: string) => name?.trim() || 'Unnamed friend';

  const handleSend = async () => {
    if (!selectedMatchmaker || isSending) return;
    const status = requestStatusByMatchmaker.get(selectedMatchmaker.id);
    if (status && status !== 'completed') {
      showToast(`${displayName(selectedMatchmaker.name)} already has an active request from you`, 'info');
      return;
    }
    setIsSending(true);
    const ok = await createPullRequest(selectedMatchmaker);
    setIsSending(false);
    if (!ok) {
      showToast('Could not send this request — please try again', 'error');
      return;
    }
    showToast(`${displayName(selectedMatchmaker.name)} will look through their friends for you 🎉`, 'success');
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Pressable style={styles.backNav} onPress={() => router.back()}>
          <ChevronLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Heart size={18} color={Colors.brand} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Get introduced</Text>
            <Text style={styles.headerTitle}>Who would you like to ask?</Text>
            <Text style={styles.headerSub}>
              Pick one friend to look through their connections and introduce you to someone.
            </Text>
          </View>
        </View>

        {/* Matchmaker list */}
        {matchmakers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matchmakers available</Text>
            <Text style={styles.emptySub}>
              You need friends who are "not single" to ask for introductions.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {matchmakers.map((f) => {
              const isSelected = selectedId === f.id;
              const status = requestStatusByMatchmaker.get(f.id);
              const isBusy = status === 'pending' || status === 'active';

              return (
                <Pressable
                  key={f.id}
                  style={({ pressed }) => [
                    styles.card,
                    isSelected && styles.cardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => setSelectedId(f.id)}
                >
                  <Avatar photo={f.photo} name={f.name} userId={f.id} size="md" ring={isSelected} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{displayName(f.name)}</Text>
                    <Text style={styles.cardMeta}>Not single</Text>
                  </View>
                  {isBusy ? (
                    <View style={[styles.statusPill, status === 'active' ? styles.pillActive : styles.pillSent]}>
                      <Text style={[styles.pillText, status === 'active' ? styles.pillTextActive : styles.pillTextSent]}>
                        {status === 'active' ? 'Active' : 'Sent'}
                      </Text>
                    </View>
                  ) : isSelected ? (
                    <View style={styles.checkCircle}>
                      <Check size={14} color={Colors.white} />
                    </View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating CTA */}
      <View style={[styles.ctaWrap, { bottom: Math.max(24, insets.bottom + 8) }]}>
        <Pressable
          style={[styles.ctaButton, (!selectedMatchmaker || isSending) && styles.ctaButtonDisabled]}
          disabled={!selectedMatchmaker || isSending}
          onPress={() => void handleSend()}
        >
          {isSending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.ctaText}>
              {selectedMatchmaker
                ? `Ask ${displayName(selectedMatchmaker.name)}`
                : 'Ask for an introduction'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 12, paddingRight: 16 },
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

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  list: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceMuted,
    padding: 10,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSelected: {
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
  },
  cardPressed: { opacity: 0.8 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 12, color: Colors.textSecondary },

  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  pillSent: { backgroundColor: Colors.brandLight, borderColor: Colors.brandBorder },
  pillActive: { backgroundColor: '#EEF4FF', borderColor: '#C7D7F8' },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillTextSent: { color: Colors.brand },
  pillTextActive: { color: Colors.accent },

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

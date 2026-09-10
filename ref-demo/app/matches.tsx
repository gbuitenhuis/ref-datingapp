import { useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Heart, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { AppTabBar } from '@/components/AppTabBar';
import { Avatar } from '@/components/ui/Avatar';

export default function MatchesScreen() {
  const { matches, refreshFriends } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const completedMatches = matches.filter((m) => m.status === 'matched');
  const displayName = (name?: string) => name?.trim() || 'Unnamed';

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFriends();
    setRefreshing(false);
  };

  if (completedMatches.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Heart size={28} color={Colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>
            When someone you like likes you back, they'll appear here.
          </Text>
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
        <View style={styles.pageHeader}>
          <View style={styles.pageIconWrap}>
            <Heart size={18} color={Colors.brand} />
          </View>
          <View>
            <Text style={styles.pageTitle}>Matches</Text>
            <Text style={styles.pageCount}>
              {completedMatches.length} match{completedMatches.length === 1 ? '' : 'es'}
            </Text>
          </View>
        </View>

        {completedMatches.map((match) => (
          <View key={match.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Avatar photo={match.user.photo} name={match.user.name} userId={match.user.id} size="lg" ring />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{displayName(match.user.name)}</Text>
                {match.user.age ? <Text style={styles.cardAge}>{match.user.age}</Text> : null}
                <View style={styles.matchBadge}>
                  <Heart size={11} color={Colors.white} fill={Colors.white} />
                  <Text style={styles.badgeText}>via {displayName(match.matchedBy.name)}</Text>
                </View>
                {match.user.relationshipStatus === 'single' ? (
                  <View style={styles.singleBadge}>
                    <View style={styles.singleDot} />
                    <Text style={styles.singleText}>Single</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {match.user.bio ? (
              <Text style={styles.bio}>{match.user.bio}</Text>
            ) : null}

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => router.push({
                  pathname: '/chat',
                  params: {
                    matchId: match.id,
                    otherName: match.user.name,
                    otherPhoto: match.user.photo ?? '',
                    otherUserId: match.user.id,
                  },
                })}
              >
                <MessageCircle size={15} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Send Message</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <AppTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.4 },
  pageCount: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 18,
    gap: 14,
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  cardInfo: { flex: 1, gap: 6, paddingTop: 4 },
  cardName: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  cardAge: { fontSize: 14, color: Colors.textSecondary },
  matchBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  singleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: '#EDFDF5',
    borderColor: '#A7EAC6',
  },
  singleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  singleText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: Colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.brand, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  primaryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});

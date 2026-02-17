import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function MatchesScreen() {
  const { matches } = useApp();
  const completedMatches = matches.filter((match) => match.status === 'matched');

  if (completedMatches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Heart size={64} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptySubtitle}>
          When someone you like likes you back, they will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>
        You have {completedMatches.length} match
        {completedMatches.length === 1 ? '' : 'es'}
      </Text>

      {completedMatches.map((match) => (
        <View key={match.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Image source={{ uri: match.user.photo }} style={styles.avatar} />
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{match.user.name}</Text>
              <View style={styles.matchBadge}>
                <Heart size={12} color={Colors.white} fill={Colors.white} />
                <Text style={styles.badgeText}>Matched by {match.matchedBy.name}</Text>
              </View>
            </View>
          </View>

          {match.user.bio ? (
            <Text style={styles.bio}>{match.user.bio}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryButton}>
              <MessageCircle size={16} color={Colors.white} />
              <Text style={styles.primaryButtonText}>Send Message</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>View Profile</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            This is a prototype. Messaging will be available in the full version.
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: Colors.background,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.white,
  },
  bio: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

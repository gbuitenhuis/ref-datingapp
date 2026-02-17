import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Friend } from '@/types';

export default function PullScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchmakerId?: string }>();
  const { friends, createPullRequest } = useApp();
  const [selectedMatchmaker, setSelectedMatchmaker] = useState<Friend | null>(
    null,
  );

  const preselectedMatchmaker = useMemo(
    () => friends.find((friend) => friend.id === params.matchmakerId),
    [friends, params.matchmakerId],
  );

  useEffect(() => {
    if (preselectedMatchmaker) {
      createPullRequest(preselectedMatchmaker);
      Alert.alert(
        'Request Sent!',
        `${preselectedMatchmaker.name} will be notified to help you find a match.`,
      );
      router.back();
    }
  }, [createPullRequest, preselectedMatchmaker, router]);

  const matchmakers = useMemo(
    () => friends.filter((friend) => friend.relationshipStatus === 'not-single'),
    [friends],
  );

  if (preselectedMatchmaker) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Sending request...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Who should match you?</Text>
        <Text style={styles.subtitle}>
          Choose a friend who knows you well to find potential matches
        </Text>
      </View>

      {matchmakers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No matchmakers yet</Text>
          <Text style={styles.emptySubtitle}>
            Invite friends who are in relationships to help match you
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {matchmakers.map((friend) => {
            const isSelected = selectedMatchmaker?.id === friend.id;
            return (
              <Pressable
                key={friend.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelectedMatchmaker(friend)}
              >
                <Image source={{ uri: friend.photo }} style={styles.avatar} />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{friend.name}</Text>
                  {friend.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>
                      {friend.bio}
                    </Text>
                  ) : null}
                  <View style={styles.badge}>
                    <Heart size={14} color={Colors.white} fill={Colors.white} />
                    <Text style={styles.badgeText}>Matchmaker</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.selector,
                    isSelected && styles.selectorSelected,
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selectedMatchmaker && (
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            createPullRequest(selectedMatchmaker);
            Alert.alert(
              'Request Sent!',
              `${selectedMatchmaker.name} will be notified to help you find a match.`,
            );
            router.back();
          }}
        >
          <Text style={styles.primaryButtonText}>
            Request Match from {selectedMatchmaker.name}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardSelected: {
    borderColor: Colors.accent,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  bio: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.accent,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
  },
  selector: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectorSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  primaryButton: {
    height: 56,
    margin: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
  },
});

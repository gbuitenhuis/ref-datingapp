import { useMemo } from 'react';
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
import { Heart, UserCheck, UserPlus, Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Friend, User } from '@/types';

export default function FriendDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; suggestion?: string }>();
  const { id, suggestion } = params;
  const isSuggestion = suggestion === 'true';

  const {
    friends,
    suggestedFriends,
    sendFriendRequest,
    areFriends,
    isRequestPending,
    getFriendById,
  } = useApp();

  const selectedUser: Friend | User | undefined = useMemo(() => {
    if (!id) return undefined;
    if (isSuggestion) {
      return suggestedFriends.find((user) => user.id === id);
    }
    return getFriendById(id);
  }, [getFriendById, id, isSuggestion, suggestedFriends]);

  const alreadyFriends = selectedUser ? areFriends(selectedUser.id) : false;
  const requestPending = selectedUser ? isRequestPending(selectedUser.id) : false;

  const computeMutualFriends = (userId: string) => {
    const friend = friends.find((item) => item.id === userId);
    if (friend?.mutualFriendsCount) return friend.mutualFriendsCount;

    const friendIds = new Set(
      friends.flatMap((item) => item.friendsOfFriend?.map((fof) => fof.id) ?? []),
    );

    return friendIds.has(userId) ? 1 : 0;
  };

  if (!selectedUser) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>User not found</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const mutualCount = computeMutualFriends(selectedUser.id);
  const theirFriends = alreadyFriends
    ? friends.find((friend) => friend.id === selectedUser.id)?.friendsOfFriend ?? []
    : [];

  const handleAddFriend = (user: User) => {
    if (requestPending) return;
    sendFriendRequest(user);
    Alert.alert('Request Sent', `${user.name} will be notified soon.`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: selectedUser.photo }} style={styles.profilePhoto} />
        <Text style={styles.name}>{selectedUser.name}</Text>
        {selectedUser.age ? (
          <Text style={styles.age}>{selectedUser.age}</Text>
        ) : null}
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              selectedUser.relationshipStatus === 'single'
                ? styles.dotSingle
                : styles.dotMatchmaker,
            ]}
          />
          <Text style={styles.statusText}>
            {selectedUser.relationshipStatus === 'single' ? 'Single' : 'Not single'}
          </Text>
        </View>
        {selectedUser.bio ? (
          <Text style={styles.bio}>{selectedUser.bio}</Text>
        ) : null}
        {mutualCount > 0 && (
          <Text style={styles.mutualText}>
            {mutualCount} mutual friend{mutualCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {!alreadyFriends && (
        <Pressable
          style={[styles.primaryButton, requestPending && styles.disabledButton]}
          onPress={() => handleAddFriend(selectedUser)}
          disabled={requestPending}
        >
          <UserPlus size={18} color={Colors.white} />
          <Text style={styles.primaryButtonText}>
            {requestPending ? 'Request Sent' : 'Add Friend'}
          </Text>
        </Pressable>
      )}

      {alreadyFriends && (
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push(`/push?preselectedId=${encodeURIComponent(selectedUser.id)}`)
            }
          >
            <UserCheck size={20} color={Colors.secondary} />
            <Text style={styles.actionTitle}>Push</Text>
            <Text style={styles.actionSubtitle}>Introduce to someone</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push(`/pull?matchmakerId=${encodeURIComponent(selectedUser.id)}`)
            }
          >
            <Heart size={20} color={Colors.accent} />
            <Text style={styles.actionTitle}>Pull</Text>
            <Text style={styles.actionSubtitle}>Ask them to match you</Text>
          </Pressable>
        </View>
      )}

      {alreadyFriends ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Their Friends</Text>
          <Text style={styles.sectionSubtitle}>
            People {selectedUser.name} is connected with
          </Text>

          {theirFriends.length === 0 ? (
            <View style={styles.emptyFriends}>
              <Users size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyFriendsText}>No friends to show</Text>
            </View>
          ) : (
            theirFriends.map((fof) => {
              const alreadyFriend = areFriends(fof.id);
              const pending = isRequestPending(fof.id);
              return (
                <View key={fof.id} style={styles.friendRow}>
                  <Image source={{ uri: fof.photo }} style={styles.friendAvatar} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{fof.name}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          fof.relationshipStatus === 'single'
                            ? styles.dotSingle
                            : styles.dotMatchmaker,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {fof.relationshipStatus === 'single'
                          ? 'Single'
                          : 'Not single'}
                      </Text>
                    </View>
                  </View>
                  {alreadyFriend ? (
                    <View style={styles.badgeSuccess}>
                      <Text style={styles.badgeText}>Friends</Text>
                    </View>
                  ) : pending ? (
                    <View style={styles.badgePending}>
                      <Text style={styles.badgeText}>Pending</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleAddFriend(fof)}
                    >
                      <UserPlus size={18} color={Colors.secondary} />
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : (
        <View style={styles.lockedSection}>
          <Users size={48} color={Colors.textSecondary} />
          <Text style={styles.lockedText}>
            Add {selectedUser.name} as a friend to see their connections
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: Colors.background,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  age: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSingle: {
    backgroundColor: Colors.success,
  },
  dotMatchmaker: {
    backgroundColor: Colors.accent,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.text,
  },
  mutualText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyFriendsText: {
    color: Colors.textSecondary,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  friendInfo: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeSuccess: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.success,
  },
  badgePending: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.white,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  lockedText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
});

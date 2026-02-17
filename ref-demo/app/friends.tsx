import { useEffect } from 'react';
import { SectionList, StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, UserPlus, Users, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Friend, FriendRequest, User } from '@/types';

interface SectionItem {
  title: string;
  data: Array<Friend | FriendRequest | User>;
  type: 'requests' | 'pending' | 'friends' | 'suggestions' | 'empty';
}

export default function FriendsScreen() {
  const router = useRouter();
  const {
    friends,
    friendRequests,
    outgoingRequests,
    suggestedFriends,
    refreshFriends,
    acceptFriendRequest,
    declineFriendRequest,
  } = useApp();

  useEffect(() => {
    void refreshFriends();
  }, [refreshFriends]);

  const sections: SectionItem[] = [];

  if (friendRequests.length > 0) {
    sections.push({
      title: 'Friend Requests',
      data: friendRequests,
      type: 'requests',
    });
  }

  if (outgoingRequests.length > 0) {
    sections.push({
      title: 'Pending Requests',
      data: outgoingRequests,
      type: 'pending',
    });
  }

  sections.push({
    title: `Friends (${friends.length})`,
    data: friends,
    type: 'friends',
  });

  if (suggestedFriends.length > 0) {
    sections.push({
      title: 'People You Might Know',
      data: suggestedFriends,
      type: 'suggestions',
    });
  }

  const isEmpty =
    friendRequests.length === 0 &&
    outgoingRequests.length === 0 &&
    friends.length === 0 &&
    suggestedFriends.length === 0;

  const renderRequest = (request: FriendRequest) => (
    <View style={styles.requestCard}>
      <Image source={{ uri: request.from.photo }} style={styles.avatar} />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{request.from.name}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              request.from.relationshipStatus === 'single'
                ? styles.dotSingle
                : styles.dotMatchmaker,
            ]}
          />
          <Text style={styles.statusText}>
            {request.from.relationshipStatus === 'single'
              ? 'Single'
              : 'Not single'}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.actionCircle, styles.actionAccept]}
          onPress={() => acceptFriendRequest(request.id)}
        >
          <Check size={18} color={Colors.white} />
        </Pressable>
        <Pressable
          style={[styles.actionCircle, styles.actionDecline]}
          onPress={() => declineFriendRequest(request.id)}
        >
          <X size={18} color={Colors.secondary} />
        </Pressable>
      </View>
    </View>
  );

  const renderPending = (request: FriendRequest) => (
    <View style={[styles.card, styles.pendingCard]}>
      <Image source={{ uri: request.to.photo }} style={styles.avatar} />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{request.to.name}</Text>
        <Text style={styles.pendingText}>Request pending</Text>
      </View>
    </View>
  );

  const renderFriend = (friend: Friend) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/friend-detail?id=${friend.id}`)}
    >
      <Image source={{ uri: friend.photo }} style={styles.avatar} />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{friend.name}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              friend.relationshipStatus === 'single'
                ? styles.dotSingle
                : styles.dotMatchmaker,
            ]}
          />
          <Text style={styles.statusText}>
            {friend.relationshipStatus === 'single' ? 'Single' : 'Not single'}
          </Text>
        </View>
        {!!friend.mutualFriendsCount && friend.mutualFriendsCount > 0 && (
          <Text style={styles.mutualText}>
            {friend.mutualFriendsCount} mutual friend
            {friend.mutualFriendsCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>
    </Pressable>
  );

  const renderSuggestion = (user: Friend) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push(`/friend-detail?id=${user.id}&suggestion=true`)
      }
    >
      <Image source={{ uri: user.photo }} style={styles.avatar} />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              user.relationshipStatus === 'single'
                ? styles.dotSingle
                : styles.dotMatchmaker,
            ]}
          />
          <Text style={styles.statusText}>
            {user.relationshipStatus === 'single' ? 'Single' : 'Not single'}
          </Text>
        </View>
        {!!user.mutualFriendsCount && (
          <Text style={styles.mutualText}>
            {user.mutualFriendsCount} mutual friend
            {user.mutualFriendsCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>
      <Pressable style={styles.addButton}>
        <UserPlus size={18} color={Colors.secondary} />
      </Pressable>
    </Pressable>
  );

  if (isEmpty) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Users size={64} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptySubtitle}>
          Share your invite link or scan QR codes to connect with friends
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/invite')}
        >
          <Text style={styles.primaryButtonText}>Invite Friends</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${index}-${(item as any).id ?? 'item'}`}
      contentContainerStyle={styles.container}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item, section }) => {
        if (section.type === 'requests') {
          return renderRequest(item as FriendRequest);
        }
        if (section.type === 'pending') {
          return renderPending(item as FriendRequest);
        }
        if (section.type === 'friends') {
          return renderFriend(item as Friend);
        }
        if (section.type === 'suggestions') {
          return renderSuggestion(item as Friend);
        }
        return null;
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.secondary,
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: Colors.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  mutualText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionAccept: {
    backgroundColor: Colors.success,
  },
  actionDecline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
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
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
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
  primaryButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
});

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
import { Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Friend } from '@/types';

export default function PushScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preselectedId?: string }>();
  const { friends, createPushRequest } = useApp();
  const preselectedId = params.preselectedId;

  const preselectedFriend = useMemo(
    () => friends.find((friend) => friend.id === preselectedId),
    [friends, preselectedId],
  );

  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (preselectedFriend && selectedFriends.length === 0) {
      setSelectedFriends([preselectedFriend]);
    }
  }, [preselectedFriend, selectedFriends.length]);

  const singleFriends = useMemo(
    () =>
      friends.filter(
        (friend) =>
          friend.relationshipStatus === 'single' && friend.id !== preselectedId,
      ),
    [friends, preselectedId],
  );

  const handleSelectFriend = (friend: Friend) => {
    if (preselectedFriend) {
      setSelectedFriends([preselectedFriend, friend]);
      setTimeout(() => {
        createPushRequest(preselectedFriend, friend);
        Alert.alert('Match Sent!', `${preselectedFriend.name} and ${friend.name} will be notified.`);
        router.back();
      }, 300);
      return;
    }

    const alreadySelected = selectedFriends.some((item) => item.id === friend.id);
    if (alreadySelected) {
      setSelectedFriends((prev) => prev.filter((item) => item.id !== friend.id));
      return;
    }

    if (selectedFriends.length < 2) {
      setSelectedFriends((prev) => [...prev, friend]);
    }
  };

  const canMatch = !preselectedFriend && selectedFriends.length === 2;

  const handleMatch = () => {
    if (selectedFriends.length !== 2) return;
    const [first, second] = selectedFriends;
    createPushRequest(first, second);
    Alert.alert(
      'Match Sent!',
      `${first.name} and ${second.name} will be notified that you think they'd be a good match.`,
    );
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {preselectedFriend
            ? `Who should meet ${preselectedFriend.name}?`
            : 'Select 2 friends to match'}
        </Text>
        <Text style={styles.subtitle}>
          {preselectedFriend
            ? `Select another single friend to introduce to ${preselectedFriend.name}`
            : "They'll both get a notification that you think they'd be a good match"}
        </Text>
        {!preselectedFriend && (
          <Text style={styles.counter}>Selected: {selectedFriends.length}/2</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {singleFriends.map((friend) => {
          const isSelected = selectedFriends.some((item) => item.id === friend.id);
          return (
            <Pressable
              key={friend.id}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
              ]}
              onPress={() => handleSelectFriend(friend)}
            >
              <Image source={{ uri: friend.photo }} style={styles.avatar} />
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{friend.name}</Text>
                {friend.bio ? (
                  <Text style={styles.bio} numberOfLines={2}>
                    {friend.bio}
                  </Text>
                ) : null}
                {friend.age ? (
                  <Text style={styles.age}>{friend.age}</Text>
                ) : null}
              </View>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Check size={18} color={Colors.white} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {canMatch && (
        <Pressable style={styles.primaryButton} onPress={handleMatch}>
          <Text style={styles.primaryButtonText}>
            Match {selectedFriends[0].name} & {selectedFriends[1].name}
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
  counter: {
    fontSize: 13,
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
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
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
  age: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    height: 56,
    margin: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

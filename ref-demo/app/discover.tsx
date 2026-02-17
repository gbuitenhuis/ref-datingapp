import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Plus, MapPin } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { User } from '@/types';

export default function DiscoverScreen() {
  const { currentUser, refreshFriends } = useApp();
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/discovery/${currentUser.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) return;

    setAddingFriendId(friendId);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          friendId: friendId,
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        // Remove from profiles
        setProfiles(profiles.filter(p => p.id !== friendId));
        await refreshFriends();
      } else {
        Alert.alert('Error', 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setAddingFriendId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.emptySubtitle}>Loading people to add...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyTitle}>No one to add yet</Text>
          <Text style={styles.emptySubtitle}>
            Come back later or ask your friends to invite people
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder} />
              )}
            </View>
            
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {item.name}{item.age ? `, ${item.age}` : ''}
              </Text>
              
              {item.bio && (
                <Text style={styles.profileBio} numberOfLines={2}>
                  {item.bio}
                </Text>
              )}
              
              {item.location && (
                <View style={styles.locationRow}>
                  <MapPin size={14} color={Colors.textSecondary} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              )}
            </View>

            <Pressable
              style={[
                styles.addButton,
                addingFriendId === item.id && styles.addButtonLoading
              ]}
              onPress={() => handleAddFriend(item.id)}
              disabled={addingFriendId === item.id}
            >
              {addingFriendId === item.id ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Plus size={20} color={Colors.white} />
              )}
              <Text style={styles.addButtonText}>Add Friend</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.border,
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  profileBio: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLoading: {
    opacity: 0.7,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
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
    paddingHorizontal: 32,
  },
});

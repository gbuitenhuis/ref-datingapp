import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { User } from '@/types';

export default function InviteAcceptScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser } = useApp();
  const [inviterProfile, setInviterProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadInviterProfile();
  }, [userId]);

  const loadInviterProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'Invalid invite link');
      router.back();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/profiles/${userId}`
      );
      if (response.ok) {
        const profile = await response.json();
        setInviterProfile(profile);
      } else {
        Alert.alert('Error', 'User not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!currentUser || !inviterProfile) return;

    setAccepting(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/friends/add`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            friendId: inviterProfile.id,
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success!',
          `You're now friends with ${inviterProfile.name}!`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/friends'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add friend. You might already be friends!');
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      Alert.alert('Error', 'Failed to add friend');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading invite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!inviterProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Invalid invite link</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join Ref!</Text>
        <Text style={styles.subtitle}>
          {inviterProfile.name} invited you to join Ref
        </Text>

        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {inviterProfile.photo ? (
              <Image
                source={{ uri: inviterProfile.photo }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder} />
            )}
          </View>

          <Text style={styles.inviterName}>
            {inviterProfile.name}{inviterProfile.age ? `, ${inviterProfile.age}` : ''}
          </Text>

          {inviterProfile.bio && (
            <Text style={styles.inviterBio}>{inviterProfile.bio}</Text>
          )}
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageText}>
            Add {inviterProfile.name} as a friend to get started. You can help each
            other find matches!
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.acceptButton, accepting && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Check size={20} color={Colors.white} />
            )}
            <Text style={styles.acceptButtonText}>
              {accepting ? 'Adding...' : 'Add as Friend'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={accepting}
          >
            <X size={20} color={Colors.text} />
            <Text style={styles.declineButtonText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    gap: 16,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.secondary,
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
  inviterName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  inviterBio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  messageBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declineButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

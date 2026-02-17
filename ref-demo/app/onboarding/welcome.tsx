import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { RelationshipStatus } from '@/types';

export default function WelcomeScreen() {
  const router = useRouter();
  const { completeOnboarding, currentUser } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatus | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName((prev) => (prev ? prev : currentUser.name ?? ''));
      setPhoto((prev) => (prev ? prev : currentUser.photo ?? ''));
      setRelationshipStatus((prev) => prev ?? currentUser.relationshipStatus);
    }
  }, [currentUser]);

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to continue.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]?.uri ?? '');
    }
  };

  const handleComplete = () => {
    if (!relationshipStatus) return;

    completeOnboarding({
      id: currentUser?.id ?? 'current-user',
      name: name.trim(),
      photo,
      relationshipStatus,
    });

    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Welcome to Ref</Text>
            <Text style={styles.subtitle}>
              The dating app where your friends help you find meaningful
              connections
            </Text>

            <View style={styles.bulletList}>
              {[
                'Get matched by people who know you',
                'No endless swiping',
                'Play cupid for your friends',
              ].map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setStep(2)}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Create your profile</Text>
            <Text style={styles.subtitle}>Add a photo and tell us your name</Text>

            <Pressable style={styles.photoButton} onPress={handlePickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera color={Colors.textSecondary} size={28} />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.photoHelper}>You can add or change your photo later</Text>

            <TextInput
              placeholder="Your first name"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Pressable
              style={[
                styles.primaryButton,
                !name.trim() && styles.primaryButtonDisabled,
              ]}
              disabled={!name.trim()}
              onPress={() => setStep(3)}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Relationship status</Text>
            <Text style={styles.subtitle}>
              Singles get matched. Non-singles can play matchmaker for friends.
            </Text>

            <View style={styles.statusList}>
              <Pressable
                style={[
                  styles.statusCard,
                  relationshipStatus === 'single' && styles.statusCardSelected,
                ]}
                onPress={() => setRelationshipStatus('single')}
              >
                <User
                  color={
                    relationshipStatus === 'single'
                      ? Colors.white
                      : Colors.text
                  }
                  size={32}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    relationshipStatus === 'single' && styles.statusTextSelected,
                  ]}
                >
                  I'm Single
                </Text>
                <Text
                  style={[
                    styles.statusSubtitle,
                    relationshipStatus === 'single' && styles.statusTextSelected,
                  ]}
                >
                  Get matched by friends
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.statusCard,
                  relationshipStatus === 'not-single' &&
                    styles.statusCardSelected,
                ]}
                onPress={() => setRelationshipStatus('not-single')}
              >
                <Check
                  color={
                    relationshipStatus === 'not-single'
                      ? Colors.white
                      : Colors.text
                  }
                  size={32}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    relationshipStatus === 'not-single' &&
                      styles.statusTextSelected,
                  ]}
                >
                  Not Single
                </Text>
                <Text
                  style={[
                    styles.statusSubtitle,
                    relationshipStatus === 'not-single' &&
                      styles.statusTextSelected,
                  ]}
                >
                  Match your friends
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                !relationshipStatus && styles.primaryButtonDisabled,
              ]}
              disabled={!relationshipStatus}
              onPress={handleComplete}
            >
              <Text style={styles.primaryButtonText}>Complete</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepContainer: {
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  bulletText: {
    fontSize: 15,
    color: Colors.text,
  },
  primaryButton: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  photoButton: {
    alignSelf: 'center',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  photoHelper: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
    opacity: 0.7,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  statusList: {
    gap: 16,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  statusCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusTextSelected: {
    color: Colors.white,
  },
});

import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, ChevronLeft, Heart, Users } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { RelationshipStatus, Gender, LookingFor } from '@/types';

const TOTAL_STEPS = 6;
const BIO_MAX = 300;
const DRAFT_KEY = '@ref_onboarding_draft';

type Draft = {
  step: number;
  name: string;
  age: string;
  photo: string;
  relationshipStatus: RelationshipStatus | null;
  gender: Gender | null;
  lookingFor: LookingFor | null;
  bio: string;
};

export default function WelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteUserId?: string | string[] }>();
  const { completeOnboarding, currentUser } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [photo, setPhoto] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);
  const [bio, setBio] = useState('');

  const inviteUserId = Array.isArray(params.inviteUserId)
    ? params.inviteUserId[0]
    : params.inviteUserId;

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft: Draft = JSON.parse(raw);
          if (draft.step > 1) setStep(draft.step);
          if (draft.name) setName(draft.name);
          if (draft.age) setAge(draft.age);
          if (draft.photo) setPhoto(draft.photo);
          if (draft.relationshipStatus) setRelationshipStatus(draft.relationshipStatus);
          if (draft.gender) setGender(draft.gender);
          if (draft.lookingFor) setLookingFor(draft.lookingFor);
          if (draft.bio) setBio(draft.bio);
        }
      } catch {}
    };
    void loadDraft();
  }, []);

  // Seed from existing user profile if available
  useEffect(() => {
    if (currentUser) {
      setName((prev) => prev || currentUser.name || '');
      setPhoto((prev) => prev || currentUser.photo || '');
      setRelationshipStatus((prev) => prev ?? currentUser.relationshipStatus);
      setGender((prev) => prev ?? currentUser.gender ?? null);
      setLookingFor((prev) => prev ?? currentUser.lookingFor ?? null);
      if ('bio' in currentUser && (currentUser as any).bio) {
        setBio((prev) => prev || (currentUser as any).bio || '');
      }
      if ('age' in currentUser && (currentUser as any).age) {
        setAge((prev) => prev || String((currentUser as any).age) || '');
      }
    }
  }, [currentUser]);

  const saveDraft = async (nextStep: number) => {
    try {
      const draft: Draft = {
        step: nextStep,
        name,
        age,
        photo,
        relationshipStatus,
        gender,
        lookingFor,
        bio,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  };

  const advanceTo = async (nextStep: number) => {
    await saveDraft(nextStep);
    setStep(nextStep);
  };

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
    if (!result.canceled) setPhoto(result.assets[0]?.uri ?? '');
  };

  const handleComplete = async () => {
    if (!relationshipStatus || !name.trim()) return;
    const parsedAge = parseInt(age, 10);
    completeOnboarding({
      id: currentUser?.id ?? 'current-user',
      name: name.trim(),
      photo,
      relationshipStatus,
      ...(gender ? { gender } : {}),
      ...(lookingFor ? { lookingFor } : {}),
      ...(bio.trim() ? { bio: bio.trim() } : {}),
      ...(parsedAge >= 18 && parsedAge <= 120 ? { age: parsedAge } : {}),
    });
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
    if (inviteUserId) {
      router.replace({ pathname: '/invite-accept', params: { userId: inviteUserId } });
    } else {
      router.replace('/home');
    }
  };

  const ageNum = parseInt(age, 10);
  const ageValid = !age.trim() || (ageNum >= 18 && ageNum <= 120);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Step dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < step ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step > 1 && (
            <Pressable style={styles.back} onPress={() => setStep(step - 1)}>
              <ChevronLeft size={20} color={Colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}

          {/* Step 1 — profile (name, photo, age) */}
          {step === 1 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 1 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>Your profile</Text>
                <Text style={styles.subtitle}>Add a photo, your name, and age.</Text>
              </View>

              <Pressable style={styles.photoButton} onPress={() => void handlePickImage()}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera color={Colors.brand} size={26} />
                    <Text style={styles.photoPlaceholderText}>Add photo</Text>
                  </View>
                )}
                <View style={styles.photoEditBadge}>
                  <Camera size={12} color={Colors.white} />
                </View>
              </Pressable>
              <Text style={styles.photoHelper}>You can change this any time</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Your first name</Text>
                <TextInput
                  placeholder="Name"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Age <Text style={styles.inputOptional}>(optional)</Text></Text>
                <TextInput
                  placeholder="Your age"
                  placeholderTextColor={Colors.textTertiary}
                  style={[styles.input, !ageValid && styles.inputError]}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                {!ageValid ? (
                  <Text style={styles.inputHint}>Please enter a valid age (18–120)</Text>
                ) : null}
              </View>

              <Pressable
                style={[styles.primaryButton, (!name.trim() || !ageValid) && styles.primaryButtonDisabled]}
                disabled={!name.trim() || !ageValid}
                onPress={() => void advanceTo(2)}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Step 2 — relationship status */}
          {step === 2 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 2 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>Your status</Text>
                <Text style={styles.subtitle}>
                  Singles get introduced. Non-singles help make introductions.
                </Text>
              </View>

              <View style={styles.statusList}>
                <Pressable
                  style={[styles.statusCard, relationshipStatus === 'single' && styles.statusCardSelected]}
                  onPress={() => setRelationshipStatus('single')}
                >
                  <View style={[styles.statusIcon, relationshipStatus === 'single' && styles.statusIconSelected]}>
                    <Heart size={22} color={relationshipStatus === 'single' ? Colors.white : Colors.brand} />
                  </View>
                  <View style={styles.statusCopy}>
                    <Text style={[styles.statusTitle, relationshipStatus === 'single' && styles.statusTitleSelected]}>
                      I'm single
                    </Text>
                    <Text style={[styles.statusSub, relationshipStatus === 'single' && styles.statusSubSelected]}>
                      Open to being introduced by friends
                    </Text>
                  </View>
                  {relationshipStatus === 'single' ? (
                    <View style={styles.checkCircle}><Check size={14} color={Colors.white} /></View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>

                <Pressable
                  style={[styles.statusCard, relationshipStatus === 'not-single' && styles.statusCardSelected]}
                  onPress={() => setRelationshipStatus('not-single')}
                >
                  <View style={[styles.statusIcon, relationshipStatus === 'not-single' && styles.statusIconSelected]}>
                    <Users size={22} color={relationshipStatus === 'not-single' ? Colors.white : Colors.brand} />
                  </View>
                  <View style={styles.statusCopy}>
                    <Text style={[styles.statusTitle, relationshipStatus === 'not-single' && styles.statusTitleSelected]}>
                      Not single
                    </Text>
                    <Text style={[styles.statusSub, relationshipStatus === 'not-single' && styles.statusSubSelected]}>
                      Here to set friends up
                    </Text>
                  </View>
                  {relationshipStatus === 'not-single' ? (
                    <View style={styles.checkCircle}><Check size={14} color={Colors.white} /></View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>
              </View>

              <Pressable
                style={[styles.primaryButton, !relationshipStatus && styles.primaryButtonDisabled]}
                disabled={!relationshipStatus}
                onPress={() => void advanceTo(3)}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Step 3 — gender */}
          {step === 3 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 3 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>Your gender</Text>
                <Text style={styles.subtitle}>This helps us personalise your experience.</Text>
              </View>

              <View style={styles.statusList}>
                {(['man', 'woman', 'non-binary'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.statusCard, gender === g && styles.statusCardSelected]}
                    onPress={() => setGender(g)}
                  >
                    <View style={styles.statusCopy}>
                      <Text style={[styles.statusTitle, gender === g && styles.statusTitleSelected]}>
                        {g === 'man' ? 'Man' : g === 'woman' ? 'Woman' : 'Non-binary'}
                      </Text>
                    </View>
                    {gender === g ? (
                      <View style={styles.checkCircle}><Check size={14} color={Colors.white} /></View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.primaryButton, !gender && styles.primaryButtonDisabled]}
                disabled={!gender}
                onPress={() => void advanceTo(4)}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Step 4 — looking for */}
          {step === 4 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 4 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>Who you're open to</Text>
                <Text style={styles.subtitle}>Let your friends know who you'd like to meet.</Text>
              </View>

              <View style={styles.statusList}>
                {(['men', 'women', 'everyone'] as LookingFor[]).map((lf) => (
                  <Pressable
                    key={lf}
                    style={[styles.statusCard, lookingFor === lf && styles.statusCardSelected]}
                    onPress={() => setLookingFor(lf)}
                  >
                    <View style={styles.statusCopy}>
                      <Text style={[styles.statusTitle, lookingFor === lf && styles.statusTitleSelected]}>
                        {lf === 'men' ? 'Men' : lf === 'women' ? 'Women' : 'Everyone'}
                      </Text>
                    </View>
                    {lookingFor === lf ? (
                      <View style={styles.checkCircle}><Check size={14} color={Colors.white} /></View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.primaryButton, !lookingFor && styles.primaryButtonDisabled]}
                disabled={!lookingFor}
                onPress={() => void advanceTo(5)}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Step 5 — bio */}
          {step === 5 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 5 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>About you</Text>
                <Text style={styles.subtitle}>
                  A short bio helps your friends introduce you better. <Text style={styles.optional}>Optional.</Text>
                </Text>
              </View>

              <View style={styles.bioWrap}>
                <TextInput
                  style={styles.bioInput}
                  placeholder="A few words about who you are and what you're looking for…"
                  placeholderTextColor={Colors.textTertiary}
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                  multiline
                  numberOfLines={5}
                  maxLength={BIO_MAX}
                  textAlignVertical="top"
                />
                <Text style={styles.bioCount}>{bio.length}/{BIO_MAX}</Text>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() => void advanceTo(6)}
              >
                <Text style={styles.primaryButtonText}>{bio.trim() ? 'Continue' : 'Skip for now'}</Text>
              </Pressable>
            </View>
          )}

          {/* Step 6 — how it works */}
          {step === 6 && (
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>Step 6 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>How Ref works</Text>
                <Text style={styles.subtitle}>
                  Two simple ways to use your trusted network.
                </Text>
              </View>

              <View style={styles.featureList}>
                <View style={styles.featureCard}>
                  <View style={[styles.featureIcon, { backgroundColor: Colors.brandLight }]}>
                    <Users size={20} color={Colors.brand} />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Introduce friends</Text>
                    <Text style={styles.featureText}>
                      Think two people you know would hit it off? Set them up.
                    </Text>
                  </View>
                </View>
                <View style={styles.featureCard}>
                  <View style={[styles.featureIcon, { backgroundColor: '#EEF4FF' }]}>
                    <Heart size={20} color={Colors.accent} />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>Get introduced</Text>
                    <Text style={styles.featureText}>
                      Ask a friend you trust to introduce you to someone they know.
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.primaryButton, !relationshipStatus && styles.primaryButtonDisabled]}
                disabled={!relationshipStatus}
                onPress={() => void handleComplete()}
              >
                <Text style={styles.primaryButtonText}>Get started</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.brand,
  },
  dotInactive: {
    width: 12,
    backgroundColor: Colors.border,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 28,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingRight: 16,
  },
  backText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  step: { gap: 24 },
  stepHeader: { gap: 6 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.brand,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  optional: { color: Colors.textTertiary, fontStyle: 'italic' },

  // Photo
  photoButton: {
    alignSelf: 'center',
    position: 'relative',
  },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.brandLight,
    borderWidth: 1.5,
    borderColor: Colors.brandBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: { fontSize: 13, color: Colors.brand, fontWeight: '600' },
  photoEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  photoHelper: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  inputWrap: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  inputOptional: { fontWeight: '400', color: Colors.textTertiary },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.error },
  inputHint: { fontSize: 12, color: Colors.error },

  // Bio
  bioWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 8,
  },
  bioInput: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    minHeight: 120,
    paddingTop: 0,
  },
  bioCount: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right' },

  // Status cards
  statusList: { gap: 12 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  statusCardSelected: {
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconSelected: { backgroundColor: Colors.brand },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  statusTitleSelected: { color: Colors.text },
  statusSub: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  statusSubSelected: { color: Colors.textSecondary },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  // Feature cards
  featureList: { gap: 12 },
  featureCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureCopy: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  featureText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },

  // CTA
  primaryButton: {
    height: 56,
    backgroundColor: Colors.brand,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});

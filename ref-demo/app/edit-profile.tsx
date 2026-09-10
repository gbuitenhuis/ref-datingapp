import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { Camera, Check, ChevronLeft, Heart, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { RelationshipStatus, Gender, LookingFor } from '@/types';

export default function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, updateProfile } = useApp();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? '');
    setPhoto(currentUser.photo ?? '');
    setBio(currentUser.bio ?? '');
    setAge(currentUser.age ? String(currentUser.age) : '');
    setPhone(currentUser.phone ?? '');
    setRelationshipStatus(currentUser.relationshipStatus ?? null);
    setGender(currentUser.gender ?? null);
    setLookingFor(currentUser.lookingFor ?? null);
  }, [currentUser]);

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to change your profile picture.');
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

  const handleSave = async () => {
    if (!name.trim() || !relationshipStatus || saving) return;
    const parsedAge = age.trim() ? parseInt(age.trim(), 10) : undefined;
    if (age.trim() && (isNaN(parsedAge!) || parsedAge! < 18 || parsedAge! > 120)) {
      showToast('Please enter a valid age (18–120)', 'error');
      return;
    }
    setSaving(true);
    const ok = await updateProfile({
      name: name.trim(),
      photo,
      bio: bio.trim() || undefined,
      age: parsedAge,
      relationshipStatus,
      phone: phone.trim() || undefined,
      ...(gender ? { gender } : {}),
      ...(lookingFor ? { lookingFor } : {}),
    });
    setSaving(false);
    if (!ok) { showToast('Could not save — please try again', 'error'); return; }
    showToast('Profile saved', 'success');
    router.back();
  };

  const canSave = name.trim().length > 0 && !!relationshipStatus && !saving;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Nav */}
          <Pressable style={styles.backNav} onPress={() => router.back()}>
            <ChevronLeft size={18} color={Colors.textSecondary} />
            <Text style={styles.backNavText}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit profile</Text>
            <Text style={styles.subtitle}>Update how people see you on Ref.</Text>
          </View>

          {/* Photo */}
          <View style={styles.photoSection}>
            <Pressable style={styles.photoButton} onPress={() => void handlePickImage()}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
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
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your first name</Text>
            <TextInput
              placeholder="Name"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Age */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your age</Text>
            <TextInput
              placeholder="e.g. 28"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>About you</Text>
            <TextInput
              placeholder="A sentence or two about yourself — helps friends describe you when making an intro."
              placeholderTextColor={Colors.textTertiary}
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number (optional)</Text>
            <Text style={styles.fieldSub}>Used so friends can find you on Ref — never shown publicly.</Text>
            <TextInput
              placeholder="+31 6 12345678"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={30}
            />
          </View>

          {/* Status */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Relationship status</Text>
            <Text style={styles.fieldSub}>Singles get introduced. Non-singles help make introductions.</Text>
            <View style={styles.statusList}>
              <Pressable
                style={[styles.statusCard, relationshipStatus === 'single' && styles.statusCardSelected]}
                onPress={() => setRelationshipStatus('single')}
              >
                <View style={[styles.statusIcon, relationshipStatus === 'single' && styles.statusIconSelected]}>
                  <Heart size={20} color={relationshipStatus === 'single' ? Colors.white : Colors.brand} />
                </View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>I'm single</Text>
                  <Text style={styles.statusSub}>Open to being introduced by friends</Text>
                </View>
                {relationshipStatus === 'single' ? (
                  <View style={styles.checkCircle}><Check size={13} color={Colors.white} /></View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </Pressable>

              <Pressable
                style={[styles.statusCard, relationshipStatus === 'not-single' && styles.statusCardSelected]}
                onPress={() => setRelationshipStatus('not-single')}
              >
                <View style={[styles.statusIcon, relationshipStatus === 'not-single' && styles.statusIconSelected]}>
                  <Users size={20} color={relationshipStatus === 'not-single' ? Colors.white : Colors.brand} />
                </View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>Not single</Text>
                  <Text style={styles.statusSub}>Here to set friends up</Text>
                </View>
                {relationshipStatus === 'not-single' ? (
                  <View style={styles.checkCircle}><Check size={13} color={Colors.white} /></View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your gender</Text>
            <View style={styles.statusList}>
              {(['man', 'woman', 'non-binary'] as Gender[]).map((g) => (
                <Pressable
                  key={g}
                  style={[styles.statusCard, gender === g && styles.statusCardSelected]}
                  onPress={() => setGender(g)}
                >
                  <View style={styles.statusCopy}>
                    <Text style={styles.statusTitle}>
                      {g === 'man' ? 'Man' : g === 'woman' ? 'Woman' : 'Non-binary'}
                    </Text>
                  </View>
                  {gender === g ? (
                    <View style={styles.checkCircle}><Check size={13} color={Colors.white} /></View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Looking for */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Who you're open to</Text>
            <View style={styles.statusList}>
              {(['men', 'women', 'everyone'] as LookingFor[]).map((lf) => (
                <Pressable
                  key={lf}
                  style={[styles.statusCard, lookingFor === lf && styles.statusCardSelected]}
                  onPress={() => setLookingFor(lf)}
                >
                  <View style={styles.statusCopy}>
                    <Text style={styles.statusTitle}>
                      {lf === 'men' ? 'Men' : lf === 'women' ? 'Women' : 'Everyone'}
                    </Text>
                  </View>
                  {lookingFor === lf ? (
                    <View style={styles.checkCircle}><Check size={13} color={Colors.white} /></View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Save */}
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            disabled={!canSave}
            onPress={() => void handleSave()}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 24,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },

  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 16 },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  header: { gap: 5 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  photoSection: { alignItems: 'center', gap: 8 },
  photoButton: { alignSelf: 'center', position: 'relative' },
  photoPreview: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.brandLight,
    borderWidth: 1.5, borderColor: Colors.brandBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  photoPlaceholderText: { fontSize: 13, color: Colors.brand, fontWeight: '600' },
  photoEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  photoHelper: { fontSize: 12, color: Colors.textTertiary },

  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text },
  fieldSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: -2 },
  input: {
    minHeight: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text,
    backgroundColor: Colors.surface,
    paddingTop: 14, paddingBottom: 14,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: { fontSize: 12, color: Colors.textTertiary, alignSelf: 'flex-end' },

  statusList: { gap: 10 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  statusCardSelected: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  statusIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center',
  },
  statusIconSelected: { backgroundColor: Colors.brand },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  emptyCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border,
  },

  saveButton: {
    height: 56, borderRadius: 14,
    backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brand, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});

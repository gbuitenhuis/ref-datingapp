import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreHorizontal, Send, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ref-backend.vercel.app';
const AUTH_TOKEN_KEY = '@ref_auth_token';

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{
    matchId?: string | string[];
    otherName?: string | string[];
    otherPhoto?: string | string[];
    otherUserId?: string | string[];
    otherBio?: string | string[];
    otherAge?: string | string[];
  }>();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  const otherName = Array.isArray(params.otherName) ? params.otherName[0] : params.otherName;
  const otherPhoto = Array.isArray(params.otherPhoto) ? params.otherPhoto[0] : params.otherPhoto;
  const otherUserId = Array.isArray(params.otherUserId) ? params.otherUserId[0] : params.otherUserId;
  const otherBio = Array.isArray(params.otherBio) ? params.otherBio[0] : params.otherBio;
  const otherAge = Array.isArray(params.otherAge) ? params.otherAge[0] : params.otherAge;

  const { currentUser, unmatch, blockUser, markChatRead, updateLastMessage, matches } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [actioning, setActioning] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Find other user's profile from matches for richer data
  const matchInContext = matches.find((m) => m.id === matchId);
  const otherUserFromMatch = matchInContext?.user;

  const displayName = otherName ?? otherUserFromMatch?.name ?? 'Match';
  const displayPhoto = otherPhoto ?? otherUserFromMatch?.photo ?? '';
  const displayBio = otherBio ?? otherUserFromMatch?.bio ?? '';
  const displayAge = otherAge ?? (otherUserFromMatch?.age ? String(otherUserFromMatch.age) : '');

  const getToken = async () => {
    if (tokenRef.current) return tokenRef.current;
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const t = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    tokenRef.current = t;
    return t;
  };

  const fetchMessages = async (initial?: boolean) => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chats/${matchId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      const items: Message[] = data.items ?? [];
      setMessages(items);

      // Update last message in context for unread tracking
      if (items.length > 0 && matchId) {
        const last = items[items.length - 1];
        updateLastMessage(matchId, { text: last.text, senderId: last.sender_id, ts: last.created_at });
      }

      if (initial) {
        setLoading(false);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
      } else {
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) markChatRead(matchId);
    void fetchMessages(true);
    pollRef.current = setInterval(() => void fetchMessages(), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (matchId) markChatRead(matchId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const handleSend = async () => {
    if (!text.trim() || sending || !matchId || !currentUser) return;
    const msgText = text.trim();
    setText('');
    setSending(true);

    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`,
      sender_id: currentUser.id,
      text: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    updateLastMessage(matchId, { text: msgText, senderId: currentUser.id, ts: optimisticMsg.created_at });
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/chats/${matchId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ senderId: currentUser.id, text: msgText }),
      });
      if (res.ok) await fetchMessages();
    } catch {}
    setSending(false);
  };

  const handleUnmatch = () => {
    setProfileModal(false);
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${displayName}? This will remove the match and all messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            setActioning(true);
            const ok = matchId ? await unmatch(matchId) : false;
            setActioning(false);
            if (ok) {
              showToast('Unmatched', 'info');
              router.back();
            } else {
              showToast('Could not unmatch — please try again', 'error');
            }
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    setProfileModal(false);
    if (!otherUserId) return;
    Alert.alert(
      'Block user',
      `Block ${displayName}? They won't be able to contact you and won't appear in your discovery.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActioning(true);
            const ok = await blockUser(otherUserId);
            if (matchId) await unmatch(matchId);
            setActioning(false);
            if (ok) {
              showToast(`${displayName} blocked`, 'info');
              router.back();
            } else {
              showToast('Could not block — please try again', 'error');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>{displayName}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Nav */}
      <View style={styles.navBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.text} />
        </Pressable>
        <Pressable style={styles.navProfile} onPress={() => setProfileModal(true)}>
          <Avatar photo={displayPhoto} name={otherName} userId={otherUserId} size="sm" />
          <Text style={styles.navTitle}>{displayName}</Text>
        </Pressable>
        <Pressable style={styles.backBtn} onPress={() => setProfileModal(true)}>
          <MoreHorizontal size={20} color={Colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Avatar photo={displayPhoto} name={otherName} userId={otherUserId} size="2xl" ring />
              <Text style={styles.emptyChatName}>{displayName}</Text>
              <Text style={styles.emptyChatSub}>
                You matched! Say hi — you were introduced by a friend.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === currentUser?.id;
            return (
              <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                  {formatMessageTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Send size={16} color={Colors.white} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Profile modal */}
      <Modal
        visible={profileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProfileModal(false)}>
          <Pressable style={styles.profileModal} onPress={() => {}}>
            <View style={styles.profileModalHandle} />

            <Pressable style={styles.profileModalClose} onPress={() => setProfileModal(false)}>
              <X size={18} color={Colors.textSecondary} />
            </Pressable>

            <ScrollView contentContainerStyle={styles.profileModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileModalPhoto}>
                {displayPhoto ? (
                  <Image source={{ uri: displayPhoto }} style={styles.profilePhoto} />
                ) : (
                  <Avatar photo={displayPhoto} name={otherName} userId={otherUserId} size="2xl" />
                )}
              </View>

              <Text style={styles.profileModalName}>{displayName}</Text>
              {displayAge ? (
                <Text style={styles.profileModalAge}>Age {displayAge}</Text>
              ) : null}
              {displayBio ? (
                <Text style={styles.profileModalBio}>{displayBio}</Text>
              ) : null}

              <View style={styles.profileModalActions}>
                <Pressable
                  style={styles.unmatchBtn}
                  onPress={handleUnmatch}
                  disabled={actioning}
                >
                  {actioning
                    ? <ActivityIndicator size="small" color={Colors.error} />
                    : <Text style={styles.unmatchBtnText}>Unmatch</Text>}
                </Pressable>
                <Pressable
                  style={styles.blockBtn}
                  onPress={handleBlock}
                  disabled={actioning}
                >
                  <Text style={styles.blockBtnText}>Block</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  navProfile: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  navTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
    flexGrow: 1,
  },

  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyChatName: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  emptyChatSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260 },

  bubbleWrap: { marginBottom: 6 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubbleWrapTheirs: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleMine: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  bubbleTextMine: { color: Colors.white },
  bubbleTime: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, marginHorizontal: 4 },
  bubbleTimeMine: { textAlign: 'right' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: Colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },

  // Profile modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  profileModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  profileModalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  profileModalClose: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  profileModalContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 10,
  },
  profileModalPhoto: { marginBottom: 4 },
  profilePhoto: { width: 120, height: 120, borderRadius: 60 },
  profileModalName: { fontSize: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  profileModalAge: { fontSize: 15, color: Colors.textSecondary },
  profileModalBio: {
    fontSize: 14, color: Colors.textSecondary, lineHeight: 21,
    textAlign: 'center', maxWidth: 300,
  },
  profileModalActions: {
    flexDirection: 'row', gap: 12,
    marginTop: 12, width: '100%',
  },
  unmatchBtn: {
    flex: 1, height: 48, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  unmatchBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },
  blockBtn: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  blockBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },
});

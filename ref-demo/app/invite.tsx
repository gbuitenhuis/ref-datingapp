import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Check, Copy, Link as LinkIcon, MessageCircle, Share2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';

export default function InviteScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const webBase = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://ref-demo-three.vercel.app';
  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'https://ref-backend.vercel.app';
  const inviteLink = currentUser?.id
    ? `${apiBase}/invite?userId=${encodeURIComponent(currentUser.id)}&web=${encodeURIComponent(webBase)}`
    : '';
  const inviteMessage = `Hey, join me on Ref, where people meet people through a mutual connection. ${inviteLink}`;
  const qrCodeUrl = inviteLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(inviteLink)}`
    : '';

  const handleSystemShare = async () => {
    if (!inviteLink) { showToast('Please sign in before sharing', 'info'); return; }
    try {
      await Share.share({ title: 'Join Ref', message: inviteMessage, url: inviteLink });
    } catch {
      try {
        const shareApi = (globalThis as any).navigator?.share;
        if (shareApi) { await shareApi({ title: 'Join Ref', text: inviteMessage, url: inviteLink }); return; }
      } catch {}
      showToast('Share failed — please try again', 'error');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) { showToast('Please sign in before sharing', 'info'); return; }
    await Clipboard.setStringAsync(inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleWhatsApp = () => {
    if (!inviteLink) { showToast('Please sign in before sharing', 'info'); return; }
    try {
      const win = (globalThis as any).window;
      if (win?.open) { win.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`); return; }
    } catch {}
    showToast('WhatsApp unavailable — try the More option', 'info');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Pressable style={styles.backNav} onPress={() => router.back()}>
          <ChevronLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <LinkIcon size={18} color={Colors.brand} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Invite friends</Text>
            <Text style={styles.headerSub}>
              The bigger your network, the more introductions you can make — and receive.
            </Text>
          </View>
        </View>

        {/* QR code */}
        <View style={styles.qrCard}>
          <Text style={styles.qrLabel}>Scan to join</Text>
          <Text style={styles.qrSub}>Open your camera and scan to accept your invite.</Text>
          {qrCodeUrl ? (
            <View style={styles.qrFrame}>
              <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>Sign in to generate your QR code.</Text>
            </View>
          )}
        </View>

        {/* Share CTA */}
        <Pressable
          style={styles.primaryButton}
          onPress={() => setShareMenuVisible(true)}
        >
          <Share2 size={17} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Share invite link</Text>
        </Pressable>
      </ScrollView>

      {/* Share sheet modal */}
      <Modal
        visible={shareMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShareMenuVisible(false)}>
          <View style={styles.shareSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share invite</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShareMenuVisible(false)}>
                <X size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {[
              {
                icon: copied ? <Check size={17} color={Colors.brand} /> : <Copy size={17} color={Colors.brand} />,
                title: copied ? 'Copied!' : 'Copy link',
                sub: 'Copy the invite text and link to clipboard',
                onPress: () => void handleCopyLink(),
              },
              {
                icon: <MessageCircle size={17} color={Colors.brand} />,
                title: 'WhatsApp',
                sub: 'Share directly in WhatsApp',
                onPress: () => handleWhatsApp(),
              },
              {
                icon: <Share2 size={17} color={Colors.brand} />,
                title: 'More',
                sub: 'Open the system share options',
                onPress: async () => { setShareMenuVisible(false); await handleSystemShare(); },
              },
            ].map((action, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
                onPress={() => void action.onPress()}
              >
                <View style={styles.sheetIconWrap}>{action.icon}</View>
                <View style={styles.sheetTextWrap}>
                  <Text style={styles.sheetActionTitle}>{action.title}</Text>
                  <Text style={styles.sheetActionSub}>{action.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backNav: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8 },
  backNavText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.brandBorder,
    backgroundColor: Colors.brandLight,
    padding: 18,
  },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  headerCopy: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  qrCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 20,
    gap: 8,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  qrLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, alignSelf: 'flex-start' },
  qrSub: { fontSize: 13, color: Colors.textSecondary, alignSelf: 'flex-start', lineHeight: 19 },
  qrFrame: {
    marginTop: 8,
    padding: 14,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  qrImage: { width: 220, height: 220 },
  qrPlaceholder: {
    marginTop: 8, padding: 24,
    borderRadius: 16, backgroundColor: Colors.surfaceMuted,
    borderWidth: 1, borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  qrPlaceholderText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  primaryButton: {
    height: 56, borderRadius: 16,
    backgroundColor: Colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.brand, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', padding: 20,
  },
  shareSheet: {
    borderRadius: 24, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 10,
    maxWidth: 440, width: '100%', alignSelf: 'center',
    shadowColor: Colors.black, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 13,
  },
  sheetActionPressed: { opacity: 0.8 },
  sheetIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTextWrap: { flex: 1, gap: 2 },
  sheetActionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sheetActionSub: { fontSize: 12, color: Colors.textSecondary },
});

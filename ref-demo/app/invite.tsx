import { useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link as LinkIcon, Mail, MessageCircle, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function InviteScreen() {
  const { currentUser } = useApp();
  const [copied, setCopied] = useState(false);

  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  const inviteLink = `${apiBase}/invite?userId=${currentUser?.id ?? 'guest'}`;
  const inviteMessage = `Hey! I'm using Ref, a dating app where friends help you find meaningful connections. Join me using my invite link: ${inviteLink}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      const shareApi = (globalThis as any).navigator?.share;
      if (shareApi) {
        await shareApi({
          title: 'Join Ref',
          text: inviteMessage,
          url: inviteLink,
        });
      } else {
        await Share.share({ message: inviteMessage });
      }
    } catch {
      Alert.alert('Share failed', 'Please try again.');
    }
  };

  const handleEmail = () => {
    const win = (globalThis as any).window;
    if (win) {
      const subject = encodeURIComponent('Join me on Ref');
      const body = encodeURIComponent(inviteMessage);
      win.open(`mailto:?subject=${subject}&body=${body}`);
    } else {
      Alert.alert('Email sharing will be available in the full version.');
    }
  };

  const handleWhatsApp = () => {
    const win = (globalThis as any).window;
    if (win) {
      const text = encodeURIComponent(inviteMessage);
      win.open(`https://wa.me/?text=${text}`);
    } else {
      Alert.alert('WhatsApp sharing will be available in the full version.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite friends to Ref</Text>
      <Text style={styles.subtitle}>
        The more friends you have, the better your matches will be
      </Text>

      <View style={styles.linkBox}>
        <Text style={styles.linkLabel}>Your invite link</Text>
        <View style={styles.linkRow}>
          <Text style={styles.linkText} numberOfLines={1}>
            {inviteLink}
          </Text>
          <Pressable style={styles.copyButton} onPress={handleCopy}>
            <LinkIcon size={18} color={copied ? Colors.success : Colors.secondary} />
          </Pressable>
        </View>
        {copied && <Text style={styles.copiedText}>Link copied to clipboard!</Text>}
      </View>

      <Pressable style={styles.primaryButton} onPress={handleShare}>
        <Share2 size={18} color={Colors.white} />
        <Text style={styles.primaryButtonText}>Share Link</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleEmail}>
        <Mail size={18} color={Colors.text} />
        <Text style={styles.secondaryButtonText}>Email</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleWhatsApp}>
        <MessageCircle size={18} color={Colors.text} />
        <Text style={styles.secondaryButtonText}>WhatsApp</Text>
      </Pressable>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How it works</Text>
        {[
          'Share your unique invite link with friends',
          'They sign up and automatically connect with you',
          'Start matching or getting matched by friends',
        ].map((item) => (
          <View key={item} style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
    gap: 16,
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
  linkBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  linkLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedText: {
    fontSize: 12,
    color: Colors.success,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 280, friction: 18 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 280, friction: 18 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 220, useNativeDriver: true }),
      ]).start(onDone);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const iconColor = toast.type === 'error' ? Colors.error : toast.type === 'success' ? Colors.success : Colors.brand;
  const Icon = toast.type === 'error' ? X : toast.type === 'success' ? Check : Info;

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.iconWrap, toast.type === 'error' && styles.iconError, toast.type === 'success' && styles.iconSuccess, toast.type === 'info' && styles.iconInfo]}>
        <Icon size={13} color={iconColor} />
      </View>
      <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { bottom: Math.max(100, insets.bottom + 90) }]} pointerEvents="none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.text,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: Colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconSuccess: { backgroundColor: 'rgba(34,197,94,0.2)' },
  iconError: { backgroundColor: 'rgba(239,68,68,0.2)' },
  iconInfo: { backgroundColor: 'rgba(99,102,241,0.2)' },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    lineHeight: 19,
  },
});

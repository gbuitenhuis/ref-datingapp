import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, !fullWidth && styles.inline]}>
      <Pressable
        style={[
          styles.base,
          styles[`variant_${variant}`],
          styles[`size_${size}`],
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'secondary' || variant === 'ghost' ? Colors.brand : Colors.white}
            size="small"
          />
        ) : (
          <View style={styles.content}>
            {icon ? <View>{icon}</View> : null}
            <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '700',
  },

  // Variants
  variant_primary: { backgroundColor: Colors.brand },
  variant_secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.brand,
  },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_destructive: { backgroundColor: Colors.error },
  variant_accent: { backgroundColor: Colors.accent },

  // Text colours
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.brand },
  text_ghost: { color: Colors.brand },
  text_destructive: { color: Colors.white },
  text_accent: { color: Colors.white },

  // Sizes
  size_lg: { height: 56, paddingHorizontal: 24 },
  size_md: { height: 48, paddingHorizontal: 20 },
  size_sm: { height: 40, paddingHorizontal: 16, borderRadius: 10 },

  textSize_lg: { fontSize: 16 },
  textSize_md: { fontSize: 15 },
  textSize_sm: { fontSize: 13 },

  disabled: { opacity: 0.45 },
});

import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import Colors from '@/constants/colors';

type BadgeVariant = 'brand' | 'success' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ label, variant = 'neutral', dot }: BadgeProps) {
  return (
    <View style={[styles.base, styles[`bg_${variant}`]]}>
      {dot ? <View style={[styles.dot, styles[`dot_${variant}`]]} /> : null}
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },

  bg_brand: { backgroundColor: Colors.brandLight, borderColor: Colors.brandBorder },
  bg_success: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  bg_neutral: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.border },
  bg_info: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },

  text: { fontSize: 12, fontWeight: '600' },
  text_brand: { color: Colors.brand },
  text_success: { color: Colors.successText },
  text_neutral: { color: Colors.textSecondary },
  text_info: { color: '#1E40AF' },

  dot: { width: 6, height: 6, borderRadius: 3 },
  dot_brand: { backgroundColor: Colors.brand },
  dot_success: { backgroundColor: Colors.success },
  dot_neutral: { backgroundColor: Colors.textTertiary },
  dot_info: { backgroundColor: '#3B82F6' },
});

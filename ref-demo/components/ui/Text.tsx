import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

const weightMap: Record<string, string> = {
  '100': 'Poppins_400Regular',
  '200': 'Poppins_400Regular',
  '300': 'Poppins_400Regular',
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  '800': 'Poppins_800ExtraBold',
  '900': 'Poppins_800ExtraBold',
  'normal': 'Poppins_400Regular',
  'bold': 'Poppins_700Bold',
};

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = weightMap[String(flat.fontWeight ?? '400')] ?? 'Poppins_400Regular';
  return <RNText style={[{ fontFamily }, style]} {...props} />;
}

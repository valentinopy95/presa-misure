import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  size?: 'small' | 'medium' | 'large';
  subtitle?: string;
}

const MASCOT = require('../../assets/principale.png');

const SIZES = {
  small:  { img: 52,  name: 18, sub: 11 },
  medium: { img: 80,  name: 24, sub: 12 },
  large:  { img: 110, name: 30, sub: 13 },
};

export default function AppLogo({ size = 'medium', subtitle }: Props) {
  const sz = SIZES[size];
  return (
    <View style={s.wrap}>
      <Image source={MASCOT} style={[s.img, { width: sz.img, height: sz.img }]} resizeMode="contain"/>
      <Text style={[s.name, { fontSize: sz.name }]}>Misu</Text>
      {!!subtitle && <Text style={[s.sub, { fontSize: sz.sub }]}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  img:  { marginBottom: 4 },
  name: { fontWeight: '900', color: '#0c2d75', letterSpacing: 0.5 },
  sub:  { color: '#999', marginTop: 2 },
});

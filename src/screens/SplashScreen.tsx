import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';

const NAVY   = '#0c2d75';
const ACCENT = '#FFC107';
const MASCOT = require('../../assets/principale.png');

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    // Pulsazione del bagliore sotto il logo
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const t = setTimeout(() => glow.start(), 600);
    return () => { clearTimeout(t); glow.stop(); };
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <View style={s.root}>
      {/* Cerchio di bagliore dietro al logo */}
      <Animated.View style={[s.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}/>

      {/* Mascotte */}
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={MASCOT} style={s.mascot} resizeMode="contain"/>
      </Animated.View>

      {/* Testo */}
      <Animated.View style={[s.textWrap, { opacity: textOpacity }]}>
        <Text style={s.appName}>Misu</Text>
        <Text style={s.appSub}>Gestione rilievi infissi</Text>
      </Animated.View>

      {/* Barra di loading in basso */}
      <Animated.View style={[s.loaderWrap, { opacity: textOpacity }]}>
        <LoadingBar/>
      </Animated.View>
    </View>
  );
}

function LoadingBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={s.barTrack}>
      <Animated.View style={[s.barFill, { width }]}/>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: ACCENT,
  },

  logoWrap: { alignItems: 'center', marginBottom: 24, zIndex: 2 },
  mascot:   { width: 200, height: 200 },

  textWrap:  { alignItems: 'center', marginBottom: 0, zIndex: 2 },
  appName:   { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
  appSub:    { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: 0.3 },

  loaderWrap: { position: 'absolute', bottom: 52, width: 120 },
  barTrack: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFC107',
  },
});

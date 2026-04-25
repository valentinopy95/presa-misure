import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

export default function SplashScreen() {
  const logoScale  = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo entra con scala + fade
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Testo appare dopo il logo
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    // 3. Pulsazione continua sul logo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const pulseTimeout = setTimeout(() => pulse.start(), 700);
    return () => {
      clearTimeout(pulseTimeout);
      pulse.stop();
    };
  }, []);

  return (
    <View style={s.root}>
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Animated.View style={[s.logoBox, { transform: [{ scale: dotScale }] }]}>
          <Text style={s.logoText}>M</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[s.textWrap, { opacity: textOpacity }]}>
        <Text style={s.appName}>MeasureMate</Text>
        <Text style={s.appSub}>Gestione rilievi infissi</Text>
      </Animated.View>

      <Animated.View style={[s.dotsWrap, { opacity: textOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 160),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={s.dots}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[s.dot, {
            opacity: dot,
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }]}
        />
      ))}
    </View>
  );
}

const BLUE = '#0c2d75';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: BLUE,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  logoText: { color: '#fff', fontSize: 42, fontWeight: '900' },

  textWrap: { alignItems: 'center', marginBottom: 48 },
  appName:  { fontSize: 28, fontWeight: '900', color: BLUE, letterSpacing: 0.5 },
  appSub:   { fontSize: 13, color: '#999', marginTop: 5 },

  dotsWrap: { position: 'absolute', bottom: 60 },
  dots:     { flexDirection: 'row', gap: 8 },
  dot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE, opacity: 0.7 },
});

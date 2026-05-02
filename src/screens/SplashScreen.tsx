import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';

const NAVY   = '#0c2d75';
const MASCOT = require('../../assets/principale.png');

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathOpacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Entrata logo
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });

    // Respirazione cerchio
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathScale,   { toValue: 1.18, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(breathOpacity, { toValue: 0.08, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(breathScale,   { toValue: 1,    duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(breathOpacity, { toValue: 0.25, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    const t = setTimeout(() => breathe.start(), 500);
    return () => { clearTimeout(t); breathe.stop(); };
  }, []);

  return (
    <View style={s.root}>

      {/* Disco bianco dietro il robot — nasconde il rettangolo bianco */}
      <Animated.View style={[s.disc, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}/>

      {/* Mascotte */}
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={MASCOT} style={s.mascot} resizeMode="contain"/>
      </Animated.View>

      {/* Palla che respira */}
      <Animated.View style={[s.breathCircle, { opacity: breathOpacity, transform: [{ scale: breathScale }] }]}/>

      {/* Testo */}
      <Animated.View style={[s.textWrap, { opacity: textOpacity }]}>
        <Text style={s.appName}>Misu</Text>
        <Text style={s.appSub}>Gestione rilievi infissi</Text>
      </Animated.View>

      {/* Loading divertente — laser scan */}
      <Animated.View style={[s.loaderWrap, { opacity: textOpacity }]}>
        <LaserLoader/>
      </Animated.View>

    </View>
  );
}

function LaserLoader() {
  const pos  = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pos, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(glow, { toValue: 0.4, duration: 450, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 1,   duration: 450, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(pos, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const left = pos.interpolate({ inputRange: [0, 1], outputRange: ['0%', '88%'] });

  return (
    <View style={s.laserTrack}>
      {/* Traccia */}
      <View style={s.laserLine}/>
      {/* Punto laser */}
      <Animated.View style={[s.laserDot, { left, opacity: glow }]}>
        <View style={s.laserDotInner}/>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 140,
  },

  // Disco bianco dietro mascotte
  disc: {
    position: 'absolute',
    width: 210, height: 210,
    borderRadius: 105,
    backgroundColor: '#fff',
    marginTop: 140,
  },

  logoWrap: { zIndex: 2 },
  mascot:   { width: 200, height: 200 },

  // Cerchio che respira
  breathCircle: {
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: '#fff',
    marginTop: 20,
  },

  textWrap: { alignItems: 'center', marginTop: 28 },
  appName:  { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  appSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 5, letterSpacing: 0.3 },

  // Laser loader
  loaderWrap: { marginTop: 40, width: 140 },
  laserTrack: { height: 20, justifyContent: 'center' },
  laserLine:  { height: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1 },
  laserDot: {
    position: 'absolute',
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 80, 80, 0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: -8,
  },
  laserDotInner: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ff4444',
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const NAVY = '#0c2d75';
const { width: W, height: H } = Dimensions.get('window');

// Finestre da disegnare: [x%, y%, larghezza, altezza, delay]
const WINDOWS = [
  { x: 0.08, y: 0.12, w: 90,  h: 110, delay: 0   },
  { x: 0.62, y: 0.08, w: 110, h: 130, delay: 120  },
  { x: 0.30, y: 0.55, w: 130, h: 100, delay: 240  },
  { x: 0.68, y: 0.50, w: 80,  h: 120, delay: 360  },
  { x: 0.10, y: 0.62, w: 100, h: 80,  delay: 180  },
  { x: 0.45, y: 0.18, w: 70,  h: 90,  delay: 300  },
];

// Numeri misura che scorrono
const MEASURES = [
  { text: '1200 mm', x: 0.05, y: 0.22, delay: 200  },
  { text: '850 mm',  x: 0.60, y: 0.35, delay: 400  },
  { text: '2100 mm', x: 0.15, y: 0.72, delay: 600  },
  { text: '600 mm',  x: 0.55, y: 0.68, delay: 150  },
  { text: '1450 mm', x: 0.30, y: 0.40, delay: 500  },
  { text: '920 mm',  x: 0.70, y: 0.20, delay: 350  },
];

function WindowShape({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1, duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.window,
        {
          left: W * x, top: H * y, width: w, height: h,
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        },
      ]}
    >
      {/* Traversa orizzontale */}
      <View style={[styles.crossH, { top: h / 2 - 1 }]} />
      {/* Traversa verticale */}
      <View style={[styles.crossV, { left: w / 2 - 1 }]} />
    </Animated.View>
  );
}

function MeasureLabel({ text, x, y, delay }: { text: string; x: number; y: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay + 300),
      Animated.parallel([
        Animated.timing(anim,  { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.measure,
        {
          left: W * x, top: H * y,
          opacity: anim,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

export default function SplashScreen() {
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(titleAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Finestre animate */}
      {WINDOWS.map((w, i) => (
        <WindowShape key={i} {...w} />
      ))}

      {/* Numeri misura */}
      {MEASURES.map((m, i) => (
        <MeasureLabel key={i} {...m} />
      ))}

      {/* Titolo centrato */}
      <Animated.View
        style={[
          styles.center,
          {
            opacity: titleAnim,
            transform: [{ scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
          },
        ]}
      >
        <Text style={styles.appName}>Misu</Text>
        <Text style={styles.appSub}>Gestione rilievi infissi</Text>
        <LaserDots />
      </Animated.View>
    </View>
  );
}

function LaserDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 280, easing: Easing.in(Easing.cubic),  useNativeDriver: true }),
          Animated.delay(560),
        ])
      );
    const anims = dots.map((d, i) => bounce(d, i * 160));
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.dots}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Finestre
  window: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 3,
  },
  crossH: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  crossV: {
    position: 'absolute', top: 0, bottom: 0,
    width: 2, backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // Misure
  measure: {
    position: 'absolute',
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.22)',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  // Titolo centrale
  center: { alignItems: 'center' },
  appName: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appSub:  { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6, letterSpacing: 1.5, fontWeight: '600' },

  dots: { flexDirection: 'row', gap: 10, marginTop: 40 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});

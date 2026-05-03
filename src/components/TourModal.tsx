import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Image, ImageSourcePropType,
} from 'react-native';

const MASCOT = require('../../assets/tutorial.png');

export interface SpotRect { x: number; y: number; w: number; h: number; }

export interface TourStep {
  icon: string;
  image?: ImageSourcePropType;
  iconBg?: string;
  title: string;
  body: string;
  spot?: SpotRect | null;
}

interface Props {
  visible: boolean;
  steps: TourStep[];
  onClose: () => void;
}

const NAVY   = '#0c2d75';
const YELLOW = '#FFC107';

export default function TourModal({ visible, steps, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const step   = steps[idx] ?? steps[0];
  const isLast  = idx === steps.length - 1;
  const isFirst = idx === 0;

  useEffect(() => {
    if (!visible) { setIdx(0); return; }
    animateIn();
  }, [visible]);

  useEffect(() => { if (visible) animateIn(); }, [idx]);

  function animateIn() {
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 190 }).start();
  }

  if (!visible || steps.length === 0) return null;

  const cardSlide = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  const go = (dir: 1 | -1) => {
    const next = idx + dir;
    if (next < 0) return;
    if (next >= steps.length) { onClose(); return; }
    setIdx(next);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Sfondo scuro */}
      <View style={s.overlay}/>

      {/* Card centrata */}
      <View style={s.centered}>
        <Animated.View style={[s.card, { opacity: cardAnim, transform: [{ translateY: cardSlide }] }]}>

          {/* Header giallo con mascotte */}
          <View style={s.header}>
            <Image source={MASCOT} style={s.mascot} resizeMode="contain"/>
            {/* Progress dots */}
            <View style={s.dots}>
              {steps.map((_, i) => (
                <View key={i} style={[s.dot, i === idx && s.dotActive]}/>
              ))}
            </View>
          </View>

          {/* Body */}
          <View style={s.body}>
            {/* Chiudi */}
            <View style={s.rowHeader}>
              <View/>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={s.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.title}>{step.title}</Text>
            <Text style={s.bodyText}>{step.body}</Text>

            {/* Nav */}
            <View style={s.nav}>
              {!isFirst
                ? <TouchableOpacity style={s.btnBack} onPress={() => go(-1)}>
                    <Text style={s.btnBackTxt}>← Indietro</Text>
                  </TouchableOpacity>
                : <View/>}
              <TouchableOpacity style={s.btnNext} onPress={() => isLast ? onClose() : go(1)}>
                <Text style={s.btnNextTxt}>{isLast ? 'Fine ✓' : 'Avanti →'}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centered: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },

  // Header bianco
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 12,
  },
  mascot: {
    width: 130, height: 130,
  },
  dots: {
    flexDirection: 'row', gap: 5, marginTop: 10,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDE3ED',
  },
  dotActive: {
    backgroundColor: NAVY, width: 20, borderRadius: 3,
  },

  // Body blu navy
  body: { padding: 20, backgroundColor: NAVY },

  rowHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconImg: { width: 34, height: 34 },
  stepIcon: { fontSize: 30 },
  close: { fontSize: 17, color: 'rgba(255,255,255,0.5)', fontWeight: '700', paddingLeft: 8 },

  title:    { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 23 },
  bodyText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 21, marginBottom: 20 },

  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnBack: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  btnBackTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  btnNext: {
    backgroundColor: YELLOW, paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 10, elevation: 2,
  },
  btnNextTxt: { fontSize: 14, fontWeight: '800', color: NAVY },
});

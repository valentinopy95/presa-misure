import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Image, ImageSourcePropType,
} from 'react-native';

const MASCOT = require('../../assets/tutorial.png');

export interface SpotRect { x: number; y: number; w: number; h: number; }

export interface TourStep {
  icon: string;
  image?: ImageSourcePropType;   // immagine menu (opzionale, sostituisce l'emoji)
  iconBg?: string;               // colore sfondo icona box
  title: string;
  body: string;
  spot?: SpotRect | null;        // tenuto per compatibilità, non più usato visivamente
}

interface Props {
  visible: boolean;
  steps: TourStep[];
  onClose: () => void;
}

export default function TourModal({ visible, steps, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const step    = steps[idx] ?? steps[0];
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

  const cardSlide = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] });

  const go = (dir: 1 | -1) => {
    const next = idx + dir;
    if (next < 0) return;
    if (next >= steps.length) { onClose(); return; }
    setIdx(next);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Sfondo scuro */}
      <View style={s.fullDark}/>

      {/* Mascotte */}
      <Animated.Image
        source={MASCOT}
        style={[s.mascot, { opacity: cardAnim, transform: [{ translateY: cardSlide }] }]}
        resizeMode="contain"
      />

      {/* Card tutorial */}
      <Animated.View style={[
        s.card,
        { bottom: 80 },
        { opacity: cardAnim, transform: [{ translateY: cardSlide }] },
      ]}>
        {/* Triangolino punta verso mascotte */}
        <View style={s.triangle}/>
        {/* Progress dots */}
        <View style={s.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[s.dot, i === idx && s.dotActive]}/>
          ))}
        </View>

        <View style={s.cardHeader}>
          {/* Icona: immagine menu oppure emoji */}
          {step.image ? (
            <View style={[s.iconBox, { backgroundColor: step.iconBg ?? '#E3F2FD' }]}>
              <Image source={step.image} style={s.iconImg} resizeMode="contain"/>
            </View>
          ) : (
            <Text style={s.stepIcon}>{step.icon}</Text>
          )}
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>{step.title}</Text>
        <Text style={s.body}>{step.body}</Text>

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
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fullDark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },

  mascot: {
    position: 'absolute',
    width: 140, height: 140,
    bottom: 80 + 20 + 280, // sopra la card (altezza card ~280)
    alignSelf: 'center',
  },

  card: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    elevation: 14,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 7 },
  },

  triangle: {
    position: 'absolute', top: -10, left: '50%' as any,
    marginLeft: -10,
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff',
  },

  dots: { flexDirection: 'row', gap: 5, alignSelf: 'center', marginBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDE3ED' },
  dotActive: { backgroundColor: '#0c2d75', width: 20, borderRadius: 3 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconImg: { width: 38, height: 38 },
  stepIcon: { fontSize: 32 },
  close: { fontSize: 17, color: '#bbb', fontWeight: '700', paddingLeft: 8 },

  title: { fontSize: 17, fontWeight: '900', color: '#0c2d75', marginBottom: 8, lineHeight: 22 },
  body:  { fontSize: 14, color: '#445', lineHeight: 21, marginBottom: 18 },

  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnBack: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDE3ED' },
  btnBackTxt: { fontSize: 14, fontWeight: '700', color: '#667' },
  btnNext: { backgroundColor: '#0c2d75', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, elevation: 2 },
  btnNextTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

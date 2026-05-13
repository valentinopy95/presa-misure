import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Easing, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type NavSection = 'saved' | 'materials' | 'cutting';

const NAV_ITEMS: { key: NavSection; image: any; label: string; sub: string; color: string }[] = [
  { key: 'saved',     image: require('../../assets/menu_saved.png'),     label: 'Rilievi salvati',    sub: 'Apri un progetto esistente',      color: '#6A1B9A' },
  { key: 'materials', image: require('../../assets/menu_materials.png'), label: 'Sviluppo materiale', sub: 'Calcola il materiale necessario',  color: '#E65100' },
  { key: 'cutting',   image: require('../../assets/menu_cutting.png'),   label: 'Distinta di taglio', sub: 'Piano di taglio barra per barra',  color: '#37474F' },
];

interface Props {
  visible: boolean;
  current: NavSection;
  onClose: () => void;
  navigation: any;
}

export default function NavBurgerModal({ visible, current, onClose, navigation }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
    }
  }, [visible]);

  const navigate = (key: NavSection) => {
    onClose();
    setTimeout(() => {
      if (key === 'saved')     navigation.replace('SavedProjects');
      if (key === 'materials') navigation.replace('MaterialsProjects');
      if (key === 'cutting')   navigation.replace('CuttingProjects');
    }, 180);
  };

  const others = NAV_ITEMS.filter(item => item.key !== current);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={[s.panel, {
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [280, 0] }) }],
          opacity: anim,
        }]}>
          <Pressable onPress={() => {}}>

            <Text style={s.sectionTitle}>VAI A</Text>

            {others.map(item => (
              <TouchableOpacity
                key={item.key}
                style={s.navItem}
                onPress={() => navigate(item.key)}
                activeOpacity={0.7}
              >
                <View style={s.navIconBox}>
                  <Image source={item.image} style={s.navImage} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.navLabel}>{item.label}</Text>
                  <Text style={s.navSub}>{item.sub}</Text>
                </View>
                <Text style={s.navArrow}>›</Text>
              </TouchableOpacity>
            ))}

            <View style={s.divider} />

            <TouchableOpacity style={s.secondaryItem} onPress={() => { onClose(); setTimeout(() => navigation.navigate('Settings'), 180); }} activeOpacity={0.7}>
              <View style={[s.secondaryIconBox, { backgroundColor: '#ECEFF1' }]}>
                <Ionicons name="settings" size={18} color="#37474F" />
              </View>
              <Text style={s.secondaryText}>Impostazioni</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryItem} onPress={() => {
              onClose();
              setTimeout(() => {
                Alert.alert(
                  'Contatta il supporto',
                  'Verrà aperta l\'app email con un messaggio indirizzato al supporto Misu.\n\nEmail: valentinopy95@gmail.com',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Apri email', onPress: () => Linking.openURL('mailto:valentinopy95@gmail.com?subject=Supporto%20Misu') },
                  ]
                );
              }, 200);
            }} activeOpacity={0.7}>
              <View style={[s.secondaryIconBox, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="headset" size={18} color="#C62828" />
              </View>
              <Text style={s.secondaryText}>Supporto tecnico</Text>
            </TouchableOpacity>

          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  panel: {
    width: 270, minHeight: '100%',
    backgroundColor: '#fff',
    paddingTop: 56, paddingBottom: 30,
    elevation: 16,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: -4, height: 0 },
  },
  sectionTitle: {
    fontSize: 9, fontWeight: '900', color: '#bbb', letterSpacing: 1.5,
    paddingHorizontal: 20, marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12, marginHorizontal: 8,
    borderRadius: 12, marginBottom: 2,
  },
  navIconBox:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navImage:    { width: 36, height: 36 },
  navLabel:    { fontSize: 13, fontWeight: '800', color: '#1a2a3a', marginBottom: 2 },
  navSub:      { fontSize: 10, color: '#8a9ab0' },
  navArrow:    { fontSize: 20, color: '#ccc', fontWeight: '700' },
  divider:     { height: 1, backgroundColor: '#EEF2F7', marginHorizontal: 16, marginVertical: 12 },
  secondaryItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    marginHorizontal: 8, borderRadius: 12, marginBottom: 2,
  },
  secondaryIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '700', color: '#333', flex: 1 },
});

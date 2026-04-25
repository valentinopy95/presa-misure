import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Easing, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { Project, RootStackParamList } from '../types';
import { saveProject } from '../storage/database';
import { getTutorialShown } from '../storage/settings';
import { listPendingInvites, fetchProfile, supabase } from '../lib/supabase';
import NewProjectModal from '../components/NewProjectModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MENU_ITEMS = [
  {
    key: 'create',
    image: require('../../assets/menu_create.gif'),
    title: 'Crea progetto misure',
    subtitle: 'Nuovo rilievo infissi',
    color: '#1565C0',
    light: '#E3F2FD',
  },
  {
    key: 'catalog',
    image: require('../../assets/menu_catalog.gif'),
    title: 'Catalogo profili',
    subtitle: 'Tipologie e disegni tecnici',
    color: '#2E7D32',
    light: '#E8F5E9',
  },
  {
    key: 'saved',
    image: require('../../assets/menu_saved.gif'),
    title: 'Rilievi salvati',
    subtitle: 'Apri un progetto esistente',
    color: '#6A1B9A',
    light: '#F3E5F5',
  },
  {
    key: 'materials',
    image: require('../../assets/menu_materials.gif'),
    title: 'Sviluppo materiale',
    subtitle: 'Calcola il materiale per un progetto',
    color: '#E65100',
    light: '#FFF3E0',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { theme: t } = useTheme();
  const [modalVisible,   setModalVisible]   = useState(false);
  const [pendingInvites, setPendingInvites] = useState(0);

  const anims = useRef(MENU_ITEMS.map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getTutorialShown().then(shown => {
      if (!shown) navigation.replace('Tutorial');
    });
    // Carica badge inviti pendenti
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const profile = await fetchProfile(user.id);
      if (!profile?.company_id) return;
      const list = await listPendingInvites(profile.company_id);
      setPendingInvites(list.length);
    });
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1, duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(90, anims.map(a =>
        Animated.spring(a, {
          toValue: 1, useNativeDriver: true,
          damping: 18, stiffness: 130,
        })
      )),
    ]).start();
  }, []);

  const handleCreate = async (name: string, clientName: string, clientPhone: string, address: string) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(), name, clientName, clientPhone, address,
      gps: null, openings: [],
      createdAt: now, updatedAt: now,
    };
    await saveProject(project);
    setModalVisible(false);
    navigation.navigate('Project', { projectId: project.id });
  };

  const handlePress = (key: string) => {
    if (key === 'create') setModalVisible(true);
    else if (key === 'catalog') navigation.navigate('Catalog');
    else if (key === 'saved') navigation.navigate('SavedProjects');
    else if (key === 'materials') navigation.navigate('MaterialsProjects');
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#05112b" />

      {/* ── HEADER ── */}
      <Animated.View style={{
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}>
        <LinearGradient
          colors={['#05112b', '#0b2870', '#1558c8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.header}
        >
          {/* Logo su sfondo bianco */}
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/icon_adaptive.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Settings */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.75}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>

          {/* Help */}
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => navigation.navigate('Help')}
            activeOpacity={0.75}
          >
            <Text style={styles.settingsIcon}>?</Text>
          </TouchableOpacity>

          {/* Account */}
          <TouchableOpacity
            style={styles.accountBtn}
            onPress={() => { navigation.navigate('Account'); setPendingInvites(0); }}
            activeOpacity={0.75}
          >
            <Text style={styles.accountIcon}>👤</Text>
            {pendingInvites > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingInvites}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.appName}>MeasureMate</Text>
          <Text style={styles.appSub}>MISURE PROFESSIONALI PER INFISSI</Text>
        </LinearGradient>
      </Animated.View>

      {/* ── MENU ── */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item, i) => {
          const anim = anims[i];
          return (
            <Animated.View
              key={item.key}
              style={{
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              }}
            >
              <TouchableOpacity
                style={[styles.card, { backgroundColor: t.card }]}
                onPress={() => handlePress(item.key)}
                activeOpacity={0.72}
              >
                {/* Left accent stripe */}
                <View style={[styles.accent, { backgroundColor: item.color }]} />

                {/* Icon box */}
                <View style={[styles.iconBox, { backgroundColor: item.light }]}>
                  <Image source={item.image} style={styles.icon} resizeMode="contain" />
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
                  <Text style={[styles.cardSub, { color: t.textSecondary }]}>{item.subtitle}</Text>
                </View>

                {/* Arrow */}
                <View style={[styles.arrowBadge, { backgroundColor: item.light }]}>
                  <Text style={[styles.arrowChar, { color: item.color }]}>›</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <NewProjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },

  // ── Header ──
  header: {
    paddingTop: 54, paddingBottom: 36, paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    elevation: 10,
    shadowColor: '#05112b',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoBox: {
    marginBottom: 12,
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logoImg: {
    width: 90,
    height: 90,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,30,120,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  appSub: {
    color: 'rgba(140,190,255,0.9)',
    fontSize: 10,
    marginTop: 7,
    letterSpacing: 2.5,
    fontWeight: '700',
  },

  // ── Menu ──
  menu: { padding: 18, gap: 11, marginTop: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0c2d75', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  accent: { width: 4, alignSelf: 'stretch' },
  iconBox: {
    width: 64, height: 64,
    margin: 12,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { width: 50, height: 50 },
  cardText: { flex: 1, paddingVertical: 14, paddingRight: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3, letterSpacing: 0.1 },
  cardSub: { fontSize: 11.5, color: '#8a9ab0', fontWeight: '500', letterSpacing: 0.1 },
  arrowBadge: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  arrowChar: { fontSize: 22, fontWeight: '700', lineHeight: 28 },

  // ── Settings / Help buttons ──
  settingsBtn: {
    position: 'absolute',
    top: 52, right: 18,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    position: 'absolute',
    top: 52, right: 64,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  accountBtn: {
    position: 'absolute',
    top: 52, left: 18,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  accountIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#0b2870',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  settingsIcon: { fontSize: 17, color: 'rgba(255,255,255,0.85)' },
});

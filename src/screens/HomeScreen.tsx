import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Easing, Image,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { Project, RootStackParamList } from '../types';
import { saveProject } from '../storage/database';
import { listPendingInvites, listInvitesForMe, fetchProfile, supabase } from '../lib/supabase';
import * as AppAlert from '../components/AppAlert';
import NewProjectModal from '../components/NewProjectModal';
import TourModal, { TourStep, SpotRect } from '../components/TourModal';
import { getTourSeen, setTourSeen } from '../storage/settings';


type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MENU_ITEMS = [
  {
    key: 'create',
    image: require('../../assets/principale.png'),
    title: 'Crea progetto misure',
    subtitle: 'Nuovo rilievo infissi',
    color: '#1565C0',
    light: '#E3F2FD',
  },
  {
    key: 'saved',
    image: require('../../assets/menu_saved.png'),
    title: 'Rilievi salvati',
    subtitle: 'Apri un progetto esistente',
    color: '#6A1B9A',
    light: '#F3E5F5',
  },
  {
    key: 'materials',
    image: require('../../assets/menu_materials.png'),
    title: 'Sviluppo materiale',
    subtitle: 'Calcola il materiale per un progetto',
    color: '#E65100',
    light: '#FFF3E0',
  },
  {
    key: 'cutting',
    image: require('../../assets/menu_cutting.png'),
    title: 'Distinta di taglio',
    subtitle: 'Piano di taglio barra per barra',
    color: '#37474F',
    light: '#ECEFF1',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { theme: t } = useTheme();
  const [modalVisible,   setModalVisible]   = useState(false);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [tourVisible,    setTourVisible]    = useState(false);
  const [tourSteps,      setTourSteps]      = useState<TourStep[]>([]);
  const [userName,       setUserName]       = useState<string | null>(null);
  const [hasCompany,     setHasCompany]     = useState(true);
  const [hasInvites,     setHasInvites]     = useState(false);

  const anims      = useRef(MENU_ITEMS.map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const accountRef = useRef<View>(null);
  const card0Ref   = useRef<View>(null);
  const card1Ref   = useRef<View>(null);
  const card2Ref   = useRef<View>(null);
  const card3Ref   = useRef<View>(null);

  const measureEl = (ref: React.RefObject<View>): Promise<SpotRect | null> =>
    new Promise(resolve => {
      if (!ref.current) { resolve(null); return; }
      setTimeout(() => {
        if (typeof (ref.current as any)?.measureInWindow !== 'function') { resolve(null); return; }
        (ref.current as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
        });
      }, 100);
    });

  const openTour = useCallback(async () => {
    const [acct, c0, c1, c2] = await Promise.all([
      measureEl(accountRef),
      measureEl(card0Ref),
      measureEl(card1Ref),
      measureEl(card2Ref),
    ]);
    setTourSteps([
      {
        icon: '👋',
        title: 'Benvenuto in Misu!',
        body: 'Questa è la schermata principale. Qui puoi creare nuovi rilievi, aprire quelli salvati e calcolare il materiale necessario.',
      },
      {
        icon: '📐',
        image: require('../../assets/principale.png'),
        iconBg: '#E3F2FD',
        title: 'Crea progetto misure',
        body: 'Premi qui per iniziare un nuovo rilievo. Inserisci il nome del cantiere, il cliente e l\'indirizzo. Poi aggiungi le aperture una per una.',
      },
      {
        icon: '🗂️',
        image: require('../../assets/menu_saved.png'),
        iconBg: '#F3E5F5',
        title: 'Rilievi salvati',
        body: 'Tutti i rilievi già creati sono qui. Puoi aprirli, modificarli, duplicarli o eliminarli. I sotto-progetti appaiono sotto il progetto madre.',
      },
      {
        icon: '📦',
        image: require('../../assets/menu_materials.png'),
        iconBg: '#FFF3E0',
        title: 'Sviluppo materiale',
        body: 'Seleziona un rilievo e l\'app calcola automaticamente quante barre di profilo ordinare, ottimizzando i tagli per ridurre gli scarti.',
      },
      {
        icon: '✂️',
        iconBg: '#ECEFF1',
        title: 'Distinta di taglio',
        body: 'Mostra come tagliare ogni barra profilo: pezzi nell\'ordine ottimale, con avanzi e grafico proporzionale. Esportabile in PDF da consegnare al serramentista.',
      },
      {
        icon: '👤',
        title: 'Account e azienda',
        body: 'In alto a sinistra trovi il tuo account. Puoi gestire la tua azienda, invitare collaboratori e sincronizzare i dati.',
      },
    ]);
    setTourVisible(true);
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'Buongiorno';
    if (h >= 12 && h < 18) return 'Buon pomeriggio';
    if (h >= 18 && h < 22) return 'Buonasera';
    return 'Buonanotte';
  };

  useEffect(() => {
    // Auto-mostra tour alla prima apertura (dopo animazioni ~1s)
    getTourSeen('home').then(seen => { if (!seen) setTimeout(openTour, 1100); });
    // Carica badge inviti pendenti + nome utente
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const profile = await fetchProfile(user.id);
      if (profile?.full_name) {
        setUserName(profile.full_name.trim().split(' ')[0]);
      }
      if (!profile?.company_id) {
        setHasCompany(false);
        // Controlla se ci sono inviti in arrivo per il badge
        const mine = await listInvitesForMe();
        setHasInvites(mine.length > 0);
        return;
      }
      setHasCompany(true);
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
      gps: null, openings: [], parentId: null,
      createdAt: now, updatedAt: now,
    };
    await saveProject(project);
    setModalVisible(false);
    navigation.navigate('Project', { projectId: project.id });
  };

  const handlePress = (key: string) => {
    if (key === 'create') {
      if (!hasCompany) {
        AppAlert.show(
          'Azienda richiesta',
          'Per creare progetti devi prima configurare la tua azienda. Ci vogliono 30 secondi.',
          [
            { text: 'Dopo', style: 'cancel' },
            { text: 'Configura ora', onPress: () => navigation.navigate('Account') },
          ]
        );
        return;
      }
      setModalVisible(true);
    }
    else if (key === 'saved') navigation.navigate('SavedProjects');
    else if (key === 'materials') navigation.navigate('MaterialsProjects');
    else if (key === 'cutting') navigation.navigate('CuttingProjects');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER bianco ── */}
      <Animated.View style={{
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}>
        <View style={styles.header}>
          {/* Bottoni sinistra/destra */}
          <View ref={accountRef} collapsable={false} style={styles.accountBtn}>
            <TouchableOpacity
              onPress={() => { navigation.navigate('Account'); setPendingInvites(0); }}
              activeOpacity={0.75}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={styles.headerIcon}>👤</Text>
              {(pendingInvites > 0 || hasInvites) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingInvites > 0 ? pendingInvites : '!'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.helpBtn} onPress={openTour} activeOpacity={0.75}>
            <Text style={styles.headerIcon}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.75}>
            <Text style={styles.headerIcon}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statsBtn} onPress={() => navigation.navigate('Stats')} activeOpacity={0.75}>
            <Text style={styles.headerIcon}>📊</Text>
          </TouchableOpacity>

          {/* Saluto + titolo centrati */}
          {userName ? (
            <Text style={styles.greeting}>{getGreeting()}, {userName}!</Text>
          ) : (
            <Text style={styles.greeting}>{getGreeting()}!</Text>
          )}
          <Text style={styles.appName}>Misu</Text>
          <Text style={styles.appSub}>MISURE PROFESSIONALI PER INFISSI</Text>
        </View>
      </Animated.View>

      {/* ── Banner nessuna azienda ── */}
      {!hasCompany && (
        <TouchableOpacity
          style={styles.companyBanner}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.85}
        >
          <Text style={styles.companyBannerIcon}>{hasInvites ? '✉️' : '🏢'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyBannerTitle}>
              {hasInvites ? 'Hai un invito in arrivo!' : 'Configura la tua azienda'}
            </Text>
            <Text style={styles.companyBannerSub}>
              {hasInvites ? 'Vai su Account per accettarlo' : 'Crea o unisciti a un\'azienda per collaborare'}
            </Text>
          </View>
          <Text style={styles.companyBannerArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── MENU ── */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item, i) => {
          const anim = anims[i];
          const cardRef = i === 0 ? card0Ref : i === 1 ? card1Ref : i === 2 ? card2Ref : card3Ref;
          return (
            <Animated.View
              key={item.key}
              style={{
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              }}
            >
              <View ref={cardRef} collapsable={false}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => handlePress(item.key)}
                activeOpacity={0.72}
              >
                {/* Icon */}
                <View style={styles.iconBox}>
                  <Image source={item.image} style={styles.icon} resizeMode="contain" />
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>{item.subtitle}</Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrowBadge}>
                  <Text style={styles.arrowChar}>›</Text>
                </View>
              </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <NewProjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
      <TourModal
        visible={tourVisible}
        steps={tourSteps}
        onClose={() => { setTourVisible(false); setTourSeen('home'); }}
      />
    </View>
  );
}

const NAVY = '#0c2d75';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },

  // ── Header bianco ──
  header: {
    backgroundColor: '#fff',
    paddingTop: 52, paddingBottom: 24, paddingHorizontal: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  greeting: { fontSize: 13, color: '#8a9ab0', fontWeight: '600', letterSpacing: 0.3, marginBottom: 4, marginTop: 44 },
  appName: { fontSize: 32, fontWeight: '900', color: NAVY, letterSpacing: 1 },
  appSub:  { fontSize: 10, color: '#aaa', marginTop: 4, letterSpacing: 2, fontWeight: '700' },

  // ── Menu ──
  menu: { padding: 18, gap: 11, marginTop: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  iconBox: {
    width: 80, height: 80,
    margin: 10,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { width: 70, height: 70 },
  cardText: { flex: 1, paddingVertical: 14, paddingRight: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 3, letterSpacing: 0.1 },
  cardSub:   { fontSize: 11.5, color: '#8a9ab0', fontWeight: '500' },
  arrowBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#EEF2F7',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  arrowChar: { fontSize: 22, fontWeight: '700', color: NAVY, lineHeight: 28 },

  // ── Buttons header ──
  settingsBtn: {
    position: 'absolute', top: 52, right: 18,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  statsBtn: {
    position: 'absolute', top: 52, right: 106,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    position: 'absolute', top: 52, right: 62,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  accountBtn: {
    position: 'absolute', top: 52, left: 18,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { fontSize: 17 },
  companyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a3f8f',
    marginHorizontal: 18, marginTop: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  companyBannerIcon:  { fontSize: 20 },
  companyBannerTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  companyBannerSub:   { fontSize: 11, color: '#aac4ff', marginTop: 1 },
  companyBannerArrow: { fontSize: 22, fontWeight: '700', color: '#aac4ff' },

  badge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

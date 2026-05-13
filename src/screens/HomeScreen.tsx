import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Easing, Image, Linking, Modal, Pressable,
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
import { useSubscription } from '../contexts/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';


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
  const navigation   = useNavigation<Nav>();
  const { theme: t } = useTheme();
  const subscription = useSubscription();
  const [modalVisible,   setModalVisible]   = useState(false);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [tourVisible,    setTourVisible]    = useState(false);
  const [tourSteps,      setTourSteps]      = useState<TourStep[]>([]);
  const [userName,       setUserName]       = useState<string | null>(null);
  const [userEmail,      setUserEmail]      = useState<string | null>(null);
  const [hasCompany,     setHasCompany]     = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [hasInvites,     setHasInvites]     = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [supportOpen,    setSupportOpen]    = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

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
      if (!user) { setCompanyLoading(false); return; }
      setUserEmail(user.email ?? null);
      const profile = await fetchProfile(user.id);
      if (profile?.full_name) {
        setUserName(profile.full_name.trim());
      }
      if (!profile?.company_id) {
        setHasCompany(false);
        setCompanyLoading(false);
        // Controlla se ci sono inviti in arrivo per il badge
        const mine = await listInvitesForMe();
        setHasInvites(mine.length > 0);
        return;
      }
      setHasCompany(true);
      setCompanyLoading(false);
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

  const handleCreate = async (name: string, clientName: string, clientPhone: string, address: string, seriesId: string | null) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(), name, clientName, clientPhone, address,
      gps: null, openings: [], parentId: null,
      catalogSeriesId: seriesId,
      createdAt: now, updatedAt: now,
    };
    try {
      await saveProject(project);
    } catch (e: any) {
      if (e?.message === 'NO_IDS') {
        AppAlert.show('Sessione scaduta', 'Riapri l\'app e riprova. Se il problema persiste, vai su Account e verifica di essere loggato.');
        return;
      }
    }
    setModalVisible(false);
    subscription.refresh();
    navigation.navigate('Project', { projectId: project.id });
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };
  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start(() => setMenuOpen(false));
  };

  const handlePress = (key: string) => {
    if (key === 'create') {
      if (companyLoading) {
        AppAlert.show('Caricamento', 'Attendi il caricamento del profilo...');
        return;
      }
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
      if (!subscription.canCreate) {
        navigation.navigate('Paywall');
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
          <TouchableOpacity style={styles.burgerBtn} onPress={openMenu} activeOpacity={0.75}>
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
            <View style={styles.burgerLine} />
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

      {/* ── Menu burger ── */}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <Animated.View
            style={[styles.menuPanel, {
              transform: [{ translateX: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [280, 0] }) }],
              opacity: menuAnim,
            }]}
          >
            <Pressable onPress={() => {}}>
              {/* Profilo */}
              <View style={styles.menuProfileBlock}>
                <View style={styles.menuAvatar}>
                  <Text style={styles.menuAvatarText}>{(userName || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuProfileName} numberOfLines={1}>{userName || 'Utente'}</Text>
                  {userEmail && <Text style={styles.menuProfileEmail} numberOfLines={1}>{userEmail}</Text>}
                </View>
              </View>

              <View style={styles.menuDivider} />

              {/* Voci */}
              {([
                { icon: 'bar-chart',    label: 'Statistiche',      sub: 'Riepilogo rilievi e misure',    color: '#1565C0', bg: '#E3F2FD', action: () => { closeMenu(); setTimeout(() => navigation.navigate('Stats'), 200); } },
                { icon: 'cube',         label: 'Magazzino avanzi', sub: 'Riutilizza i profili avanzati', color: '#E65100', bg: '#FFF3E0', action: () => { closeMenu(); setTimeout(() => navigation.navigate('Magazzino'), 200); } },
                { icon: 'layers',       label: 'Serie catalogo',   sub: 'Profili e formule di taglio',  color: '#00695C', bg: '#E0F2F1', action: () => { closeMenu(); setTimeout(() => navigation.navigate('CatalogSeries'), 200); } },
                { icon: 'settings',     label: 'Impostazioni',     sub: 'Parametri calcolo e barre',    color: '#37474F', bg: '#ECEFF1', action: () => { closeMenu(); setTimeout(() => navigation.navigate('Settings'), 200); } },
                { icon: 'compass',      label: 'Tour guidato',     sub: 'Rivedere le funzionalità',     color: '#6A1B9A', bg: '#F3E5F5', action: () => { closeMenu(); setTimeout(openTour, 200); } },
                { icon: 'headset',      label: 'Supporto tecnico', sub: 'Scrivici per assistenza',      color: '#C62828', bg: '#FFEBEE', action: () => { closeMenu(); setTimeout(() => setSupportOpen(true), 200); } },
              ] as { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; sub: string; color: string; bg: string; action: () => void }[]).map(item => (
                <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action} activeOpacity={0.7}>
                  <View style={[styles.menuItemBox, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuItemText, { color: item.color }]}>{item.label}</Text>
                    <Text style={styles.menuItemSub}>{item.sub}</Text>
                  </View>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── Supporto tecnico modal ── */}
      <Modal visible={supportOpen} transparent animationType="fade" onRequestClose={() => setSupportOpen(false)}>
        <Pressable style={styles.supportOverlay} onPress={() => setSupportOpen(false)}>
          <Pressable style={styles.supportSheet} onPress={() => {}}>
            <Text style={styles.supportIcon}>🎧</Text>
            <Text style={styles.supportTitle}>Supporto tecnico</Text>
            <Text style={styles.supportBody}>
              Hai bisogno di aiuto? Scrivici una email e ti risponderemo il prima possibile.
            </Text>
            <Text style={styles.supportEmail}>valentinopy95@gmail.com</Text>
            <TouchableOpacity
              style={styles.supportBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSupportOpen(false);
                Linking.openURL('mailto:valentinopy95@gmail.com?subject=Supporto%20Misu');
              }}
            >
              <Text style={styles.supportBtnText}>Apri app email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportCancel} onPress={() => setSupportOpen(false)}>
              <Text style={styles.supportCancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  burgerBtn: {
    position: 'absolute', top: 52, right: 18,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
    gap: 5,
  },
  burgerLine: {
    width: 18, height: 2, borderRadius: 2, backgroundColor: NAVY,
  },
  accountBtn: {
    position: 'absolute', top: 52, left: 18,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { fontSize: 17 },

  // ── Menu burger panel ──
  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  menuPanel: {
    width: 260, minHeight: '100%',
    backgroundColor: '#fff',
    paddingTop: 56, paddingBottom: 30,
    elevation: 16,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: -4, height: 0 },
  },
  menuProfileBlock: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, gap: 12,
  },
  menuAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  menuAvatarText:    { color: '#fff', fontWeight: '900', fontSize: 18 },
  menuProfileName:   { fontSize: 14, fontWeight: '800', color: '#1a2a3a' },
  menuProfileEmail:  { fontSize: 11, color: '#8a9ab0', marginTop: 2 },
  menuDivider:       { height: 1, backgroundColor: '#EEF2F7', marginHorizontal: 16, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    marginHorizontal: 8, borderRadius: 12, marginBottom: 2,
  },
  menuNavIconBox:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuNavSub:       { fontSize: 10, color: '#8a9ab0', marginTop: 1 },
  menuSecondaryItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 14 },
  menuSecondaryText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#555' },
  menuItemBox:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemIcon:  { fontSize: 20 },
  menuItemText:  { fontSize: 14, fontWeight: '800', marginBottom: 1 },
  menuItemSub:   { fontSize: 11, color: '#8a9ab0', fontWeight: '500' },
  menuItemArrow: { fontSize: 20, color: '#ccc', fontWeight: '700' },
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

  // ── Supporto modal ──
  supportOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', paddingHorizontal: 28,
  },
  supportSheet: {
    backgroundColor: NAVY, borderRadius: 22,
    padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  supportIcon:   { fontSize: 40, marginBottom: 12 },
  supportTitle:  { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  supportBody:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  supportEmail:  { fontSize: 13, fontWeight: '700', color: '#90CAF9', marginBottom: 24 },
  supportBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  supportBtnText:    { fontSize: 15, fontWeight: '800', color: NAVY },
  supportCancel:     { paddingVertical: 10 },
  supportCancelText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

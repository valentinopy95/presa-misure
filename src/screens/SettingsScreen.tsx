import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import TourModal, { TourStep } from '../components/TourModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import {
  getBarLength, getRiattestattura,
  getAntaReduction, getSlatPitch,
  getToleranceByType,
} from '../storage/settings';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Menu card ────────────────────────────────────────────────────────────────

function MenuCard({
  icon, title, sub, color, onPress,
}: {
  icon: string; title: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[mc.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[mc.iconWrap, { backgroundColor: color + '15' }]}>
        <Text style={mc.icon}>{icon}</Text>
      </View>
      <View style={mc.text}>
        <Text style={mc.title}>{title}</Text>
        <Text style={mc.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={[mc.arrow, { backgroundColor: color + '15' }]}>
        <Text style={[mc.arrowText, { color }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    gap: 14, borderLeftWidth: 4,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 21 },
  text:      { flex: 1 },
  title:     { fontSize: 15, fontWeight: '800', color: '#1a2a3a' },
  sub:       { fontSize: 12, color: '#8a9ab0', marginTop: 3 },
  arrow:     { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
});

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={sl.text}>{label}</Text>;
}
const sl = StyleSheet.create({
  text: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase', color: '#8a9ab0', marginTop: 24, marginBottom: 10, paddingLeft: 4 },
});

// ─── Hub ─────────────────────────────────────────────────────────────────────

const SETTINGS_TOUR: TourStep[] = [
  { icon: '📋', title: 'Serie catalogo', body: 'Crea le serie di profili con le formule di taglio per ogni numero di ante. Assegna una serie al progetto e l\'app calcola ogni pezzo al millimetro in automatico.', spot: null },
  { icon: '📐', title: 'Tolleranze', body: 'Differenza tra la misura in luce e la misura di taglio. Si configura separatamente per finestre, porte, persiane e zanzariere — larghezza e altezza indipendenti.', spot: null },
  { icon: '✂️', title: 'Parametri barra', body: 'Lunghezza barra utile, riattestattura 45°, kerf 90° e margine di sicurezza. Usati per l\'ottimizzazione FFD del taglio su tutte le serie.', spot: null },
  { icon: '💰', title: 'Prezzi al m²', body: 'Prezzi orientativi per tipologia e numero di ante. Vengono usati per stimare il valore del progetto nel PDF del rilievo.', spot: null },
  { icon: '🔧', title: 'Calcolo generico', body: 'Riduzione anta, parametri persiane (lamella, zoccolo, traverso) e posizione fascia. Usati per le aperture senza serie catalogo assegnata.', spot: null },
  { icon: '💾', title: 'Preset', body: 'Salva tutta la configurazione corrente come preset con un nome. Richiamalo in un tap per applicare immediatamente tolleranze, parametri e prezzi — utile per passare da un tipo di sistema all\'altro.', spot: null },
  { icon: '☁️', title: 'Tutto in cloud', body: 'Tutte le impostazioni (tolleranze, prezzi, parametri, serie) si sincronizzano automaticamente con tutti i dispositivi del tuo team. Configuri una volta, funziona ovunque.', spot: null },
];

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { theme, toggleDark } = useTheme();
  const t = theme;
  const [tourVisible, setTourVisible] = useState(false);

  const [tolSummary,  setTolSummary]  = useState('');
  const [barSummary,  setBarSummary]  = useState('');
  const [genSummary,  setGenSummary]  = useState('');

  const loadSummaries = useCallback(() => {
    getToleranceByType().then(tbt => {
      setTolSummary(`Finestre L−${tbt.finestre.w}/H−${tbt.finestre.h} · Porte L−${tbt.porte.w}/H−${tbt.porte.h}`);
    });
    Promise.all([getBarLength(), getRiattestattura()]).then(([bar, riatt]) => {
      setBarSummary(`Barra ${bar} mm · Riattestattura ${riatt} mm`);
    });
    Promise.all([getAntaReduction(), getSlatPitch()]).then(([red, slat]) => {
      setGenSummary(`Rid. anta ${red} mm · Lamella ${slat} mm`);
    });
  }, []);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setTourVisible(true)}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    loadSummaries();
  }, [loadSummaries]));

  return (
    <ScrollView style={[s.screen, { backgroundColor: t.bg }]} contentContainerStyle={s.content}>
      <TourModal visible={tourVisible} steps={SETTINGS_TOUR} onClose={() => setTourVisible(false)}/>

      {/* ── Serie catalogo ── */}
      <SectionLabel label="Serie catalogo" />
      <MenuCard
        icon="📋" color="#00695C"
        title="Serie catalogo"
        sub="Profili, formule di taglio e varianti per numero di ante"
        onPress={() => navigation.navigate('CatalogSeries')}
      />

      {/* ── Calcolo ── */}
      <SectionLabel label="Calcolo" />
      <MenuCard
        icon="📐" color="#1565C0"
        title="Tolleranze"
        sub={tolSummary || 'Da luce a taglio per tipologia'}
        onPress={() => navigation.navigate('SettingsTolleranze')}
      />
      <MenuCard
        icon="📏" color="#2E7D32"
        title="Parametri barra"
        sub={barSummary || 'Lunghezza, kerf, riattestattura, margine'}
        onPress={() => navigation.navigate('SettingsParametri')}
      />
      <MenuCard
        icon="🔧" color="#546E7A"
        title="Calcolo generico"
        sub={genSummary || 'Riduzione anta, persiane, fascia'}
        onPress={() => navigation.navigate('SettingsGenerico')}
      />

      {/* ── Prezzi ── */}
      <SectionLabel label="Prezzi" />
      <MenuCard
        icon="💰" color="#E65100"
        title="Prezzi al m²"
        sub="Stima orientativa per tipologia e numero foglie"
        onPress={() => navigation.navigate('SettingsPrezzi')}
      />

      {/* ── Aspetto ── */}
      <SectionLabel label="Aspetto" />
      <View style={[s.toggleCard, { backgroundColor: t.card }]}>
        <View style={[s.toggleIconWrap, { backgroundColor: t.dark ? '#1a3a6a' : '#EEF4FF' }]}>
          <Text style={{ fontSize: 21 }}>{t.dark ? '🌙' : '☀️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.toggleTitle, { color: t.textPrimary }]}>Tema scuro</Text>
          <Text style={[s.toggleSub, { color: t.textSecondary }]}>{t.dark ? 'Attivo' : 'Disattivo'}</Text>
        </View>
        <Switch
          value={t.dark}
          onValueChange={toggleDark}
          trackColor={{ false: '#ccd5de', true: '#1565C0' }}
          thumbColor={t.dark ? '#e4eeff' : '#fff'}
        />
      </View>

      <Text style={[s.version, { color: t.dark ? '#3a5a7a' : '#D0D8E0' }]}>Versione 1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14,
    gap: 14, elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  toggleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleTitle:    { fontSize: 15, fontWeight: '800' },
  toggleSub:      { fontSize: 12, marginTop: 2 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});

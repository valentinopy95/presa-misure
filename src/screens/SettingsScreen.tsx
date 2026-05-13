import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import TourModal, { TourStep } from '../components/TourModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import {
  getBarLength, getRiattestattura,
  getAntaReduction, getSlatPitch,
  getToleranceByType,
  CatalogSeries, getCatalogSeries, upsertCatalogSeries,
  getDefaultCatalogSeriesId, setDefaultCatalogSeriesId,
} from '../storage/settings';
import { RootStackParamList } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../lib/supabase';
import * as AppAlert from '../components/AppAlert';

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
  const subscription = useSubscription();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [buyingSlot, setBuyingSlot] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);

  const [catalogSeries,   setCatalogSeries]   = useState<CatalogSeries[]>([]);
  const [defaultSeriesId, setDefaultSeriesId] = useState<string | null>(null);
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
    getCatalogSeries().then(setCatalogSeries);
    getDefaultCatalogSeriesId().then(setDefaultSeriesId);
    loadSummaries();
  }, [loadSummaries]));

  const handleImportSeries = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(raw) as CatalogSeries;
      if (!parsed.id || !parsed.name || !Array.isArray(parsed.variants)) {
        AppAlert.show('File non valido', 'Il file non è una serie Misu valida.');
        return;
      }
      const imported: CatalogSeries = { ...parsed, id: uuidv4() };
      await upsertCatalogSeries(imported);
      const updated = await getCatalogSeries();
      setCatalogSeries(updated);
      AppAlert.show('Serie importata', `"${imported.name}" è stata aggiunta alle tue serie.`);
    } catch {
      AppAlert.show('Errore', 'Impossibile leggere il file. Assicurati che sia un file .misu.json valido.');
    }
  };

  const handleNewSeries = () => {
    if (subscription.plan === 'free' || subscription.status !== 'active') {
      navigation.navigate('Paywall');
      return;
    }
    if (!subscription.canAddSeries) {
      if (subscription.plan === 'base') {
        // Base al limite → upgrade a Pro
        navigation.navigate('Paywall');
      } else {
        // Pro al limite → acquista slot extra
        setShowLimitModal(true);
      }
      return;
    }
    navigation.navigate('SeriesEditor', {});
  };

  const handleBuySeriesSlot = async () => {
    setBuyingSlot(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { type: 'extra_series_slot' },
      });
      if (error || !data?.url) {
        AppAlert.show('Errore', 'Impossibile avviare il pagamento. Riprova.');
        return;
      }
      const { Linking, Platform } = require('react-native');
      if (Platform.OS === 'web') (window as any).open(data.url, '_blank');
      else Linking.openURL(data.url);
      setTimeout(() => subscription.refresh(), 5000);
    } catch {
      AppAlert.show('Errore', 'Impossibile avviare il pagamento. Riprova.');
    } finally {
      setBuyingSlot(false);
      setShowLimitModal(false);
    }
  };

  return (
    <ScrollView style={[s.screen, { backgroundColor: t.bg }]} contentContainerStyle={s.content}>
      <TourModal visible={tourVisible} steps={SETTINGS_TOUR} onClose={() => setTourVisible(false)}/>

      {/* ── Serie catalogo ── */}
      <SectionLabel label="Serie catalogo" />
      <View style={[s.seriesCard, { backgroundColor: t.card }]}>
        <View style={s.seriesCardHeader}>
          <View>
            <Text style={[s.seriesCardTitle, { color: t.textPrimary }]}>📋  Gestione serie</Text>
            <Text style={[s.seriesCardSub, { color: t.textSecondary }]}>
              {subscription.plan === 'free' || subscription.status !== 'active'
                ? 'Richiede piano Base o Pro'
                : `${subscription.seriesCount}/${subscription.seriesLimit} serie`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.seriesImportBtn} onPress={handleImportSeries}>
              <Text style={s.seriesImportBtnText}>Importa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.seriesAddBtn} onPress={handleNewSeries}>
              <Text style={s.seriesAddBtnText}>+ Nuova</Text>
            </TouchableOpacity>
          </View>
        </View>

        {catalogSeries.length === 0 ? (
          <View style={s.seriesEmpty}>
            <Text style={s.seriesEmptyIcon}>📂</Text>
            <Text style={[s.seriesEmptyText, { color: t.textSecondary }]}>
              Aggiungi una serie per calcolare tagli con le misure precise dei profili
            </Text>
          </View>
        ) : (
          catalogSeries.map(series => (
            <TouchableOpacity
              key={series.id}
              style={s.seriesRow}
              onPress={() => navigation.navigate('SeriesEditor', { seriesId: series.id })}
            >
              <View style={s.seriesDot} />
              <View style={{ flex: 1 }}>
                <Text style={[s.seriesName, { color: t.textPrimary }]}>{series.name}</Text>
                <Text style={[s.seriesSub, { color: t.textSecondary }]}>
                  {series.variants.length} {series.variants.length === 1 ? 'variante' : 'varianti'}
                </Text>
              </View>
              {defaultSeriesId === series.id ? (
                <View style={s.defaultBadge}>
                  <Text style={s.defaultBadgeText}>DEFAULT</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.setDefaultBtn}
                  onPress={async () => { await setDefaultCatalogSeriesId(series.id); setDefaultSeriesId(series.id); }}
                >
                  <Text style={[s.setDefaultText, { color: t.textSecondary }]}>Imposta default</Text>
                </TouchableOpacity>
              )}
              <Text style={{ color: '#ccc', fontSize: 18, marginLeft: 8 }}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

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

      {/* Limit modal */}
      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <Pressable style={lm.overlay} onPress={() => setShowLimitModal(false)}>
          <Pressable style={lm.sheet} onPress={() => {}}>
            <Text style={lm.icon}>📋</Text>
            <Text style={lm.title}>Limite serie raggiunto</Text>
            <Text style={lm.body}>
              Hai usato tutte le {subscription.seriesLimit} serie incluse nel piano Pro.{'\n'}
              Puoi aggiungere slot extra a €3/mese ciascuno.
            </Text>
            <TouchableOpacity style={lm.buyBtn} onPress={handleBuySeriesSlot} disabled={buyingSlot}>
              {buyingSlot
                ? <ActivityIndicator color="#fff"/>
                : <Text style={lm.buyBtnText}>Acquista slot extra · €3/mese</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={lm.cancelBtn} onPress={() => setShowLimitModal(false)}>
              <Text style={lm.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  seriesCard: {
    borderRadius: 16, padding: 16, marginBottom: 4,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  seriesCardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seriesCardTitle:   { fontSize: 15, fontWeight: '800' },
  seriesCardSub:     { fontSize: 12, marginTop: 2 },
  seriesAddBtn:        { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  seriesAddBtnText:    { color: '#fff', fontWeight: '800', fontSize: 12 },
  seriesImportBtn:     { borderWidth: 1.5, borderColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  seriesImportBtnText: { color: '#0c2d75', fontWeight: '700', fontSize: 12 },

  seriesEmpty:     { alignItems: 'center', paddingVertical: 16, gap: 8 },
  seriesEmptyIcon: { fontSize: 28 },
  seriesEmptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  seriesRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 10 },
  seriesDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1565C0' },
  seriesName:  { fontSize: 14, fontWeight: '700' },
  seriesSub:   { fontSize: 11, marginTop: 2 },

  defaultBadge:     { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: '900', color: '#2E7D32', letterSpacing: 0.3 },
  setDefaultBtn:    { paddingHorizontal: 6 },
  setDefaultText:   { fontSize: 11, fontWeight: '600' },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14,
    gap: 14, elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  toggleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleTitle:    { fontSize: 15, fontWeight: '800' },
  toggleSub:      { fontSize: 12, marginTop: 2 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});

const lm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 28 },
  sheet:     { backgroundColor: '#0c2d75', borderRadius: 22, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  icon:      { fontSize: 36, marginBottom: 12 },
  title:     { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  body:      { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  buyBtn:    { backgroundColor: '#1565C0', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, width: '100%', alignItems: 'center', marginBottom: 10 },
  buyBtnText:{ fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelBtn: { paddingVertical: 10 },
  cancelText:{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

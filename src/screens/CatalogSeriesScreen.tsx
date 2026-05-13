import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { v4 as uuidv4 } from 'uuid';
import TourModal, { TourStep } from '../components/TourModal';
import {
  CatalogSeries, getCatalogSeries, upsertCatalogSeries,
  getDefaultCatalogSeriesId, setDefaultCatalogSeriesId,
} from '../storage/settings';
import { RootStackParamList } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import * as AppAlert from '../components/AppAlert';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOUR: TourStep[] = [
  { icon: '📋', title: 'Serie catalogo', body: 'Una serie è un set di formule di taglio per un sistema di profili. Crea una serie per ogni sistema (es. EKOS 100, EKU 66 TT) e l\'app calcola ogni pezzo al millimetro in automatico.', spot: null },
  { icon: '🔢', title: 'Varianti per numero di ante', body: 'Ogni serie ha una variante per 1 anta, 2 ante, 3 ante ecc. Ogni variante contiene i pezzi (traverso, montante, fermavetro…) con la loro formula di calcolo.', spot: null },
  { icon: '⭐', title: 'Serie default', body: 'Imposta una serie come default: verrà preselezionata alla creazione di ogni nuovo progetto. Puoi sempre cambiarla progetto per progetto.', spot: null },
  { icon: '↕️', title: 'Importa / Esporta', body: 'Esporta una serie in un file .misu.json per condividerla con un collega o per riceverla già pronta dal fornitore. Importa un file ricevuto con il tasto "Importa".', spot: null },
  { icon: '☁️', title: 'Sincronizzazione automatica', body: 'Le serie sono condivise con tutto il team. Chi aggiunge o modifica una serie lo vede subito su tutti i dispositivi collegati alla stessa azienda.', spot: null },
];

export default function CatalogSeriesScreen() {
  const navigation   = useNavigation<Nav>();
  const { theme: t } = useTheme();
  const subscription = useSubscription();

  const [catalogSeries,   setCatalogSeries]   = useState<CatalogSeries[]>([]);
  const [defaultSeriesId, setDefaultSeriesId] = useState<string | null>(null);
  const [showLimitModal,  setShowLimitModal]  = useState(false);
  const [buyingSlot,      setBuyingSlot]      = useState(false);
  const [tourVisible,     setTourVisible]     = useState(false);

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
  }, []));

  const handleExportSeries = async (series: CatalogSeries) => {
    const json = JSON.stringify(series, null, 2);
    const fileName = `${series.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}.misu.json`;
    const path = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Esporta serie' });
  };

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
        navigation.navigate('Paywall');
      } else {
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
      <TourModal visible={tourVisible} steps={TOUR} onClose={() => setTourVisible(false)} />

      {/* Header info */}
      <View style={[s.infoCard, { backgroundColor: t.card }]}>
        <View style={s.infoRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: t.textPrimary }]}>Serie di profili</Text>
            <Text style={[s.infoSub, { color: t.textSecondary }]}>
              {subscription.plan === 'free' || subscription.status !== 'active'
                ? 'Richiede piano Base o Pro'
                : `${subscription.seriesCount} di ${subscription.seriesLimit} serie usate`}
            </Text>
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={s.importBtn} onPress={handleImportSeries}>
              <Text style={s.importBtnText}>↑ Importa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} onPress={handleNewSeries}>
              <Text style={s.addBtnText}>+ Nuova</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lista serie */}
      {catalogSeries.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: t.card }]}>
          <Text style={s.emptyIcon}>📂</Text>
          <Text style={[s.emptyTitle, { color: t.textPrimary }]}>Nessuna serie</Text>
          <Text style={[s.emptyBody, { color: t.textSecondary }]}>
            Crea una serie per calcolare i tagli con le misure precise dei profili, oppure importa un file .misu.json ricevuto.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={handleNewSeries}>
            <Text style={s.emptyBtnText}>+ Crea prima serie</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.listCard, { backgroundColor: t.card }]}>
          {catalogSeries.map((series, idx) => (
            <TouchableOpacity
              key={series.id}
              style={[s.row, idx > 0 && s.rowBorder]}
              onPress={() => navigation.navigate('SeriesEditor', { seriesId: series.id })}
              activeOpacity={0.7}
            >
              <View style={s.rowDot} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: t.textPrimary }]}>{series.name}</Text>
                <Text style={[s.rowSub, { color: t.textSecondary }]}>
                  {series.variants.length} {series.variants.length === 1 ? 'variante' : 'varianti'}
                </Text>
              </View>
              <TouchableOpacity style={s.exportBtn} onPress={() => handleExportSeries(series)}>
                <Text style={s.exportBtnText}>↑ Esporta</Text>
              </TouchableOpacity>
              {defaultSeriesId === series.id ? (
                <View style={s.defaultBadge}>
                  <Text style={s.defaultBadgeText}>DEFAULT</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.setDefaultBtn}
                  onPress={async () => {
                    await setDefaultCatalogSeriesId(series.id);
                    setDefaultSeriesId(series.id);
                  }}
                >
                  <Text style={[s.setDefaultText, { color: t.textSecondary }]}>Default</Text>
                </TouchableOpacity>
              )}
              <Text style={{ color: '#ccc', fontSize: 20, marginLeft: 8 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[s.hint, { color: t.textSecondary }]}>
        Entra in una serie per modificarla, aggiungere varianti o esportarla come file .misu.json.
      </Text>

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
                ? <ActivityIndicator color="#fff" />
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

const NAVY = '#0c2d75';

const s = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  infoCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoTitle: { fontSize: 16, fontWeight: '800' },
  infoSub:   { fontSize: 12, marginTop: 3 },
  btnRow:   { flexDirection: 'row', gap: 8 },
  addBtn:   { backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  importBtn:  { borderWidth: 1.5, borderColor: NAVY, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  importBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },

  emptyCard: {
    borderRadius: 16, padding: 32, alignItems: 'center',
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  emptyBody:  { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn:   { backgroundColor: NAVY, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  listCard: {
    borderRadius: 16, paddingHorizontal: 16,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  rowDot:    { width: 9, height: 9, borderRadius: 5, backgroundColor: NAVY },
  rowName:   { fontSize: 14, fontWeight: '700' },
  rowSub:    { fontSize: 11, marginTop: 2 },

  exportBtn:     { borderWidth: 1.5, borderColor: NAVY, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  exportBtnText: { color: NAVY, fontWeight: '700', fontSize: 11 },

  defaultBadge:     { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: '900', color: '#2E7D32', letterSpacing: 0.3 },
  setDefaultBtn:    { paddingHorizontal: 4 },
  setDefaultText:   { fontSize: 11, fontWeight: '600' },

  hint: { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});

const lm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 28 },
  sheet:     { backgroundColor: NAVY, borderRadius: 22, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  icon:      { fontSize: 36, marginBottom: 12 },
  title:     { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  body:      { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  buyBtn:    { backgroundColor: '#1565C0', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, width: '100%', alignItems: 'center', marginBottom: 10 },
  buyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

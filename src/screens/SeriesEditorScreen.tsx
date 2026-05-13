import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Modal, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import * as AppAlert from '../components/AppAlert';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  CatalogSeries, CatalogVariant,
  getCatalogSeries, upsertCatalogSeries, deleteCatalogSeries,
} from '../storage/settings';
import { RootStackParamList } from '../types';
import TourModal, { TourStep } from '../components/TourModal';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'SeriesEditor'>;
type Route = RouteProp<RootStackParamList, 'SeriesEditor'>;

const SERIES_TOUR: TourStep[] = [
  { icon: '📋', title: 'Cos\'è una serie catalogo', body: 'Una serie rappresenta un sistema di profili (es. EKOS 100). Contiene una o più varianti, una per ogni numero di ante (1 anta, 2 ante, ecc.).', spot: null },
  { icon: '🔢', title: 'Varianti per numero di ante', body: 'Per ogni configurazione (1 anta, 2 ante…) crei una variante separata. Quando assegni la serie a un progetto, l\'app sceglie automaticamente la variante giusta per ogni apertura.', spot: null },
  { icon: '✏️', title: 'Modifica variante', body: 'Tocca una variante esistente per aprire l\'editor e configurare i pezzi (traversi, montanti, fermavetro, riporto) con le formule di calcolo specifiche della serie.', spot: null },
  { icon: '🏷️', title: 'Assegna al progetto', body: 'Dopo aver creato la serie, torna nel progetto e tocca il badge 📋 nell\'header per assegnarla. Distinta e sviluppo useranno le misure della serie.', spot: null },
];

const LEAF_OPTIONS = [1, 2, 3, 4];

export default function SeriesEditorScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { seriesId } = route.params ?? {};

  const [name,     setName]     = useState('');
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(seriesId);

  // Modal selezione numero ante per nuova variante
  const [showLeafPicker, setShowLeafPicker] = useState(false);
  const [tourVisible,    setTourVisible]    = useState(false);

  useFocusEffect(useCallback(() => {
    const id = currentId;
    if (!id) return;
    getCatalogSeries().then(list => {
      const s = list.find(x => x.id === id);
      if (s) {
        setName(s.name);
        setVariants(s.variants);
      }
    });
  }, [currentId]));

  // Salva solo nome serie (senza toccare le varianti)
  const saveName = async (): Promise<string> => {
    if (!name.trim()) {
      AppAlert.show('Errore', 'Inserisci il nome della serie.');
      return '';
    }
    setSaving(true);
    try {
      const id = currentId ?? uuidv4();
      const existing = await getCatalogSeries();
      const current  = existing.find(s => s.id === id);
      const series: CatalogSeries = {
        id,
        name:     name.trim(),
        variants: current?.variants ?? variants,
      };
      await upsertCatalogSeries(series);
      setCurrentId(id);
      return id;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const id = await saveName();
      if (id) navigation.goBack();
    } catch (e: any) {
      AppAlert.show('Errore salvataggio', e?.message ?? 'Impossibile salvare la serie. Riprova.');
    }
  };

  const handleAddVariant = async (leafCount: number) => {
    setShowLeafPicker(false);
    // Controlla se esiste già una variante per questo numero di ante
    if (variants.find(v => v.leafCount === leafCount)) {
      AppAlert.show('Variante esistente', `Esiste già una variante per ${leafCount} ${leafCount === 1 ? 'anta' : 'ante'}. Modificala direttamente.`);
      return;
    }
    // Assicura che la serie sia salvata prima di navigare
    let id = currentId;
    if (!id) {
      id = await saveName();
      if (!id) return;
    }
    navigation.navigate('VariantEditor', { seriesId: id, leafCount });
  };

  const handleEditVariant = (variant: CatalogVariant) => {
    if (!currentId) return;
    navigation.navigate('VariantEditor', { seriesId: currentId, variantId: variant.id });
  };

  const handleDelete = () => {
    if (!currentId) return;
    AppAlert.show('Elimina serie', 'Elimini anche tutte le varianti. Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await deleteCatalogSeries(currentId);
        navigation.goBack();
      }},
    ]);
  };

  const handleExport = async () => {
    if (!currentId) {
      AppAlert.show('Salva prima', 'Salva la serie prima di esportarla.');
      return;
    }
    const all = await getCatalogSeries();
    const series = all.find(s => s.id === currentId);
    if (!series) return;
    const json = JSON.stringify(series, null, 2);
    const fileName = `${series.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}.misu.json`;
    const path = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Esporta serie' });
  };

  const handleImport = async () => {
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
      // Assegna nuovo ID per evitare conflitti
      const imported: CatalogSeries = { ...parsed, id: uuidv4() };
      await upsertCatalogSeries(imported);
      AppAlert.show('Serie importata', `"${imported.name}" è stata aggiunta alle tue serie.`);
      navigation.goBack();
    } catch {
      AppAlert.show('Errore', 'Impossibile leggere il file. Assicurati che sia un file .misu.json valido.');
    }
  };

  const usedLeafCounts = variants.map(v => v.leafCount);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TourModal visible={tourVisible} steps={SERIES_TOUR} onClose={() => setTourVisible(false)}/>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Nome serie */}
        <Text style={s.label}>Nome serie</Text>
        <TextInput
          style={s.input}
          placeholder="es. Persiana quadra XX"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Varianti */}
        <View style={s.variantsHeader}>
          <Text style={s.sectionTitle}>VARIANTI PER N° ANTE</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowLeafPicker(true)}>
            <Text style={s.addBtnText}>+ Aggiungi</Text>
          </TouchableOpacity>
        </View>

        {variants.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              Nessuna variante.{'\n'}
              Aggiungi una variante per ogni numero di ante (es. 1, 2, 4).{'\n'}
              Ogni variante ha la sua tabella pezzi con le formule di taglio.
            </Text>
          </View>
        ) : (
          variants
            .slice()
            .sort((a, b) => a.leafCount - b.leafCount)
            .map(v => (
              <TouchableOpacity key={v.id} style={s.variantRow} onPress={() => handleEditVariant(v)} activeOpacity={0.7}>
                <View style={s.variantLeafBadge}>
                  <Text style={s.variantLeafNum}>{v.leafCount}</Text>
                  <Text style={s.variantLeafLabel}>{v.leafCount === 1 ? 'anta' : 'ante'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.variantName}>{v.leafCount === 1 ? '1 anta' : `${v.leafCount} ante`}</Text>
                  <Text style={s.variantSub}>{v.pieces.length} {v.pieces.length === 1 ? 'pezzo' : 'pezzi'}</Text>
                </View>
                <Text style={s.variantArrow}>›</Text>
              </TouchableOpacity>
            ))
        )}

        {/* Salva */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff"/>
            : <Text style={s.saveBtnText}>Salva serie</Text>}
        </TouchableOpacity>

        {currentId && (
          <TouchableOpacity style={s.exportBtn} onPress={handleExport}>
            <Text style={s.exportBtnText}>Esporta file .misu.json</Text>
          </TouchableOpacity>
        )}

        {currentId && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Text style={s.deleteBtnText}>Elimina serie</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Modal picker numero ante */}
      <Modal visible={showLeafPicker} transparent animationType="fade" onRequestClose={() => setShowLeafPicker(false)}>
        <Pressable style={s.overlay} onPress={() => setShowLeafPicker(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Seleziona numero ante</Text>
            <View style={s.leafGrid}>
              {LEAF_OPTIONS.map(n => {
                const used = usedLeafCounts.includes(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[s.leafOption, used && s.leafOptionUsed]}
                    onPress={() => !used && handleAddVariant(n)}
                    activeOpacity={used ? 1 : 0.7}
                  >
                    <Text style={[s.leafOptionNum, used && s.leafOptionNumUsed]}>{n}</Text>
                    <Text style={[s.leafOptionLabel, used && s.leafOptionLabelUsed]}>
                      {n === 1 ? 'anta' : 'ante'}
                    </Text>
                    {used && <Text style={s.leafOptionUsedTag}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setShowLeafPicker(false)}>
              <Text style={s.sheetCancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 16, paddingBottom: 40 },

  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDE3ED', paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#1a2a3a', marginBottom: 20 },

  variantsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle:   { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  addBtn:         { backgroundColor: '#0c2d75', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText:     { color: '#fff', fontWeight: '800', fontSize: 12 },

  emptyBox:  { backgroundColor: '#EEF4FF', borderRadius: 12, padding: 16, marginBottom: 20 },
  emptyText: { fontSize: 13, color: '#5a7090', lineHeight: 20, textAlign: 'center' },

  variantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDE3ED',
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 8,
  },
  variantLeafBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0c2d75',
    alignItems: 'center', justifyContent: 'center',
  },
  variantLeafNum:   { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  variantLeafLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '700' },
  variantName:      { fontSize: 15, fontWeight: '700', color: '#1a2a3a' },
  variantSub:       { fontSize: 12, color: '#7a8a9a', marginTop: 2 },
  variantArrow:     { fontSize: 22, color: '#aaa' },

  saveBtn:       { backgroundColor: '#0c2d75', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  saveBtnText:   { color: '#fff', fontWeight: '900', fontSize: 16 },
  exportBtn:     { borderWidth: 1.5, borderColor: '#0c2d75', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  exportBtnText: { color: '#0c2d75', fontWeight: '700', fontSize: 14 },
  deleteBtn:     { borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet:   { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#1a2a3a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20, textAlign: 'center' },

  leafGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  leafOption: {
    width: 76, height: 76, borderRadius: 12,
    backgroundColor: '#0c2d75',
    alignItems: 'center', justifyContent: 'center',
  },
  leafOptionUsed: { backgroundColor: '#E8F5E9' },
  leafOptionNum:  { color: '#fff', fontSize: 28, fontWeight: '900' },
  leafOptionNumUsed: { color: '#2E7D32' },
  leafOptionLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' },
  leafOptionLabelUsed: { color: '#4CAF50' },
  leafOptionUsedTag: { position: 'absolute', top: 6, right: 8, fontSize: 12, color: '#2E7D32', fontWeight: '900' },

  sheetCancel:     { alignItems: 'center', paddingVertical: 12 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
});

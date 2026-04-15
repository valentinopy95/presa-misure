import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Dimensions, Modal, Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Opening, Photo, RootStackParamList, OpeningStyle, OpeningSide } from '../types';
import { getProject, saveOpening } from '../storage/database';
import { getToleranceW, getToleranceH, getDimMode } from '../storage/settings';
import { LiveDrawing } from '../components/drawings';
import StyleLabel from '../components/StyleLabel';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Measurement'>;
type Route = RouteProp<RootStackParamList, 'Measurement'>;

const SCREEN_W = Dimensions.get('window').width;
const DRAWING_W = SCREEN_W - 40;

function getOpeningSides(style: OpeningStyle | null, leafCount: number | null): { value: OpeningSide; label: string }[] {
  if (style === 'window_tilt_turn') {
    return [
      { value: 'bottom', label: 'Basso ↓' },
      { value: 'top',    label: 'Alto ↑'  },
    ];
  }
  const n = leafCount ?? 1;
  if (n >= 4) return [
    { value: 'left',         label: '← Sinistra'   },
    { value: 'center-left',  label: '← Centro-sin' },
    { value: 'center-right', label: 'Centro-des →' },
    { value: 'right',        label: 'Destra →'     },
  ];
  if (n === 3) return [
    { value: 'left',   label: '← Sinistra' },
    { value: 'center', label: 'Centro'      },
    { value: 'right',  label: 'Destra →'   },
  ];
  return [
    { value: 'left',  label: '← Sinistra' },
    { value: 'right', label: 'Destra →'   },
  ];
}


const emptyOpening = (): Opening => ({
  id: uuidv4(),
  name: '',
  width: null,
  height: null,
  boxHeight: null,
  leafCount: null,
  openingSide: null,
  style: null,
  profileSeries: null,
  glassType: null,
  photos: [],
  textNote: '',
  audioNote: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function MeasurementScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId, openingId } = route.params;

  const [opening, setOpening] = useState<Opening>(emptyOpening());
  const [toleranceW, setToleranceW] = useState<number>(10);
  const [toleranceH, setToleranceH] = useState<number>(10);
  const [dimMode, setDimMode] = useState<'taglio' | 'luce'>('taglio');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    getToleranceW().then(setToleranceW);
    getToleranceH().then(setToleranceH);
    getDimMode().then(setDimMode);
    if (openingId) {
      getProject(projectId).then(p => {
        const existing = p?.openings.find(o => o.id === openingId);
        if (existing) setOpening(existing);
      });
    }
  }, [openingId, projectId]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      getToleranceW().then(setToleranceW);
      getToleranceH().then(setToleranceH);
      getDimMode().then(setDimMode);
      if (openingId) {
        getProject(projectId).then(p => {
          const existing = p?.openings.find(o => o.id === openingId);
          if (existing) setOpening(existing);
        });
      }
    });
    return unsub;
  }, [navigation, openingId, projectId]);

  const update = (fields: Partial<Opening>) =>
    setOpening(prev => ({ ...prev, ...fields }));

  const taglioW = opening.width  != null ? opening.width  - toleranceW : null;
  const taglioH = opening.height != null ? opening.height - toleranceH : null;
  const isMonoblocco = opening.style === 'roller_blind';
  const isSubframe   = opening.style === 'subframe_window';
  const isSliding    = opening.style === 'door_sliding' || opening.style === 'window_sliding';

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const photo: Photo = { id: uuidv4(), uri: result.assets[0].uri, createdAt: new Date().toISOString() };
      update({ photos: [...opening.photos, photo] });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const photo: Photo = { id: uuidv4(), uri: result.assets[0].uri, createdAt: new Date().toISOString() };
      update({ photos: [...opening.photos, photo] });
    }
  };

  const removePhoto = (id: string) =>
    update({ photos: opening.photos.filter(p => p.id !== id) });

  const handleSavePress = () => {
    if (!opening.name.trim()) {
      Alert.alert('Nome richiesto', 'Inserisci un nome per questa apertura.');
      return;
    }
    setShowSaveModal(true);
  };

  const doSave = async (andDevelop: boolean) => {
    setShowSaveModal(false);
    setIsSaving(true);
    const now = new Date().toISOString();
    const toSave: Opening = { ...opening, updatedAt: now };
    if (!openingId) toSave.createdAt = now;
    await saveOpening(projectId, toSave);
    setIsSaving(false);
    if (andDevelop) {
      navigation.navigate('Materials', { projectId });
    } else {
      navigation.goBack();
    }
  };

  const openStylePicker = () => {
    saveOpening(projectId, opening).then(() => {
      navigation.navigate('StylePicker', { projectId, openingId: opening.id });
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Disegno 2D live (sempre visibile) ── */}
      <View style={styles.drawingCard}>
        <LiveDrawing
          style={opening.style}
          width={opening.width}
          height={opening.height}
          toleranceW={toleranceW}
          toleranceH={toleranceH}
          boxHeight={opening.boxHeight}
          leafCount={opening.leafCount}
          openingSide={opening.openingSide}
          displayWidth={DRAWING_W - 16}
          dimMode={dimMode}
        />
        {!opening.style && (
          <Text style={styles.drawingPlaceholder}>
            Seleziona un tipo per vedere il disegno
          </Text>
        )}
      </View>

      {/* ── Nome ── */}
      <Text style={styles.label}>Nome apertura *</Text>
      <TextInput
        style={styles.input}
        placeholder="es. Finestra soggiorno"
        value={opening.name}
        onChangeText={t => update({ name: t })}
      />

      {/* ── Tipologia ── */}
      <Text style={styles.label}>Tipologia</Text>
      <TouchableOpacity style={styles.styleButton} onPress={openStylePicker}>
        {opening.style ? (
          <StyleLabel style={opening.style} />
        ) : (
          <Text style={styles.stylePlaceholder}>Seleziona tipo...</Text>
        )}
        <Text style={styles.styleArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Larghezza ── */}
      <Text style={styles.label}>Larghezza</Text>
      <View style={styles.dimCard}>
        <View style={styles.dimRow}>
          <View style={styles.dimLabelCol}>
            <Text style={styles.dimType}>LUCE</Text>
            <Text style={styles.dimDesc}>misurata sul posto</Text>
          </View>
          <View style={styles.dimInputWrap}>
            <TextInput
              style={styles.dimField}
              placeholder="—"
              keyboardType="numeric"
              value={opening.width?.toString() ?? ''}
              onChangeText={t => update({ width: t ? Number(t) : null })}
            />
            <Text style={styles.unit}>mm</Text>
          </View>
        </View>
        <View style={styles.dimDivider}/>
        <View style={styles.dimRow}>
          <View style={styles.dimLabelCol}>
            <Text style={[styles.dimType, styles.dimTypeTaglio]}>TAGLIO</Text>
            <Text style={styles.dimDesc}>luce − {toleranceW} mm</Text>
          </View>
          <View style={styles.dimInputWrap}>
            <Text style={styles.taglioValue}>{taglioW ?? '—'}</Text>
            <Text style={styles.unit}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Altezza ── */}
      <Text style={styles.label}>Altezza</Text>
      <View style={styles.dimCard}>
        <View style={styles.dimRow}>
          <View style={styles.dimLabelCol}>
            <Text style={styles.dimType}>LUCE</Text>
            <Text style={styles.dimDesc}>misurata sul posto</Text>
          </View>
          <View style={styles.dimInputWrap}>
            <TextInput
              style={styles.dimField}
              placeholder="—"
              keyboardType="numeric"
              value={opening.height?.toString() ?? ''}
              onChangeText={t => update({ height: t ? Number(t) : null })}
            />
            <Text style={styles.unit}>mm</Text>
          </View>
        </View>
        <View style={styles.dimDivider}/>
        <View style={styles.dimRow}>
          <View style={styles.dimLabelCol}>
            <Text style={[styles.dimType, styles.dimTypeTaglio]}>TAGLIO</Text>
            <Text style={styles.dimDesc}>luce − {toleranceH} mm</Text>
          </View>
          <View style={styles.dimInputWrap}>
            <Text style={styles.taglioValue}>{taglioH ?? '—'}</Text>
            <Text style={styles.unit}>mm</Text>
          </View>
        </View>
      </View>
      <Text style={styles.toleranceHint}>Tolleranze modificabili in Impostazioni ⚙️</Text>

      {/* ── Altezza cassonetto (solo monoblocco) ── */}
      {isMonoblocco && (
        <>
          <Text style={styles.label}>Altezza cassonetto</Text>
          <View style={styles.dimCard}>
            <View style={styles.dimRow}>
              <View style={styles.dimLabelCol}>
                <Text style={styles.dimType}>CASSONETTO</Text>
                <Text style={styles.dimDesc}>altezza vano tapparella</Text>
              </View>
              <View style={styles.dimInputWrap}>
                <TextInput
                  style={styles.dimField}
                  placeholder="—"
                  keyboardType="numeric"
                  value={opening.boxHeight?.toString() ?? ''}
                  onChangeText={t => update({ boxHeight: t ? Number(t) : null })}
                />
                <Text style={styles.unit}>mm</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* ── Numero ante (non per controtelai) ── */}
      {!isSubframe && (
        <>
          <Text style={styles.label}>Numero ante</Text>
          <View style={styles.leafRow}>
            {[1, 2, 3, 4].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.leafBtn, opening.leafCount === n && styles.leafBtnActive]}
                onPress={() => update({ leafCount: opening.leafCount === n ? null : n })}
              >
                <Text style={[styles.leafBtnText, opening.leafCount === n && styles.leafBtnTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Lato apertura (non per controtelai) ── */}
      {!isSubframe && (
        <>
          <Text style={styles.label}>Lato apertura</Text>
          <View style={styles.sideRow}>
            {getOpeningSides(opening.style, opening.leafCount).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sideBtn, opening.openingSide === opt.value && styles.sideBtnActive]}
                onPress={() => update({ openingSide: opening.openingSide === opt.value ? null : opt.value })}
              >
                <Text style={[styles.sideBtnText, opening.openingSide === opt.value && styles.sideBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Note ── */}
      <Text style={styles.label}>Note</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Aggiungi note o osservazioni..."
        multiline
        numberOfLines={3}
        value={opening.textNote}
        onChangeText={t => update({ textNote: t })}
      />

      {/* ── Foto ── */}
      <Text style={styles.label}>Foto</Text>
      <View style={styles.photoRow}>
        {opening.photos.map(photo => (
          <View key={photo.id} style={styles.photoThumb}>
            <Image source={{ uri: photo.uri }} style={styles.thumb}/>
            <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(photo.id)}>
              <Text style={styles.removePhotoText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
          <Text style={styles.addPhotoIcon}>📷</Text>
          <Text style={styles.addPhotoText}>Fotocamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPhoto} onPress={pickFromGallery}>
          <Text style={styles.addPhotoIcon}>🖼️</Text>
          <Text style={styles.addPhotoText}>Galleria</Text>
        </TouchableOpacity>
      </View>

      {/* ── Salva ── */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSavePress}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Salvataggio...' : 'Salva apertura'}
        </Text>
      </TouchableOpacity>

      {/* ── Modal salvataggio ── */}
      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSaveModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Salva apertura</Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => doSave(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnPrimaryText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => doSave(true)} activeOpacity={0.8}>
              <Text style={styles.modalBtnSecondaryText}>Salva e sviluppa materiale</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSaveModal(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 48 },

  drawingCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 8,
    marginBottom: 20, elevation: 2, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    minHeight: 60,
  },
  drawingPlaceholder: {
    color: '#CCC', fontSize: 13, paddingVertical: 16,
  },

  label: {
    fontSize: 11, fontWeight: '700', color: '#555',
    marginBottom: 6, marginTop: 18,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 13,
    fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0',
  },
  textArea: { height: 90, textAlignVertical: 'top' },

  unit: { fontSize: 13, color: '#999', marginLeft: 4, fontWeight: '600' },
  taglioValue: { fontSize: 20, fontWeight: '800', color: '#1565C0', textAlign: 'right' },
  toleranceHint: { fontSize: 11, color: '#BBB', textAlign: 'right', marginTop: 4 },

  dimCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden',
  },
  dimRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  dimDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },
  dimLabelCol: { flex: 1 },
  dimType: { fontSize: 11, fontWeight: '800', color: '#333', letterSpacing: 1 },
  dimTypeTaglio: { color: '#1565C0' },
  dimDesc: { fontSize: 11, color: '#AAA', marginTop: 1 },
  dimInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dimField: {
    fontSize: 20, fontWeight: '700', color: '#222',
    textAlign: 'right', minWidth: 80, padding: 4,
    borderBottomWidth: 2, borderBottomColor: '#E0E0E0',
  },

  styleButton: {
    backgroundColor: '#fff', borderRadius: 10, padding: 13,
    borderWidth: 1, borderColor: '#E0E0E0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stylePlaceholder: { color: '#AAA', fontSize: 15 },
  styleArrow: { color: '#AAA', fontSize: 22 },

  // Leaf count selector
  leafRow: { flexDirection: 'row', gap: 10 },
  leafBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#fff',
    alignItems: 'center',
  },
  leafBtnActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  leafBtnText: { fontSize: 18, fontWeight: '700', color: '#888' },
  leafBtnTextActive: { color: '#1565C0' },

  // Opening side selector
  sideRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sideBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#fff',
  },
  sideBtnActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  sideBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  sideBtnTextActive: { color: '#1565C0' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 80, height: 80, position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#E53935', width: 22, height: 22,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 15, lineHeight: 18 },
  addPhoto: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 2, borderColor: '#1565C0', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoIcon: { fontSize: 22 },
  addPhotoText: { fontSize: 10, color: '#1565C0', marginTop: 2 },

  // Profile series chips
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#fff',
    marginRight: 8,
  },
  chipActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#888' },
  chipTextActive: { color: '#1565C0' },

  // Glass type buttons
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  glassBtn: {
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#fff',
  },
  glassBtnActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  glassBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  glassBtnTextActive: { color: '#1565C0' },

  saveButton: {
    backgroundColor: '#1565C0', borderRadius: 12,
    padding: 17, alignItems: 'center', marginTop: 28,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Save modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 16 },
  modalBtnPrimary: {
    backgroundColor: '#1565C0', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  modalBtnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBtnSecondary: {
    backgroundColor: '#E3F2FD', borderRadius: 14, borderWidth: 1.5, borderColor: '#1565C0',
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  modalBtnSecondaryText: { color: '#1565C0', fontSize: 15, fontWeight: '700' },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Pressable, Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList, Project, Opening, OpeningStyle } from '../types';
import { getProject } from '../storage/database';
import { getToleranceW, getToleranceH } from '../storage/settings';
import { LiveDrawing } from '../components/drawings';
import { generateHTML } from '../utils/pdfExport';

type Route = RouteProp<RootStackParamList, 'Document'>;

const STYLE_LABELS: Record<OpeningStyle, string> = {
  window_single:        'Battente',
  window_double:        'Finestra doppia',
  window_sliding:       'Finestra scorrevole',
  window_tilt_turn:     'Vasistas',
  door_single:          'Porta singola',
  door_double:          'Porta doppia',
  door_sliding:         'Porta scorrevole',
  door_french:          'Porta finestra',
  door_bifold:          'Porta a libro',
  door_entrance:        'Portoncino',
  shutter_single:       'Persiana finestra',
  shutter_double:       'Persiana portafinestra',
  roller_blind:         'Monoblocco tapparella',
  subframe_window:      'Controtelaio',
  mosquito_fixed:       'Zanzariera fissa',
  mosquito_rollup:      'Zanzariera sali scendi',
  mosquito_lateral:     'Zanzariera laterale',
};

const dim = (v: number | null) => v != null ? `${v}` : '—';

export default function DocumentScreen() {
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [toleranceW, setToleranceW] = useState(10);
  const [toleranceH, setToleranceH] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    getProject(projectId).then(setProject);
    getToleranceW().then(setToleranceW);
    getToleranceH().then(setToleranceH);
  }, [projectId]);

  const safeName = project?.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim() ?? 'rilievo';

  // Build PDF (native only) and return local URI
  const buildPDF = async (): Promise<string> => {
    if (!project) throw new Error('No project');
    const html = generateHTML(project, toleranceW, toleranceH);
    const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });
    const destUri = `${FileSystem.documentDirectory}${safeName}.pdf`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  };

  const handleShare = async () => {
    if (!project) return;
    setShowExportModal(false);
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        // Web: open HTML in new tab — user can print/save as PDF from browser
        const html = generateHTML(project, toleranceW, toleranceH);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, '_blank');
        if (tab) setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      // Android / iOS
      const uri = await buildPDF();
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rilievo - ${project.name}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Errore', 'Impossibile generare il PDF. Riprova.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!project) return;
    setShowExportModal(false);
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        // Web: download HTML file (user can open in browser and print as PDF)
        const html = generateHTML(project, toleranceW, toleranceH);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}_rilievo.html`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const srcUri = await buildPDF();
      const fileName = `${safeName}.pdf`;
      if (Platform.OS === 'android') {
        // Android: use Storage Access Framework to pick destination folder
        const { StorageAccessFramework } = FileSystem;
        const perms = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) { setExporting(false); return; }
        const destUri = await StorageAccessFramework.createFileAsync(
          perms.directoryUri, fileName, 'application/pdf',
        );
        const content = await FileSystem.readAsStringAsync(srcUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(destUri, content, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert('Salvato!', `"${fileName}" salvato nella cartella scelta.`);
      } else {
        // iOS: share sheet — user can tap "Salva su File"
        await Sharing.shareAsync(srcUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Salva - ${project.name}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare il PDF. Riprova.');
    } finally {
      setExporting(false);
    }
  };

  if (!project) return (
    <View style={styles.loading}>
      <ActivityIndicator color="#1565C0" size="large" />
    </View>
  );

  const windows  = project.openings.filter(o => o.style?.startsWith('window')).length;
  const doors    = project.openings.filter(o => o.style?.startsWith('door')).length;
  const shutters = project.openings.filter(o => o.style?.startsWith('shutter')).length;
  const rollers  = project.openings.filter(o => o.style === 'roller_blind').length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Header progetto ── */}
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle}>{project.name}</Text>
          {!!project.clientName && (
            <Text style={styles.projectClient}>{project.clientName}</Text>
          )}
          {!!project.address && (
            <Text style={styles.projectAddress}>📍 {project.address}</Text>
          )}
          <View style={styles.statsRow}>
            <StatBox value={project.openings.length} label="Aperture" />
            <StatBox value={windows}  label="Finestre" />
            <StatBox value={doors}    label="Porte" />
            <StatBox value={shutters} label="Persiane" />
            <StatBox value={rollers}  label="Monoblocchi" />
          </View>
          <View style={styles.toleranceRow}>
            <View style={styles.toleranceBadge}>
              <Text style={styles.toleranceBadgeText}>Tol. L: {toleranceW} mm</Text>
            </View>
            <View style={styles.toleranceBadge}>
              <Text style={styles.toleranceBadgeText}>Tol. H: {toleranceH} mm</Text>
            </View>
          </View>
        </View>

        {/* ── Griglia aperture ── */}
        {project.openings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nessuna apertura inserita</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Aperture ({project.openings.length})</Text>
            <View style={styles.grid}>
              {project.openings.map((opening, idx) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  index={idx + 1}
                  toleranceW={toleranceW}
                  toleranceH={toleranceH}
                />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottone export ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => !exporting && setShowExportModal(true)}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
              <Text style={styles.exportBtnText}>Generazione PDF...</Text>
            </>
          ) : (
            <>
              <Text style={styles.exportBtnIcon}>📄</Text>
              <Text style={styles.exportBtnText}>Esporta PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Export Modal ── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowExportModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Esporta PDF</Text>
            {project && (
              <Text style={styles.modalFilename}>
                {safeName}{Platform.OS === 'web' ? '_rilievo.html' : '.pdf'}
              </Text>
            )}
            <TouchableOpacity style={styles.modalBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.modalBtnIcon}>📤</Text>
              <View>
                <Text style={styles.modalBtnTitle}>
                  {Platform.OS === 'web' ? 'Apri nel browser' : 'Condividi'}
                </Text>
                <Text style={styles.modalBtnSub}>
                  {Platform.OS === 'web' ? 'Stampa o salva come PDF dal browser' : 'Apri nelle app del dispositivo'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnAlt]} onPress={handleSaveToDevice} activeOpacity={0.8}>
              <Text style={styles.modalBtnIcon}>💾</Text>
              <View>
                <Text style={[styles.modalBtnTitle, { color: '#1565C0' }]}>
                  {Platform.OS === 'web' ? 'Scarica HTML' : Platform.OS === 'ios' ? 'Salva su File' : 'Salva sul dispositivo'}
                </Text>
                <Text style={[styles.modalBtnSub, { color: '#7a9cc0' }]}>
                  {Platform.OS === 'web' ? 'Scarica file HTML, aprilo e stampa come PDF' : Platform.OS === 'ios' ? 'Salva in File tramite share sheet' : 'Scegli una cartella di destinazione'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowExportModal(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── StatBox ────────────────────────────────────────────────────────────────
function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.num}>{value}</Text>
      <Text style={statStyles.lbl}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  num: { fontSize: 20, fontWeight: '800', color: '#fff' },
  lbl: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase' },
});

// ─── OpeningCard ─────────────────────────────────────────────────────────────
function OpeningCard({
  opening, index, toleranceW, toleranceH,
}: {
  opening: Opening; index: number; toleranceW: number; toleranceH: number;
}) {
  const tagW = opening.width  != null ? opening.width  - toleranceW : null;
  const tagH = opening.height != null ? opening.height - toleranceH : null;
  const styleLabel = opening.style ? STYLE_LABELS[opening.style] : null;
  const isRoller = opening.style === 'roller_blind';

  return (
    <View style={cardStyles.card}>
      {/* Header */}
      <View style={cardStyles.header}>
        <View style={cardStyles.numBadge}>
          <Text style={cardStyles.numText}>{index}</Text>
        </View>
        <Text style={cardStyles.name} numberOfLines={1}>{opening.name}</Text>
      </View>

      {/* Disegno 2D */}
      <View style={cardStyles.drawingArea}>
        {opening.style ? (
          <LiveDrawing
            style={opening.style}
            previewMode
            previewSize={88}
            boxHeight={opening.boxHeight}
          />
        ) : (
          <View style={cardStyles.noStyle}>
            <Text style={cardStyles.noStyleText}>?</Text>
          </View>
        )}
      </View>

      {/* Dimensioni */}
      <View style={cardStyles.dims}>
        <DimRow label="Largh." luce={opening.width} taglio={tagW} />
        <DimRow label="Altez." luce={opening.height} taglio={tagH} />
        {isRoller && (
          <DimRow label="Cass." luce={opening.boxHeight ?? null} taglio={null} />
        )}
      </View>

      {/* Tipologia */}
      {styleLabel && (
        <View style={cardStyles.styleBadge}>
          <Text style={cardStyles.styleText}>{styleLabel}</Text>
        </View>
      )}

      {/* Note */}
      {!!opening.textNote && (
        <Text style={cardStyles.note} numberOfLines={2}>{opening.textNote}</Text>
      )}

      {/* Foto */}
      {opening.photos.length > 0 && (
        <Text style={cardStyles.photos}>📷 {opening.photos.length} foto</Text>
      )}
    </View>
  );
}

function DimRow({ label, luce, taglio }: { label: string; luce: number | null; taglio: number | null }) {
  return (
    <View style={dimRowStyles.row}>
      <Text style={dimRowStyles.label}>{label}</Text>
      <View style={dimRowStyles.values}>
        <Text style={dimRowStyles.luce}>L {dim(luce)} mm</Text>
        {taglio !== null && <Text style={dimRowStyles.taglio}>T {dim(taglio)} mm</Text>}
      </View>
    </View>
  );
}
const dimRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 10, color: '#888', fontWeight: '700', textTransform: 'uppercase' },
  values: { alignItems: 'flex-end' },
  luce: { fontSize: 13, fontWeight: '800', color: '#222' },
  taglio: { fontSize: 10, fontWeight: '600', color: '#1565C0' },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0ECF8',
    overflow: 'hidden', width: '47.5%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F6FF', padding: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#E0ECF8',
  },
  numBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  name: { flex: 1, fontSize: 12, fontWeight: '700', color: '#222' },
  drawingArea: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: '#FAFBFC',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  noStyle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  noStyleText: { fontSize: 24, color: '#CCC' },
  dims: { padding: 10, paddingBottom: 6 },
  styleBadge: {
    marginHorizontal: 10, marginBottom: 8, padding: 4,
    backgroundColor: '#E3F2FD', borderRadius: 6, alignItems: 'center',
  },
  styleText: { fontSize: 9, color: '#1565C0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { marginHorizontal: 10, marginBottom: 6, fontSize: 10, color: '#666' },
  photos: { marginHorizontal: 10, marginBottom: 8, fontSize: 10, color: '#AAA' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },

  projectHeader: {
    backgroundColor: '#1565C0', borderRadius: 16,
    padding: 20, marginBottom: 20,
  },
  projectTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  projectClient: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  projectAddress: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 14 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 12 },
  toleranceRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  toleranceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  toleranceBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#1565C0',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#AAA', fontSize: 15 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEE',
  },
  exportBtn: {
    backgroundColor: '#1565C0', borderRadius: 14,
    padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnIcon: { fontSize: 20 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 4,
  },
  modalFilename: {
    fontSize: 12, color: '#888', marginBottom: 20,
    fontStyle: 'italic',
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1565C0', borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  modalBtnAlt: {
    backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0',
  },
  modalBtnIcon: { fontSize: 24 },
  modalBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 1 },
  modalBtnSub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  modalCancel: {
    alignItems: 'center', paddingVertical: 14, marginTop: 4,
  },
  modalCancelText: { fontSize: 15, color: '#888', fontWeight: '600' },
});

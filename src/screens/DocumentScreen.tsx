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
import {
  getToleranceW, getToleranceH,
  getRiattestattura, getBarLength, getKerf90, getSafetyMargin,
  getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction, getAntaTopRail,
} from '../storage/settings';
import { LiveDrawing } from '../components/drawings';
import { generateHTML, PdfMode } from '../utils/pdfExport';
import { MaterialsConfig } from '../utils/calculateMaterials';

type Route = RouteProp<RootStackParamList, 'Document'>;

const STYLE_LABELS: Record<OpeningStyle, string> = {
  window_fixed:         'Fisso',
  window_single:        'Finestra battente',
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
  mosquito_rollup:      'Zanzariera avvolgibile',
  mosquito_lateral:     'Zanzariera laterale',
};

const dim = (v: number | null) => v != null ? `${v}` : '—';

async function buildPhotoMap(openings: Opening[]): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  for (const o of openings) {
    if (o.photos.length === 0) continue;
    const b64s: string[] = [];
    for (const photo of o.photos) {
      try {
        const b64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        b64s.push(b64);
      } catch {
        // file mancante, salta
      }
    }
    if (b64s.length > 0) map[o.id] = b64s;
  }
  return map;
}

const MODE_OPTIONS: { key: PdfMode; label: string; sub: string }[] = [
  { key: 'misure',    label: 'Solo rilievo',    sub: 'Aperture e misure' },
  { key: 'both',      label: 'Completo',         sub: 'Misure + materiale' },
  { key: 'materiale', label: 'Solo materiale',   sub: 'Sviluppo barre' },
];

export default function DocumentScreen() {
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [toleranceW, setToleranceW] = useState(10);
  const [toleranceH, setToleranceH] = useState(10);
  const [matConfig, setMatConfig] = useState<MaterialsConfig>({});
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<PdfMode>('both');

  useEffect(() => {
    getProject(projectId).then(setProject);
    Promise.all([
      getToleranceW(), getToleranceH(),
      getRiattestattura(), getBarLength(), getKerf90(),
      getSafetyMargin(), getSlatPitch(), getZoccoloH(),
      getFasciaH(), getAntaReduction(), getAntaTopRail(),
    ]).then(([tolW, tolH, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed, antaTop]) => {
      setToleranceW(tolW);
      setToleranceH(tolH);
      setMatConfig({
        riattestattura: riatt, barLength: barLen, kerf90: kerf,
        safetyMarginPct: margin, slatPitch: slatP, zoccoloH: zocH,
        fasciaH: fasH, antaReduction: antaRed, antaTopRail: antaTop,
      });
    });
  }, [projectId]);

  const safeName = project?.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim() ?? 'rilievo';

  const buildPDF = async (mode: PdfMode): Promise<string> => {
    if (!project) throw new Error('No project');
    const hasPhotos = project.openings.some(o => o.photos.length > 0);
    const photoMap = hasPhotos ? await buildPhotoMap(project.openings) : undefined;
    const html = generateHTML(project, toleranceW, toleranceH, undefined, {
      mode,
      photoMap,
      materialsConfig: matConfig,
    });
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
        const html = generateHTML(project, toleranceW, toleranceH, undefined, {
          mode: exportMode, materialsConfig: matConfig,
        });
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, '_blank');
        if (tab) setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      const uri = await buildPDF(exportMode);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rilievo - ${project.name}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
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
        const html = generateHTML(project, toleranceW, toleranceH, undefined, {
          mode: exportMode, materialsConfig: matConfig,
        });
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${safeName}_rilievo.html`; a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const srcUri = await buildPDF(exportMode);
      const fileName = `${safeName}.pdf`;
      if (Platform.OS === 'android') {
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
        await Sharing.shareAsync(srcUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Salva - ${project.name}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch {
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
          {!!project.clientName && <Text style={styles.projectClient}>{project.clientName}</Text>}
          {!!project.address && <Text style={styles.projectAddress}>📍 {project.address}</Text>}
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

            {/* Selettore contenuto */}
            <Text style={styles.modalSectionLabel}>Contenuto</Text>
            <View style={styles.modeRow}>
              {MODE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.modeBtn, exportMode === opt.key && styles.modeBtnActive]}
                  onPress={() => setExportMode(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.modeBtnLabel, exportMode === opt.key && styles.modeBtnLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.modeBtnSub, exportMode === opt.key && styles.modeBtnSubActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Azioni */}
            <TouchableOpacity style={styles.modalBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.modalBtnIcon}>📤</Text>
              <View>
                <Text style={styles.modalBtnTitle}>
                  {Platform.OS === 'web' ? 'Apri nel browser' : 'Condividi'}
                </Text>
                <Text style={styles.modalBtnSub}>
                  {Platform.OS === 'web' ? 'Stampa o salva come PDF' : 'Apri nelle app del dispositivo'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnAlt]} onPress={handleSaveToDevice} activeOpacity={0.8}>
              <Text style={styles.modalBtnIcon}>💾</Text>
              <View>
                <Text style={[styles.modalBtnTitle, { color: '#1565C0' }]}>
                  {Platform.OS === 'ios' ? 'Salva su File' : 'Salva sul dispositivo'}
                </Text>
                <Text style={[styles.modalBtnSub, { color: '#7a9cc0' }]}>
                  {Platform.OS === 'ios' ? 'Salva in File tramite share sheet' : 'Scegli una cartella di destinazione'}
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
      <View style={cardStyles.header}>
        <View style={cardStyles.numBadge}>
          <Text style={cardStyles.numText}>{index}</Text>
        </View>
        <Text style={cardStyles.name} numberOfLines={1}>{opening.name}</Text>
      </View>
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
      <View style={cardStyles.dims}>
        <DimRow label="Largh." luce={opening.width} taglio={tagW} />
        <DimRow label="Altez." luce={opening.height} taglio={tagH} />
        {isRoller && <DimRow label="Cass." luce={opening.boxHeight ?? null} taglio={null} />}
      </View>
      {styleLabel && (
        <View style={cardStyles.styleBadge}>
          <Text style={cardStyles.styleText}>{styleLabel}</Text>
        </View>
      )}
      {!!opening.textNote && (
        <Text style={cardStyles.note} numberOfLines={2}>{opening.textNote}</Text>
      )}
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
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 14 },
  modalSectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  modeBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E8F0',
    backgroundColor: '#F5F8FF', alignItems: 'center',
  },
  modeBtnActive: { borderColor: '#1565C0', backgroundColor: '#EEF4FF' },
  modeBtnLabel: { fontSize: 11, fontWeight: '700', color: '#8a9ab0', marginBottom: 2 },
  modeBtnLabelActive: { color: '#1565C0' },
  modeBtnSub: { fontSize: 9, color: '#aaa', textAlign: 'center' },
  modeBtnSubActive: { color: '#5a8ac0' },

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
  modalCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  modalCancelText: { fontSize: 15, color: '#888', fontWeight: '600' },
});

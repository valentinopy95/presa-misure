import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert, Text,
  Modal, Pressable, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { v4 as uuidv4 } from 'uuid';
import { Project, Opening, OpeningStyle, RootStackParamList } from '../types';
import { getProject, getProjectFamily, deleteOpening, saveOpening, deleteProject } from '../storage/database';
import { getToleranceW, getToleranceH } from '../storage/settings';
import { generateHTML } from '../utils/pdfExport';
import OpeningCard from '../components/OpeningCard';
import { useTheme } from '../contexts/ThemeContext';
import TourModal, { TourStep, SpotRect } from '../components/TourModal';
import { getTourSeen, setTourSeen } from '../storage/settings';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Project'>;
type Route = RouteProp<RootStackParamList, 'Project'>;

export default function ProjectScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { projectId } = route.params;
  const { theme: t } = useTheme();

  const [family,          setFamily]          = useState<Project[]>([]);
  const [activeIdx,       setActiveIdx]       = useState(0);
  const [exporting,       setExporting]       = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [tourVisible,     setTourVisible]     = useState(false);
  const [tourSteps,       setTourSteps]       = useState<TourStep[]>([]);

  const headerRef           = useRef<any>(null);
  const pdfBtnRef           = useRef<any>(null);
  const addBtnRef           = useRef<any>(null);
  const shouldAutoOpenTour  = useRef(false);

  const activeProject   = family[activeIdx] ?? null;
  const activeProjectId = activeProject?.id ?? projectId;

  // ── Carica famiglia ────────────────────────────────────────────────────────
  const loadFamily = useCallback(async () => {
    const fam = await getProjectFamily(projectId);
    if (fam.length === 0) return;
    setFamily(fam);
    const idx = fam.findIndex(p => p.id === projectId);
    setActiveIdx(prev => {
      // mantieni tab attivo se ancora valido, altrimenti va al progetto aperto
      if (prev < fam.length) return prev;
      return Math.max(0, idx);
    });
  }, [projectId]);

  // useFocusEffect richiede un callback sincrono — l'async deve stare dentro
  useFocusEffect(useCallback(() => { loadFamily(); }, [loadFamily]));

  // Ricarica solo il progetto attivo dopo cambio tab
  useEffect(() => {
    const id = family[activeIdx]?.id;
    if (!id) return;
    getProject(id).then(p => {
      if (p) setFamily(prev => prev.map((f, i) => i === activeIdx ? p : f));
    });
  }, [activeIdx]);

  // Ricarica progetto attivo (dopo aggiunta/modifica apertura)
  const reload = useCallback(() => {
    const id = family[activeIdx]?.id;
    if (!id) return;
    getProject(id).then(p => {
      if (p) setFamily(prev => prev.map((f, i) => i === activeIdx ? p : f));
    });
  }, [family, activeIdx]);

  // ── Tour ───────────────────────────────────────────────────────────────────
  const measureEl = (ref: React.RefObject<any>): Promise<SpotRect | null> =>
    new Promise(resolve => {
      if (!ref.current) { resolve(null); return; }
      setTimeout(() => {
        if (typeof ref.current?.measureInWindow !== 'function') { resolve(null); return; }
        ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
          resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
        });
      }, 100);
    });

  const openTour = useCallback(async () => {
    const [hdr, pdf, add] = await Promise.all([
      measureEl(headerRef),
      measureEl(pdfBtnRef),
      measureEl(addBtnRef),
    ]);
    setTourSteps([
      {
        icon: '🏗️',
        title: 'Il tuo rilievo',
        body: 'Qui trovi le informazioni del cantiere e l\'elenco di tutte le aperture. Se hai più versioni (finestre + persiane) usa le schede in alto per passare da una all\'altra.',
        spot: hdr,
      },
      {
        icon: '📄',
        title: 'Esporta PDF',
        body: 'Genera e condividi il documento del rilievo in PDF. Ogni scheda ha il suo PDF indipendente.',
        spot: pdf,
      },
      {
        icon: '➕',
        title: 'Aggiungi apertura',
        body: 'Premi qui per aggiungere una nuova finestra, porta o persiana alla scheda attiva.',
        spot: add,
      },
      {
        icon: '📦',
        title: 'Sviluppo materiale',
        body: 'Il tasto "Materiale" calcola il profilo per la scheda attiva. Ogni scheda ha il suo sviluppo separato.',
        spot: null,
      },
      {
        icon: '⧉',
        title: 'Duplica progetto',
        body: 'Il tasto "Duplica" crea una nuova scheda nella stessa famiglia. Utile per varianti dello stesso cantiere (es. finestre + persiane).',
        spot: null,
      },
    ]);
    setTourVisible(true);
  }, []);

  useEffect(() => {
    getTourSeen('project').then(seen => { if (!seen) shouldAutoOpenTour.current = true; });
  }, []);

  useEffect(() => {
    if (activeProject && shouldAutoOpenTour.current) {
      shouldAutoOpenTour.current = false;
      setTimeout(openTour, 500);
    }
  }, [activeProject, openTour]);

  // ── Header navigation ──────────────────────────────────────────────────────
  React.useEffect(() => {
    navigation.setOptions({
      title: family[0]?.name ?? '',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity onPress={openTour} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('DuplicateProject', { projectId: activeProjectId })}
            style={{ marginRight: 4, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>⧉ Duplica</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [family, activeProjectId, navigation, openTour]);

  // ── PDF ────────────────────────────────────────────────────────────────────
  const getLogoBase64 = async (): Promise<string | undefined> => {
    try {
      const asset = Asset.fromModule(require('../../assets/mascote.png'));
      await asset.downloadAsync();
      if (!asset.localUri) return undefined;
      return await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 as any });
    } catch { return undefined; }
  };

  const buildPDF = async (): Promise<string> => {
    if (!activeProject) throw new Error('no project');
    const tolW = await getToleranceW();
    const tolH = await getToleranceH();
    const logo = await getLogoBase64();
    const html = generateHTML(activeProject, tolW, tolH, logo);
    const { uri: tmp } = await Print.printToFileAsync({ html, base64: false });
    const safe = activeProject.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
    const dest  = `${FileSystem.documentDirectory}${safe}.pdf`;
    await FileSystem.copyAsync({ from: tmp, to: dest });
    return dest;
  };

  const handleShare = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const tolW = await getToleranceW();
        const tolH = await getToleranceH();
        const html = generateHTML(activeProject!, tolW, tolH, await getLogoBase64());
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const tab  = window.open(url, '_blank');
        if (tab) setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      const uri = await buildPDF();
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Rilievo - ${activeProject?.name}` });
    } catch { Alert.alert('Errore', 'Impossibile generare il PDF.'); }
    finally   { setExporting(false); }
  };

  const handleSaveToDevice = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const safe = activeProject!.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
      if (Platform.OS === 'web') {
        const tolW = await getToleranceW();
        const tolH = await getToleranceH();
        const html = generateHTML(activeProject!, tolW, tolH, await getLogoBase64());
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${safe}_rilievo.html`; a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const src      = await buildPDF();
      const fileName = `${safe}.pdf`;
      if (Platform.OS === 'android') {
        const { StorageAccessFramework } = FileSystem;
        const perms = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) { setExporting(false); return; }
        const dest    = await StorageAccessFramework.createFileAsync(perms.directoryUri, fileName, 'application/pdf');
        const content = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(dest, content, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('Salvato!', `"${fileName}" salvato nella cartella scelta.`);
      } else {
        await Sharing.shareAsync(src, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Salva - ${activeProject?.name}` });
      }
    } catch { Alert.alert('Errore', 'Impossibile salvare il PDF.'); }
    finally   { setExporting(false); }
  };

  // ── Aperture ───────────────────────────────────────────────────────────────
  const shutterEquivalent = (style: OpeningStyle | null): OpeningStyle => {
    if (!style) return 'shutter_single';
    if (style.startsWith('door'))   return 'shutter_double';
    if (style.startsWith('window')) return style.includes('double') ? 'shutter_double' : 'shutter_single';
    return 'shutter_single';
  };

  const handleDuplicate = (opening: Opening) => {
    const isWindowOrDoor = opening.style?.startsWith('window') || opening.style?.startsWith('door');
    if (isWindowOrDoor) {
      Alert.alert('Duplica apertura', 'Vuoi cambiare la tipologia della copia in persiana?', [
        { text: 'Sì, cambia in persiana', onPress: async () => {
            const copy: Opening = { ...opening, id: uuidv4(), name: opening.name + ' (copia)', style: shutterEquivalent(opening.style) };
            await saveOpening(activeProjectId, copy); reload();
          },
        },
        { text: 'No, copia uguale', onPress: async () => {
            const copy: Opening = { ...opening, id: uuidv4(), name: opening.name + ' (copia)' };
            await saveOpening(activeProjectId, copy); reload();
          },
        },
        { text: 'Annulla', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Duplica apertura', 'Vuoi duplicare questa apertura?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Duplica', onPress: async () => {
            const copy: Opening = { ...opening, id: uuidv4(), name: opening.name + ' (copia)' };
            await saveOpening(activeProjectId, copy); reload();
          },
        },
      ]);
    }
  };

  const handleDelete = (openingId: string) => {
    Alert.alert('Elimina apertura', 'Vuoi eliminare questa voce?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteOpening(activeProjectId, openingId); reload();
        },
      },
    ]);
  };

  const handleDeleteSubProject = (idx: number) => {
    const proj = family[idx];
    if (!proj) return;
    Alert.alert(
      'Elimina sottoprogetto',
      `Vuoi eliminare "${proj.name}" con tutte le sue aperture? L'operazione non è reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: async () => {
            await deleteProject(proj.id);
            const newFamily = family.filter((_, i) => i !== idx);
            if (newFamily.length === 0) {
              navigation.goBack();
            } else {
              setFamily(newFamily);
              setActiveIdx(Math.min(activeIdx, newFamily.length - 1));
            }
          },
        },
      ],
    );
  };

  if (!activeProject) return <View style={{ flex: 1, backgroundColor: t.bg }}/>;

  const openings = activeProject.openings ?? [];

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>

      {/* ── Header info con tab strip ── */}
      <LinearGradient
        ref={headerRef}
        colors={['#0b1e3e', '#1565C0']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.projectInfo}
      >
        <Text style={styles.client}>{activeProject.clientName || 'Cliente non specificato'}</Text>
        <Text style={styles.address}>{activeProject.address || 'Indirizzo non specificato'}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.count}>
            {openings.length} apertur{openings.length === 1 ? 'a' : 'e'}
          </Text>
        </View>

        {/* Tab strip — visibile solo se ci sono più progetti nella famiglia */}
        {family.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStrip}
            contentContainerStyle={styles.tabContent}
          >
            {family.map((p, i) => (
              <View key={p.id} style={[styles.tab, i === activeIdx && styles.tabActive]}>
                <TouchableOpacity onPress={() => setActiveIdx(i)} activeOpacity={0.75} style={styles.tabLabel}>
                  <Text style={[styles.tabText, i === activeIdx && styles.tabTextActive]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSubProject(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}>
                  <Text style={[styles.tabClose, i === activeIdx && styles.tabCloseActive]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ── Toolbar ── */}
      <View style={[styles.toolbar, { backgroundColor: t.card, borderBottomColor: '#e0e6ef' }]}>
        <TouchableOpacity
          ref={pdfBtnRef}
          style={[styles.toolbarBtn, styles.toolbarBtnPDF, exporting && { opacity: 0.55 }]}
          onPress={() => !exporting && setShowExportModal(true)}
          disabled={exporting}
          activeOpacity={0.75}
        >
          {exporting
            ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 6 }}/>
            : <Text style={styles.toolbarBtnIcon}>📄</Text>}
          <Text style={styles.toolbarBtnLabel}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={addBtnRef}
          style={[styles.toolbarBtn, styles.toolbarBtnAdd]}
          onPress={() => navigation.navigate('Measurement', { projectId: activeProjectId })}
          activeOpacity={0.75}
        >
          <Text style={styles.toolbarAddIcon}>+</Text>
          <Text style={[styles.toolbarBtnLabel, { color: '#0c2d75' }]}>Aggiungi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, styles.toolbarBtnMat]}
          onPress={() => navigation.navigate('Materials', { projectId: activeProjectId })}
          activeOpacity={0.75}
        >
          <Text style={styles.toolbarBtnIcon}>📦</Text>
          <Text style={styles.toolbarBtnLabel}>Materiale</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={openings}
        keyExtractor={item => item.id}
        contentContainerStyle={openings.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Nessuna apertura</Text>
            <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>Premi + per aggiungere una finestra o porta</Text>
          </View>
        }
        renderItem={({ item }) => (
          <OpeningCard
            opening={item}
            onPress={() => navigation.navigate('Measurement', { projectId: activeProjectId, openingId: item.id })}
            onDelete={() => handleDelete(item.id)}
            onDuplicate={() => handleDuplicate(item)}
          />
        )}
      />

      <TourModal
        visible={tourVisible}
        steps={tourSteps}
        onClose={() => { setTourVisible(false); setTourSeen('project'); }}
      />

      {/* ── Export Modal ── */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowExportModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>Esporta PDF</Text>
            {activeProject && (
              <Text style={styles.sheetFile}>
                {activeProject.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim()}{Platform.OS === 'web' ? '_rilievo.html' : '.pdf'}
              </Text>
            )}

            <TouchableOpacity style={styles.optBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.optIcon}>📤</Text>
              <View>
                <Text style={styles.optTitle}>{Platform.OS === 'web' ? 'Apri nel browser' : 'Condividi'}</Text>
                <Text style={styles.optSub}>{Platform.OS === 'web' ? 'Stampa o salva come PDF dal browser' : 'Apri nelle app del dispositivo'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optBtn, styles.optBtnAlt]} onPress={handleSaveToDevice} activeOpacity={0.8}>
              <Text style={styles.optIcon}>💾</Text>
              <View>
                <Text style={[styles.optTitle, { color: '#1565C0' }]}>
                  {Platform.OS === 'web' ? 'Scarica HTML' : Platform.OS === 'ios' ? 'Salva su File' : 'Salva sul dispositivo'}
                </Text>
                <Text style={[styles.optSub, { color: '#7a9cc0' }]}>
                  {Platform.OS === 'web' ? 'Scarica e apri nel browser per stampare' : Platform.OS === 'ios' ? 'Salva in File tramite share sheet' : 'Scegli una cartella di destinazione'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancel} onPress={() => setShowExportModal(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#EEF2F7' },
  projectInfo: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  client:      { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
  address:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3 },
  countBadge:  {
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: '#FFC107', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  count: { color: '#0c2d75', fontSize: 12, fontWeight: '800' },

  // ── Tab strip ──
  tabStrip:   { marginTop: 14 },
  tabContent: { gap: 8, paddingRight: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 14, paddingRight: 10, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabLabel:      { flexShrink: 1 },
  tabText:       { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#0b1e3e' },
  tabClose:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '800' },
  tabCloseActive:{ color: '#0b1e3e' },

  // ── Toolbar ──
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  toolbarBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, elevation: 1, flex: 1 },
  toolbarBtnPDF:  { backgroundColor: '#0d47a1' },
  toolbarBtnAdd:  { backgroundColor: '#FFC107', flex: 1.4 },
  toolbarBtnMat:  { backgroundColor: '#E65100' },
  toolbarBtnIcon:  { fontSize: 14 },
  toolbarBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  toolbarAddIcon:  { color: '#0c2d75', fontSize: 20, fontWeight: '700', lineHeight: 22 },

  list:           { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle:     { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle:  { fontSize: 15, color: '#999', textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 36 },
  handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 4 },
  sheetFile:  { fontSize: 12, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  optBtn:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1565C0', borderRadius: 14, padding: 16, marginBottom: 10 },
  optBtnAlt:  { backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0' },
  optIcon:    { fontSize: 24 },
  optTitle:   { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 1 },
  optSub:     { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  cancel:     { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: '#888', fontWeight: '600' },
});

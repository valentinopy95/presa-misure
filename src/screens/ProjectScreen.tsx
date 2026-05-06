import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  Modal, Pressable, ActivityIndicator, Platform, ScrollView,
  TextInput, KeyboardAvoidingView,
} from 'react-native';
import * as AppAlert from '../components/AppAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { Project, Opening, OpeningStyle, RootStackParamList } from '../types';
import { getProject, getProjectFamily, deleteOpening, saveOpening, deleteProject, saveProject } from '../storage/database';
import { getToleranceW, getToleranceH, getPrices, priceForStyle, PriceConfig, getRiattestattura, getBarLength, getKerf90, getSafetyMargin, getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction, getAntaTopRail } from '../storage/settings';
import { generateHTML, generateCuttingListHTML, generateFullPDF } from '../utils/pdfExport';
import { calculateCuttingList } from '../utils/calculateMaterials';
import { getLogoBase64, sharePdf, saveToDevice } from '../utils/pdfActions';
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
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [editName,        setEditName]        = useState('');
  const [editClient,      setEditClient]      = useState('');
  const [editPhone,       setEditPhone]       = useState('');
  const [editAddress,     setEditAddress]     = useState('');
  const [editSaving,      setEditSaving]      = useState(false);
  const [prices,          setPricesState]     = useState<PriceConfig>({ interni: 0, persiane: 0, controtelai: 0, zanzariere: 0, monoblocchi: 0 });

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
  useFocusEffect(useCallback(() => {
    loadFamily();
    getPrices().then(setPricesState);
  }, [loadFamily]));

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
  const handlePdfAction = async (
    pdfType: 'rilievo' | 'sviluppo' | 'distinta' | 'completo',
    action: 'share' | 'save',
  ) => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const [tolW, tolH, logo, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed, antaTop] =
        await Promise.all([
          getToleranceW(), getToleranceH(), getLogoBase64(),
          getRiattestattura(), getBarLength(), getKerf90(), getSafetyMargin(),
          getSlatPitch(), getZoccoloH(), getFasciaH(), getAntaReduction(), getAntaTopRail(),
        ]);
      const matConfig = {
        riattestattura: riatt, barLength: barLen, kerf90: kerf,
        safetyMarginPct: margin, slatPitch: slatP, zoccoloH: zocH,
        fasciaH: fasH, antaReduction: antaRed, antaTopRail: antaTop,
      };
      const safe = activeProject!.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();

      let html: string;
      let filename: string;

      if (pdfType === 'rilievo') {
        html = generateHTML(activeProject!, tolW, tolH, logo, { mode: 'misure', prices });
        filename = `${safe}_rilievo`;
      } else if (pdfType === 'sviluppo') {
        html = generateHTML(activeProject!, tolW, tolH, logo, { mode: 'materiale', materialsConfig: matConfig, prices });
        filename = `${safe}_sviluppo`;
      } else if (pdfType === 'distinta') {
        const cuttingResult = calculateCuttingList(activeProject!.openings, matConfig);
        html = generateCuttingListHTML(activeProject!, cuttingResult, logo);
        filename = `${safe}_distinta`;
      } else {
        // completo — tutti e 3 in un unico PDF
        const cuttingResult = calculateCuttingList(activeProject!.openings, matConfig);
        html = generateFullPDF(activeProject!, tolW, tolH, cuttingResult, logo, matConfig, prices);
        filename = `${safe}_completo`;
      }

      if (action === 'share') {
        await sharePdf(html, filename);
      } else {
        await saveToDevice(html, filename);
      }
    } catch { AppAlert.show('Errore', 'Impossibile generare il PDF.'); }
    finally  { setExporting(false); }
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
      AppAlert.show('Duplica apertura', 'Vuoi cambiare la tipologia della copia in persiana?', [
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
      AppAlert.show('Duplica apertura', 'Vuoi duplicare questa apertura?', [
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
    AppAlert.show('Elimina apertura', 'Vuoi eliminare questa voce?', [
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
    AppAlert.show(
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

  const openEditModal = () => {
    if (!activeProject) return;
    setEditName(activeProject.name);
    setEditClient(activeProject.clientName);
    setEditPhone(activeProject.clientPhone);
    setEditAddress(activeProject.address);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!activeProject || !editName.trim()) return;
    setEditSaving(true);
    try {
      const updated: Project = {
        ...activeProject,
        name:        editName.trim(),
        clientName:  editClient.trim(),
        clientPhone: editPhone.trim(),
        address:     editAddress.trim(),
        updatedAt:   new Date().toISOString(),
      };
      await saveProject(updated);
      setFamily(prev => prev.map((p, i) => i === activeIdx ? updated : p));
      setShowEditModal(false);
    } finally {
      setEditSaving(false);
    }
  };

  if (!activeProject) return <View style={{ flex: 1, backgroundColor: t.bg }}/>;

  const openings = activeProject.openings ?? [];

  const totalEstimate = openings.reduce((sum, o) => {
    const p = priceForStyle(o.style, prices);
    if (!p || !o.width || !o.height) return sum;
    return sum + (o.width * o.height / 1_000_000) * p;
  }, 0);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>

      {/* ── Header info con tab strip ── */}
      <LinearGradient
        ref={headerRef}
        colors={['#0b1e3e', '#1565C0']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.projectInfo}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.client}>{activeProject.clientName || 'Cliente non specificato'}</Text>
            <Text style={styles.address}>{activeProject.address || 'Indirizzo non specificato'}</Text>
            {!!activeProject.clientPhone && (
              <Text style={styles.address}>{activeProject.clientPhone}</Text>
            )}
          </View>
          <TouchableOpacity onPress={openEditModal} style={styles.editBtn} activeOpacity={0.75}>
            <Text style={styles.editBtnIcon}>✏️</Text>
            <Text style={styles.editBtnText}>Modifica</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <View style={styles.countBadge}>
            <Text style={styles.count}>
              {openings.length} apertur{openings.length === 1 ? 'a' : 'e'}
            </Text>
          </View>
          {totalEstimate > 0 && (
            <View style={styles.estimateBadge}>
              <Text style={styles.estimateText}>~ € {totalEstimate.toFixed(0)}</Text>
            </View>
          )}
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
          style={[styles.toolbarBtn, exporting && { opacity: 0.55 }]}
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
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('Measurement', { projectId: activeProjectId })}
          activeOpacity={0.75}
        >
          <Text style={styles.toolbarBtnIcon}>＋</Text>
          <Text style={styles.toolbarBtnLabel}>Aggiungi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('Materials', { projectId: activeProjectId })}
          activeOpacity={0.75}
        >
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
            pricePerSqm={priceForStyle(item.style, prices) || undefined}
          />
        )}
      />

      <TourModal
        visible={tourVisible}
        steps={tourSteps}
        onClose={() => { setTourVisible(false); setTourSeen('project'); }}
      />

      {/* ── Edit Project Modal ── */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowEditModal(false)} />
          <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: 32 }]}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>Modifica progetto</Text>

            {[
              { label: 'Nome progetto', value: editName, set: setEditName, cap: 'words' as const, keyboard: 'default' as const },
              { label: 'Cliente', value: editClient, set: setEditClient, cap: 'words' as const, keyboard: 'default' as const },
              { label: 'Telefono', value: editPhone, set: setEditPhone, cap: 'none' as const, keyboard: 'phone-pad' as const },
              { label: 'Indirizzo', value: editAddress, set: setEditAddress, cap: 'words' as const, keyboard: 'default' as const },
            ].map(f => (
              <View key={f.label} style={styles.editField}>
                <Text style={styles.editLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.editInput, { color: t.textPrimary, borderColor: '#DDE3ED', backgroundColor: '#F8FAFC' }]}
                  value={f.value}
                  onChangeText={f.set}
                  autoCapitalize={f.cap}
                  keyboardType={f.keyboard}
                  placeholderTextColor="#aab"
                />
              </View>
            ))}

            <TouchableOpacity style={styles.optBtn} onPress={handleSaveEdit} disabled={editSaving} activeOpacity={0.8}>
              {editSaving
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.optTitle, { color: '#fff' }]}>Salva modifiche</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setShowEditModal(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Export Modal ── */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={styles.overlay} onPress={() => !exporting && setShowExportModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>Esporta PDF</Text>

            {exporting ? (
              <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                <ActivityIndicator color="#1565C0" size="large" />
                <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>Generazione in corso…</Text>
              </View>
            ) : (
              <>
                {([
                  { type: 'rilievo',  icon: '📄', title: 'Rilievo misure',     sub: 'Elenco aperture con misure e note' },
                  { type: 'sviluppo', icon: '📊', title: 'Sviluppo materiale', sub: 'Barre e profili da ordinare' },
                  { type: 'distinta', icon: '✂️', title: 'Distinta di taglio', sub: 'Sequenza di taglio barra per barra' },
                ] as const).map(item => (
                  <View key={item.type} style={styles.pdfTypeRow}>
                    <View style={styles.pdfTypeLabel}>
                      <Text style={styles.pdfTypeIcon}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pdfTypeTitle}>{item.title}</Text>
                        <Text style={styles.pdfTypeSub}>{item.sub}</Text>
                      </View>
                    </View>
                    <View style={styles.pdfTypeActions}>
                      <TouchableOpacity
                        style={styles.pdfActionBtn}
                        onPress={() => handlePdfAction(item.type, 'share')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.pdfActionIcon}>📤</Text>
                        <Text style={styles.pdfActionText}>Condividi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pdfActionBtn, styles.pdfActionBtnSave]}
                        onPress={() => handlePdfAction(item.type, 'save')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.pdfActionIcon}>💾</Text>
                        <Text style={[styles.pdfActionText, { color: '#1565C0' }]}>Salva</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* ── PDF Completo ── */}
                <View style={[styles.pdfTypeRow, { borderTopWidth: 1, borderTopColor: '#eef2f7', marginTop: 6, paddingTop: 12 }]}>
                  <View style={styles.pdfTypeLabel}>
                    <Text style={styles.pdfTypeIcon}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pdfTypeTitle}>PDF completo</Text>
                      <Text style={styles.pdfTypeSub}>Rilievo + Materiale + Distinta in un unico file</Text>
                    </View>
                  </View>
                  <View style={styles.pdfTypeActions}>
                    <TouchableOpacity
                      style={styles.pdfActionBtn}
                      onPress={() => handlePdfAction('completo', 'share')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pdfActionIcon}>📤</Text>
                      <Text style={styles.pdfActionText}>Condividi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pdfActionBtn, styles.pdfActionBtnSave]}
                      onPress={() => handlePdfAction('completo', 'save')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pdfActionIcon}>💾</Text>
                      <Text style={[styles.pdfActionText, { color: '#1565C0' }]}>Salva</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.cancel} onPress={() => setShowExportModal(false)} disabled={exporting}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0c2d75' },
  projectInfo: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  client:      { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
  address:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 12, marginLeft: 8,
  },
  editBtnIcon: { fontSize: 13 },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editField:   { marginBottom: 12 },
  editLabel:   { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  editInput:   { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  countBadge:  {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  count: { color: '#fff', fontSize: 12, fontWeight: '800' },
  estimateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,180,0,0.25)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,180,0,0.4)',
  },
  estimateText: { color: '#FFE082', fontSize: 12, fontWeight: '800' },

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
  toolbarBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, elevation: 1, flex: 1, backgroundColor: '#0c2d75' },
  toolbarBtnIcon:  { fontSize: 14, color: '#fff' },
  toolbarBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

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

  // ── PDF type rows ──
  pdfTypeRow: {
    borderTopWidth: 1, borderTopColor: '#F0F4F8',
    paddingVertical: 12, gap: 8,
  },
  pdfTypeLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  pdfTypeIcon:  { fontSize: 20 },
  pdfTypeTitle: { fontSize: 14, fontWeight: '700', color: '#1a2a3a' },
  pdfTypeSub:   { fontSize: 11, color: '#888', marginTop: 1 },
  pdfTypeActions: { flexDirection: 'row', gap: 8 },
  pdfActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 9,
  },
  pdfActionBtnSave: {
    backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0',
  },
  pdfActionIcon: { fontSize: 14 },
  pdfActionText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

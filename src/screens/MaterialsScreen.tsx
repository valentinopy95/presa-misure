import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Project } from '../types';
import { getProject } from '../storage/database';
import {
  getRiattestattura, getBarLength, getKerf90, getSafetyMargin,
  getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction, getAntaTopRail,
  getToleranceW, getToleranceH,
  SettingsPreset, getPresets, applyPreset,
  CatalogSeries, getCatalogSeries,
} from '../storage/settings';
import {
  calculateMaterials, calculateCatalogCuttingList, catalogCuttingToMaterials, openingsWithoutSeries,
  MaterialsResult, MaterialsConfig, ProfileResult, MIN_REMNANT_MM,
} from '../utils/calculateMaterials';
import { generateHTML } from '../utils/pdfExport';
import { getLogoBase64, sharePdf, saveToDevice } from '../utils/pdfActions';
import * as AppAlert from '../components/AppAlert';
import TourModal, { TourStep } from '../components/TourModal';

type Route = RouteProp<RootStackParamList, 'Materials'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'Materials'>;

const MATERIALS_TOUR: TourStep[] = [
  { icon: '📊', title: 'Risultato calcolo', body: 'Questa pagina mostra quante barre ordinare per questo rilievo. Le aperture senza tipologia o misure complete non vengono elaborate.', spot: null },
  { icon: '📐', title: 'Taglio a 45°', body: 'Profili che compongono i telai (finestre e porte). Il numero di barre è ottimizzato per ridurre gli scarti.', spot: null },
  { icon: '📏', title: 'Taglio a 90°', body: 'Profili tagliati dritti: zoccolini, fasce, traverse di persiane. Anche questi ottimizzati per barra.', spot: null },
  { icon: '⚠️', title: 'Barre al limite', body: 'Quando una barra è quasi piena (meno di 250mm liberi) l\'app ti avvisa. Puoi decidere se aggiungere una barra extra di sicurezza.', spot: null },
  { icon: '⚙️', title: 'Preset impostazioni', body: 'Tocca un preset in alto per cambiare al volo i parametri di calcolo (barra, tolleranze, ecc.) e ricalcolare istantaneamente.', spot: null },
];

export default function MaterialsScreen() {
  const route      = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { projectId } = route.params;

  const [project,        setProject]        = useState<Project | null>(null);
  const [result,         setResult]         = useState<MaterialsResult | null>(null);
  const [catalogResult,  setCatalogResult]  = useState<MaterialsResult | null>(null);
  const [catalogSeries,  setCatalogSeries]  = useState<CatalogSeries | null>(null);
  const [matConfig,      setMatConfig]      = useState<MaterialsConfig | null>(null);
  const [presets,        setPresets]        = useState<SettingsPreset[]>([]);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [tourVisible,    setTourVisible]    = useState(false);
  const [showPdfModal,   setShowPdfModal]   = useState(false);
  const [pdfBusy,        setPdfBusy]        = useState(false);
  const [extraBars,      setExtraBars]      = useState<Record<string, number>>({});

  const projectRef   = useRef(project);
  const matConfigRef = useRef(matConfig);
  projectRef.current   = project;
  matConfigRef.current = matConfig;

  const handlePdfAction = useCallback(async (action: 'share' | 'save') => {
    const p   = projectRef.current;
    const cfg = matConfigRef.current;
    if (!p || !cfg) return;
    setShowPdfModal(false);
    setPdfBusy(true);
    try {
      const [tolW, tolH, logo] = await Promise.all([getToleranceW(), getToleranceH(), getLogoBase64()]);
      const html = generateHTML(p, tolW, tolH, logo, { mode: 'materiale', materialsConfig: cfg });
      const safe = p.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
      if (action === 'share') {
        await sharePdf(html, `${safe}_sviluppo`);
      } else {
        await saveToDevice(html, `${safe}_sviluppo`);
      }
    } catch { AppAlert.show('Errore', 'Impossibile generare il PDF.'); }
    finally  { setPdfBusy(false); }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowPdfModal(true)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const loadAndCalculate = useCallback(async () => {
    const [p, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed, antaTop, tolW, tolH, allSeries] = await Promise.all([
      getProject(projectId), getRiattestattura(), getBarLength(), getKerf90(),
      getSafetyMargin(), getSlatPitch(), getZoccoloH(), getFasciaH(), getAntaReduction(), getAntaTopRail(),
      getToleranceW(), getToleranceH(), getCatalogSeries(),
    ]);
    if (!p) return;
    const cfg: MaterialsConfig = {
      riattestattura: riatt, barLength: barLen, kerf90: kerf,
      safetyMarginPct: margin, slatPitch: slatP, zoccoloH: zocH,
      fasciaH: fasH, antaReduction: antaRed, antaTopRail: antaTop,
    };
    setProject(p);
    setMatConfig(cfg);

    const series = p.catalogSeriesId ? allSeries.find(s => s.id === p.catalogSeriesId) ?? null : null;
    setCatalogSeries(series);

    if (series) {
      const catCutting = calculateCatalogCuttingList(p.openings, series, tolW, tolH, cfg);
      setCatalogResult(catalogCuttingToMaterials(catCutting, margin));
      setResult(calculateMaterials(openingsWithoutSeries(p.openings), cfg));
    } else {
      setCatalogResult(null);
      setResult(calculateMaterials(p.openings, cfg));
    }
  }, [projectId]);

  useEffect(() => {
    getPresets().then(setPresets);
    loadAndCalculate();
  }, [loadAndCalculate]);

  const handleSelectPreset = async (preset: SettingsPreset) => {
    await applyPreset(preset);
    setActiveId(preset.id);
    setResult(null);
    setCatalogResult(null);
    setExtraBars({});
    await loadAndCalculate();
  };

  const addExtra = (label: string) =>
    setExtraBars(prev => ({ ...prev, [label]: (prev[label] ?? 0) + 1 }));
  const removeExtra = (label: string) =>
    setExtraBars(prev => {
      const n = (prev[label] ?? 0) - 1;
      if (n <= 0) { const { [label]: _, ...rest } = prev; return rest; }
      return { ...prev, [label]: n };
    });

  if (!project || !result) {
    return <View style={s.loading}><ActivityIndicator color="#1565C0" size="large"/></View>;
  }

  const validCount = project.openings.filter(
    o => o.style && o.width && o.height &&
         o.style !== 'roller_blind' && !o.style.startsWith('mosquito') && o.style !== 'custom',
  ).length;

  const allCatalogProfiles = catalogResult ? [...catalogResult.profiles45, ...catalogResult.profiles90] : [];
  const allOffcuts = [...(catalogResult?.profiles45 ?? []), ...(catalogResult?.profiles90 ?? []), ...result.profiles45, ...result.profiles90].filter(p => p.offcuts.length > 0);
  const nearLimitProfiles = [...allCatalogProfiles, ...result.profiles45, ...result.profiles90].filter(p => p.nearLimit);

  return (
    <>
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <TourModal visible={tourVisible} steps={MATERIALS_TOUR} onClose={() => setTourVisible(false)}/>

      {/* ── Preset strip ── */}
      {presets.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={ps.bar} contentContainerStyle={ps.scroll}
        >
          {presets.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[ps.chip, activeId === p.id && ps.chipActive]}
              onPress={() => handleSelectPreset(p)}
            >
              <Text style={[ps.chipText, activeId === p.id && ps.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.projectName}>{project.name}</Text>
        {!!project.clientName && <Text style={s.projectSub}>{project.clientName}</Text>}
        <Text style={s.projectSub}>{validCount} aperture elaborate</Text>
      </View>

      {/* ── Distinta di taglio (in alto) ── */}
      {validCount > 0 && (
        <TouchableOpacity
          style={s.cuttingBtn}
          onPress={() => navigation.navigate('CuttingList', { projectId })}
        >
          <Text style={s.cuttingBtnIcon}>✂️</Text>
          <View style={s.cuttingBtnText}>
            <Text style={s.cuttingBtnTitle}>Distinta di taglio</Text>
            <Text style={s.cuttingBtnSub}>Come tagliare ogni barra, barra per barra</Text>
          </View>
          <Text style={s.cuttingBtnArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── Disclaimer ── */}
      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          ⚠️ I dati sono stime basate sulle misure rilevate. Il numero di barre e i tagli possono variare del ±5–10% rispetto al reale in base agli accoppiamenti effettivi e alle tolleranze in cantiere. Verificare sempre prima dell'ordine.
        </Text>
      </View>

      {/* ── Barre al limite ── */}
      {nearLimitProfiles.length > 0 && (
        <View style={nl.card}>
          <View style={nl.titleRow}>
            <Text style={nl.icon}>⚠️</Text>
            <Text style={nl.title}>Barre al limite — verifica consigliata</Text>
          </View>
          <Text style={nl.sub}>
            Una o più barre sono usate quasi al massimo (meno di 250 mm liberi).{'\n'}
            Un errore di taglio potrebbe richiedere una barra in più. Aggiungila tu se vuoi stare sicuro.
          </Text>
          {nearLimitProfiles.map(p => {
            const extra = extraBars[p.label] ?? 0;
            const total = p.bars + extra;
            return (
              <View key={p.label} style={nl.row}>
                <View style={nl.rowLeft}>
                  <Text style={nl.rowLabel}>{p.label}</Text>
                  <Text style={nl.rowBars}>
                    {p.bars} barre calcolate{extra > 0 ? ` + ${extra} extra = ` : ''}
                    {extra > 0 ? <Text style={nl.rowTotal}>{total}</Text> : null}
                  </Text>
                </View>
                <View style={nl.rowBtns}>
                  {extra > 0 && (
                    <TouchableOpacity style={[nl.btn, nl.btnMinus]} onPress={() => removeExtra(p.label)}>
                      <Text style={nl.btnMinus}>−</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={nl.btn} onPress={() => addExtra(p.label)}>
                    <Text style={nl.btnPlus}>+1 barra</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Sezione catalogo ── */}
      {catalogResult && allCatalogProfiles.length > 0 && (
        <>
          <SectionHeader label={`Serie: ${catalogSeries?.name ?? 'Catalogo'}`} color="#6A1B9A"/>
          {catalogResult.profiles45.length > 0 && (
            <>
              <SectionHeader label="Taglio a 45°" color="#1565C0"/>
              <ProfileTable rows={catalogResult.profiles45} extraBars={extraBars}/>
            </>
          )}
          {catalogResult.profiles90.length > 0 && (
            <>
              <SectionHeader label="Taglio a 90°" color="#2E7D32"/>
              <ProfileTable rows={catalogResult.profiles90} extraBars={extraBars}/>
            </>
          )}
        </>
      )}

      {/* ── Sezione generica ── */}
      {result.profiles45.length > 0 && (
        <>
          {allCatalogProfiles.length > 0 && <SectionHeader label="Altri profili (calcolo generico)" color="#37474F"/>}
          {!allCatalogProfiles.length && <SectionHeader label="Taglio a 45°" color="#1565C0"/>}
          <ProfileTable rows={result.profiles45} extraBars={extraBars}/>
        </>
      )}
      {result.profiles90.length > 0 && (
        <>
          {allCatalogProfiles.length > 0 && !result.profiles45.length && <SectionHeader label="Altri profili (calcolo generico)" color="#37474F"/>}
          {!allCatalogProfiles.length && <SectionHeader label="Taglio a 90°" color="#2E7D32"/>}
          <ProfileTable rows={result.profiles90} extraBars={extraBars}/>
        </>
      )}

      {/* ── Avanzi riutilizzabili ── */}
      {allOffcuts.length > 0 && (
        <>
          <SectionHeader label="Avanzi riutilizzabili" color="#E65100"/>
          <View style={off.card}>
            <View style={off.note}>
              <Text style={off.noteText}>
                Pezzi ≥ {MIN_REMNANT_MM}mm rimasti dopo il taglio — conservali per il prossimo progetto.
              </Text>
            </View>
            {allOffcuts.map((p, i) => (
              <View key={p.label} style={[off.row, i % 2 === 1 && off.rowAlt]}>
                <Text style={off.label}>{p.label}</Text>
                <View style={off.right}>
                  <Text style={off.count}>{p.offcuts.length}×</Text>
                  <Text style={off.lengths}>{p.offcuts.map(l => `${l.toFixed(1)}mm`).join(', ')}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Avvisi pezzi fuori barra ── */}
      {result.warnings.length > 0 && (
        <>
          <SectionHeader label="Avvisi" color="#C62828"/>
          <View style={warn.card}>
            {result.warnings.map((w, i) => (
              <View key={i} style={[warn.row, i % 2 === 1 && warn.rowAlt]}>
                <Text style={warn.icon}>⚠️</Text>
                <Text style={warn.text}>{w}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {validCount === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            Nessuna apertura con misure complete.{'\n'}
            Inserisci larghezza e altezza per ogni apertura.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }}/>
    </ScrollView>

    {/* ── PDF Modal ── */}
    <Modal visible={showPdfModal} transparent animationType="fade" onRequestClose={() => setShowPdfModal(false)}>
      <Pressable style={pdfM.overlay} onPress={() => !pdfBusy && setShowPdfModal(false)}>
        <Pressable style={pdfM.sheet} onPress={() => {}}>
          <View style={pdfM.handle}/>
          <Text style={pdfM.title}>Esporta sviluppo materiale</Text>
          {pdfBusy ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator color="#1565C0" size="large"/>
              <Text style={{ color: '#888', marginTop: 10, fontSize: 13 }}>Generazione in corso…</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={pdfM.btn} onPress={() => handlePdfAction('share')} activeOpacity={0.8}>
                <Text style={pdfM.btnIcon}>📤</Text>
                <View>
                  <Text style={pdfM.btnTitle}>Condividi</Text>
                  <Text style={pdfM.btnSub}>Apri nelle app del dispositivo</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[pdfM.btn, pdfM.btnAlt]} onPress={() => handlePdfAction('save')} activeOpacity={0.8}>
                <Text style={pdfM.btnIcon}>💾</Text>
                <View>
                  <Text style={[pdfM.btnTitle, { color: '#1565C0' }]}>Salva sul dispositivo</Text>
                  <Text style={[pdfM.btnSub, { color: '#7a9cc0' }]}>Scegli la cartella di destinazione</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={pdfM.cancel} onPress={() => setShowPdfModal(false)} disabled={pdfBusy}>
            <Text style={pdfM.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={[sec.wrap, { borderLeftColor: color }]}>
      <Text style={[sec.text, { color }]}>{label}</Text>
    </View>
  );
}

function ProfileTable({ rows, extraBars }: { rows: ProfileResult[]; extraBars: Record<string, number> }) {
  return (
    <View style={tbl.card}>
      {rows.map((r, i) => {
        const extra = extraBars[r.label] ?? 0;
        const total = r.bars + extra;
        return (
          <View key={r.label} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
            <View style={tbl.labelWrap}>
              <Text style={tbl.labelCell}>{r.label}</Text>
              {r.nearLimit && <Text style={tbl.limitBadge}>⚠ al limite</Text>}
            </View>
            <View style={tbl.barsWrap}>
              <Text style={[tbl.barsNum, extra > 0 && { color: '#E65100' }]}>{total}</Text>
              <Text style={tbl.barsLabel}>{extra > 0 ? `${r.bars}+${extra}` : 'barre'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#F0F4F8' },
  content:     { padding: 16 },
  loading:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1565C0', borderRadius: 14,
    padding: 18, marginBottom: 16,
  },
  projectName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  projectSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  disclaimer: {
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FFE082',
  },
  disclaimerText: { fontSize: 11, color: '#6D4C00', lineHeight: 17 },
  empty:       { alignItems: 'center', padding: 32 },
  emptyText:   { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  cuttingBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#1565C0',
    elevation: 2, gap: 12,
  },
  cuttingBtnIcon:  { fontSize: 24 },
  cuttingBtnText:  { flex: 1 },
  cuttingBtnTitle: { fontSize: 15, fontWeight: '800', color: '#1565C0' },
  cuttingBtnSub:   { fontSize: 12, color: '#7090C0', marginTop: 2 },
  cuttingBtnArrow: { fontSize: 22, color: '#1565C0', fontWeight: '700' },
});

const ps = StyleSheet.create({
  bar:       { marginBottom: 12 },
  scroll:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, paddingRight: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3ED',
    elevation: 1,
  },
  chipActive:     { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#5a7a9a' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
});

const nl = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#FCD34D',
    elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  icon:     { fontSize: 18 },
  title:    { fontSize: 14, fontWeight: '800', color: '#92400E', flex: 1 },
  sub:      { fontSize: 12, color: '#78350F', lineHeight: 18, marginBottom: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#FDE68A',
  },
  rowLeft:  { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#1a2a3a' },
  rowBars:  { fontSize: 12, color: '#78350F', marginTop: 2 },
  rowTotal: { fontSize: 12, fontWeight: '800', color: '#E65100' },
  rowBtns:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: {
    backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, elevation: 1,
  },
  btnMinus: {
    backgroundColor: '#EEF2F7', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, fontSize: 16, fontWeight: '700', color: '#667',
  },
  btnPlus:  { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const sec = StyleSheet.create({
  wrap: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 10, marginTop: 6 },
  text: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
});

const tbl = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E8F0',
    overflow: 'hidden', marginBottom: 16,
  },
  row:       { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  rowAlt:    { backgroundColor: '#F7FAFF' },
  labelWrap: { flex: 1 },
  labelCell: { fontWeight: '700', color: '#222', fontSize: 14 },
  limitBadge:{ fontSize: 10, color: '#D97706', fontWeight: '700', marginTop: 2 },
  barsWrap:  { alignItems: 'center', minWidth: 64 },
  barsNum:   { fontSize: 32, fontWeight: '900', color: '#1565C0', lineHeight: 36 },
  barsLabel: { fontSize: 10, color: '#7090C0', fontWeight: '600', textTransform: 'uppercase' },
});

const warn = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#FFCDD2',
    overflow: 'hidden', marginBottom: 16,
  },
  row:    { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'flex-start' },
  rowAlt: { backgroundColor: '#FFF5F5' },
  icon:   { fontSize: 14, marginRight: 8, marginTop: 1 },
  text:   { flex: 1, fontSize: 13, color: '#C62828', lineHeight: 18 },
});

const off = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#FFD0B0',
    overflow: 'hidden', marginBottom: 16,
  },
  note: {
    backgroundColor: '#FFF8F0', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#FFD0B0',
  },
  noteText: { fontSize: 12, color: '#E65100', lineHeight: 17 },
  row:      { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  rowAlt:   { backgroundColor: '#FFF8F4' },
  label:    { flex: 1, fontWeight: '700', color: '#222', fontSize: 13 },
  right:    { alignItems: 'flex-end' },
  count:    { fontSize: 14, fontWeight: '900', color: '#E65100' },
  lengths:  { fontSize: 11, color: '#888', marginTop: 1 },
});

const pdfM = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 36 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 18 },
  title:      { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 16 },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1565C0', borderRadius: 14, padding: 16, marginBottom: 10 },
  btnAlt:     { backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0' },
  btnIcon:    { fontSize: 24 },
  btnTitle:   { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 1 },
  btnSub:     { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  cancel:     { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: '#888', fontWeight: '600' },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as AppAlert from '../components/AppAlert';
import { RootStackParamList, Project } from '../types';
import { sharePdf, saveToDevice } from '../utils/pdfActions';
import { getProject } from '../storage/database';
import {
  getRiattestattura, getBarLength, getKerf90, getSafetyMargin,
  getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction, getAntaTopRail,
  getToleranceW, getToleranceH,
  SettingsPreset, getPresets, applyPreset,
  CatalogSeries, getCatalogSeries,
} from '../storage/settings';
import {
  calculateCuttingList, calculateCatalogCuttingList, openingsWithoutSeries,
  CuttingListResult, CuttingProfile, CuttingBin,
} from '../utils/calculateMaterials';
import { generateCuttingListHTML } from '../utils/pdfExport';

type Route = RouteProp<RootStackParamList, 'CuttingList'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'CuttingList'>;

// Palette di colori per i pezzi in ogni barra
const PIECE_COLORS = [
  '#1565C0', '#2E7D32', '#6A1B9A', '#E65100',
  '#00796B', '#C62828', '#37474F', '#F57F17',
  '#0277BD', '#558B2F',
];

export default function CuttingListScreen() {
  const route      = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { projectId } = route.params;

  const [project,        setProject]        = useState<Project | null>(null);
  const [result,         setResult]         = useState<CuttingListResult | null>(null);
  const [catalogResult,  setCatalogResult]  = useState<CuttingListResult | null>(null);
  const [catalogSeries,  setCatalogSeries]  = useState<CatalogSeries | null>(null);
  const [config,         setConfig]         = useState<{ barLength: number; riattestattura: number; kerf90: number; antaReduction: number } | null>(null);
  const [presets,        setPresets]        = useState<SettingsPreset[]>([]);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [showPdfModal,   setShowPdfModal]   = useState(false);
  const [pdfBusy,        setPdfBusy]        = useState(false);

  const loadAndCalculate = useCallback(async () => {
    const [p, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed, antaTop, tolW, tolH, allSeries] = await Promise.all([
      getProject(projectId), getRiattestattura(), getBarLength(), getKerf90(),
      getSafetyMargin(), getSlatPitch(), getZoccoloH(), getFasciaH(), getAntaReduction(), getAntaTopRail(),
      getToleranceW(), getToleranceH(), getCatalogSeries(),
    ]);
    if (!p) return;
    setProject(p);
    const cfg = {
      riattestattura: riatt, barLength: barLen, kerf90: kerf,
      safetyMarginPct: margin, slatPitch: slatP, zoccoloH: zocH, fasciaH: fasH,
      antaReduction: antaRed, antaTopRail: antaTop,
    };
    setConfig({ barLength: barLen, riattestattura: riatt, kerf90: kerf, antaReduction: antaRed });

    // Serie catalogo
    const series = p.catalogSeriesId ? allSeries.find(s => s.id === p.catalogSeriesId) ?? null : null;
    setCatalogSeries(series);

    if (series) {
      // Catalogo per aperture eligibili, default per il resto
      setCatalogResult(calculateCatalogCuttingList(p.openings, series, tolW, tolH, cfg));
      setResult(calculateCuttingList(openingsWithoutSeries(p.openings), cfg));
    } else {
      setCatalogResult(null);
      setResult(calculateCuttingList(p.openings, cfg));
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
    await loadAndCalculate();
  };

  const projectRef = useRef(project);
  const resultRef  = useRef(result);
  projectRef.current = project;
  resultRef.current  = result;

  const handlePdfAction = useCallback(async (action: 'share' | 'save') => {
    const p = projectRef.current;
    const r = resultRef.current;
    if (!p || !r) return;
    setShowPdfModal(false);
    setPdfBusy(true);
    try {
      const html = generateCuttingListHTML(p, r);
      const safe = p.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
      if (action === 'share') {
        await sharePdf(html, `${safe}_distinta`);
      } else {
        await saveToDevice(html, `${safe}_distinta`);
      }
    } catch { AppAlert.show('Errore', 'Impossibile generare il PDF.'); }
    finally  { setPdfBusy(false); }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: 'Distinta di taglio',
      headerRight: () => (
        <TouchableOpacity onPress={() => setShowPdfModal(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>PDF</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (!project || !result || !config) {
    return <View style={s.loading}><ActivityIndicator color="#1565C0" size="large"/></View>;
  }

  const hasCatalogData = catalogResult && (catalogResult.profiles45.length > 0 || catalogResult.profiles90.length > 0);
  const hasData = result.profiles45.length > 0 || result.profiles90.length > 0 || !!hasCatalogData;

  return (
    <>
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      {/* Preset strip */}
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

      {/* Sviluppo materiale (scorciatoia) */}
      <TouchableOpacity
        style={s.materialsBtn}
        onPress={() => navigation.navigate('Materials', { projectId })}
      >
        <Text style={s.materialsBtnIcon}>📊</Text>
        <View style={s.materialsBtnText}>
          <Text style={s.materialsBtnTitle}>Sviluppo materiale</Text>
          <Text style={s.materialsBtnSub}>Quante barre ordinare per questo rilievo</Text>
        </View>
        <Text style={s.materialsBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.projectName}>{project.name}</Text>
        {!!project.clientName && <Text style={s.projectSub}>{project.clientName}</Text>}
        <Text style={s.projectSub}>Barre da {config.barLength} mm · Rid. anta: {config.antaReduction} mm</Text>
      </View>

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          ⚠️ I dati sono stime basate sulle misure rilevate. Il numero di barre e i tagli possono variare del ±5–10% rispetto al reale in base agli accoppiamenti effettivi e alle tolleranze in cantiere. Verificare sempre prima dell'ordine.
        </Text>
      </View>

      {/* Legenda */}
      <View style={s.legendCard}>
        <Text style={s.legendTitle}>Come leggere la distinta</Text>
        <Text style={s.legendBody}>
          Ogni riga è una barra da tagliare. I numeri indicano la lunghezza dei pezzi nell'ordine in cui conviene tagliarli (dal più lungo al più corto). L'avanzo in grigio è lo scarto.
        </Text>
      </View>

      {!hasData && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Nessuna apertura con misure complete.</Text>
        </View>
      )}

      {/* ── Sezione catalogo ── */}
      {hasCatalogData && catalogResult && (
        <>
          <SectionHeader label={`Serie: ${catalogSeries?.name ?? 'Catalogo'}`} color="#6A1B9A"/>
          {catalogResult.profiles45.length > 0 && (
            <>
              <SectionHeader label="Tagli a 45°" color="#1565C0"/>
              {catalogResult.profiles45.map(profile => (
                <ProfileBlock key={`cat45_${profile.label}`} profile={profile} barLength={config.barLength}/>
              ))}
            </>
          )}
          {catalogResult.profiles90.length > 0 && (
            <>
              <SectionHeader label="Tagli a 90°" color="#2E7D32"/>
              {catalogResult.profiles90.map(profile => (
                <ProfileBlock key={`cat90_${profile.label}`} profile={profile} barLength={config.barLength}/>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Sezione generica (zanzariere, monoblocchi, fissi ecc.) ── */}
      {(result.profiles45.length > 0 || result.profiles90.length > 0) && (
        <>
          {hasCatalogData && <SectionHeader label="Altri profili (calcolo generico)" color="#37474F"/>}
          {result.profiles45.length > 0 && (
            <>
              {!hasCatalogData && <SectionHeader label="Tagli a 45°" color="#1565C0"/>}
              {result.profiles45.map(profile => (
                <ProfileBlock key={profile.label} profile={profile} barLength={config.barLength}/>
              ))}
            </>
          )}
          {result.profiles90.length > 0 && (
            <>
              {!hasCatalogData && <SectionHeader label="Tagli a 90°" color="#2E7D32"/>}
              {result.profiles90.map(profile => (
                <ProfileBlock key={profile.label} profile={profile} barLength={config.barLength}/>
              ))}
            </>
          )}
        </>
      )}

      {/* Avvisi */}
      {[...(catalogResult?.warnings ?? []), ...result.warnings].length > 0 && (
        <>
          <SectionHeader label="Avvisi" color="#C62828"/>
          <View style={warn.card}>
            {[...(catalogResult?.warnings ?? []), ...result.warnings].map((w, i) => (
              <View key={i} style={[warn.row, i % 2 === 1 && warn.rowAlt]}>
                <Text style={warn.icon}>⚠️</Text>
                <Text style={warn.text}>{w}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }}/>
    </ScrollView>

    {/* ── PDF Modal ── */}
    <Modal visible={showPdfModal} transparent animationType="fade" onRequestClose={() => setShowPdfModal(false)}>
      <Pressable style={pdfM.overlay} onPress={() => !pdfBusy && setShowPdfModal(false)}>
        <Pressable style={pdfM.sheet} onPress={() => {}}>
          <View style={pdfM.handle}/>
          <Text style={pdfM.title}>Esporta distinta di taglio</Text>
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

// ─── ProfileBlock ─────────────────────────────────────────────────────────────

function ProfileBlock({ profile, barLength }: { profile: CuttingProfile; barLength: number }) {
  const totalBars = profile.bins.length;
  const angleColor = profile.cutAngle === 45 ? '#1565C0' : '#2E7D32';

  return (
    <View style={pb.card}>
      {/* Profile header */}
      <View style={[pb.header, { borderLeftColor: angleColor }]}>
        <Text style={pb.headerLabel}>{profile.label}</Text>
        <View style={[pb.angleBadge, { backgroundColor: angleColor }]}>
          <Text style={pb.angleBadgeText}>{profile.cutAngle}°</Text>
        </View>
        <Text style={pb.barCount}>{totalBars} barr{totalBars !== 1 ? 'e' : 'a'}</Text>
      </View>

      {/* Each bar */}
      {profile.bins.map((bin, idx) => (
        <BarRow
          key={idx}
          bin={bin}
          barIndex={idx + 1}
          barLength={barLength}
          totalBars={totalBars}
        />
      ))}
    </View>
  );
}

// ─── BarRow ───────────────────────────────────────────────────────────────────

function BarRow({
  bin, barIndex, barLength, totalBars,
}: {
  bin: CuttingBin;
  barIndex: number;
  barLength: number;
  totalBars: number;
}) {
  const usedMm = barLength - bin.remaining;

  return (
    <View style={br.wrap}>
      {/* Bar label */}
      <View style={br.labelCol}>
        <Text style={br.barNum}>B{barIndex}</Text>
        <Text style={br.barTotal}>/{totalBars}</Text>
      </View>

      {/* Bar visual + piece list */}
      <View style={br.right}>
        {/* Visual bar */}
        <View style={br.barTrack}>
          {bin.pieces.map((piece, pi) => {
            const widthPct = (piece / barLength) * 100;
            const color = PIECE_COLORS[pi % PIECE_COLORS.length];
            return (
              <View
                key={pi}
                style={[br.segment, { width: `${widthPct}%` as any, backgroundColor: color }]}
              />
            );
          })}
          {/* Remaining space */}
          {bin.remaining > 0 && (
            <View
              style={[br.segment, br.segmentRem, { width: `${(bin.remaining / barLength) * 100}%` as any }]}
            />
          )}
        </View>

        {/* Piece sizes */}
        <View style={br.pieces}>
          {bin.pieces.map((piece, pi) => {
            const color = PIECE_COLORS[pi % PIECE_COLORS.length];
            return (
              <View key={pi} style={br.pieceTag}>
                <View style={[br.pieceColor, { backgroundColor: color }]}/>
                <Text style={br.pieceLen}>{piece.toFixed(1)}</Text>
              </View>
            );
          })}
          {bin.remaining > 0 && (
            <View style={br.pieceTag}>
              <View style={[br.pieceColor, br.pieceColorRem]}/>
              <Text style={br.pieceLenRem}>
                {bin.remaining.toFixed(1)} avanzo
              </Text>
            </View>
          )}
        </View>

        {/* Usage bar label */}
        <Text style={br.usageText}>
          Usata: {usedMm.toFixed(1)} / {barLength} mm
          {bin.remaining === 0 ? ' — barra piena' : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={[sec.wrap, { borderLeftColor: color }]}>
      <Text style={[sec.text, { color }]}>{label}</Text>
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
  legendCard: {
    backgroundColor: '#EBF3FF', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB',
  },
  legendTitle: { fontSize: 13, fontWeight: '800', color: '#1565C0', marginBottom: 6 },
  legendBody:  { fontSize: 12, color: '#455A64', lineHeight: 18 },
  empty:       { alignItems: 'center', padding: 32 },
  emptyText:   { color: '#AAA', fontSize: 14, textAlign: 'center' },
  materialsBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#2E7D32',
    elevation: 2, gap: 12,
  },
  materialsBtnIcon:  { fontSize: 22 },
  materialsBtnText:  { flex: 1 },
  materialsBtnTitle: { fontSize: 15, fontWeight: '800', color: '#2E7D32' },
  materialsBtnSub:   { fontSize: 12, color: '#70A070', marginTop: 2 },
  materialsBtnArrow: { fontSize: 22, color: '#2E7D32', fontWeight: '700' },
});

const sec = StyleSheet.create({
  wrap: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 10, marginTop: 6 },
  text: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
});

const pb = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E8F0',
    overflow: 'hidden', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F7FAFF',
    borderLeftWidth: 4,
    borderBottomWidth: 1, borderBottomColor: '#E0E8F0',
    gap: 8,
  },
  headerLabel: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1a2a3a' },
  angleBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  angleBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  barCount:    { fontSize: 12, color: '#7090C0', fontWeight: '600' },
});

const br = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F8',
    alignItems: 'flex-start',
    gap: 10,
  },
  labelCol:  { width: 36, alignItems: 'center', paddingTop: 2 },
  barNum:    { fontSize: 14, fontWeight: '900', color: '#1a2a3a' },
  barTotal:  { fontSize: 10, color: '#aaa', fontWeight: '600' },
  right:     { flex: 1 },
  barTrack:  {
    height: 20, borderRadius: 6, backgroundColor: '#EEF2F7',
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#DDE4EF',
  },
  segment:    { height: '100%' as any },
  segmentRem: { backgroundColor: '#E8EDF4' },
  pieces: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 4, marginTop: 8,
  },
  pieceTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F4F8', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, gap: 5,
  },
  pieceColor:    { width: 10, height: 10, borderRadius: 3 },
  pieceColorRem: { backgroundColor: '#C8D4E0' },
  pieceLen:      { fontSize: 12, fontWeight: '700', color: '#1a2a3a' },
  pieceLenRem:   { fontSize: 11, fontWeight: '600', color: '#8A9AB0' },
  usageText:     { fontSize: 10, color: '#A0B0C8', marginTop: 6 },
});

const ps = StyleSheet.create({
  bar:       { marginBottom: 12 },
  scroll:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, paddingRight: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3ED',
    elevation: 1,
  },
  chipActive:     { backgroundColor: '#37474F', borderColor: '#37474F' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#5a7a9a' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
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

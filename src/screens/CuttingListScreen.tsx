import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as AppAlert from '../components/AppAlert';
import { RootStackParamList, Project } from '../types';
import { sharePdf, saveToDevice } from '../utils/pdfActions';
import { getProject, getProjectFamily } from '../storage/database';
import {
  getRiattestattura, getBarLength, getKerf90, getSafetyMargin,
  getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction, getAntaTopRail,
  getToleranceW, getToleranceH, getToleranceByType,
  SettingsPreset, getPresets, applyPreset,
  CatalogSeries, getCatalogSeries,
} from '../storage/settings';
import {
  CuttingListResult, CuttingProfile, CuttingBin, CuttingBinPiece,
  PieceGroup, MIN_REMNANT_MM,
} from '../utils/calculateMaterials';
import { calculateRemote } from '../utils/calculateRemote';
import { generateCuttingListHTML } from '../utils/pdfExport';
import { saveCuttingComplete } from '../storage/statusTracker';
import { getMagazzino, saveMagazzino, emptyItem } from '../storage/magazzino';
import { getCuttingProgress, saveCuttingProgress, clearCuttingProgress } from '../storage/cuttingProgress';

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

  const [family,         setFamily]         = useState<Project[]>([]);
  const [activeIdx,      setActiveIdx]      = useState(0);
  const [project,        setProject]        = useState<Project | null>(null);
  const [result,         setResult]         = useState<CuttingListResult | null>(null);
  const [catalogResult,  setCatalogResult]  = useState<CuttingListResult | null>(null);
  const [calcError,      setCalcError]      = useState(false);
  const [catalogSeries,  setCatalogSeries]  = useState<CatalogSeries | null>(null);
  const [config,         setConfig]         = useState<{ barLength: number; riattestattura: number; kerf90: number; antaReduction: number } | null>(null);
  const [presets,        setPresets]        = useState<SettingsPreset[]>([]);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [showPdfModal,   setShowPdfModal]   = useState(false);
  const [pdfBusy,        setPdfBusy]        = useState(false);
  const [checked,        setChecked]        = useState<Set<string>>(new Set());
  const [magazzinoMatch, setMagazzinoMatch] = useState(false);

  const activeProjectId = family[activeIdx]?.id ?? projectId;
  const activeProjectIdRef = useRef(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

  useEffect(() => {
    getProjectFamily(projectId).then(fam => {
      if (fam.length > 0) setFamily(fam);
    });
  }, [projectId]);

  useFocusEffect(useCallback(() => {
    getCuttingProgress(activeProjectIdRef.current).then(keys => {
      setChecked(keys.length > 0 ? new Set(keys) : new Set());
    });
  }, []));

  useEffect(() => {
    getCuttingProgress(activeProjectId).then(keys => {
      setChecked(keys.length > 0 ? new Set(keys) : new Set());
    });
  }, [activeProjectId]);

  const totalPieces = useMemo(() => {
    let n = 0;
    const count = (r: CuttingListResult | null) => {
      if (!r) return;
      for (const p of [...r.profiles45, ...r.profiles90])
        for (const bin of p.bins) n += bin.pieces.length;
    };
    count(result);
    count(catalogResult);
    return n;
  }, [result, catalogResult]);

  const toggleCheck = useCallback((key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      const pid = activeProjectIdRef.current;
      saveCuttingProgress(pid, [...next]);
      const nowComplete  = totalPieces > 0 && next.size >= totalPieces;
      const wasComplete  = totalPieces > 0 && prev.size >= totalPieces;
      saveCuttingComplete(pid, nowComplete);
      if (nowComplete && !wasComplete) {
        // snapshot refs so the closure stays stable
        const catRes = catalogResultRef.current;
        const series = catalogSeriesRef.current;
        if (catRes && series) autoAddOffcutsToMagazzino(catRes, series);
      }
      return next;
    });
  }, [projectId, totalPieces]);

  const resetProgress = useCallback(() => {
    setChecked(new Set());
    clearCuttingProgress(activeProjectId);
    saveCuttingComplete(activeProjectId, false);
  }, [activeProjectId]);

  const loadAndCalculate = useCallback(async () => {
    const [p, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed, antaTop, tolW, tolH, allSeries, tolByType] = await Promise.all([
      getProject(activeProjectId), getRiattestattura(), getBarLength(), getKerf90(),
      getSafetyMargin(), getSlatPitch(), getZoccoloH(), getFasciaH(), getAntaReduction(), getAntaTopRail(),
      getToleranceW(), getToleranceH(), getCatalogSeries(), getToleranceByType(),
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

    // Magazzino match
    if (series) {
      const magItems = await getMagazzino();
      const seriesCodes = new Set<string>();
      for (const v of series.variants)
        for (const code of Object.values(v.articleCodes ?? {}))
          if (code?.trim()) seriesCodes.add(code.trim().toLowerCase());
      setMagazzinoMatch(
        seriesCodes.size > 0 &&
        magItems.some(m => m.articleCode && seriesCodes.has(m.articleCode.trim().toLowerCase()))
      );
    } else {
      setMagazzinoMatch(false);
    }

    try {
      const calc = await calculateRemote({
        openings: p.openings, config: cfg,
        series: series ?? null,
        toleranceW: tolW, toleranceH: tolH, toleranceByType: tolByType,
      });
      setCalcError(false);
      setResult(calc.cuttingResult);
      setCatalogResult(calc.catalogCuttingResult);
    } catch {
      setCalcError(true);
    }
  }, [activeProjectId]);

  useEffect(() => {
    getPresets().then(setPresets);
    loadAndCalculate();
  }, [loadAndCalculate]);

  useEffect(() => {
    setResult(null);
    setCatalogResult(null);
    loadAndCalculate();
  }, [activeIdx]);

  const handleSelectPreset = async (preset: SettingsPreset) => {
    await applyPreset(preset);
    setActiveId(preset.id);
    setResult(null);
    await loadAndCalculate();
  };

  const projectRef       = useRef(project);
  const resultRef        = useRef(result);
  const catalogResultRef = useRef(catalogResult);
  const catalogSeriesRef = useRef(catalogSeries);
  projectRef.current       = project;
  resultRef.current        = result;
  catalogResultRef.current = catalogResult;
  catalogSeriesRef.current = catalogSeries;

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

  // Banner serie attiva
  const seriesBanner = catalogSeries
    ? { label: `Serie: ${catalogSeries.name}`, color: '#6A1B9A', bg: '#F3E5F5' }
    : { label: 'Calcolo standard (nessuna serie)', color: '#37474F', bg: '#ECEFF1' };

  if (calcError) {
    return (
      <View style={s.loading}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
          Connessione assente.{'\n'}Controlla la rete e riprova.
        </Text>
        <TouchableOpacity onPress={loadAndCalculate} style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#0c2d75', fontWeight: '800', fontSize: 15 }}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!project || !result || !config) {
    return <View style={s.loading}><ActivityIndicator color="#1565C0" size="large"/></View>;
  }

  const hasCatalogData = catalogResult && (catalogResult.profiles45.length > 0 || catalogResult.profiles90.length > 0);
  const hasData = result.profiles45.length > 0 || result.profiles90.length > 0 || !!hasCatalogData;

  return (
    <View style={{ flex: 1, backgroundColor: '#0c2d75' }}>
    {/* ── Top header: info progetto + switch + tabs ── */}
    <View style={s.topHeader}>
      <View style={s.headerTop}>
        <View style={{ flex: 1 }}>
          {!!project.clientName && <Text style={s.projectSub}>{project.name}</Text>}
          <Text style={s.projectName}>{project.clientName || project.name}</Text>
          <Text style={s.projectParams}>Barre {config.barLength} mm · Riatt. {config.riattestattura} mm</Text>
        </View>
        <View style={[s.seriesBadge, { backgroundColor: seriesBanner.color }]}>
          <Text style={s.seriesBadgeText}>{catalogSeries ? catalogSeries.name : 'Standard'}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.switchBtn} onPress={() => navigation.navigate('Materials', { projectId })} activeOpacity={0.8}>
        <Text style={s.switchBtnIcon}>📊</Text>
        <Text style={s.switchBtnTitle}>Vai allo sviluppo materiale</Text>
        <Text style={s.switchBtnArrow}>›</Text>
      </TouchableOpacity>
      {family.length > 1 && (
        <View style={{ marginTop: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabContent}>
            {family.map((p, i) => (
              <TouchableOpacity key={p.id} style={[s.tab, i === activeIdx && s.tabActive]} onPress={() => setActiveIdx(i)} activeOpacity={0.75}>
                <Text style={[s.tabText, i === activeIdx && s.tabTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      {/* Legenda */}
      <View style={s.legendCard}>
        <Text style={s.legendTitle}>Come leggere la distinta</Text>
        <Text style={s.legendBody}>
          Ogni riga è una barra da tagliare. I numeri indicano la lunghezza dei pezzi nell'ordine in cui conviene tagliarli (dal più lungo al più corto). L'avanzo in grigio è lo scarto.
        </Text>
      </View>

      {/* Taglio completo banner */}
      {totalPieces > 0 && checked.size >= totalPieces && (
        <View style={s.completeBanner}>
          <Text style={s.completeBannerIcon}>✓</Text>
          <Text style={s.completeBannerText}>Taglio completo!</Text>
          <TouchableOpacity onPress={resetProgress} style={s.completeBannerReset}>
            <Text style={s.completeBannerResetText}>Azzera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Magazzino hint */}
      {magazzinoMatch && (
        <View style={s.magBanner}>
          <Text style={s.magBannerIcon}>📦</Text>
          <Text style={s.magBannerText}>
            Hai avanzi in magazzino per alcuni profili di questa serie — verifica la compatibilità del colore prima di ordinare.
          </Text>
        </View>
      )}

      {!hasData && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Nessuna apertura con misure complete.</Text>
        </View>
      )}

      {/* ── Sezione catalogo ── */}
      {hasCatalogData && catalogResult && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <SectionHeader label={`Serie: ${catalogSeries?.name ?? 'Catalogo'}`} color="#6A1B9A"/>
            {checked.size > 0 && (
              <TouchableOpacity onPress={resetProgress} style={{ marginLeft: 'auto' as any, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFF3E0', borderRadius: 8 }}>
                <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '700' }}>Reset ✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {catalogResult.profiles45.length > 0 && (
            <>
              <SectionHeader label="Tagli a 45°" color="#1565C0"/>
              {catalogResult.profiles45.map(profile => (
                <ProfileBlock key={`cat45_${profile.label}`} profile={profile} barLength={config.barLength} checked={checked} onToggle={toggleCheck}/>
              ))}
            </>
          )}
          {catalogResult.profiles90.length > 0 && (
            <>
              <SectionHeader label="Tagli a 90°" color="#2E7D32"/>
              {catalogResult.profiles90.map(profile => (
                <ProfileBlock key={`cat90_${profile.label}`} profile={profile} barLength={config.barLength} checked={checked} onToggle={toggleCheck}/>
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
                <ProfileBlock key={profile.label} profile={profile} barLength={config.barLength} checked={checked} onToggle={toggleCheck}/>
              ))}
            </>
          )}
          {result.profiles90.length > 0 && (
            <>
              {!hasCatalogData && <SectionHeader label="Tagli a 90°" color="#2E7D32"/>}
              {result.profiles90.map(profile => (
                <ProfileBlock key={profile.label} profile={profile} barLength={config.barLength} checked={checked} onToggle={toggleCheck}/>
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
    </View>
  );
}

// ─── Auto-populate magazzino on cutting complete ──────────────────────────────

async function autoAddOffcutsToMagazzino(
  cuttingResult: CuttingListResult,
  series: CatalogSeries,
) {
  // Map PieceGroup → article code (first variant that declares it wins)
  const groupToCode: Partial<Record<PieceGroup, string>> = {};
  for (const variant of series.variants) {
    for (const [grp, code] of Object.entries(variant.articleCodes ?? {})) {
      if (code?.trim() && !groupToCode[grp as PieceGroup]) {
        groupToCode[grp as PieceGroup] = code.trim();
      }
    }
  }

  // Collect offcuts ≥ MIN_REMNANT_MM per article code
  // If no article code configured for the group, use the profile label as key
  const offcutsByCode: Record<string, { offcuts: number[]; label: string }> = {};
  for (const profile of [...cuttingResult.profiles45, ...cuttingResult.profiles90]) {
    if (!profile.group) continue;
    const code = groupToCode[profile.group] ?? profile.label; // fallback to "Telaio", "Anta" etc.
    for (const bin of profile.bins) {
      if (bin.remaining >= MIN_REMNANT_MM) {
        if (!offcutsByCode[code]) offcutsByCode[code] = { offcuts: [], label: profile.label };
        offcutsByCode[code].offcuts.push(Math.round(bin.remaining));
      }
    }
  }

  if (!Object.keys(offcutsByCode).length) return;

  const magItems = await getMagazzino();
  const updated  = [...magItems];

  for (const [code, { offcuts: newOffcuts, label: profileLabel }] of Object.entries(offcutsByCode)) {
    const idx = updated.findIndex(
      m => m.articleCode.trim().toLowerCase() === code.toLowerCase(),
    );
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        offcuts: [...updated[idx].offcuts, ...newOffcuts].sort((a, b) => b - a),
      };
    } else {
      const item = emptyItem();
      item.articleCode = code;
      item.label       = `${profileLabel} · ${series.name}`;
      item.offcuts     = [...newOffcuts].sort((a, b) => b - a);
      updated.push(item);
    }
  }

  await saveMagazzino(updated);
}

// ─── ProfileBlock ─────────────────────────────────────────────────────────────

function ProfileBlock({
  profile, barLength, checked, onToggle,
}: {
  profile: CuttingProfile; barLength: number;
  checked: Set<string>; onToggle: (key: string) => void;
}) {
  const totalBars  = profile.bins.length;
  const angleColor = profile.cutAngle === 45 ? '#1565C0' : '#2E7D32';
  const profileKey = profile.label;

  return (
    <View style={pb.card}>
      <View style={[pb.header, { borderLeftColor: angleColor }]}>
        <Text style={pb.headerLabel}>{profile.label}</Text>
        <View style={[pb.angleBadge, { backgroundColor: angleColor }]}>
          <Text style={pb.angleBadgeText}>{profile.cutAngle}°</Text>
        </View>
        <Text style={pb.barCount}>{totalBars} barr{totalBars !== 1 ? 'e' : 'a'}</Text>
      </View>
      {profile.bins.map((bin, idx) => (
        <BarRow
          key={idx}
          bin={bin}
          barIndex={idx + 1}
          barLength={barLength}
          totalBars={totalBars}
          profileKey={profileKey}
          checked={checked}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}

// ─── BarRow ───────────────────────────────────────────────────────────────────

function BarRow({
  bin, barIndex, barLength, totalBars, profileKey, checked, onToggle,
}: {
  bin: CuttingBin;
  barIndex: number;
  barLength: number;
  totalBars: number;
  profileKey: string;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  const usedMm = barLength - bin.remaining;

  return (
    <View style={br.wrap}>
      <View style={br.labelCol}>
        <Text style={br.barNum}>B{barIndex}</Text>
        <Text style={br.barTotal}>/{totalBars}</Text>
      </View>

      <View style={br.right}>
        {/* Visual bar */}
        <View style={br.barTrack}>
          {bin.pieces.map((piece, pi) => {
            const widthPct = (piece.length / barLength) * 100;
            const color = PIECE_COLORS[pi % PIECE_COLORS.length];
            const ck   = `${profileKey}_b${barIndex}_p${pi}`;
            const done = checked.has(ck);
            return (
              <View
                key={pi}
                style={[br.segment, { width: `${widthPct}%` as any, backgroundColor: color, opacity: done ? 0.25 : 1 }]}
              />
            );
          })}
          {bin.remaining > 0 && (
            <View
              style={[br.segment, br.segmentRem, { width: `${(bin.remaining / barLength) * 100}%` as any }]}
            />
          )}
        </View>

        {/* Pezzi con nome + checkbox */}
        <View style={br.pieces}>
          {bin.pieces.map((piece, pi) => {
            const color = PIECE_COLORS[pi % PIECE_COLORS.length];
            const ck    = `${profileKey}_b${barIndex}_p${pi}`;
            const done  = checked.has(ck);
            return (
              <TouchableOpacity
                key={pi}
                style={[br.pieceTag, done && br.pieceTagDone]}
                onPress={() => onToggle(ck)}
                activeOpacity={0.7}
              >
                <View style={[br.pieceColor, { backgroundColor: done ? '#bbb' : color }]}/>
                {!!piece.label && (
                  <Text style={[br.pieceLabel, done && br.pieceLabelDone]}>{piece.label}</Text>
                )}
                <Text style={[br.pieceLen, done && br.pieceLenDone]}>{piece.length.toFixed(1)}</Text>
                <Text style={done ? br.checkDone : br.checkTodo}>{done ? '✓' : '○'}</Text>
              </TouchableOpacity>
            );
          })}
          {bin.remaining > 0 && (
            <View style={br.pieceTag}>
              <View style={[br.pieceColor, br.pieceColorRem]}/>
              <Text style={br.pieceLenRem}>{bin.remaining.toFixed(1)} avanzo</Text>
            </View>
          )}
        </View>

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
  topHeader:    { backgroundColor: '#0c2d75', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  tabContent:   { gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  tabActive:     { backgroundColor: '#fff', borderColor: '#fff' },
  tabText:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  tabTextActive: { color: '#0c2d75' },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  switchBtnIcon:  { fontSize: 15 },
  switchBtnTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff' },
  switchBtnArrow: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  loading:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c2d75' },
  header: {
    backgroundColor: '#1565C0', borderRadius: 16,
    padding: 16, marginBottom: 14,
    elevation: 4, shadowColor: '#1a3a5c', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  headerTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  projectName:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  projectSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  projectParams:{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  seriesBadge:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', maxWidth: 120 },
  seriesBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  materialsBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  materialsBtnIcon:  { fontSize: 18 },
  materialsBtnTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff' },
  materialsBtnArrow: { fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  legendCard: {
    backgroundColor: '#EBF3FF', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB',
  },
  legendTitle: { fontSize: 13, fontWeight: '800', color: '#1565C0', marginBottom: 6 },
  legendBody:  { fontSize: 12, color: '#455A64', lineHeight: 18 },
  empty:       { alignItems: 'center', padding: 32 },
  emptyText:   { color: '#AAA', fontSize: 14, textAlign: 'center' },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  completeBannerIcon: { fontSize: 20, color: '#2E7D32' },
  completeBannerText: { flex: 1, fontSize: 15, fontWeight: '800', color: '#2E7D32' },
  completeBannerReset: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  completeBannerResetText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  magBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FFE082',
  },
  magBannerIcon: { fontSize: 18, marginTop: 1 },
  magBannerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18, fontWeight: '500' },
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
  pieceColor:     { width: 10, height: 10, borderRadius: 3 },
  pieceColorRem:  { backgroundColor: '#C8D4E0' },
  pieceLabel:     { fontSize: 10, fontWeight: '700', color: '#1a2a3a' },
  pieceLabelDone: { color: '#aaa', textDecorationLine: 'line-through' as const },
  pieceLen:       { fontSize: 12, fontWeight: '700', color: '#1a2a3a' },
  pieceLenDone:   { color: '#aaa', textDecorationLine: 'line-through' as const },
  pieceLenRem:    { fontSize: 11, fontWeight: '600', color: '#8A9AB0' },
  pieceTagDone:   { backgroundColor: '#F0F4F8', opacity: 0.6 },
  checkTodo:      { fontSize: 12, color: '#B0C0D0', marginLeft: 2 },
  checkDone:      { fontSize: 12, color: '#2E7D32', fontWeight: '900', marginLeft: 2 },
  usageText:      { fontSize: 10, color: '#A0B0C8', marginTop: 6 },
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
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet:      { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
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

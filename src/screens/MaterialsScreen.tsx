import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Project } from '../types';
import { getProject } from '../storage/database';
import { getRiattestattura, getBarLength, getKerf90, getSafetyMargin, getSlatPitch, getZoccoloH, getFasciaH, getAntaReduction } from '../storage/settings';
import { calculateMaterials, MaterialsResult, ProfileResult, MIN_REMNANT_MM } from '../utils/calculateMaterials';

type Route = RouteProp<RootStackParamList, 'Materials'>;

export default function MaterialsScreen() {
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [result,  setResult]  = useState<MaterialsResult | null>(null);

  useEffect(() => {
    (async () => {
      const [p, riatt, barLen, kerf, margin, slatP, zocH, fasH, antaRed] = await Promise.all([
        getProject(projectId), getRiattestattura(), getBarLength(), getKerf90(),
        getSafetyMargin(), getSlatPitch(), getZoccoloH(), getFasciaH(),
        getAntaReduction(),
      ]);
      if (!p) return;
      setProject(p);
      setResult(calculateMaterials(p.openings, {
        riattestattura: riatt, barLength: barLen, kerf90: kerf,
        safetyMarginPct: margin, slatPitch: slatP, zoccoloH: zocH, fasciaH: fasH,
        antaReduction: antaRed,
      }));
    })();
  }, [projectId]);

  if (!project || !result) {
    return <View style={s.loading}><ActivityIndicator color="#1565C0" size="large"/></View>;
  }

  const validCount = project.openings.filter(
    o => o.style && o.width && o.height &&
         o.style !== 'roller_blind' && !o.style.startsWith('mosquito'),
  ).length;

  const allOffcuts = [...result.profiles45, ...result.profiles90].filter(p => p.offcuts.length > 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.projectName}>{project.name}</Text>
        {!!project.clientName && <Text style={s.projectSub}>{project.clientName}</Text>}
        <Text style={s.projectSub}>{validCount} aperture elaborate</Text>
      </View>

      {/* Sezione 45° */}
      {result.profiles45.length > 0 && (
        <>
          <SectionHeader label="Taglio a 45°" color="#1565C0"/>
          <ProfileTable rows={result.profiles45}/>
        </>
      )}

      {/* Sezione 90° */}
      {result.profiles90.length > 0 && (
        <>
          <SectionHeader label="Taglio a 90°" color="#2E7D32"/>
          <ProfileTable rows={result.profiles90}/>
        </>
      )}

      {/* Avanzi riutilizzabili */}
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
                  <Text style={off.lengths}>{p.offcuts.map(l => `${Math.round(l)}mm`).join(', ')}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Avvisi pezzi fuori barra */}
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

function ProfileTable({ rows }: { rows: ProfileResult[] }) {
  return (
    <View style={tbl.card}>
      {rows.map((r, i) => (
        <View key={r.label} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
          <Text style={tbl.labelCell}>{r.label}</Text>
          <View style={tbl.barsWrap}>
            <Text style={tbl.barsNum}>{r.bars}</Text>
            <Text style={tbl.barsLabel}>barre</Text>
          </View>
        </View>
      ))}
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
  empty:       { alignItems: 'center', padding: 32 },
  emptyText:   { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 22 },
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
  labelCell: { fontWeight: '700', color: '#222', fontSize: 14, flex: 1 },
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

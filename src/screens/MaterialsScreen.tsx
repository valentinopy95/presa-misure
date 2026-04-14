import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Project } from '../types';
import { getProject } from '../storage/database';
import { getRiattestattura } from '../storage/settings';
import { calculateMaterials, MaterialsResult, ProfileResult } from '../utils/calculateMaterials';

type Route = RouteProp<RootStackParamList, 'Materials'>;

export default function MaterialsScreen() {
  const route = useRoute<Route>();
  const { projectId } = route.params;

  const [project, setProject]   = useState<Project | null>(null);
  const [result, setResult]     = useState<MaterialsResult | null>(null);

  useEffect(() => {
    (async () => {
      const [p, riatt] = await Promise.all([getProject(projectId), getRiattestattura()]);
      if (!p) return;
      setProject(p);
      setResult(calculateMaterials(p.openings, riatt));
    })();
  }, [projectId]);

  if (!project || !result) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#1565C0" size="large" />
      </View>
    );
  }

  const validOpenings = project.openings.filter(
    o => o.style && o.width && o.height &&
         o.style !== 'roller_blind' && o.style !== 'subframe_window',
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      {/* ── Header progetto ── */}
      <View style={s.header}>
        <Text style={s.projectName}>{project.name}</Text>
        {!!project.clientName && <Text style={s.projectSub}>{project.clientName}</Text>}
        <Text style={s.projectSub}>{validOpenings.length} aperture elaborate</Text>
      </View>

      {/* ── Riepilogo barre ── */}
      <View style={s.summaryRow}>
        <SummaryBox label="Barre 45°" value={result.totalBars45} color="#1565C0" />
        <SummaryBox label="Barre 90°" value={result.totalBars90} color="#2E7D32" />
        <SummaryBox label="Totale barre" value={result.totalBars45 + result.totalBars90} color="#37474F" />
      </View>

      {/* ── Taglio a 45° ── */}
      {result.profiles45.length > 0 && (
        <>
          <SectionHeader label="Taglio a 45°" color="#1565C0" />
          <ProfileTable rows={result.profiles45} />
        </>
      )}

      {/* ── Taglio a 90° ── */}
      {result.profiles90.length > 0 && (
        <>
          <SectionHeader label="Taglio a 90°" color="#2E7D32" />
          <ProfileTable rows={result.profiles90} />
        </>
      )}

      {validOpenings.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            Nessuna apertura con misure complete.{'\n'}
            Compila larghezza e altezza per ogni apertura.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[sum.box, { borderTopColor: color }]}>
      <Text style={[sum.value, { color }]}>{value}</Text>
      <Text style={sum.label}>{label}</Text>
    </View>
  );
}

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
      {/* Header */}
      <View style={[tbl.row, tbl.headRow]}>
        <Text style={[tbl.cell, tbl.headCell, { flex: 3 }]}>Profilo</Text>
        <Text style={[tbl.cell, tbl.headCell, { flex: 1, textAlign: 'right' }]}>Pz</Text>
        <Text style={[tbl.cell, tbl.headCell, { flex: 2, textAlign: 'right' }]}>ml</Text>
        <Text style={[tbl.cell, tbl.headCell, { flex: 2, textAlign: 'right' }]}>Barre</Text>
      </View>
      {/* Rows */}
      {rows.map((r, i) => (
        <View key={r.label} style={[tbl.row, i % 2 === 1 && tbl.rowAlt]}>
          <Text style={[tbl.cell, tbl.labelCell, { flex: 3 }]}>{r.label}</Text>
          <Text style={[tbl.cell, tbl.dataCell,  { flex: 1, textAlign: 'right' }]}>{r.pieces}</Text>
          <Text style={[tbl.cell, tbl.dataCell,  { flex: 2, textAlign: 'right' }]}>{r.totalMl.toFixed(1)}</Text>
          <Text style={[tbl.cell, tbl.barsCell,  { flex: 2, textAlign: 'right' }]}>{r.bars}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  summaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  empty:       { alignItems: 'center', padding: 32 },
  emptyText:   { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

const sum = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderTopWidth: 3,
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  value: { fontSize: 26, fontWeight: '800' },
  label: { fontSize: 10, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },
});

const sec = StyleSheet.create({
  wrap: {
    borderLeftWidth: 4, paddingLeft: 10,
    marginBottom: 10, marginTop: 6,
  },
  text: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
});

const tbl = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E8F0',
    overflow: 'hidden', marginBottom: 16,
  },
  row:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  rowAlt:  { backgroundColor: '#F7FAFF' },
  headRow: { backgroundColor: '#EEF4FF', borderBottomWidth: 1, borderBottomColor: '#D0DEFA' },
  cell:    { fontSize: 13 },
  headCell:  { fontWeight: '700', color: '#445', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelCell: { fontWeight: '600', color: '#333' },
  dataCell:  { color: '#666' },
  barsCell:  { fontWeight: '800', color: '#1565C0', fontSize: 14 },
});

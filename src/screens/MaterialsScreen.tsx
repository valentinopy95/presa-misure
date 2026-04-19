import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Project } from '../types';
import { getProject } from '../storage/database';
import { getRiattestattura } from '../storage/settings';
import { calculateMaterials, MaterialsResult, ProfileResult } from '../utils/calculateMaterials';

type Route = RouteProp<RootStackParamList, 'Materials'>;

export default function MaterialsScreen() {
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [result,  setResult]  = useState<MaterialsResult | null>(null);

  useEffect(() => {
    (async () => {
      const [p, riatt] = await Promise.all([getProject(projectId), getRiattestattura()]);
      if (!p) return;
      setProject(p);
      setResult(calculateMaterials(p.openings, riatt));
    })();
  }, [projectId]);

  if (!project || !result) {
    return <View style={s.loading}><ActivityIndicator color="#1565C0" size="large"/></View>;
  }

  const validCount = project.openings.filter(
    o => o.style && o.width && o.height &&
         o.style !== 'roller_blind' && o.style !== 'subframe_window',
  ).length;

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

// ─── Sub-components ──────────────────────────────────────────────────────────

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
  summaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
  right:     { textAlign: 'right' },
  labelCell: { fontWeight: '700', color: '#222', fontSize: 14, flex: 1 },
  barsWrap:  { alignItems: 'center', minWidth: 64 },
  barsNum:   { fontSize: 32, fontWeight: '900', color: '#1565C0', lineHeight: 36 },
  barsLabel: { fontSize: 10, color: '#7090C0', fontWeight: '600', textTransform: 'uppercase' },
});

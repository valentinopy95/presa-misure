import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getAllProjectsWithOpenings } from '../storage/database';
import { Project, Opening, OpeningStyle } from '../types';

const NAVY = '#0c2d75';

// Raggruppamento leggibile per categoria
const STYLE_LABELS: Partial<Record<OpeningStyle, string>> = {
  window_fixed:      'Finestra fissa',
  window_single:     'Finestra 1 anta',
  window_double:     'Finestra 2 ante',
  window_sliding:    'Finestra scorrevole',
  window_tilt_turn:  'Vasistas',
  door_single:       'Porta 1 anta',
  door_double:       'Porta 2 ante',
  door_sliding:      'Porta scorrevole',
  door_french:       'Porta-finestra',
  door_bifold:       'Porta a soffietto',
  door_entrance:     'Porta d\'ingresso',
  shutter_single:    'Persiana 1 anta',
  shutter_double:    'Persiana 2 ante',
  roller_blind:      'Monoblocco',
  subframe_window:   'Controtelaio',
  mosquito_fixed:    'Zanzariera fissa',
  mosquito_rollup:   'Zanzariera avvolgibile',
  mosquito_lateral:  'Zanzariera laterale',
};

interface Stats {
  totalProjects:   number;
  totalOpenings:   number;
  uniqueClients:   number;
  last30Projects:  number;
  last30Openings:  number;
  avgWidth:        number | null;
  avgHeight:       number | null;
  typeCounts:      { label: string; count: number }[];
}

function computeStats(projects: Project[]): Stats {
  const root = projects.filter(p => !p.parentId);
  const allOpenings: Opening[] = projects.flatMap(p => p.openings);
  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;

  const last30Projects = root.filter(p => now - new Date(p.updatedAt).getTime() < ms30).length;
  const last30Openings = allOpenings.filter(o => now - new Date(o.updatedAt).getTime() < ms30).length;

  const uniqueClients = new Set(root.map(p => p.clientName?.trim().toLowerCase()).filter(Boolean)).size;

  const widths  = allOpenings.map(o => o.width).filter((v): v is number => v != null && v > 0);
  const heights = allOpenings.map(o => o.height).filter((v): v is number => v != null && v > 0);
  const avgWidth  = widths.length  ? Math.round(widths.reduce((a, b) => a + b, 0)  / widths.length)  : null;
  const avgHeight = heights.length ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : null;

  const countMap: Record<string, number> = {};
  for (const o of allOpenings) {
    if (!o.style) continue;
    const label = STYLE_LABELS[o.style] ?? o.style;
    countMap[label] = (countMap[label] ?? 0) + 1;
  }
  const typeCounts = Object.entries(countMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalProjects:  root.length,
    totalOpenings:  allOpenings.length,
    uniqueClients,
    last30Projects,
    last30Openings,
    avgWidth,
    avgHeight,
    typeCounts,
  };
}

export default function StatsScreen() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProjectsWithOpenings()
      .then(all => setStats(computeStats(all)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#fff" size="large"/></View>;
  }
  if (!stats) {
    return <View style={s.center}><Text style={s.empty}>Nessun dato disponibile</Text></View>;
  }

  const maxCount = stats.typeCounts[0]?.count ?? 1;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>

      {/* ── Totali ── */}
      <Text style={s.sectionTitle}>Totali</Text>
      <View style={s.row}>
        <StatCard value={stats.totalProjects}  label="Progetti"  />
        <StatCard value={stats.totalOpenings}  label="Aperture"  />
        <StatCard value={stats.uniqueClients}  label="Clienti"   />
      </View>

      {/* ── Ultimi 30 giorni ── */}
      <Text style={s.sectionTitle}>Ultimi 30 giorni</Text>
      <View style={s.row}>
        <StatCard value={stats.last30Projects} label="Progetti"  accent />
        <StatCard value={stats.last30Openings} label="Aperture"  accent />
      </View>

      {/* ── Misure medie ── */}
      {(stats.avgWidth || stats.avgHeight) ? (
        <>
          <Text style={s.sectionTitle}>Misure medie aperture</Text>
          <View style={s.row}>
            {stats.avgWidth  != null && <StatCard value={`${stats.avgWidth} mm`}  label="Larghezza media" />}
            {stats.avgHeight != null && <StatCard value={`${stats.avgHeight} mm`} label="Altezza media"   />}
          </View>
        </>
      ) : null}

      {/* ── Tipologie ── */}
      {stats.typeCounts.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Aperture per tipologia</Text>
          <View style={s.typeList}>
            {stats.typeCounts.map(({ label, count }) => (
              <View key={label} style={s.typeRow}>
                <Text style={s.typeLabel} numberOfLines={1}>{label}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${Math.round((count / maxCount) * 100)}%` }]} />
                </View>
                <Text style={s.typeCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

    </ScrollView>
  );
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={[s.card, accent && s.cardAccent]}>
      <Text style={[s.cardValue, accent && s.cardValueAccent]}>{value}</Text>
      <Text style={[s.cardLabel, accent && s.cardLabelAccent]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: NAVY },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  empty:  { color: 'rgba(255,255,255,0.5)', fontSize: 15 },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginTop: 24, marginBottom: 10,
  },

  row: { flexDirection: 'row', gap: 10 },

  card: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cardAccent: {
    backgroundColor: '#fff',
  },
  cardValue: {
    fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5,
  },
  cardValueAccent: { color: NAVY },
  cardLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)',
    marginTop: 4, textAlign: 'center',
  },
  cardLabelAccent: { color: 'rgba(12,45,117,0.6)' },

  typeList: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  typeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  typeLabel: {
    width: 140, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)',
  },
  barTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3, marginHorizontal: 10, overflow: 'hidden',
  },
  barFill: {
    height: '100%', backgroundColor: '#fff', borderRadius: 3,
  },
  typeCount: {
    width: 28, fontSize: 12, fontWeight: '800', color: '#fff', textAlign: 'right',
  },
});

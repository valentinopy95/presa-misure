import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import {
  getBarLength, getRiattestattura,
  getAntaReduction, getSlatPitch,
  getToleranceByType,
  CatalogSeries, getCatalogSeries,
  getDefaultCatalogSeriesId, setDefaultCatalogSeriesId,
} from '../storage/settings';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Menu card ────────────────────────────────────────────────────────────────

function MenuCard({
  icon, title, sub, color, onPress,
}: {
  icon: string; title: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[mc.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[mc.iconWrap, { backgroundColor: color + '15' }]}>
        <Text style={mc.icon}>{icon}</Text>
      </View>
      <View style={mc.text}>
        <Text style={mc.title}>{title}</Text>
        <Text style={mc.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={[mc.arrow, { backgroundColor: color + '15' }]}>
        <Text style={[mc.arrowText, { color }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    gap: 14, borderLeftWidth: 4,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 21 },
  text:      { flex: 1 },
  title:     { fontSize: 15, fontWeight: '800', color: '#1a2a3a' },
  sub:       { fontSize: 12, color: '#8a9ab0', marginTop: 3 },
  arrow:     { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
});

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={sl.text}>{label}</Text>;
}
const sl = StyleSheet.create({
  text: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase', color: '#8a9ab0', marginTop: 24, marginBottom: 10, paddingLeft: 4 },
});

// ─── Hub ─────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { theme, toggleDark } = useTheme();
  const t = theme;

  const [catalogSeries,   setCatalogSeries]   = useState<CatalogSeries[]>([]);
  const [defaultSeriesId, setDefaultSeriesId] = useState<string | null>(null);
  const [tolSummary,  setTolSummary]  = useState('');
  const [barSummary,  setBarSummary]  = useState('');
  const [genSummary,  setGenSummary]  = useState('');

  const loadSummaries = useCallback(() => {
    getToleranceByType().then(tbt => {
      setTolSummary(`Finestre L−${tbt.finestre.w}/H−${tbt.finestre.h} · Porte L−${tbt.porte.w}/H−${tbt.porte.h}`);
    });
    Promise.all([getBarLength(), getRiattestattura()]).then(([bar, riatt]) => {
      setBarSummary(`Barra ${bar} mm · Riattestattura ${riatt} mm`);
    });
    Promise.all([getAntaReduction(), getSlatPitch()]).then(([red, slat]) => {
      setGenSummary(`Rid. anta ${red} mm · Lamella ${slat} mm`);
    });
  }, []);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  useFocusEffect(useCallback(() => {
    getCatalogSeries().then(setCatalogSeries);
    getDefaultCatalogSeriesId().then(setDefaultSeriesId);
    loadSummaries();
  }, [loadSummaries]));

  return (
    <ScrollView style={[s.screen, { backgroundColor: t.bg }]} contentContainerStyle={s.content}>

      {/* ── Serie catalogo ── */}
      <SectionLabel label="Serie catalogo" />
      <View style={[s.seriesCard, { backgroundColor: t.card }]}>
        <View style={s.seriesCardHeader}>
          <View>
            <Text style={[s.seriesCardTitle, { color: t.textPrimary }]}>📋  Gestione serie</Text>
            <Text style={[s.seriesCardSub, { color: t.textSecondary }]}>
              {catalogSeries.length === 0 ? 'Nessuna serie configurata' : `${catalogSeries.length} serie disponibili`}
            </Text>
          </View>
          <TouchableOpacity style={s.seriesAddBtn} onPress={() => navigation.navigate('SeriesEditor', {})}>
            <Text style={s.seriesAddBtnText}>+ Nuova</Text>
          </TouchableOpacity>
        </View>

        {catalogSeries.length === 0 ? (
          <View style={s.seriesEmpty}>
            <Text style={s.seriesEmptyIcon}>📂</Text>
            <Text style={[s.seriesEmptyText, { color: t.textSecondary }]}>
              Aggiungi una serie per calcolare tagli con le misure precise dei profili
            </Text>
          </View>
        ) : (
          catalogSeries.map(series => (
            <TouchableOpacity
              key={series.id}
              style={s.seriesRow}
              onPress={() => navigation.navigate('SeriesEditor', { seriesId: series.id })}
            >
              <View style={s.seriesDot} />
              <View style={{ flex: 1 }}>
                <Text style={[s.seriesName, { color: t.textPrimary }]}>{series.name}</Text>
                <Text style={[s.seriesSub, { color: t.textSecondary }]}>
                  {series.variants.length} {series.variants.length === 1 ? 'variante' : 'varianti'}
                </Text>
              </View>
              {defaultSeriesId === series.id ? (
                <View style={s.defaultBadge}>
                  <Text style={s.defaultBadgeText}>DEFAULT</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.setDefaultBtn}
                  onPress={async () => { await setDefaultCatalogSeriesId(series.id); setDefaultSeriesId(series.id); }}
                >
                  <Text style={[s.setDefaultText, { color: t.textSecondary }]}>Imposta default</Text>
                </TouchableOpacity>
              )}
              <Text style={{ color: '#ccc', fontSize: 18, marginLeft: 8 }}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Calcolo ── */}
      <SectionLabel label="Calcolo" />
      <MenuCard
        icon="📐" color="#1565C0"
        title="Tolleranze"
        sub={tolSummary || 'Da luce a taglio per tipologia'}
        onPress={() => navigation.navigate('SettingsTolleranze')}
      />
      <MenuCard
        icon="📏" color="#2E7D32"
        title="Parametri barra"
        sub={barSummary || 'Lunghezza, kerf, riattestattura, margine'}
        onPress={() => navigation.navigate('SettingsParametri')}
      />
      <MenuCard
        icon="🔧" color="#546E7A"
        title="Calcolo generico"
        sub={genSummary || 'Riduzione anta, persiane, fascia'}
        onPress={() => navigation.navigate('SettingsGenerico')}
      />

      {/* ── Prezzi ── */}
      <SectionLabel label="Prezzi" />
      <MenuCard
        icon="💰" color="#E65100"
        title="Prezzi al m²"
        sub="Stima orientativa per tipologia e numero foglie"
        onPress={() => navigation.navigate('SettingsPrezzi')}
      />

      {/* ── Aspetto ── */}
      <SectionLabel label="Aspetto" />
      <View style={[s.toggleCard, { backgroundColor: t.card }]}>
        <View style={[s.toggleIconWrap, { backgroundColor: t.dark ? '#1a3a6a' : '#EEF4FF' }]}>
          <Text style={{ fontSize: 21 }}>{t.dark ? '🌙' : '☀️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.toggleTitle, { color: t.textPrimary }]}>Tema scuro</Text>
          <Text style={[s.toggleSub, { color: t.textSecondary }]}>{t.dark ? 'Attivo' : 'Disattivo'}</Text>
        </View>
        <Switch
          value={t.dark}
          onValueChange={toggleDark}
          trackColor={{ false: '#ccd5de', true: '#1565C0' }}
          thumbColor={t.dark ? '#e4eeff' : '#fff'}
        />
      </View>

      <Text style={[s.version, { color: t.dark ? '#3a5a7a' : '#D0D8E0' }]}>Versione 1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  seriesCard: {
    borderRadius: 16, padding: 16, marginBottom: 4,
    elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  seriesCardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seriesCardTitle:   { fontSize: 15, fontWeight: '800' },
  seriesCardSub:     { fontSize: 12, marginTop: 2 },
  seriesAddBtn:      { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  seriesAddBtnText:  { color: '#fff', fontWeight: '800', fontSize: 12 },

  seriesEmpty:     { alignItems: 'center', paddingVertical: 16, gap: 8 },
  seriesEmptyIcon: { fontSize: 28 },
  seriesEmptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  seriesRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 10 },
  seriesDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1565C0' },
  seriesName:  { fontSize: 14, fontWeight: '700' },
  seriesSub:   { fontSize: 11, marginTop: 2 },

  defaultBadge:     { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: '900', color: '#2E7D32', letterSpacing: 0.3 },
  setDefaultBtn:    { paddingHorizontal: 6 },
  setDefaultText:   { fontSize: 11, fontWeight: '600' },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14,
    gap: 14, elevation: 3, shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  toggleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleTitle:    { fontSize: 15, fontWeight: '800' },
  toggleSub:      { fontSize: 12, marginTop: 2 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});

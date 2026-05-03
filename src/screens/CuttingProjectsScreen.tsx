import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjectsWithOpenings } from '../storage/database';
import TourModal, { TourStep } from '../components/TourModal';
import { getTourSeen, setTourSeen } from '../storage/settings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CuttingProjects'>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CUTTING_PROJECTS_TOUR: TourStep[] = [
  {
    icon: '✂️',
    image: require('../../assets/menu_cutting.png'),
    title: 'Distinta di taglio',
    body: 'Seleziona un progetto per vedere come tagliare ogni barra di profilo. La distinta mostra l\'ordine ottimale dei tagli barra per barra.',
    spot: null,
  },
  {
    icon: '📊',
    title: 'Ottimizzazione tagli',
    body: 'L\'algoritmo FFD (First Fit Decreasing) assegna i pezzi più lunghi per primi, riducendo al minimo gli scarti.',
    spot: null,
  },
  {
    icon: '📄',
    title: 'Esporta PDF',
    body: 'Dalla distinta puoi esportare un PDF da consegnare al serramentista: ogni barra mostra lunghezze e ordine di taglio.',
    spot: null,
  },
];

export default function CuttingProjectsScreen() {
  const navigation  = useNavigation<Nav>();
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [query,       setQuery]       = useState('');
  const [tourVisible, setTourVisible] = useState(false);

  const filtered = query.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.clientName ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : projects;

  useFocusEffect(
    useCallback(() => {
      getAllProjectsWithOpenings().then(all =>
        setProjects([...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      ).catch(() => {});
    }, [])
  );

  useEffect(() => {
    getTourSeen('cutting_projects').then(seen => { if (!seen) setTourVisible(true); });
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <TourModal
        visible={tourVisible}
        steps={CUTTING_PROJECTS_TOUR}
        onClose={() => { setTourVisible(false); setTourSeen('cutting_projects'); }}
      />
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca per nome o cliente…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✂️</Text>
            <Text style={styles.emptyTitle}>Nessun progetto salvato</Text>
            <Text style={styles.emptySubtitle}>Crea prima un progetto con le misure</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CuttingList', { projectId: item.id })}
            activeOpacity={0.75}
          >
            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {!!item.clientName && (
                <Text style={styles.client} numberOfLines={1}>{item.clientName}</Text>
              )}
              <View style={styles.meta}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {item.openings.length} apertur{item.openings.length === 1 ? 'a' : 'e'}
                  </Text>
                </View>
                <Text style={styles.date}>{formatDate(item.updatedAt)}</Text>
              </View>
            </View>
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowChar}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0c2d75' },
  searchBox:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput:    {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  list:           { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 80 },
  emptyIcon:      { fontSize: 52, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptySubtitle:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  cardBody: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 4 },
  name:     { fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 3 },
  client:   { fontSize: 12, color: '#556070', marginBottom: 7, fontWeight: '500' },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    backgroundColor: '#EEF2F7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  countText:  { fontSize: 11, fontWeight: '700', color: '#0c2d75' },
  date:       { fontSize: 11, color: '#aab0ba', fontWeight: '500' },
  arrowBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  arrowChar:  { fontSize: 22, fontWeight: '700', color: '#0c2d75', lineHeight: 28 },
});

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjectsWithOpenings } from '../storage/database';
import TourModal, { TourStep } from '../components/TourModal';
import { getTourSeen, setTourSeen } from '../storage/settings';
import NavBurgerModal from '../components/NavBurgerModal';
import {
  getOrderedStatuses, setOrdered, clearOrdered, OrderedStatus,
} from '../storage/statusTracker';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MaterialsProjects'>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MATERIALS_PROJECTS_TOUR: TourStep[] = [
  {
    icon: '📦',
    image: require('../../assets/menu_materials.png'),
    title: 'Sviluppo materiale',
    body: 'Qui selezioni il progetto di cui vuoi calcolare i materiali. L\'app legge tutte le aperture e calcola quante barre di profilo ordinare.',
    spot: null,
  },
  {
    icon: '🔢',
    title: 'Scegli il progetto',
    body: 'Tocca un rilievo per vedere il calcolo materiali. Vengono elaborate solo le aperture con tipologia e misure complete.',
    spot: null,
  },
  {
    icon: '⚙️',
    title: 'Impostazioni calcolo',
    body: 'I parametri del calcolo (lunghezza barre, tolleranze, riattestattura...) si cambiano nelle Impostazioni dalla Home. Prima di calcolare verifica che siano corretti.',
    spot: null,
  },
];

export default function MaterialsProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [query,       setQuery]       = useState('');
  const [tourVisible, setTourVisible] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [orderedMap,      setOrderedMap]      = useState<Record<string, OrderedStatus>>({});
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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
      getOrderedStatuses().then(setOrderedMap).catch(() => {});
    }, [])
  );

  const toggleOrdered = useCallback(async (pid: string) => {
    if (orderedMap[pid]) {
      setConfirmRemoveId(pid);
    } else {
      const date = new Date().toISOString();
      await setOrdered(pid, date);
      setOrderedMap(prev => ({ ...prev, [pid]: { date } }));
    }
  }, [orderedMap]);

  const confirmRemove = useCallback(async () => {
    if (!confirmRemoveId) return;
    await clearOrdered(confirmRemoveId);
    setOrderedMap(prev => { const n = { ...prev }; delete n[confirmRemoveId]; return n; });
    setConfirmRemoveId(null);
  }, [confirmRemoveId]);

  useEffect(() => {
    getTourSeen('materials_projects').then(seen => { if (!seen) setTourVisible(true); });
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNavMenuOpen(true)} style={{ paddingHorizontal: 10, paddingVertical: 8, gap: 5, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: '#fff' }} />
            <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: '#fff' }} />
            <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: '#fff' }} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <TourModal
        visible={tourVisible}
        steps={MATERIALS_PROJECTS_TOUR}
        onClose={() => { setTourVisible(false); setTourSeen('materials_projects'); }}
      />
      <NavBurgerModal
        visible={navMenuOpen}
        current="materials"
        onClose={() => setNavMenuOpen(false)}
        navigation={navigation}
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
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Nessun progetto salvato</Text>
            <Text style={styles.emptySubtitle}>Crea prima un progetto con le misure</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ordered = orderedMap[item.id];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Materials', { projectId: item.id })}
              activeOpacity={0.75}
            >
              {/* Body */}
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
                <TouchableOpacity
                  onPress={() => toggleOrdered(item.id)}
                  style={[styles.orderBtn, !!ordered && styles.orderBtnActive]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.orderBtnText, !!ordered && styles.orderBtnTextActive]}>
                    {ordered ? `✓ Ordinato · ${formatDate(ordered.date)}` : '+ Segna come ordinato'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Arrow badge */}
              <View style={styles.arrowBadge}>
                <Text style={styles.arrowChar}>›</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal conferma rimozione ordinato */}
      <Modal visible={!!confirmRemoveId} transparent animationType="fade" onRequestClose={() => setConfirmRemoveId(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setConfirmRemoveId(null)}>
          <Pressable style={styles.confirmSheet} onPress={() => {}}>
            <Text style={styles.confirmIcon}>⚠️</Text>
            <Text style={styles.confirmTitle}>Rimuovi "Ordinato"</Text>
            <Text style={styles.confirmBody}>Vuoi rimuovere il segno di ordinato da questo progetto?</Text>
            <TouchableOpacity style={styles.confirmBtnDanger} onPress={confirmRemove} activeOpacity={0.85}>
              <Text style={styles.confirmBtnDangerText}>Rimuovi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnCancel} onPress={() => setConfirmRemoveId(null)}>
              <Text style={styles.confirmBtnCancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c2d75' },
  searchBox:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  cardBody: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 4 },
  name: { fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 3 },
  client: { fontSize: 12, color: '#556070', marginBottom: 7, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  countBadge: {
    backgroundColor: '#EEF2F7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#0c2d75' },
  date: { fontSize: 11, color: '#aab0ba', fontWeight: '500' },
  arrowBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  arrowChar: { fontSize: 22, fontWeight: '700', color: '#0c2d75', lineHeight: 28 },
  orderBtn: {
    alignSelf: 'flex-start', marginTop: 7,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#DDE4EF',
  },
  orderBtnActive: { backgroundColor: '#E8F5E9', borderColor: '#66BB6A' },
  orderBtnText: { fontSize: 11, fontWeight: '700', color: '#7090B0' },
  orderBtnTextActive: { color: '#2E7D32' },

  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', paddingHorizontal: 28,
  },
  confirmSheet: {
    backgroundColor: '#0c2d75', borderRadius: 22,
    padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  confirmIcon:  { fontSize: 36, marginBottom: 12 },
  confirmTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  confirmBody:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  confirmBtnDanger: {
    backgroundColor: '#D32F2F', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 13,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  confirmBtnDangerText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  confirmBtnCancel:     { paddingVertical: 10 },
  confirmBtnCancelText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

import React, { useCallback, useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, TextInput } from 'react-native';
import * as AppAlert from '../components/AppAlert';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjects, deleteProject } from '../storage/database';
import ProjectCard from '../components/ProjectCard';
import TourModal, { TourStep } from '../components/TourModal';
import { getTourSeen, setTourSeen } from '../storage/settings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SavedProjects'>;

const SAVED_TOUR: TourStep[] = [
  {
    icon: '🗂️',
    image: require('../../assets/menu_saved.png'),
    title: 'I tuoi rilievi',
    body: 'Qui trovi tutti i progetti salvati. Tocca un progetto per aprirlo. Se ha sotto-progetti (duplicati), li trovi dentro con le schede in alto.',
    spot: null,
  },
  {
    icon: '⧉',
    title: 'Sotto-progetti',
    body: 'Duplicando un progetto si crea una nuova versione collegata al progetto madre. Aprendo il padre trovi tutte le versioni come schede scorrevoli.',
    spot: null,
  },
  {
    icon: '🗑️',
    title: 'Elimina progetto',
    body: 'Premi ✕ sulla scheda per eliminare un rilievo. Eliminando un progetto madre si eliminano anche tutti i suoi sotto-progetti.',
    spot: null,
  },
];

export default function SavedProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const { theme: t } = useTheme();
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [query,       setQuery]       = useState('');
  const [tourVisible, setTourVisible] = useState(false);

  const filtered = query.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.clientName ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : projects;

  const reload = useCallback(() => {
    getAllProjects().then(all => {
      // Mostra solo i progetti radice — i sotto-progetti appaiono dentro il progetto madre
      setProjects(all.filter(p => !p.parentId));
    }).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    getTourSeen('saved').then(seen => { if (!seen) setTourVisible(true); });
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

  const handleDelete = (project: Project) => {
    // Conta sotto-progetti
    getAllProjects().then(all => {
      const childCount = all.filter(p => p.parentId === project.id).length;
      const msg = childCount > 0
        ? `Eliminando il progetto verranno eliminati anche i ${childCount} sotto-progetti collegati. Continuare?`
        : "Sei sicuro? L'operazione non è reversibile.";
      AppAlert.show('Elimina progetto', msg, [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
            await deleteProject(project.id);
            reload();
          },
        },
      ]);
    });
  };

  return (
    <View style={styles.container}>
      <TourModal
        visible={tourVisible}
        steps={SAVED_TOUR}
        onClose={() => { setTourVisible(false); setTourSeen('saved'); }}
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
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>Nessun rilievo salvato</Text>
            <Text style={styles.emptySubtitle}>Torna alla home e crea un nuovo progetto</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate('Project', { projectId: item.id })}
            onDelete={() => handleDelete(item)}
          />
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
  list:           { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 80 },
  emptyIcon:      { fontSize: 52, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptySubtitle:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
});

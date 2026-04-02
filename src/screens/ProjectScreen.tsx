import React, { useCallback, useState } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert, Text,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getProject, deleteOpening } from '../storage/database';
import OpeningCard from '../components/OpeningCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Project'>;
type Route = RouteProp<RootStackParamList, 'Project'>;

export default function ProjectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);

  const reload = useCallback(() => {
    getProject(projectId).then(setProject);
  }, [projectId]);

  useFocusEffect(reload);

  React.useLayoutEffect(() => {
    if (!project) return;
    navigation.setOptions({
      title: project.name,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Document', { projectId })}
          style={{ marginRight: 4 }}
        >
          <Text style={{ color: '#1565C0', fontSize: 15, fontWeight: '600' }}>PDF</Text>
        </TouchableOpacity>
      ),
    });
  }, [project, navigation, projectId]);

  const handleDelete = (openingId: string) => {
    Alert.alert('Elimina apertura', 'Vuoi eliminare questa voce?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteOpening(projectId, openingId);
          reload();
        },
      },
    ]);
  };

  if (!project) return null;

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.projectInfo}>
        <Text style={styles.client}>{project.clientName || 'Cliente non specificato'}</Text>
        <Text style={styles.address}>{project.address || 'Indirizzo non specificato'}</Text>
        <Text style={styles.count}>
          {project.openings.length} apertur{project.openings.length === 1 ? 'a' : 'e'}
        </Text>
      </View>

      <FlatList
        data={project.openings}
        keyExtractor={item => item.id}
        contentContainerStyle={project.openings.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nessuna apertura</Text>
            <Text style={styles.emptySubtitle}>Premi + per aggiungere una finestra o porta</Text>
          </View>
        }
        renderItem={({ item }) => (
          <OpeningCard
            opening={item}
            onPress={() => navigation.navigate('Measurement', { projectId, openingId: item.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Measurement', { projectId })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  projectInfo: {
    backgroundColor: '#1565C0', padding: 16,
  },
  client: { color: '#fff', fontSize: 16, fontWeight: '600' },
  address: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  count: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#999', textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  fabIcon: { fontSize: 32, color: '#fff', lineHeight: 36 },
});

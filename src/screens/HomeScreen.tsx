import React, { useCallback, useState } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert, Text,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { Project, RootStackParamList } from '../types';
import { getAllProjects, deleteProject, saveProject } from '../storage/database';
import ProjectCard from '../components/ProjectCard';
import NewProjectModal from '../components/NewProjectModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllProjects().then(setProjects);
    }, [])
  );

  const handleCreate = async (name: string, clientName: string, address: string) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      name,
      clientName,
      address,
      gps: null,
      openings: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(project);
    setProjects(prev => [project, ...prev]);
    setModalVisible(false);
    navigation.navigate('Project', { projectId: project.id });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Elimina progetto', 'Sei sicuro? L\'operazione non è reversibile.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteProject(id);
          setProjects(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nessun progetto</Text>
            <Text style={styles.emptySubtitle}>Premi + per creare il tuo primo rilievo</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate('Project', { projectId: item.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      <NewProjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
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

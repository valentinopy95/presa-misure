import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjects, deleteProject } from '../storage/database';
import ProjectCard from '../components/ProjectCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SavedProjects'>;

export default function SavedProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const [projects, setProjects] = useState<Project[]>([]);

  useFocusEffect(
    useCallback(() => { getAllProjects().then(setProjects); }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Elimina progetto', "Sei sicuro? L'operazione non è reversibile.", [
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
            <Text style={styles.emptyTitle}>Nessun rilievo salvato</Text>
            <Text style={styles.emptySubtitle}>Torna alla home e crea un nuovo progetto</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#999', textAlign: 'center' },
});

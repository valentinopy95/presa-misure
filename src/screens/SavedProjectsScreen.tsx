import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjects, deleteProject } from '../storage/database';
import ProjectCard from '../components/ProjectCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SavedProjects'>;

export default function SavedProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const { theme: t } = useTheme();
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
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Nessun rilievo salvato</Text>
            <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>Torna alla home e crea un nuovo progetto</Text>
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
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a2a3a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#8a9ab0', textAlign: 'center', lineHeight: 20 },
});

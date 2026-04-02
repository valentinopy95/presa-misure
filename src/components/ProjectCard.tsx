import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Project } from '../types';

interface Props {
  project: Project;
  onPress: () => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, onPress, onDelete }: Props) {
  const date = new Date(project.updatedAt).toLocaleDateString('it-IT');
  const count = project.openings.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
        {!!project.clientName && (
          <Text style={styles.client} numberOfLines={1}>{project.clientName}</Text>
        )}
        {!!project.address && (
          <Text style={styles.address} numberOfLines={1}>📍 {project.address}</Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.meta}>{count} apertur{count === 1 ? 'a' : 'e'}</Text>
          <Text style={styles.meta}>{date}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.delete} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden', elevation: 2,
  },
  accent: { width: 5, backgroundColor: '#1565C0' },
  body: { flex: 1, padding: 14 },
  name: { fontSize: 17, fontWeight: '700', color: '#222' },
  client: { fontSize: 14, color: '#555', marginTop: 2 },
  address: { fontSize: 13, color: '#888', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  meta: { fontSize: 12, color: '#AAA' },
  delete: { padding: 14, justifyContent: 'center' },
  deleteIcon: { fontSize: 18 },
});

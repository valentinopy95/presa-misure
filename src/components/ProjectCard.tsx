import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Project } from '../types';

interface Props {
  project: Project;
  onPress: () => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, onPress, onDelete }: Props) {
  const date = new Date(project.updatedAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const count = project.openings.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Left accent */}
      <LinearGradient
        colors={['#1976d2', '#0d47a1']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.accent}
      />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
        {!!project.clientName && (
          <Text style={styles.client} numberOfLines={1}>{project.clientName}</Text>
        )}
        {!!project.address && (
          <Text style={styles.address} numberOfLines={1}>📍 {project.address}</Text>
        )}
        <View style={styles.footer}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count} apertur{count === 1 ? 'a' : 'e'}</Text>
          </View>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.delete}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.deleteBox}>
          <Text style={styles.deleteIcon}>✕</Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 18, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  accent: { width: 5 },
  body: { flex: 1, paddingVertical: 16, paddingHorizontal: 16 },
  name: { fontSize: 16, fontWeight: '800', color: '#1a2a3a', letterSpacing: 0.1 },
  client: { fontSize: 13, color: '#556070', marginTop: 3, fontWeight: '500' },
  address: { fontSize: 12, color: '#8a9ab0', marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  countBadge: {
    backgroundColor: '#EEF2F7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  date: { fontSize: 11, color: '#aab0ba', fontWeight: '500' },
  delete: { justifyContent: 'center', paddingHorizontal: 16 },
  deleteBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE8E8', alignItems: 'center', justifyContent: 'center',
  },
  deleteIcon: { fontSize: 12, color: '#D32F2F', fontWeight: '800' },
});

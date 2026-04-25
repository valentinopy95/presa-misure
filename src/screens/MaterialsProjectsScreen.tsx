import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Project, RootStackParamList } from '../types';
import { getAllProjectsWithOpenings } from '../storage/database';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MaterialsProjects'>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MaterialsProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const [projects, setProjects] = useState<Project[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllProjectsWithOpenings().then(all =>
        setProjects([...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      );
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Nessun progetto salvato</Text>
            <Text style={styles.emptySubtitle}>Crea prima un progetto con le misure</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Materials', { projectId: item.id })}
            activeOpacity={0.75}
          >
            {/* Left accent */}
            <LinearGradient
              colors={['#ff7043', '#E65100']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={styles.accent}
            />

            {/* Icon box */}
            <LinearGradient
              colors={['#ff7043', '#E65100']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.iconBox}
            >
              <Text style={styles.icon}>📦</Text>
            </LinearGradient>

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
            </View>

            {/* Arrow badge */}
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
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a2a3a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#8a9ab0', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  accent: { width: 4, alignSelf: 'stretch' },
  iconBox: {
    width: 52, height: 52, margin: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  cardBody: { flex: 1, paddingVertical: 14, paddingRight: 4 },
  name: { fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 3 },
  client: { fontSize: 12, color: '#556070', marginBottom: 7, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  date: { fontSize: 11, color: '#aab0ba', fontWeight: '500' },
  arrowBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  arrowChar: { fontSize: 22, fontWeight: '700', color: '#E65100', lineHeight: 28 },
});

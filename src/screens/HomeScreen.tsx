import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { Project, RootStackParamList } from '../types';
import { saveProject } from '../storage/database';
import NewProjectModal from '../components/NewProjectModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MENU_ITEMS = [
  {
    key: 'create',
    icon: '📐',
    title: 'Crea progetto misure',
    subtitle: 'Nuovo rilievo infissi',
    color: '#1565C0',
    light: '#E3F2FD',
  },
  {
    key: 'catalog',
    icon: '📋',
    title: 'Catalogo profili',
    subtitle: 'Tipologie e disegni tecnici',
    color: '#2E7D32',
    light: '#E8F5E9',
  },
  {
    key: 'saved',
    icon: '🗂️',
    title: 'Rilievi salvati',
    subtitle: 'Apri un progetto esistente',
    color: '#6A1B9A',
    light: '#F3E5F5',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [modalVisible, setModalVisible] = useState(false);

  const handleCreate = async (name: string, clientName: string, address: string) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(), name, clientName, address,
      gps: null, openings: [],
      createdAt: now, updatedAt: now,
    };
    await saveProject(project);
    setModalVisible(false);
    navigation.navigate('Project', { projectId: project.id });
  };

  const handlePress = (key: string) => {
    if (key === 'create') setModalVisible(true);
    else if (key === 'catalog') navigation.navigate('Catalog');
    else if (key === 'saved') navigation.navigate('SavedProjects');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d47a1" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>SA</Text>
        </View>
        <Text style={styles.appName}>SerraApp</Text>
        <Text style={styles.appSub}>Rilievo professionale infissi</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.card}
            onPress={() => handlePress(item.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: item.light }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.arrow, { color: item.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings link */}
      <TouchableOpacity style={styles.settings} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsText}>⚙️  Impostazioni</Text>
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
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  header: {
    backgroundColor: '#1565C0',
    paddingTop: 52, paddingBottom: 32, paddingHorizontal: 28,
    alignItems: 'center',
  },
  logoBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  appName: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  appSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },

  menu: { padding: 20, gap: 12, marginTop: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#888' },
  arrow: { fontSize: 26, fontWeight: '300' },

  settings: { alignItems: 'center', marginTop: 'auto', paddingVertical: 24 },
  settingsText: { fontSize: 14, color: '#999', fontWeight: '600' },
});

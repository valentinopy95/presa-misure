import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList, Opening, OpeningStyle } from '../types';
import { getProject, saveProject } from '../storage/database';
import StyleLabel from '../components/StyleLabel';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'DuplicateProject'>;
type Route = RouteProp<RootStackParamList, 'DuplicateProject'>;

// Categorie principali mostrate nella schermata
type Category = 'window' | 'door' | 'shutter' | 'subframe' | 'mosquito' | 'roller_blind';

const CATEGORIES: { key: Category; label: string; color: string }[] = [
  { key: 'window',      label: 'Finestra',      color: '#1565C0' },
  { key: 'door',        label: 'Porta',          color: '#6A1B9A' },
  { key: 'shutter',     label: 'Persiana',       color: '#2E7D32' },
  { key: 'subframe',    label: 'Controtelaio',   color: '#5D4037' },
  { key: 'mosquito',    label: 'Zanzariera',     color: '#00838F' },
  { key: 'roller_blind',label: 'Tapparella',     color: '#E65100' },
];

function categoryOf(style: OpeningStyle | null): Category {
  if (!style) return 'window';
  if (style.startsWith('window'))   return 'window';
  if (style.startsWith('door'))     return 'door';
  if (style.startsWith('shutter'))  return 'shutter';
  if (style.startsWith('subframe')) return 'subframe';
  if (style.startsWith('mosquito')) return 'mosquito';
  if (style === 'roller_blind')     return 'roller_blind';
  return 'window';
}

// Mappa categoria + ante → stile di default
function defaultStyle(cat: Category, leafCount: number | null): OpeningStyle {
  const n = leafCount ?? 1;
  switch (cat) {
    case 'window':
      return n >= 2 ? 'window_double' : 'window_single';
    case 'door':
      return n >= 2 ? 'door_double' : 'door_single';
    case 'shutter':
      return n >= 2 ? 'shutter_double' : 'shutter_single';
    case 'subframe':
      return 'subframe_window';
    case 'mosquito':
      return 'mosquito_fixed';
    case 'roller_blind':
      return 'roller_blind';
  }
}

interface DraftOpening extends Opening {
  _category: Category;
}

export default function DuplicateProjectScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { projectId } = route.params;

  const [projectName, setProjectName] = useState('');
  const [drafts, setDrafts]           = useState<DraftOpening[]>([]);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    getProject(projectId).then(p => {
      if (!p) return;
      setProjectName(p.name + ' (2)');
      setDrafts(p.openings.map(o => ({
        ...o,
        id: uuidv4(),
        _category: categoryOf(o.style),
      })));
    });
  }, [projectId]);

  const updateDraft = (index: number, patch: Partial<DraftOpening>) => {
    setDrafts(prev => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
  };

  const changeCategory = (index: number, cat: Category) => {
    const draft = drafts[index];
    const newStyle = defaultStyle(cat, draft.leafCount);
    updateDraft(index, { _category: cat, style: newStyle });
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      Alert.alert('Nome mancante', 'Inserisci il nome del nuovo progetto.');
      return;
    }
    setSaving(true);
    try {
      const original = await getProject(projectId);
      if (!original) return;
      const now = new Date().toISOString();
      // Se l'originale è già un figlio → la copia diventa fratello (stesso parent).
      // Se l'originale è un progetto madre → la copia diventa figlio (parent = originale).
      const parentId = original.parentId ?? original.id;
      const newProject = {
        ...original,
        id:        uuidv4(),
        name:      projectName.trim(),
        parentId,
        openings:  drafts.map(({ _category, ...o }) => ({ ...o, updatedAt: now })),
        createdAt: now,
        updatedAt: now,
      };
      await saveProject(newProject);
      Alert.alert('Copia creata!', `"${newProject.name}" è stato creato.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Nome nuovo progetto */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Nome nuovo progetto</Text>
          <TextInput
            style={s.nameInput}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Es. Casa Rossi (2)"
            placeholderTextColor="#aaa"
            autoCapitalize="words"
          />
        </View>

        {/* Aperture */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Aperture ({drafts.length})</Text>
          <Text style={s.hint}>Modifica nome, tipologia o misure prima di creare la copia.</Text>
        </View>

        {drafts.map((draft, index) => (
          <View key={draft.id} style={s.card}>
            {/* Nome apertura */}
            <TextInput
              style={s.openingName}
              value={draft.name}
              onChangeText={v => updateDraft(index, { name: v })}
              placeholder="Nome apertura"
              placeholderTextColor="#aaa"
            />

            {/* Tipologia attuale */}
            <View style={s.currentStyle}>
              {draft.style && <StyleLabel style={draft.style} compact />}
            </View>

            {/* Selettore categoria */}
            <Text style={s.catLabel}>Cambia tipologia</Text>
            <View style={s.catRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.catChip, draft._category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => changeCategory(index, cat.key)}
                >
                  <Text style={[s.catChipText, draft._category === cat.key && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Misure */}
            <View style={s.dimsRow}>
              <View style={s.dimWrap}>
                <Text style={s.dimLabel}>Larghezza (mm)</Text>
                <TextInput
                  style={s.dimInput}
                  value={draft.width != null ? String(draft.width) : ''}
                  onChangeText={v => updateDraft(index, { width: v ? parseInt(v) : null })}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={s.dimWrap}>
                <Text style={s.dimLabel}>Altezza (mm)</Text>
                <TextInput
                  style={s.dimInput}
                  value={draft.height != null ? String(draft.height) : ''}
                  onChangeText={v => updateDraft(index, { height: v ? parseInt(v) : null })}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
          </View>
        ))}

        {/* Crea copia */}
        <TouchableOpacity style={s.btnCreate} onPress={handleCreate} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnCreateText}>Crea copia progetto</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#0c2d75';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: { padding: 16, paddingBottom: 40 },

  section:      { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 },
  hint:         { fontSize: 12, color: '#aaa', marginTop: -4 },

  nameInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#DDE3ED',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#1a2a3a',
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },

  openingName: {
    fontSize: 15, fontWeight: '800', color: '#1a2a3a',
    borderBottomWidth: 1.5, borderBottomColor: '#EEF2F7',
    paddingBottom: 8, marginBottom: 10,
  },

  currentStyle: { marginBottom: 12 },

  catLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  catRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  catChip:  {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#DDE3ED', backgroundColor: '#F8FAFC',
  },
  catChipText: { fontSize: 12, fontWeight: '700', color: '#555' },

  dimsRow: { flexDirection: 'row', gap: 12 },
  dimWrap: { flex: 1 },
  dimLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  dimInput: {
    backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDE3ED',
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, fontWeight: '700', color: '#1a2a3a', textAlign: 'center',
  },

  btnCreate: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    elevation: 3, shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  btnCreateText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

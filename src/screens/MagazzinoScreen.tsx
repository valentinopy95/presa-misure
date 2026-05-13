import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  MagazzinoItem, getMagazzino, upsertMagazzinoItem, deleteMagazzinoItem, emptyItem,
} from '../storage/magazzino';

const NAVY = '#0c2d75';

export default function MagazzinoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Magazzino'>>();
  const [items,       setItems]       = useState<MagazzinoItem[]>([]);
  const [editing,     setEditing]     = useState<MagazzinoItem | null>(null);
  const [newOffcut,   setNewOffcut]   = useState('');

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setEditing(emptyItem())}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 26 }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    getMagazzino().then(setItems);
  }, []));

  const openNew = () => setEditing(emptyItem());
  const openEdit = (item: MagazzinoItem) => setEditing({ ...item, offcuts: [...item.offcuts] });

  const closeModal = () => { setEditing(null); setNewOffcut(''); };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.articleCode.trim() && !editing.label.trim()) {
      Alert.alert('Attenzione', 'Inserisci almeno il codice articolo o la descrizione.');
      return;
    }
    await upsertMagazzinoItem(editing);
    const updated = await getMagazzino();
    setItems(updated);
    closeModal();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Elimina articolo', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await deleteMagazzinoItem(id);
        setItems(prev => prev.filter(x => x.id !== id));
      }},
    ]);
  };

  const addOffcut = () => {
    if (!editing) return;
    const n = parseInt(newOffcut.replace(/[^0-9]/g, ''), 10);
    if (!n || n <= 0) return;
    setEditing({ ...editing, offcuts: [...editing.offcuts, n].sort((a, b) => b - a) });
    setNewOffcut('');
  };

  const removeOffcut = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, offcuts: editing.offcuts.filter((_, i) => i !== idx) });
  };

  const totalOffcuts = items.reduce((s, x) => s + x.offcuts.length, 0);

  return (
    <View style={s.root}>

      {/* Sommario */}
      <View style={s.summary}>
        <View style={s.summaryCard}>
          <Text style={s.summaryNum}>{items.length}</Text>
          <Text style={s.summaryLabel}>Articoli</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryNum}>{totalOffcuts}</Text>
          <Text style={s.summaryLabel}>Avanzi</Text>
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={x => x.id}
        contentContainerStyle={items.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>Magazzino vuoto</Text>
            <Text style={s.emptySub}>Premi + per aggiungere un articolo</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={s.cardHeader}>
              <View style={s.articleBadge}>
                <Text style={s.articleBadgeText}>{item.articleCode || '—'}</Text>
              </View>
              <Text style={s.cardLabel} numberOfLines={1}>{item.label || 'Senza descrizione'}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>×</Text>
              </TouchableOpacity>
            </View>
            {item.offcuts.length > 0 && (
              <View style={s.cardBody}>
                <View style={s.offcutsRow}>
                  <Text style={s.offcutsLabel}>Avanzi:</Text>
                  <View style={s.offcutsList}>
                    {item.offcuts.map((mm, i) => (
                      <View key={i} style={s.offcutChip}>
                        <Text style={s.offcutChipText}>{mm} mm</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Modal editing */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <Pressable onPress={() => {}} style={s.modalSheet}>
              <Text style={s.modalTitle}>{editing?.id && items.find(x => x.id === editing.id) ? 'Modifica articolo' : 'Nuovo articolo'}</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={s.fieldLabel}>Codice articolo</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editing?.articleCode ?? ''}
                  onChangeText={v => editing && setEditing({ ...editing, articleCode: v })}
                  placeholder="es. EK100-T"
                  placeholderTextColor="#bbb"
                  autoCapitalize="characters"
                />

                <Text style={s.fieldLabel}>Descrizione</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editing?.label ?? ''}
                  onChangeText={v => editing && setEditing({ ...editing, label: v })}
                  placeholder="es. Telaio EKOS 100"
                  placeholderTextColor="#bbb"
                />

                <Text style={s.fieldLabel}>Avanzi (mm)</Text>
                <View style={s.offcutInputRow}>
                  <TextInput
                    style={[s.fieldInput, { flex: 1, marginBottom: 0 }]}
                    value={newOffcut}
                    onChangeText={setNewOffcut}
                    keyboardType="number-pad"
                    placeholder="es. 1240"
                    placeholderTextColor="#bbb"
                    onSubmitEditing={addOffcut}
                  />
                  <TouchableOpacity style={s.addOffcutBtn} onPress={addOffcut}>
                    <Text style={s.addOffcutBtnText}>+ Aggiungi</Text>
                  </TouchableOpacity>
                </View>
                {editing?.offcuts && editing.offcuts.length > 0 && (
                  <View style={s.offcutsEdit}>
                    {editing.offcuts.map((mm, i) => (
                      <View key={i} style={s.offcutEditChip}>
                        <Text style={s.offcutEditText}>{mm} mm</Text>
                        <TouchableOpacity onPress={() => removeOffcut(i)}>
                          <Text style={s.offcutEditDel}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
                  <Text style={s.saveBtnText}>Salva</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },

  summary: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  summaryNum:   { fontSize: 22, fontWeight: '900', color: NAVY },
  summaryLabel: { fontSize: 10, color: '#8a9ab0', fontWeight: '600', marginTop: 2 },

  list:          { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 40 },
  empty:          { alignItems: 'center', gap: 8 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { fontSize: 16, fontWeight: '800', color: '#1a2a3a' },
  emptySub:       { fontSize: 12, color: '#8a9ab0', textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F8',
  },
  articleBadge:     { backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  articleBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  cardLabel:        { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a2a3a' },
  deleteBtn:        { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:    { fontSize: 22, color: '#DC2626', fontWeight: '700', lineHeight: 24 },

  cardBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 },

  offcutsRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  offcutsLabel: { fontSize: 11, fontWeight: '700', color: '#8a9ab0', marginTop: 3 },
  offcutsList:  { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  offcutChip:   { backgroundColor: '#EEF4FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  offcutChipText: { fontSize: 11, fontWeight: '700', color: NAVY },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  modalSheet: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalTitle:  { fontSize: 17, fontWeight: '900', color: NAVY, marginBottom: 16, marginTop: 4 },

  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#888', marginBottom: 5, marginTop: 12, letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1a2a3a', marginBottom: 2,
  },
  offcutInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  addOffcutBtn:   { backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  addOffcutBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  offcutsEdit: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  offcutEditChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF4FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  offcutEditText: { fontSize: 12, fontWeight: '700', color: NAVY },
  offcutEditDel:  { fontSize: 16, color: '#DC2626', fontWeight: '700', lineHeight: 18 },

  saveBtn:     { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

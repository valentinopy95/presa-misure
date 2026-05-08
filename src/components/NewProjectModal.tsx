import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatalogSeries, getCatalogSeries, getDefaultCatalogSeriesId } from '../storage/settings';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, clientName: string, clientPhone: string, address: string, seriesId: string | null) => void;
}

export default function NewProjectModal({ visible, onClose, onCreate }: Props) {
  const insets = useSafeAreaInsets();
  const [name,          setName]          = useState('');
  const [clientName,    setClientName]    = useState('');
  const [clientPhone,   setClientPhone]   = useState('');
  const [address,       setAddress]       = useState('');
  const [seriesId,      setSeriesId]      = useState<string | null>(null);
  const [allSeries,     setAllSeries]     = useState<CatalogSeries[]>([]);
  const [showPicker,    setShowPicker]    = useState(false);

  useEffect(() => {
    if (!visible) return;
    Promise.all([getCatalogSeries(), getDefaultCatalogSeriesId()]).then(([list, defId]) => {
      setAllSeries(list);
      setSeriesId(defId);
    });
  }, [visible]);

  const handleCreate = () => {
    if (!clientName.trim()) return;
    onCreate(name.trim() || clientName.trim(), clientName.trim(), clientPhone.trim(), address.trim(), seriesId);
    setName(''); setClientName(''); setClientPhone(''); setAddress(''); setSeriesId(null);
  };

  const selectedSeries = allSeries.find(s => s.id === seriesId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(36, insets.bottom + 20) }]}>
          <View style={styles.handle} />

          <LinearGradient
            colors={['#0d47a1', '#1976d2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.headerStrip}
          >
            <Text style={styles.headerIcon}>📐</Text>
            <View>
              <Text style={styles.title}>Nuovo progetto</Text>
              <Text style={styles.subtitle}>Inserisci i dati del rilievo</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Cliente *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome del cliente"
              placeholderTextColor="#aab"
              value={clientName}
              onChangeText={setClientName}
              autoFocus
            />

            <Text style={styles.label}>Nome progetto</Text>
            <TextInput
              style={styles.input}
              placeholder="es. Piano terra (lascia vuoto per usare il nome cliente)"
              placeholderTextColor="#aab"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Telefono</Text>
            <TextInput
              style={styles.input}
              placeholder="+39 000 000 0000"
              placeholderTextColor="#aab"
              value={clientPhone}
              onChangeText={setClientPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Indirizzo</Text>
            <TextInput
              style={styles.input}
              placeholder="Via, città"
              placeholderTextColor="#aab"
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Serie catalogo taglio</Text>
            <TouchableOpacity style={[styles.input, styles.seriesRow]} onPress={() => setShowPicker(true)}>
              <Text style={{ fontSize: 14, color: seriesId ? '#1a2a3a' : '#aab', flex: 1 }}>
                {selectedSeries?.name ?? 'Nessuna serie selezionata'}
              </Text>
              <Text style={{ fontSize: 18, color: '#aab' }}>›</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !clientName.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!clientName.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={clientName.trim() ? ['#FFC107', '#F59E0B'] : ['#aaa', '#888']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.createBtnGrad}
              >
                <Text style={styles.createText}>Crea progetto</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Picker serie */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPicker(false)}>
          <Pressable style={styles.pickerSheet}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>Serie catalogo</Text>
            <TouchableOpacity
              style={[styles.pickerRow, !seriesId && styles.pickerRowActive]}
              onPress={() => { setSeriesId(null); setShowPicker(false); }}
            >
              <Text style={styles.pickerName}>Nessuna</Text>
              {!seriesId && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
            {allSeries.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pickerRow, seriesId === s.id && styles.pickerRowActive]}
                onPress={() => { setSeriesId(s.id); setShowPicker(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{s.name}</Text>
                  <Text style={styles.pickerSub}>{s.variants.length} varianti</Text>
                </View>
                {seriesId === s.id && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,40,0.55)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', maxHeight: '90%',
  },
  handle: {
    width: 44, height: 4, backgroundColor: '#DDE4EE',
    borderRadius: 2, alignSelf: 'center', marginTop: 12,
  },
  headerStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingVertical: 20, marginTop: 12,
  },
  headerIcon: { fontSize: 28 },
  title:      { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
  subtitle:   { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  form:       { paddingHorizontal: 24, paddingTop: 4 },
  label: {
    fontSize: 10, fontWeight: '800', color: '#1565C0',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7, marginTop: 16,
  },
  input: {
    backgroundColor: '#EEF2F7', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1a2a3a',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  seriesRow:  { flexDirection: 'row', alignItems: 'center' },
  actions:    { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 16, marginBottom: 4 },
  cancelBtn: {
    flex: 1, padding: 15, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#DDE4EE', alignItems: 'center',
    backgroundColor: '#F7FAFD',
  },
  cancelText:       { fontSize: 15, color: '#6a7a8a', fontWeight: '700' },
  createBtn:        { flex: 2, borderRadius: 14, overflow: 'hidden' },
  createBtnDisabled:{ opacity: 0.5 },
  createBtnGrad:    { paddingVertical: 15, alignItems: 'center' },
  createText:       { fontSize: 15, color: '#0c2d75', fontWeight: '800', letterSpacing: 0.3 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 13, fontWeight: '900', color: '#1a2a3a',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 10, marginBottom: 6, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#DDE3ED',
  },
  pickerRowActive: { borderColor: '#0c2d75', backgroundColor: '#EEF4FF' },
  pickerName:  { fontSize: 15, fontWeight: '700', color: '#1a2a3a' },
  pickerSub:   { fontSize: 11, color: '#7a8a9a', marginTop: 2 },
  check:       { fontSize: 16, color: '#0c2d75', fontWeight: '900' },
});

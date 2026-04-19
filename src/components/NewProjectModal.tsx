import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, clientName: string, clientPhone: string, address: string) => void;
}

export default function NewProjectModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), clientName.trim(), clientPhone.trim(), address.trim());
    setName('');
    setClientName('');
    setClientPhone('');
    setAddress('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
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

          <View style={styles.form}>
            <Text style={styles.label}>Nome progetto *</Text>
            <TextInput
              style={styles.input}
              placeholder="es. Villa Rossi - Piano terra"
              placeholderTextColor="#aab"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>Cliente</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome del cliente"
              placeholderTextColor="#aab"
              value={clientName}
              onChangeText={setClientName}
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
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={name.trim() ? ['#1976d2', '#0d47a1'] : ['#aaa', '#888']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.createBtnGrad}
              >
                <Text style={styles.createText}>Crea progetto</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,40,0.55)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: 36,
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
  title: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  form: { paddingHorizontal: 24, paddingTop: 20 },
  label: {
    fontSize: 10, fontWeight: '800', color: '#1565C0',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7, marginTop: 16,
  },
  input: {
    backgroundColor: '#EEF2F7', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1a2a3a',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 28 },
  cancelBtn: {
    flex: 1, padding: 15, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#DDE4EE', alignItems: 'center',
    backgroundColor: '#F7FAFD',
  },
  cancelText: { fontSize: 15, color: '#6a7a8a', fontWeight: '700' },
  createBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  createText: { fontSize: 15, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
});

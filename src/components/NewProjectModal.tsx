import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, clientName: string, address: string) => void;
}

export default function NewProjectModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), clientName.trim(), address.trim());
    setName('');
    setClientName('');
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
          <Text style={styles.title}>Nuovo progetto</Text>

          <Text style={styles.label}>Nome progetto *</Text>
          <TextInput
            style={styles.input}
            placeholder="es. Villa Rossi - Piano terra"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Cliente</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome del cliente"
            value={clientName}
            onChangeText={setClientName}
          />

          <Text style={styles.label}>Indirizzo</Text>
          <TextInput
            style={styles.input}
            placeholder="Via, città"
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={styles.createText}>Crea</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 14, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14,
    fontSize: 15, borderWidth: 1, borderColor: '#E8E8E8',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1, padding: 15, borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD', alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  createBtn: {
    flex: 1, padding: 15, borderRadius: 12,
    backgroundColor: '#1565C0', alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});

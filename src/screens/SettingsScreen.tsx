import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import {
  KEYS,
  DEFAULT_TOLERANCE_W, DEFAULT_TOLERANCE_H, DEFAULT_RIATTESTATTURA,
  getToleranceW, setToleranceW,
  getToleranceH, setToleranceH,
  getRiattestattura, setRiattestattura,
  getDimMode, setDimMode,
} from '../storage/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../types';

const ROLES: { value: UserRole; label: string; description: string; emoji: string }[] = [
  {
    value: 'builder',
    label: 'Costruttore / Cliente',
    description: 'Richiede un preventivo al fornitore di finestre o porte',
    emoji: '🏗️',
  },
  {
    value: 'sales',
    label: 'Commerciale',
    description: 'Registra misure indicative per una quotazione preliminare',
    emoji: '💼',
  },
  {
    value: 'surveyor',
    label: 'Tecnico rilevatore',
    description: 'Registra misure precise per la produzione',
    emoji: '📐',
  },
];

export default function SettingsScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [tolWText, setTolWText] = useState<string>(String(DEFAULT_TOLERANCE_W));
  const [tolHText, setTolHText] = useState<string>(String(DEFAULT_TOLERANCE_H));
  const [riattText, setRiattText] = useState<string>(String(DEFAULT_RIATTESTATTURA));
  const [dimMode, setDimModeState] = useState<'taglio' | 'luce'>('taglio');

  useEffect(() => {
    AsyncStorage.getItem(KEYS.ROLE).then(v => {
      if (v) setRole(v as UserRole);
    });
    getToleranceW().then(t => setTolWText(String(t)));
    getToleranceH().then(t => setTolHText(String(t)));
    getRiattestattura().then(r => setRiattText(String(r)));
    getDimMode().then(setDimModeState);
  }, []);

  const selectRole = async (r: UserRole) => {
    setRole(r);
    await AsyncStorage.setItem(KEYS.ROLE, r);
  };

  const handleTolWEnd = () => {
    const n = parseInt(tolWText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_TOLERANCE_W : Math.min(n, 999);
    setTolWText(String(val));
    setToleranceW(val);
  };

  const handleTolHEnd = () => {
    const n = parseInt(tolHText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_TOLERANCE_H : Math.min(n, 999);
    setTolHText(String(val));
    setToleranceH(val);
  };

  const handleRiattEnd = () => {
    const n = parseInt(riattText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_RIATTESTATTURA : Math.min(n, 99);
    setRiattText(String(val));
    setRiattestattura(val);
  };

  const exW = 1200 - (parseInt(tolWText, 10) || 0);
  const exH = 2200 - (parseInt(tolHText, 10) || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Tolleranza Larghezza ── */}
      <Text style={styles.sectionTitle}>Tolleranza taglio larghezza</Text>
      <Text style={styles.sectionSub}>
        Differenza applicata alla larghezza luce per ottenere la misura taglio
      </Text>
      <View style={styles.toleranceCard}>
        <View style={styles.toleranceRow}>
          <View>
            <Text style={styles.toleranceLabel}>Luce largh.</Text>
            <Text style={styles.toleranceFormula}>es. 1200 mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>−</Text>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={styles.toleranceInput}
              keyboardType="numeric"
              value={tolWText}
              onChangeText={setTolWText}
              onEndEditing={handleTolWEnd}
              onBlur={handleTolWEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={styles.toleranceUnit}>mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>=</Text>
          <View>
            <Text style={styles.toleranceLabel}>Taglio largh.</Text>
            <Text style={styles.toleranceFormula}>{exW} mm</Text>
          </View>
        </View>
      </View>

      {/* ── Tolleranza Altezza ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Tolleranza taglio altezza</Text>
      <Text style={styles.sectionSub}>
        Differenza applicata all'altezza luce per ottenere la misura taglio
      </Text>
      <View style={styles.toleranceCard}>
        <View style={styles.toleranceRow}>
          <View>
            <Text style={styles.toleranceLabel}>Luce altez.</Text>
            <Text style={styles.toleranceFormula}>es. 2200 mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>−</Text>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={styles.toleranceInput}
              keyboardType="numeric"
              value={tolHText}
              onChangeText={setTolHText}
              onEndEditing={handleTolHEnd}
              onBlur={handleTolHEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={styles.toleranceUnit}>mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>=</Text>
          <View>
            <Text style={styles.toleranceLabel}>Taglio altez.</Text>
            <Text style={styles.toleranceFormula}>{exH} mm</Text>
          </View>
        </View>
      </View>

      {/* ── Riattestattura ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Riattestattura taglio 45°</Text>
      <Text style={styles.sectionSub}>
        Spreco per riattestattura tra un pezzo e l'altro sulle barre a taglio 45° (default 25 mm)
      </Text>
      <View style={styles.toleranceCard}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toleranceLabel}>Spreco per taglio</Text>
            <Text style={styles.toleranceFormula}>es. 25 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={styles.toleranceInput}
              keyboardType="numeric"
              value={riattText}
              onChangeText={setRiattText}
              onEndEditing={handleRiattEnd}
              onBlur={handleRiattEnd}
              maxLength={2}
              selectTextOnFocus
            />
            <Text style={styles.toleranceUnit}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Visualizzazione misure ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Misura visualizzata nel disegno</Text>
      <Text style={styles.sectionSub}>
        Scegli se mostrare la misura luce o taglio nelle frecce del disegno
      </Text>
      <View style={styles.toggleRow}>
        {(['taglio', 'luce'] as const).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, dimMode === mode && styles.toggleBtnActive]}
            onPress={() => { setDimModeState(mode); setDimMode(mode); }}
          >
            <Text style={[styles.toggleBtnText, dimMode === mode && styles.toggleBtnTextActive]}>
              {mode === 'taglio' ? 'Taglio (Lt / Ht)' : 'Luce (Ll / Hl)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Ruolo ── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Ruolo utente</Text>
      <Text style={styles.sectionSub}>
        Seleziona il tuo profilo per personalizzare l'esperienza
      </Text>

      {ROLES.map(r => (
        <TouchableOpacity
          key={r.value}
          style={[styles.roleCard, role === r.value && styles.roleCardActive]}
          onPress={() => selectRole(r.value)}
        >
          <Text style={styles.roleEmoji}>{r.emoji}</Text>
          <View style={styles.roleText}>
            <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
              {r.label}
            </Text>
            <Text style={styles.roleDesc}>{r.description}</Text>
          </View>
          {role === r.value && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.version}>Versione 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#888', marginBottom: 14 },

  toleranceCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, elevation: 1,
  },
  toleranceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toleranceLabel: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  toleranceFormula: { fontSize: 15, color: '#333', fontWeight: '700', marginTop: 2 },
  toleranceMinus: { fontSize: 22, color: '#AAA', fontWeight: '300' },
  toleranceInputWrap: { alignItems: 'center' },
  toleranceInput: {
    backgroundColor: '#F0F4FF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    fontSize: 22, fontWeight: '700', color: '#1565C0',
    borderWidth: 2, borderColor: '#1565C0', width: 80, textAlign: 'center',
  },
  toleranceUnit: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '600' },

  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
    elevation: 1,
  },
  roleCardActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  roleEmoji: { fontSize: 28, marginRight: 14 },
  roleText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  roleLabelActive: { color: '#1565C0' },
  roleDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  check: { fontSize: 20, color: '#1565C0', fontWeight: '700' },
  version: { textAlign: 'center', color: '#CCC', fontSize: 13, marginTop: 40 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', elevation: 1,
  },
  toggleBtnActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  toggleBtnTextActive: { color: '#1565C0' },
});

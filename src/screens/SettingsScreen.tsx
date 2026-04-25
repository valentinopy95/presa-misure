import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import {
  DEFAULT_TOLERANCE_W, DEFAULT_TOLERANCE_H, DEFAULT_RIATTESTATTURA,
  DEFAULT_BAR_LENGTH, DEFAULT_KERF_90, DEFAULT_SAFETY_MARGIN,
  DEFAULT_SLAT_PITCH, DEFAULT_ZOCCOLO_H, DEFAULT_FASCIA_H,
  DEFAULT_ANTA_REDUCTION,
  getToleranceW, setToleranceW,
  getToleranceH, setToleranceH,
  getRiattestattura, setRiattestattura,
  getBarLength, setBarLength,
  getKerf90, setKerf90,
  getSafetyMargin, setSafetyMargin,
  getSlatPitch, setSlatPitch,
  getZoccoloH, setZoccoloH,
  getFasciaH, setFasciaH,
  getAntaReduction, setAntaReduction,
} from '../storage/settings';

export default function SettingsScreen() {
  const { theme, toggleDark } = useTheme();
  const t = theme;

  const [tolWText,   setTolWText]   = useState<string>(String(DEFAULT_TOLERANCE_W));
  const [tolHText,   setTolHText]   = useState<string>(String(DEFAULT_TOLERANCE_H));
  const [riattText,  setRiattText]  = useState<string>(String(DEFAULT_RIATTESTATTURA));
  const [barText,    setBarText]    = useState<string>(String(DEFAULT_BAR_LENGTH));
  const [kerfText,   setKerfText]   = useState<string>(String(DEFAULT_KERF_90));
  const [marginText, setMarginText] = useState<string>(String(DEFAULT_SAFETY_MARGIN));
  const [slatText,   setSlatText]   = useState<string>(String(DEFAULT_SLAT_PITCH));
  const [zocText,    setZocText]    = useState<string>(String(DEFAULT_ZOCCOLO_H));
  const [fasText,    setFasText]    = useState<string>(String(DEFAULT_FASCIA_H));
  const [antaRedText, setAntaRedText] = useState<string>(String(DEFAULT_ANTA_REDUCTION));

  useEffect(() => {
    getToleranceW().then(v => setTolWText(String(v)));
    getToleranceH().then(v => setTolHText(String(v)));
    getRiattestattura().then(v => setRiattText(String(v)));
    getBarLength().then(v => setBarText(String(v)));
    getKerf90().then(v => setKerfText(String(v)));
    getSafetyMargin().then(v => setMarginText(String(v)));
    getSlatPitch().then(v => setSlatText(String(v)));
    getZoccoloH().then(v => setZocText(String(v)));
    getFasciaH().then(v => setFasText(String(v)));
    getAntaReduction().then(v => setAntaRedText(String(v)));
  }, []);

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

  const handleBarEnd = () => {
    const n = parseInt(barText, 10);
    const val = isNaN(n) || n <= 0 ? DEFAULT_BAR_LENGTH : Math.min(Math.max(n, 1000), 9999);
    setBarText(String(val));
    setBarLength(val);
  };

  const handleKerfEnd = () => {
    const n = parseInt(kerfText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_KERF_90 : Math.min(n, 20);
    setKerfText(String(val));
    setKerf90(val);
  };

  const handleMarginEnd = () => {
    const n = parseInt(marginText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_SAFETY_MARGIN : Math.min(n, 50);
    setMarginText(String(val));
    setSafetyMargin(val);
  };

  const handleSlatEnd = () => {
    const n = parseInt(slatText, 10);
    const val = isNaN(n) || n <= 0 ? DEFAULT_SLAT_PITCH : Math.min(Math.max(n, 10), 200);
    setSlatText(String(val));
    setSlatPitch(val);
  };

  const handleZocEnd = () => {
    const n = parseInt(zocText, 10);
    const val = isNaN(n) || n <= 0 ? DEFAULT_ZOCCOLO_H : Math.min(Math.max(n, 50), 500);
    setZocText(String(val));
    setZoccoloH(val);
  };

  const handleFasEnd = () => {
    const n = parseInt(fasText, 10);
    const val = isNaN(n) || n <= 0 ? DEFAULT_FASCIA_H : Math.min(Math.max(n, 50), 500);
    setFasText(String(val));
    setFasciaH(val);
  };

  const handleAntaRedEnd = () => {
    const n = parseInt(antaRedText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_ANTA_REDUCTION : Math.min(n, 100);
    setAntaRedText(String(val));
    setAntaReduction(val);
  };

  const exW = 1200 - (parseInt(tolWText, 10) || 0);
  const exH = 2200 - (parseInt(tolHText, 10) || 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} contentContainerStyle={styles.content}>

      {/* ── Modalità scura ── */}
      <Text style={[styles.sectionTitle, { color: t.textPrimary, borderLeftColor: '#1565C0' }]}>Modalità scura</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>Attiva il tema scuro in tutta l'app</Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>TEMA</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>
              {t.dark ? 'Scuro' : 'Chiaro'}
            </Text>
          </View>
          <Switch
            value={t.dark}
            onValueChange={toggleDark}
            trackColor={{ false: '#ccd5de', true: '#1565C0' }}
            thumbColor={t.dark ? '#e4eeff' : '#fff'}
          />
        </View>
      </View>

      {/* ── Tolleranza Larghezza ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Tolleranza taglio larghezza</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Differenza applicata alla larghezza luce per ottenere la misura taglio
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Luce largh.</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 1200 mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>−</Text>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={tolWText}
              onChangeText={setTolWText}
              onEndEditing={handleTolWEnd}
              onBlur={handleTolWEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>=</Text>
          <View>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Taglio largh.</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>{exW} mm</Text>
          </View>
        </View>
      </View>

      {/* ── Tolleranza Altezza ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Tolleranza taglio altezza</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Differenza applicata all'altezza luce per ottenere la misura taglio
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Luce altez.</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 2200 mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>−</Text>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={tolHText}
              onChangeText={setTolHText}
              onEndEditing={handleTolHEnd}
              onBlur={handleTolHEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
          <Text style={styles.toleranceMinus}>=</Text>
          <View>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Taglio altez.</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>{exH} mm</Text>
          </View>
        </View>
      </View>

      {/* ── Riattestattura ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Riattestattura taglio 45°</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Spreco per riattestattura tra un pezzo e l'altro sulle barre a taglio 45° (default 25 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Spreco per taglio</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 25 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={riattText}
              onChangeText={setRiattText}
              onEndEditing={handleRiattEnd}
              onBlur={handleRiattEnd}
              maxLength={2}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Lunghezza barra ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Lunghezza barra (mm)</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Lunghezza utile della barra dopo squadratura (default 6400 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Lunghezza barra</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 6400 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder, width: 100 }]}
              keyboardType="numeric"
              value={barText}
              onChangeText={setBarText}
              onEndEditing={handleBarEnd}
              onBlur={handleBarEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Kerf 90° ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Kerf taglio 90°</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Spessore lama della troncatrice per tagli a 90° (default 4 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Spessore lama</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 4 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={kerfText}
              onChangeText={setKerfText}
              onEndEditing={handleKerfEnd}
              onBlur={handleKerfEnd}
              maxLength={2}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Margine di sicurezza ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Margine di sicurezza</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Percentuale aggiuntiva sul numero di barre calcolate (default 0%)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Margine aggiuntivo</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 5%</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={marginText}
              onChangeText={setMarginText}
              onEndEditing={handleMarginEnd}
              onBlur={handleMarginEnd}
              maxLength={2}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>%</Text>
          </View>
        </View>
      </View>

      {/* ── Riduzione anta ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Riduzione anta</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Riduzione totale telaio → anta (somma dei due lati). Default 0 mm.
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Riduzione anta</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 10 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={antaRedText}
              onChangeText={setAntaRedText}
              onEndEditing={handleAntaRedEnd}
              onBlur={handleAntaRedEnd}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Passo lamella persiana ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Passo lamella persiana</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Interasse tra le lamelle della persiana (50 / 55 / 60 / 77 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Passo lamella</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 55 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={slatText}
              onChangeText={setSlatText}
              onEndEditing={handleSlatEnd}
              onBlur={handleSlatEnd}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Altezza zoccolo persiana ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Altezza zoccolo persiana</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Altezza del profilo zoccolo inferiore della persiana (default 100 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Altezza zoccolo</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 100 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={zocText}
              onChangeText={setZocText}
              onEndEditing={handleZocEnd}
              onBlur={handleZocEnd}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Altezza fascia porta-finestra ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Altezza fascia porta-finestra</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Altezza della fascia superiore per persiane porta-finestra (default 100 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Altezza fascia</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 100 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={fasText}
              onChangeText={setFasText}
              onEndEditing={handleFasEnd}
              onBlur={handleFasEnd}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.version, { color: t.dark ? '#3a5a7a' : '#CCC' }]}>Versione 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 3,
    borderLeftWidth: 3, borderLeftColor: '#1565C0', paddingLeft: 10,
  },
  sectionSub: { fontSize: 12, color: '#8a9ab0', marginBottom: 14, paddingLeft: 13 },

  toleranceCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
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
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  roleCardActive: { borderColor: '#1565C0', backgroundColor: '#EEF5FF' },
  roleEmoji: { fontSize: 28, marginRight: 14 },
  roleText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  roleLabelActive: { color: '#1565C0' },
  roleDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  check: { fontSize: 20, color: '#1565C0', fontWeight: '700' },
  version: { textAlign: 'center', color: '#CCC', fontSize: 13, marginTop: 40 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', elevation: 2,
    shadowColor: '#1a3a5c', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  toggleBtnActive: { borderColor: '#1565C0', backgroundColor: '#EEF5FF' },
  toggleBtnText: { fontSize: 13, fontWeight: '700', color: '#8a9ab0' },
  toggleBtnTextActive: { color: '#1565C0' },
});

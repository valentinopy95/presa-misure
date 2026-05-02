import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch,
  Alert, Modal, Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import {
  DEFAULT_TOLERANCE_W, DEFAULT_TOLERANCE_H, DEFAULT_RIATTESTATTURA,
  DEFAULT_BAR_LENGTH, DEFAULT_KERF_90, DEFAULT_SAFETY_MARGIN,
  DEFAULT_SLAT_PITCH, DEFAULT_ZOCCOLO_H, DEFAULT_FASCIA_H,
  DEFAULT_ANTA_REDUCTION, DEFAULT_ANTA_TOP_RAIL,
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
  getAntaTopRail, setAntaTopRail,
  SettingsPreset, getPresets, addPreset, deletePreset, renamePreset, applyPreset,
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
  const [antaRedText,  setAntaRedText]  = useState<string>(String(DEFAULT_ANTA_REDUCTION));
  const [antaTopText,  setAntaTopText]  = useState<string>(String(DEFAULT_ANTA_TOP_RAIL));
  const [presets,       setPresets]       = useState<SettingsPreset[]>([]);
  const [activeId,      setActiveId]      = useState<string | null>(null);
  // modale nome preset (Android non ha Alert.prompt)
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptValue,   setPromptValue]   = useState('');
  const [promptMode,    setPromptMode]    = useState<'add' | { id: string; current: string }>('add');

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
    getAntaTopRail().then(v => setAntaTopText(String(v)));
    getPresets().then(setPresets);
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
    const val = isNaN(n) || n <= 0 ? DEFAULT_FASCIA_H : Math.min(Math.max(n, 500), 1500);
    setFasText(String(val));
    setFasciaH(val);
  };

  const handleAntaRedEnd = () => {
    const n = parseInt(antaRedText, 10);
    const val = isNaN(n) || n < 0 ? DEFAULT_ANTA_REDUCTION : Math.min(n, 100);
    setAntaRedText(String(val));
    setAntaReduction(val);
  };

  const handleAntaTopEnd = () => {
    const n = parseInt(antaTopText, 10);
    const val = isNaN(n) || n <= 0 ? DEFAULT_ANTA_TOP_RAIL : Math.min(Math.max(n, 30), 200);
    setAntaTopText(String(val));
    setAntaTopRail(val);
  };

  // ── Preset handlers ──────────────────────────────────────────────────────────

  const getCurrentValues = (): Omit<SettingsPreset, 'id' | 'name'> => ({
    toleranceW:      parseInt(tolWText,    10) || DEFAULT_TOLERANCE_W,
    toleranceH:      parseInt(tolHText,    10) || DEFAULT_TOLERANCE_H,
    riattestattura:  parseInt(riattText,   10) || DEFAULT_RIATTESTATTURA,
    barLength:       parseInt(barText,     10) || DEFAULT_BAR_LENGTH,
    kerf90:          parseInt(kerfText,    10) || DEFAULT_KERF_90,
    safetyMarginPct: parseInt(marginText,  10) || DEFAULT_SAFETY_MARGIN,
    slatPitch:       parseInt(slatText,    10) || DEFAULT_SLAT_PITCH,
    zoccoloH:        parseInt(zocText,     10) || DEFAULT_ZOCCOLO_H,
    fasciaH:         parseInt(fasText,     10) || DEFAULT_FASCIA_H,
    antaTopRail:     parseInt(antaTopText, 10) || DEFAULT_ANTA_TOP_RAIL,
    antaReduction:   parseInt(antaRedText, 10) || DEFAULT_ANTA_REDUCTION,
  });

  const openAddPrompt = () => {
    setPromptMode('add');
    setPromptValue('');
    setPromptVisible(true);
  };

  const openRenamePrompt = (preset: SettingsPreset) => {
    setPromptMode({ id: preset.id, current: preset.name });
    setPromptValue(preset.name);
    setPromptVisible(true);
  };

  const handlePromptConfirm = async () => {
    const name = promptValue.trim();
    if (!name) { setPromptVisible(false); return; }
    setPromptVisible(false);
    if (promptMode === 'add') {
      const preset: SettingsPreset = { id: Date.now().toString(), name, ...getCurrentValues() };
      await addPreset(preset);
      setPresets(prev => [...prev, preset]);
      setActiveId(preset.id);
    } else {
      const updated = await renamePreset(promptMode.id, name);
      setPresets(updated);
    }
  };

  const handleSelectPreset = async (preset: SettingsPreset) => {
    await applyPreset(preset);
    setTolWText(String(preset.toleranceW));
    setTolHText(String(preset.toleranceH));
    setRiattText(String(preset.riattestattura));
    setBarText(String(preset.barLength));
    setKerfText(String(preset.kerf90));
    setMarginText(String(preset.safetyMarginPct));
    setSlatText(String(preset.slatPitch));
    setZocText(String(preset.zoccoloH));
    setFasText(String(preset.fasciaH));
    setAntaTopText(String(preset.antaTopRail ?? DEFAULT_ANTA_TOP_RAIL));
    setAntaRedText(String(preset.antaReduction));
    setActiveId(preset.id);
  };

  const handleLongPressPreset = (preset: SettingsPreset) => {
    Alert.alert(preset.name, 'Cosa vuoi fare?', [
      { text: 'Rinomina', onPress: () => openRenamePrompt(preset) },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          const updated = await deletePreset(preset.id);
          setPresets(updated);
          if (activeId === preset.id) setActiveId(null);
        },
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const exW = 1200 - (parseInt(tolWText, 10) || 0);
  const exH = 2200 - (parseInt(tolHText, 10) || 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} contentContainerStyle={styles.content}>

      {/* ── Modal nome preset ── */}
      <Modal visible={promptVisible} transparent animationType="fade" onRequestClose={() => setPromptVisible(false)}>
        <View style={pm.overlay}>
          <View style={pm.box}>
            <Text style={pm.title}>{promptMode === 'add' ? 'Nuovo preset' : 'Rinomina preset'}</Text>
            <Text style={pm.sub}>{promptMode === 'add' ? 'Salva i valori attuali come preset richiamabile.' : ''}</Text>
            <TextInput
              style={pm.input}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder="Es. Profilo 60, Serramenti esterno..."
              placeholderTextColor="#aaa"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handlePromptConfirm}
            />
            <View style={pm.btnRow}>
              <TouchableOpacity style={pm.btnCancel} onPress={() => setPromptVisible(false)}>
                <Text style={pm.btnCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pm.btnOk} onPress={handlePromptConfirm}>
                <Text style={pm.btnOkText}>{promptMode === 'add' ? 'Salva preset' : 'Rinomina'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Striscia preset ── */}
      <View style={[styles.presetBar, { backgroundColor: t.card }]}>
        <Text style={[styles.presetTitle, { color: t.textSecondary }]}>PRESET IMPOSTAZIONI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
          {presets.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetChip, activeId === p.id && styles.presetChipActive]}
              onPress={() => handleSelectPreset(p)}
              onLongPress={() => handleLongPressPreset(p)}
              delayLongPress={500}
            >
              <Text style={[styles.presetChipText, activeId === p.id && styles.presetChipTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.presetAddBtn} onPress={openAddPrompt}>
            <Text style={styles.presetAddText}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
        {presets.length === 0 && (
          <Text style={[styles.presetEmpty, { color: t.textSecondary }]}>
            Configura i valori e premi ＋ per salvare il primo preset
          </Text>
        )}
      </View>

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

      {/* ── Posizione fascia porta-finestra ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Posizione fascia porta-finestra</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Distanza dal basso al centro della fascia intermedia (default 994 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Centro fascia</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 994 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder, width: 100 }]}
              keyboardType="numeric"
              value={fasText}
              onChangeText={setFasText}
              onEndEditing={handleFasEnd}
              onBlur={handleFasEnd}
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={[styles.toleranceUnit, { color: t.label }]}>mm</Text>
          </View>
        </View>
      </View>

      {/* ── Traverso superiore anta persiana ── */}
      <Text style={[styles.sectionTitle, { marginTop: 24, color: t.textPrimary }]}>Traverso superiore anta persiana</Text>
      <Text style={[styles.sectionSub, { color: t.textSecondary }]}>
        Altezza del profilo anta in cima alla persiana — viene sottratta per calcolare le lamelle (default 68 mm)
      </Text>
      <View style={[styles.toleranceCard, { backgroundColor: t.card }]}>
        <View style={styles.toleranceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toleranceLabel, { color: t.label }]}>Traverso superiore</Text>
            <Text style={[styles.toleranceFormula, { color: t.textPrimary }]}>es. 68 mm</Text>
          </View>
          <View style={styles.toleranceInputWrap}>
            <TextInput
              style={[styles.toleranceInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputBorder }]}
              keyboardType="numeric"
              value={antaTopText}
              onChangeText={setAntaTopText}
              onEndEditing={handleAntaTopEnd}
              onBlur={handleAntaTopEnd}
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

  // Preset strip
  presetBar: {
    borderRadius: 16, padding: 16, marginBottom: 20,
    elevation: 2, shadowColor: '#1a3a5c', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  presetTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  presetScroll: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
    backgroundColor: '#EEF2F7', borderWidth: 1.5, borderColor: 'transparent',
  },
  presetChipActive: { backgroundColor: '#EEF5FF', borderColor: '#1565C0' },
  presetChipText:   { fontSize: 13, fontWeight: '600', color: '#5a7a9a' },
  presetChipTextActive: { color: '#1565C0', fontWeight: '800' },
  presetAddBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1565C0',
    alignItems: 'center', justifyContent: 'center',
  },
  presetAddText: { color: '#fff', fontSize: 20, lineHeight: 26, fontWeight: '700' },
  presetEmpty:   { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  box: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%',
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  title:  { fontSize: 18, fontWeight: '900', color: '#0c2d75', marginBottom: 4 },
  sub:    { fontSize: 12, color: '#8a9ab0', marginBottom: 16 },
  input: {
    backgroundColor: '#F0F4FF', borderRadius: 12, borderWidth: 2, borderColor: '#1565C0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#1a2a3a',
    marginBottom: 18,
  },
  btnRow:       { flexDirection: 'row', gap: 10 },
  btnCancel:    { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDE3ED', alignItems: 'center' },
  btnCancelText:{ fontSize: 14, fontWeight: '700', color: '#667' },
  btnOk:        { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#1565C0', alignItems: 'center', elevation: 2 },
  btnOkText:    { fontSize: 14, fontWeight: '800', color: '#fff' },
});

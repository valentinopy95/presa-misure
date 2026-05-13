import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import TourModal, { TourStep } from '../components/TourModal';
import {
  DEFAULT_TOLERANCE_W, DEFAULT_TOLERANCE_H,
  DEFAULT_RIATTESTATTURA, DEFAULT_BAR_LENGTH, DEFAULT_KERF_90,
  DEFAULT_SAFETY_MARGIN, DEFAULT_SLAT_PITCH, DEFAULT_ZOCCOLO_H,
  DEFAULT_FASCIA_H, DEFAULT_ANTA_REDUCTION, DEFAULT_ANTA_TOP_RAIL,
  getToleranceByType, setToleranceByType, ToleranceByType,
  getDetailedPrices, setDetailedPrices, PRICE_SECTIONS,
  getRiattestattura, setRiattestattura,
  getBarLength, setBarLength,
  getKerf90, setKerf90,
  getSafetyMargin, setSafetyMargin,
  getSlatPitch, setSlatPitch,
  getZoccoloH, setZoccoloH,
  getFasciaH, setFasciaH,
  getAntaReduction, setAntaReduction,
  getAntaTopRail, setAntaTopRail,
  DetailedPriceConfig,
} from '../storage/settings';

// ─── Shared components ────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.title}>{label}</Text>
      {!!sub && <Text style={sh.sub}>{sub}</Text>}
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:  { marginTop: 24, marginBottom: 12 },
  title: { fontSize: 13, fontWeight: '900', color: '#1a2a3a', textTransform: 'uppercase', letterSpacing: 0.8 },
  sub:   { fontSize: 12, color: '#8a9ab0', marginTop: 3 },
});

function NumericRow({
  label, hint, value, unit, maxLength = 4, onEnd,
  onChange,
}: {
  label: string; hint?: string; value: string; unit: string;
  maxLength?: number;
  onEnd: () => void;
  onChange: (v: string) => void;
}) {
  const { theme: t } = useTheme();
  return (
    <View style={[nr.card, { backgroundColor: t.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={[nr.label, { color: t.label }]}>{label}</Text>
        {!!hint && <Text style={[nr.hint, { color: t.textSecondary }]}>{hint}</Text>}
      </View>
      <View style={nr.right}>
        <TextInput
          style={[nr.input, { backgroundColor: t.inputBg, borderColor: '#1565C0', color: '#1565C0' }]}
          keyboardType="numeric"
          value={value}
          onChangeText={onChange}
          onEndEditing={onEnd}
          onBlur={onEnd}
          maxLength={maxLength}
          selectTextOnFocus
        />
        <Text style={[nr.unit, { color: t.label }]}>{unit}</Text>
      </View>
    </View>
  );
}

const nr = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#1a3a5c', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  label: { fontSize: 14, fontWeight: '700', color: '#1a2a3a' },
  hint:  { fontSize: 11, color: '#8a9ab0', marginTop: 2 },
  right: { alignItems: 'center', gap: 4 },
  input: { borderRadius: 10, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 10, fontSize: 20, fontWeight: '800', width: 80, textAlign: 'center' },
  unit:  { fontSize: 11, fontWeight: '600', color: '#8a9ab0' },
});

// ─── TOLLERANZE ───────────────────────────────────────────────────────────────

const TOL_TYPES: { key: keyof ToleranceByType; label: string; icon: string }[] = [
  { key: 'finestre',   label: 'Finestre',   icon: '🪟' },
  { key: 'porte',      label: 'Porte',      icon: '🚪' },
  { key: 'persiane',   label: 'Persiane',   icon: '🌿' },
  { key: 'zanzariere', label: 'Zanzariere', icon: '🦟' },
];

const TOL_TOUR: TourStep[] = [
  { icon: '📐', title: 'Tolleranza da luce a taglio', body: 'La tolleranza è la differenza tra la misura del vano (luce) e la misura di taglio del profilo. Es.: vano 1200 mm − 10 mm = taglio 1190 mm.', spot: null },
  { icon: '🪟', title: 'Per tipologia', body: 'Ogni tipologia ha la sua tolleranza separata: finestre, porte, persiane e zanzariere possono richiedere scostamenti diversi in base al sistema di profili che usi.', spot: null },
  { icon: '📏', title: 'L e H separati', body: 'Larghezza e altezza si configurano indipendentemente. Molti sistemi usano la stessa tolleranza su entrambi gli assi, ma alcuni sistemi a nastro o scorrimento richiedono scostamenti diversi.', spot: null },
  { icon: '☁️', title: 'Sincronizzazione cloud', body: 'Le tolleranze vengono salvate automaticamente per tutta la tua azienda. Ogni membro del team vede sempre le stesse impostazioni senza doverle riconfigurate sul proprio dispositivo.', spot: null },
];

export function SettingsTolleranzeScreen() {
  const navigation = useNavigation();
  const { theme: t } = useTheme();
  const [tourVisible, setTourVisible] = useState(false);
  const [tol, setTol] = useState<ToleranceByType>({
    finestre:   { w: DEFAULT_TOLERANCE_W, h: DEFAULT_TOLERANCE_H },
    porte:      { w: DEFAULT_TOLERANCE_W, h: DEFAULT_TOLERANCE_H },
    persiane:   { w: DEFAULT_TOLERANCE_W, h: DEFAULT_TOLERANCE_H },
    zanzariere: { w: DEFAULT_TOLERANCE_W, h: DEFAULT_TOLERANCE_H },
  });

  useEffect(() => { getToleranceByType().then(setTol); }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const update = (key: keyof ToleranceByType, axis: 'w' | 'h', raw: string) => {
    const n = parseInt(raw, 10);
    const val = isNaN(n) || n < 0 ? 0 : n;
    const updated = { ...tol, [key]: { ...tol[key], [axis]: val } };
    setTol(updated);
    setToleranceByType(updated);
  };

  return (
    <ScrollView style={[ss.screen, { backgroundColor: t.bg }]} contentContainerStyle={ss.content}>
      <TourModal visible={tourVisible} steps={TOL_TOUR} onClose={() => setTourVisible(false)}/>
      <View style={ss.infoCard}>
        <Text style={ss.infoText}>
          Differenza sottratta dalla misura luce per ottenere la misura di taglio. Impostabile separatamente per ogni tipologia.
        </Text>
      </View>

      {TOL_TYPES.map(({ key, label, icon }) => (
        <View key={key} style={[ss.groupCard, { backgroundColor: t.card }]}>
          <Text style={[ss.groupTitle, { color: t.textPrimary }]}>{icon}  {label}</Text>
          <View style={ss.tolRow}>
            <View style={ss.tolCell}>
              <Text style={[ss.tolLabel, { color: t.label }]}>Larghezza  −</Text>
              <View style={ss.tolInputRow}>
                <TextInput
                  style={[nr.input, { backgroundColor: t.inputBg, borderColor: '#1565C0', color: '#1565C0', width: 70 }]}
                  keyboardType="numeric"
                  value={String(tol[key].w)}
                  maxLength={4}
                  selectTextOnFocus
                  onChangeText={v => update(key, 'w', v)}
                />
                <Text style={[nr.unit, { color: t.label }]}>mm</Text>
              </View>
            </View>
            <View style={ss.tolDivider} />
            <View style={ss.tolCell}>
              <Text style={[ss.tolLabel, { color: t.label }]}>Altezza  −</Text>
              <View style={ss.tolInputRow}>
                <TextInput
                  style={[nr.input, { backgroundColor: t.inputBg, borderColor: '#1565C0', color: '#1565C0', width: 70 }]}
                  keyboardType="numeric"
                  value={String(tol[key].h)}
                  maxLength={4}
                  selectTextOnFocus
                  onChangeText={v => update(key, 'h', v)}
                />
                <Text style={[nr.unit, { color: t.label }]}>mm</Text>
              </View>
            </View>
          </View>
          <View style={ss.exampleRow}>
            <Text style={ss.exampleText}>
              es. luce 1200×2200 → taglio {1200 - tol[key].w}×{2200 - tol[key].h} mm
            </Text>
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── PARAMETRI BARRA ─────────────────────────────────────────────────────────

const PARAM_TOUR: TourStep[] = [
  { icon: '📏', title: 'Lunghezza barra', body: 'Lunghezza utile della barra dopo la prima squadratura. Il valore standard è 6400 mm. Cambialo se usi barre di lunghezza diversa o tagli in cantiere.', spot: null },
  { icon: '✂️', title: 'Riattestattura 45°', body: 'Spreco di materiale tra un pezzo e l\'altro sulla stessa barra quando si taglia a 45°. Standard 25 mm (lama + riattestattura). Questo valore viene sottratto ad ogni cambio di pezzo.', spot: null },
  { icon: '🔪', title: 'Kerf 90°', body: 'Spessore della lama della troncatrice per i tagli a 90°. Incide sul calcolo degli avanzi. Standard: 4 mm.', spot: null },
  { icon: '🛡️', title: 'Margine di sicurezza', body: 'Percentuale di barre extra aggiunta al totale calcolato per coprire errori di taglio o scarti imprevisti. 0% = nessun margine. Consigliato: 5–10%.', spot: null },
  { icon: '💾', title: 'Preset impostazioni', body: 'Dalla schermata principale delle impostazioni puoi salvare tutti i parametri come preset con un nome (es. "Cantiere Rossi"). Richiamalo in un tap per applicare immediatamente tutta la configurazione.', spot: null },
];

export function SettingsParametriScreen() {
  const navigation = useNavigation();
  const { theme: t } = useTheme();
  const [tourVisible, setTourVisible] = useState(false);
  const [barText,    setBarText]    = useState(String(DEFAULT_BAR_LENGTH));
  const [riattText,  setRiattText]  = useState(String(DEFAULT_RIATTESTATTURA));
  const [kerfText,   setKerfText]   = useState(String(DEFAULT_KERF_90));
  const [marginText, setMarginText] = useState(String(DEFAULT_SAFETY_MARGIN));

  useEffect(() => {
    getBarLength().then(v => setBarText(String(v)));
    getRiattestattura().then(v => setRiattText(String(v)));
    getKerf90().then(v => setKerfText(String(v)));
    getSafetyMargin().then(v => setMarginText(String(v)));
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const saveBar    = () => { const n = parseInt(barText, 10);    const v = isNaN(n)||n<=0?DEFAULT_BAR_LENGTH:Math.min(Math.max(n,1000),9999); setBarText(String(v)); setBarLength(v); };
  const saveRiatt  = () => { const n = parseInt(riattText, 10);  const v = isNaN(n)||n<0?DEFAULT_RIATTESTATTURA:Math.min(n,99);              setRiattText(String(v)); setRiattestattura(v); };
  const saveKerf   = () => { const n = parseInt(kerfText, 10);   const v = isNaN(n)||n<0?DEFAULT_KERF_90:Math.min(n,20);                     setKerfText(String(v)); setKerf90(v); };
  const saveMargin = () => { const n = parseInt(marginText, 10); const v = isNaN(n)||n<0?DEFAULT_SAFETY_MARGIN:Math.min(n,50);               setMarginText(String(v)); setSafetyMargin(v); };

  return (
    <ScrollView style={[ss.screen, { backgroundColor: t.bg }]} contentContainerStyle={ss.content}>
      <TourModal visible={tourVisible} steps={PARAM_TOUR} onClose={() => setTourVisible(false)}/>
      <View style={ss.infoCard}>
        <Text style={ss.infoText}>Parametri usati nell'ottimizzazione del taglio barre (bin-packing). Validi per tutte le serie e per il calcolo generico.</Text>
      </View>

      <SectionHeader label="Barra profilo" />
      <NumericRow label="Lunghezza barra" hint="Lunghezza utile dopo squadratura" value={barText} unit="mm" maxLength={4} onChange={setBarText} onEnd={saveBar} />
      <NumericRow label="Riattestattura 45°" hint="Spreco tra pezzi sulla stessa barra" value={riattText} unit="mm" maxLength={2} onChange={setRiattText} onEnd={saveRiatt} />
      <NumericRow label="Kerf 90°" hint="Spessore lama troncatrice" value={kerfText} unit="mm" maxLength={2} onChange={setKerfText} onEnd={saveKerf} />

      <SectionHeader label="Sicurezza" />
      <NumericRow label="Margine di sicurezza" hint="Barre extra sul totale calcolato" value={marginText} unit="%" maxLength={2} onChange={setMarginText} onEnd={saveMargin} />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── PREZZI ───────────────────────────────────────────────────────────────────

const PREZZI_TOUR: TourStep[] = [
  { icon: '💰', title: 'Prezzi al m²', body: 'I prezzi sono orientativi e vengono usati per calcolare la stima economica nel rilievo e nel PDF. Lascia 0 per non mostrare il preventivo per quella tipologia.', spot: null },
  { icon: '🪟', title: 'Per tipologia e ante', body: 'Ogni tipologia ha prezzi separati per numero di ante: 1 anta, 2 ante, ecc. Questo ti permette di tarare la stima in base alla complessità del serramento.', spot: null },
  { icon: '📊', title: 'Stima nel rilievo', body: 'Il prezzo viene moltiplicato per l\'area (L × H in m²) di ogni apertura. La somma appare come stima totale nel progetto e nel PDF esportato.', spot: null },
  { icon: '☁️', title: 'Condivisi con il team', body: 'I prezzi sono condivisi con tutti i membri della tua azienda in tempo reale. Aggiornarli su un dispositivo li aggiorna per tutti, così il preventivo è sempre coerente tra i collaboratori.', spot: null },
];

export function SettingsPrezziScreen() {
  const navigation = useNavigation();
  const { theme: t } = useTheme();
  const [tourVisible, setTourVisible] = useState(false);
  const [prices, setPricesState] = useState<DetailedPriceConfig>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { getDetailedPrices().then(setPricesState); }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const updatePrice = (key: string, raw: string) => {
    const n = parseFloat(raw.replace(',', '.')) || 0;
    const updated = { ...prices, [key]: n };
    setPricesState(updated);
    setDetailedPrices(updated);
  };

  const toggleSection = (label: string) =>
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));

  const filledCount = (items: { key: string }[]) =>
    items.filter(i => prices[i.key] > 0).length;

  return (
    <ScrollView style={[ss.screen, { backgroundColor: t.bg }]} contentContainerStyle={ss.content}>
      <TourModal visible={tourVisible} steps={PREZZI_TOUR} onClose={() => setTourVisible(false)}/>
      <View style={ss.infoCard}>
        <Text style={ss.infoText}>Prezzi orientativi al m² per ogni tipologia. Tocca una categoria per espanderla e configurare i prezzi.</Text>
      </View>

      {PRICE_SECTIONS.map(sec => {
        const isOpen = !!openSections[sec.label];
        const filled = filledCount(sec.items);
        return (
          <View key={sec.label} style={[ss.groupCard, { backgroundColor: t.card, padding: 0, overflow: 'hidden' }]}>
            {/* Header accordion */}
            <TouchableOpacity
              style={[ss.priceHeader, { backgroundColor: sec.color, flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => toggleSection(sec.label)}
              activeOpacity={0.8}
            >
              <Text style={[ss.priceHeaderText, { flex: 1 }]}>{sec.label}</Text>
              {filled > 0 && (
                <View style={ss.priceBadge}>
                  <Text style={ss.priceBadgeText}>{filled}/{sec.items.length}</Text>
                </View>
              )}
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
                {isOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {/* Righe prezzi (visibili solo se aperto) */}
            {isOpen && sec.items.map((item, idx) => (
              <View
                key={item.key}
                style={[ss.priceRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#F0F4F8' }]}
              >
                <Text style={[ss.priceLabel, { color: t.textPrimary }]}>{item.label}</Text>
                <View style={ss.priceInputRow}>
                  <Text style={[ss.priceEuro, { color: t.label }]}>€</Text>
                  <TextInput
                    style={[nr.input, { backgroundColor: t.inputBg, borderColor: sec.color + '66', color: sec.color, width: 80, fontSize: 16 }]}
                    keyboardType="decimal-pad"
                    value={prices[item.key] ? String(prices[item.key]) : ''}
                    placeholder="0"
                    placeholderTextColor="#ccc"
                    selectTextOnFocus
                    onChangeText={v => updatePrice(item.key, v)}
                    onBlur={() => setDetailedPrices(prices)}
                  />
                  <Text style={[ss.priceUnit, { color: t.label }]}>/m²</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── CALCOLO GENERICO ─────────────────────────────────────────────────────────

const GENERICO_TOUR: TourStep[] = [
  { icon: '🔧', title: 'Quando si usa il calcolo generico', body: 'Questi parametri entrano in gioco solo per le aperture senza una serie catalogo assegnata, oppure per tipologie non coperte dalla serie (zanzariere, monoblocchi, ecc.).', spot: null },
  { icon: '🪟', title: 'Riduzione anta', body: 'Differenza totale tra la larghezza del telaio e quella dell\'anta (somma dei due lati). Es.: riduzione 10 mm → anta = telaio − 10 mm. Con la serie catalogo questo valore viene gestito dagli offset dei singoli pezzi nella variante.', spot: null },
  { icon: '🏠', title: 'Parametri persiane', body: 'Passo lamella: distanza tra le lamelle (tipicamente 55 mm). Altezza zoccolo: profilo inferiore dell\'anta. Traverso superiore anta: profilo alto. Questi valori determinano quante lamelle vengono calcolate per ogni anta.', spot: null },
  { icon: '🚪', title: 'Posizione fascia', body: 'Distanza dal basso al centro della fascia intermedia in una porta-finestra. Divide il vano vetro in due zone separate per il calcolo del fermavetro. Modifica solo se monti fasce a quota non standard.', spot: null },
  { icon: '📋', title: 'Usa una serie catalogo', body: 'Con una serie catalogo configurata questi parametri generici non vengono usati per telaio e anta — ogni pezzo ha la sua formula precisa. Il calcolo generico rimane utile per zanzariere, persiane e monoblocchi.', spot: null },
];

export function SettingsGenericoScreen() {
  const navigation = useNavigation();
  const { theme: t } = useTheme();
  const [tourVisible, setTourVisible] = useState(false);
  const [antaRedText,  setAntaRedText]  = useState(String(DEFAULT_ANTA_REDUCTION));
  const [antaTopText,  setAntaTopText]  = useState(String(DEFAULT_ANTA_TOP_RAIL));
  const [slatText,     setSlatText]     = useState(String(DEFAULT_SLAT_PITCH));
  const [zocText,      setZocText]      = useState(String(DEFAULT_ZOCCOLO_H));
  const [fasText,      setFasText]      = useState(String(DEFAULT_FASCIA_H));

  useEffect(() => {
    getAntaReduction().then(v => setAntaRedText(String(v)));
    getAntaTopRail().then(v => setAntaTopText(String(v)));
    getSlatPitch().then(v => setSlatText(String(v)));
    getZoccoloH().then(v => setZocText(String(v)));
    getFasciaH().then(v => setFasText(String(v)));
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const saveAntaRed  = () => { const n = parseInt(antaRedText,10);  const v=isNaN(n)||n<0?DEFAULT_ANTA_REDUCTION:Math.min(n,100);              setAntaRedText(String(v)); setAntaReduction(v); };
  const saveAntaTop  = () => { const n = parseInt(antaTopText,10);  const v=isNaN(n)||n<=0?DEFAULT_ANTA_TOP_RAIL:Math.min(Math.max(n,30),200); setAntaTopText(String(v)); setAntaTopRail(v); };
  const saveSlat     = () => { const n = parseInt(slatText,10);     const v=isNaN(n)||n<=0?DEFAULT_SLAT_PITCH:Math.min(Math.max(n,10),200);    setSlatText(String(v)); setSlatPitch(v); };
  const saveZoc      = () => { const n = parseInt(zocText,10);      const v=isNaN(n)||n<=0?DEFAULT_ZOCCOLO_H:Math.min(Math.max(n,50),500);     setZocText(String(v)); setZoccoloH(v); };
  const saveFas      = () => { const n = parseInt(fasText,10);      const v=isNaN(n)||n<=0?DEFAULT_FASCIA_H:Math.min(Math.max(n,500),1500);    setFasText(String(v)); setFasciaH(v); };

  return (
    <ScrollView style={[ss.screen, { backgroundColor: t.bg }]} contentContainerStyle={ss.content}>
      <TourModal visible={tourVisible} steps={GENERICO_TOUR} onClose={() => setTourVisible(false)}/>
      <View style={ss.infoCard}>
        <Text style={ss.infoText}>Parametri usati solo dal calcolo generico (aperture senza serie catalogo assegnata). Con la serie attiva questi valori non influenzano il calcolo principale.</Text>
      </View>

      <SectionHeader label="Telaio e anta" />
      <NumericRow label="Riduzione anta" hint="Riduzione totale telaio→anta (somma dei due lati)" value={antaRedText} unit="mm" maxLength={3} onChange={setAntaRedText} onEnd={saveAntaRed} />
      <NumericRow label="Altezza profilo anta" hint="Sottratta per calcolare le lamelle persiana" value={antaTopText} unit="mm" maxLength={3} onChange={setAntaTopText} onEnd={saveAntaTop} />

      <SectionHeader label="Persiane" />
      <NumericRow label="Passo lamella" hint="Interasse tra le lamelle (50 / 55 / 60 / 77 mm)" value={slatText} unit="mm" maxLength={3} onChange={setSlatText} onEnd={saveSlat} />
      <NumericRow label="Altezza zoccolo" hint="Profilo inferiore anta persiana" value={zocText} unit="mm" maxLength={3} onChange={setZocText} onEnd={saveZoc} />

      <SectionHeader label="Porta-finestra" />
      <NumericRow label="Posizione fascia" hint="Distanza dal basso al centro della fascia intermedia" value={fasText} unit="mm" maxLength={4} onChange={setFasText} onEnd={saveFas} />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16 },

  infoCard: {
    backgroundColor: '#EBF3FF', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#BBDEFB',
  },
  infoText: { fontSize: 12, color: '#455A64', lineHeight: 18 },

  groupCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 14,
    elevation: 2, shadowColor: '#1a3a5c', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  groupTitle: { fontSize: 15, fontWeight: '800', padding: 16, paddingBottom: 8 },

  tolRow:      { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 0 },
  tolCell:     { flex: 1, alignItems: 'center', gap: 8 },
  tolLabel:    { fontSize: 11, fontWeight: '700', color: '#8a9ab0', textTransform: 'uppercase', letterSpacing: 0.4 },
  tolInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tolDivider:  { width: 1, backgroundColor: '#EEF2F7', marginHorizontal: 8 },

  exampleRow:  { backgroundColor: '#F7FAFF', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  exampleText: { fontSize: 11, color: '#7090C0', fontStyle: 'italic' },

  priceHeader:     { paddingHorizontal: 14, paddingVertical: 12 },
  priceHeaderText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  priceBadge:      { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  priceBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  priceRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  priceLabel:      { fontSize: 13, flex: 1 },
  priceInputRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceEuro:       { fontSize: 12 },
  priceUnit:       { fontSize: 11 },
});

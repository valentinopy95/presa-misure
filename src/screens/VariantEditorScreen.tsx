import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import * as AppAlert from '../components/AppAlert';
import {
  CatalogPiece, CatalogVariant,
  getCatalogSeries, upsertCatalogVariant, deleteCatalogVariant,
} from '../storage/settings';
import { RootStackParamList } from '../types';
import TourModal, { TourStep } from '../components/TourModal';

const VARIANT_TOUR: TourStep[] = [
  { icon: '🪟', title: 'Variante per numero di ante', body: 'Ogni variante definisce i pezzi da tagliare per una finestra con 1, 2, 3 o 4 ante. La serie può avere più varianti, una per ogni configurazione.', spot: null },
  { icon: '📦', title: 'Sezioni Telaio / Anta / Fermavetro / Riporto', body: 'I pezzi sono divisi per categoria: Telaio (profilo fisso), Anta (profilo mobile), Fermavetro (solo se selezionato sull\'apertura) e Riporto (coprigiunto tra ante, solo per aperture con 2+ ante).', spot: null },
  { icon: '📐', title: 'Formula di calcolo', body: 'Per ogni pezzo scegli: base di riferimento (L = larghezza taglio, H = altezza taglio), offset in mm (+/−) e divisore.\n\n−÷ (arancio, default): (L + offset) ÷ divisore → es. traverso: (L − 48) / 2 = 643\n÷− (blu): (L ÷ divisore) + offset → es. L/2 poi − 48 = 619', spot: null },
  { icon: '✂️', title: 'Angolo di taglio', body: 'Ang.A e Ang.B indicano l\'angolo di taglio alle due estremità del profilo: 45° per giunti a inglete (telaio e anta), 90° per tagli dritti (fermavetro, riporto).', spot: null },
  { icon: '🔁', title: 'Condizione soglia', body: '"Sempre" include il pezzo in tutti i casi. "Senza soglia" lo esclude se la porta ha soglia. "Con soglia" lo include solo se c\'è la soglia.', spot: null },
];

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VariantEditor'>;
type Route = RouteProp<RootStackParamList, 'VariantEditor'>;

type PieceCategory = 'telaio' | 'anta' | 'fermavetro' | 'riporto';

function emptyPiece(cat: PieceCategory): CatalogPiece {
  return { id: uuidv4(), name: '', quantity: 1, baseVar: 'L', offset: 0, divisor: 1, cutAngle1: 45, cutAngle2: 45, pieceCategory: cat, divideFirst: false };
}

const SECTIONS: { cat: PieceCategory; label: string; color: string; bg: string; hint: string }[] = [
  { cat: 'telaio',     label: 'Telaio',     color: '#7B1FA2', bg: '#F3E5F5', hint: 'Profili del telaio fisso' },
  { cat: 'anta',       label: 'Anta',       color: '#0c2d75', bg: '#EEF4FF', hint: 'Profili dell\'anta mobile' },
  { cat: 'fermavetro', label: 'Fermavetro', color: '#1565C0', bg: '#E3F2FD', hint: 'Solo se l\'apertura ha fermavetro' },
  { cat: 'riporto',    label: 'Riporto',    color: '#2E7D32', bg: '#E8F5E9', hint: 'Coprigiunto tra ante (solo battente multiplo)' },
];

export default function VariantEditorScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { seriesId, variantId, leafCount: paramLeafCount } = route.params;

  const [leafCount, setLeafCount] = useState<number>(paramLeafCount ?? 1);
  const [pieces, setPieces]       = useState<CatalogPiece[]>([emptyPiece('anta')]);
  const [saving, setSaving]       = useState(false);
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setTourVisible(true)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!variantId) return;
    getCatalogSeries().then(list => {
      const s = list.find(x => x.id === seriesId);
      const v = s?.variants.find(x => x.id === variantId);
      if (v) {
        setLeafCount(v.leafCount);
        // Migrazione vecchi pezzi senza categoria → anta
        const migrated = v.pieces.map(p => ({ ...p, pieceCategory: p.pieceCategory ?? 'anta' as PieceCategory }));
        setPieces(migrated.length ? migrated : [emptyPiece('anta')]);
      }
    });
  }, [variantId, seriesId]);

  const updatePiece = (id: string, patch: Partial<CatalogPiece>) =>
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const addPiece = (cat: PieceCategory) =>
    setPieces(prev => [...prev, emptyPiece(cat)]);

  const removePiece = (id: string) =>
    setPieces(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const variant: CatalogVariant = {
        id:        variantId ?? uuidv4(),
        leafCount,
        pieces:    pieces.filter(p => p.name.trim()),
      };
      await upsertCatalogVariant(seriesId, variant);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!variantId) return;
    AppAlert.show('Elimina variante', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await deleteCatalogVariant(seriesId, variantId);
        navigation.goBack();
      }},
    ]);
  };

  const renderPieceRow = (p: CatalogPiece, sectionColor: string) => (
    <View key={p.id}>
      <View style={s.pieceRow}>
        {/* Nome */}
        <TextInput
          style={[s.cellInput, { flex: 3 }]}
          placeholder="Nome pezzo"
          placeholderTextColor="#bbb"
          value={p.name}
          onChangeText={v => updatePiece(p.id, { name: v })}
        />
        {/* Quantità */}
        <TextInput
          style={[s.cellInput, { width: 36 }]}
          keyboardType="number-pad"
          value={String(p.quantity)}
          onChangeText={v => {
            const n = parseInt(v.replace(/[^0-9]/g, ''));
            if (!isNaN(n) && n >= 1) updatePiece(p.id, { quantity: n });
            else if (v === '' || v === '0') updatePiece(p.id, { quantity: 1 });
          }}
          onBlur={() => updatePiece(p.id, { quantity: Math.max(1, p.quantity) })}
          selectTextOnFocus
        />
        {/* Base L/H */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 36, backgroundColor: sectionColor }]}
          onPress={() => updatePiece(p.id, { baseVar: p.baseVar === 'L' ? 'H' : 'L' })}
        >
          <Text style={s.toggleText}>{p.baseVar}</Text>
        </TouchableOpacity>
        {/* Toggle segno +/- */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 26 }, p.offset < 0 && s.toggleBtnMinus]}
          onPress={() => updatePiece(p.id, { offset: -p.offset })}
        >
          <Text style={s.toggleText}>{p.offset < 0 ? '−' : '+'}</Text>
        </TouchableOpacity>
        {/* Offset valore assoluto */}
        <TextInput
          style={[s.cellInput, { width: 36 }]}
          keyboardType="decimal-pad"
          value={p.offset === 0 ? '' : String(Math.abs(p.offset))}
          placeholder="0"
          placeholderTextColor="#ccc"
          selectTextOnFocus
          onChangeText={v => {
            const clean = v.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            const n = parseFloat(clean) || 0;
            const sign = p.offset < 0 ? -1 : 1;
            updatePiece(p.id, { offset: sign * n });
          }}
        />
        {/* Divisore */}
        <TextInput
          style={[s.cellInput, { width: 30 }]}
          keyboardType="decimal-pad"
          value={p.divisor === 1 ? '' : String(p.divisor)}
          placeholder="1"
          placeholderTextColor="#ccc"
          onChangeText={v => {
            const clean = v.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            updatePiece(p.id, { divisor: Math.max(1, parseFloat(clean) || 1) });
          }}
        />
        {/* Ordine operazioni: ÷ prima o − prima */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 32 }, (p.divideFirst !== true) && s.toggleBtnMinus]}
          onPress={() => updatePiece(p.id, { divideFirst: p.divideFirst === true ? false : true })}
        >
          <Text style={s.toggleText}>{p.divideFirst === true ? '÷−' : '−÷'}</Text>
        </TouchableOpacity>
        {/* Angolo A */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 38 }, p.cutAngle1 === 90 && s.toggleBtn90]}
          onPress={() => updatePiece(p.id, { cutAngle1: p.cutAngle1 === 45 ? 90 : 45 })}
        >
          <Text style={s.toggleText}>{p.cutAngle1}°</Text>
        </TouchableOpacity>
        {/* Angolo B */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 38 }, p.cutAngle2 === 90 && s.toggleBtn90]}
          onPress={() => updatePiece(p.id, { cutAngle2: p.cutAngle2 === 45 ? 90 : 45 })}
        >
          <Text style={s.toggleText}>{p.cutAngle2}°</Text>
        </TouchableOpacity>
        {/* Rimuovi */}
        <TouchableOpacity style={s.removeBtn} onPress={() => removePiece(p.id)}>
          <Text style={s.removeBtnText}>×</Text>
        </TouchableOpacity>
      </View>
      {/* Condizione soglia */}
      <View style={s.condRow}>
        {(['always', 'no_soglia', 'with_soglia'] as const).map(cond => (
          <TouchableOpacity
            key={cond}
            style={[s.condChip, (p.condition ?? 'always') === cond && { borderColor: sectionColor, backgroundColor: '#F0F4FF' }]}
            onPress={() => updatePiece(p.id, { condition: cond })}
          >
            <Text style={[s.condChipText, (p.condition ?? 'always') === cond && { color: sectionColor }]}>
              {cond === 'always' ? 'Sempre' : cond === 'no_soglia' ? 'Senza soglia' : 'Con soglia'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TourModal visible={tourVisible} steps={VARIANT_TOUR} onClose={() => setTourVisible(false)}/>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Badge configurazione */}
        <View style={s.configBadge}>
          <Text style={s.configBadgeNum}>{leafCount}</Text>
          <Text style={s.configBadgeLabel}>{leafCount === 1 ? 'anta' : 'ante'}</Text>
        </View>

        {/* Intestazione colonne */}
        <View style={s.headerRow}>
          <Text style={[s.headerCell, { flex: 3 }]}>Pezzo</Text>
          <Text style={[s.headerCell, { width: 36 }]}>Qtà</Text>
          <Text style={[s.headerCell, { width: 36 }]}>Rif.</Text>
          <Text style={[s.headerCell, { width: 26 }]}>±</Text>
          <Text style={[s.headerCell, { width: 36 }]}>mm</Text>
          <Text style={[s.headerCell, { width: 30 }]}>÷</Text>
          <Text style={[s.headerCell, { width: 32 }]}>ord.</Text>
          <Text style={[s.headerCell, { width: 38 }]}>Ang.A</Text>
          <Text style={[s.headerCell, { width: 38 }]}>Ang.B</Text>
          <Text style={[s.headerCell, { width: 24 }]}></Text>
        </View>

        {/* Sezioni per categoria */}
        {SECTIONS.map(sec => {
          const secPieces = pieces.filter(p => (p.pieceCategory ?? 'anta') === sec.cat);
          return (
            <View key={sec.cat} style={[s.section, { borderColor: sec.color }]}>
              {/* Header sezione */}
              <View style={[s.sectionHeader, { backgroundColor: sec.bg }]}>
                <Text style={[s.sectionTitle, { color: sec.color }]}>{sec.label.toUpperCase()}</Text>
                <Text style={[s.sectionHint, { color: sec.color }]}>{sec.hint}</Text>
              </View>

              {/* Pezzi della sezione */}
              <View style={s.sectionBody}>
                {secPieces.length === 0 && (
                  <Text style={s.emptyHint}>Nessun pezzo — premi + per aggiungere</Text>
                )}
                {secPieces.map(p => renderPieceRow(p, sec.color))}

                {/* Aggiungi */}
                <TouchableOpacity
                  style={[s.addPieceBtn, { borderColor: sec.color }]}
                  onPress={() => addPiece(sec.cat)}
                >
                  <Text style={[s.addPieceBtnText, { color: sec.color }]}>+ Aggiungi pezzo {sec.label.toLowerCase()}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Legenda formula */}
        <View style={s.legend}>
          <Text style={s.legendText}>
            <Text style={s.legendBold}>−÷</Text> (arancio, default): <Text style={s.legendBold}>(L + offset) ÷ div</Text> es. traverso: (L − 48)/2{'\n'}
            <Text style={s.legendBold}>÷−</Text> (blu): <Text style={s.legendBold}>(L ÷ div) + offset</Text> es. L/2 poi − 48{'\n'}
            Offset <Text style={s.legendBold}>−</Text> = sottrae · Offset <Text style={s.legendBold}>+</Text> = aggiunge{'\n'}
            Rif. = L (larghezza taglio) · H (altezza taglio){'\n'}
            Condizione: <Text style={s.legendBold}>Sempre / Senza soglia / Con soglia</Text>
          </Text>
        </View>

        {/* Salva */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff"/>
            : <Text style={s.saveBtnText}>Salva variante</Text>}
        </TouchableOpacity>

        {variantId && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Text style={s.deleteBtnText}>Elimina variante</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 16, paddingBottom: 40 },

  configBadge: {
    alignSelf: 'center', width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0c2d75', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  configBadgeNum:   { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 34 },
  configBadgeLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8, paddingHorizontal: 2 },
  headerCell: { fontSize: 9, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', textAlign: 'center' },

  section: {
    borderWidth: 1.5, borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  sectionHint:  { fontSize: 10, fontWeight: '500', opacity: 0.7, flex: 1 },
  sectionBody:  { padding: 10 },
  emptyHint:    { fontSize: 11, color: '#aaa', textAlign: 'center', paddingVertical: 8 },

  pieceRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  cellInput:  { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDE3ED', paddingHorizontal: 4, paddingVertical: 8, fontSize: 12, color: '#1a2a3a', textAlign: 'center' },
  toggleBtn:     { backgroundColor: '#0c2d75', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtn90:   { backgroundColor: '#2E7D32' },
  toggleBtnMinus: { backgroundColor: '#B45309' },
  toggleText:    { color: '#fff', fontWeight: '800', fontSize: 11 },
  removeBtn:     { width: 24, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 20, color: '#DC2626', fontWeight: '700', lineHeight: 22 },

  condRow:        { flexDirection: 'row', gap: 5, marginTop: 1, marginBottom: 8, paddingLeft: 2 },
  condChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#DDE3ED', backgroundColor: '#F8FAFC' },
  condChipText:   { fontSize: 9, fontWeight: '700', color: '#aaa' },

  addPieceBtn:     { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  addPieceBtnText: { fontWeight: '700', fontSize: 13 },

  legend:     { backgroundColor: '#EEF4FF', borderRadius: 10, padding: 12, marginBottom: 20 },
  legendText: { fontSize: 11, color: '#555', lineHeight: 17 },
  legendBold: { fontWeight: '800', color: '#0c2d75' },

  saveBtn:       { backgroundColor: '#0c2d75', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  saveBtnText:   { color: '#fff', fontWeight: '900', fontSize: 16 },
  deleteBtn:     { borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
});

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

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VariantEditor'>;
type Route = RouteProp<RootStackParamList, 'VariantEditor'>;

function emptyPiece(): CatalogPiece {
  return { id: uuidv4(), name: '', quantity: 1, baseVar: 'L', offset: 0, divisor: 1, cutAngle1: 45, cutAngle2: 45 };
}

export default function VariantEditorScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { seriesId, variantId, leafCount: paramLeafCount } = route.params;

  const [leafCount, setLeafCount] = useState<number>(paramLeafCount ?? 1);
  const [pieces, setPieces]       = useState<CatalogPiece[]>([emptyPiece()]);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!variantId) return;
    getCatalogSeries().then(list => {
      const s = list.find(x => x.id === seriesId);
      const v = s?.variants.find(x => x.id === variantId);
      if (v) {
        setLeafCount(v.leafCount);
        setPieces(v.pieces.length ? v.pieces : [emptyPiece()]);
      }
    });
  }, [variantId, seriesId]);

  const updatePiece = (id: string, patch: Partial<CatalogPiece>) =>
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const addPiece    = () => setPieces(prev => [...prev, emptyPiece()]);
  const removePiece = (id: string) => {
    if (pieces.length <= 1) return;
    setPieces(prev => prev.filter(p => p.id !== id));
  };

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

  const leafLabel = leafCount === 1 ? '1 anta' : `${leafCount} ante`;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Text style={[s.headerCell, { width: 26 }]}>+/-</Text>
          <Text style={[s.headerCell, { width: 36 }]}>mm</Text>
          <Text style={[s.headerCell, { width: 30 }]}>÷</Text>
          <Text style={[s.headerCell, { width: 38 }]}>Ang.A</Text>
          <Text style={[s.headerCell, { width: 38 }]}>Ang.B</Text>
          <Text style={[s.headerCell, { width: 24 }]}></Text>
        </View>

        {/* Righe pezzi */}
        {pieces.map((p) => (
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
                style={[s.toggleBtn, { width: 36 }]}
                onPress={() => updatePiece(p.id, { baseVar: p.baseVar === 'L' ? 'H' : 'L' })}
              >
                <Text style={s.toggleText}>{p.baseVar}</Text>
              </TouchableOpacity>
              {/* Toggle segno +/- */}
              <TouchableOpacity
                style={[s.toggleBtn, { width: 26 }, p.offset > 0 && s.toggleBtnPlus]}
                onPress={() => updatePiece(p.id, { offset: -p.offset })}
              >
                <Text style={s.toggleText}>{p.offset > 0 ? '+' : '−'}</Text>
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
                  const sign = p.offset > 0 ? 1 : -1;
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
            {/* Condizione soglia — riga secondaria compatta */}
            <View style={s.condRow}>
              {(['always', 'no_soglia', 'with_soglia'] as const).map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[s.condChip, (p.condition ?? 'always') === cond && s.condChipActive]}
                  onPress={() => updatePiece(p.id, { condition: cond })}
                >
                  <Text style={[s.condChipText, (p.condition ?? 'always') === cond && s.condChipTextActive]}>
                    {cond === 'always' ? 'Sempre' : cond === 'no_soglia' ? 'Senza soglia' : 'Con soglia'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Aggiungi riga */}
        <TouchableOpacity style={s.addPieceBtn} onPress={addPiece}>
          <Text style={s.addPieceBtnText}>+ Aggiungi pezzo</Text>
        </TouchableOpacity>

        {/* Legenda */}
        <View style={s.legend}>
          <Text style={s.legendText}>
            Configurazione: <Text style={s.legendBold}>{leafLabel}</Text>{'\n'}
            Formula: <Text style={s.legendBold}>(Rif. ± mm) ÷ divisore</Text>{'\n'}
            Tocca +/− per cambiare il segno: blu = sottrai mm, arancio = aggiungi mm{'\n'}
            Rif. = punta corta L (larghezza) o H (altezza){'\n'}
            Ang.A = angolo lato sinistro/basso · Ang.B = angolo lato destro/alto{'\n'}
            Tocca l'angolo per passare da 45° a 90°{'\n\n'}
            <Text style={s.legendBold}>I 3 pulsanti grigi sotto ogni riga:</Text>{'\n'}
            <Text style={s.legendBold}>Sempre</Text> = il pezzo c'è sempre{'\n'}
            <Text style={s.legendBold}>Senza soglia</Text> = solo se la porta NON ha soglia ribassata (es. traverso inferiore telaio){'\n'}
            <Text style={s.legendBold}>Con soglia</Text> = solo se la porta HA soglia ribassata (es. soglia stessa)
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

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4, paddingHorizontal: 2 },
  headerCell: { fontSize: 9, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', textAlign: 'center' },

  pieceRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  cellInput:  { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDE3ED', paddingHorizontal: 4, paddingVertical: 8, fontSize: 12, color: '#1a2a3a', textAlign: 'center' },
  toggleBtn:     { backgroundColor: '#0c2d75', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtn90:   { backgroundColor: '#2E7D32' },
  toggleBtnPlus: { backgroundColor: '#B45309' },
  toggleText:    { color: '#fff', fontWeight: '800', fontSize: 11 },
  removeBtn:     { width: 24, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 20, color: '#DC2626', fontWeight: '700', lineHeight: 22 },

  condRow:          { flexDirection: 'row', gap: 5, marginTop: -3, marginBottom: 6, paddingLeft: 2 },
  condChip:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#DDE3ED', backgroundColor: '#F8FAFC' },
  condChipActive:   { borderColor: '#0c2d75', backgroundColor: '#EEF4FF' },
  condChipText:     { fontSize: 9, fontWeight: '700', color: '#aaa' },
  condChipTextActive: { color: '#0c2d75' },

  addPieceBtn:     { borderWidth: 1.5, borderColor: '#0c2d75', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  addPieceBtnText: { color: '#0c2d75', fontWeight: '700', fontSize: 14 },

  legend:     { backgroundColor: '#EEF4FF', borderRadius: 10, padding: 12, marginBottom: 20 },
  legendText: { fontSize: 11, color: '#555', lineHeight: 17 },
  legendBold: { fontWeight: '800', color: '#0c2d75' },

  saveBtn:       { backgroundColor: '#0c2d75', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  saveBtnText:   { color: '#fff', fontWeight: '900', fontSize: 16 },
  deleteBtn:     { borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
});

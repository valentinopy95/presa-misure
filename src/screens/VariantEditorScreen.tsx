import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import * as AppAlert from '../components/AppAlert';
import {
  CatalogPiece, CatalogVariant, PieceOp,
  getCatalogSeries, upsertCatalogVariant, deleteCatalogVariant,
} from '../storage/settings';
import { RootStackParamList } from '../types';
import TourModal, { TourStep } from '../components/TourModal';

const VARIANT_TOUR: TourStep[] = [
  { icon: '🪟', title: 'Variante per numero di ante', body: 'Ogni variante definisce i pezzi da tagliare per una finestra con 1, 2, 3 o 4 ante. La serie può avere più varianti, una per ogni configurazione.', spot: null },
  { icon: '📦', title: 'Sezioni Telaio / Anta / Fermavetro / Riporto', body: 'I pezzi sono divisi per categoria: Telaio (profilo fisso), Anta (profilo mobile), Fermavetro (solo se selezionato sull\'apertura) e Riporto (coprigiunto tra ante, solo per aperture con 2+ ante).', spot: null },
  { icon: '📐', title: 'Formula di calcolo', body: 'Per ogni pezzo scegli base (L/H), poi due operazioni in sequenza: Op1→Val1, Op2→Val2.\n\nEs. traverso: L − 48 ÷ 2 → (1334−48)÷2 = 643\nEs. fermavetro: L ÷ 2 − 5 → 1334÷2−5 = 662\n\nOgni operatore (+, −, ÷) si cambia toccando il pulsante colorato.', spot: null },
  { icon: '✂️', title: 'Angolo di taglio', body: 'Ang.A e Ang.B indicano l\'angolo di taglio alle due estremità del profilo: 45° per giunti a inglete (telaio e anta), 90° per tagli dritti (fermavetro, riporto).', spot: null },
  { icon: '🔁', title: 'Condizione soglia', body: '"Sempre" include il pezzo in tutti i casi. "Senza soglia" lo esclude se la porta ha soglia. "Con soglia" lo include solo se c\'è la soglia.', spot: null },
];

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VariantEditor'>;
type Route = RouteProp<RootStackParamList, 'VariantEditor'>;

type PieceCategory = 'telaio' | 'anta' | 'fermavetro' | 'riporto' | 'fascia_zoccolo' | 'lamella' | 'mezza_lamella' | 'posizionatore';

function emptyPiece(cat: PieceCategory, angle: 45 | 90 = 45): CatalogPiece {
  return { id: uuidv4(), name: '', quantity: 1, baseVar: 'L', offset: 0, divisor: 1, cutAngle1: angle, cutAngle2: angle, pieceCategory: cat, op1: '-', val1: 0, op2: '÷', val2: 1 };
}

// Converte pezzi vecchio formato (offset/divisor) in nuovo formato (op1/val1/op2/val2)
function migratePiece(p: CatalogPiece): CatalogPiece {
  if (p.op1 !== undefined) return p;
  const absOff = Math.abs(p.offset);
  const sign: PieceOp = p.offset >= 0 ? '+' : '-';
  if (p.divideFirst) return { ...p, op1: '÷', val1: p.divisor, op2: sign, val2: absOff };
  return { ...p, op1: sign, val1: absOff, op2: '÷', val2: p.divisor };
}

const OPS: PieceOp[] = ['+', '-', '÷'];
function nextOp(op: PieceOp): PieceOp { return OPS[(OPS.indexOf(op) + 1) % OPS.length]; }
function opColor(op: PieceOp): string {
  if (op === '+') return '#2E7D32';
  if (op === '-') return '#C62828';
  return '#0c2d75';
}

const SECTIONS: { cat: PieceCategory; label: string; color: string; bg: string; hint: string }[] = [
  { cat: 'telaio',     label: 'Telaio',     color: '#7B1FA2', bg: '#F3E5F5', hint: 'Profili del telaio fisso' },
  { cat: 'anta',       label: 'Anta',       color: '#0c2d75', bg: '#EEF4FF', hint: 'Profili dell\'anta mobile' },
  { cat: 'fermavetro', label: 'Fermavetro', color: '#1565C0', bg: '#E3F2FD', hint: 'Solo se l\'apertura ha fermavetro' },
  { cat: 'riporto',    label: 'Riporto',    color: '#2E7D32', bg: '#E8F5E9', hint: 'Coprigiunto tra ante (solo battente multiplo)' },
];

const EXTRA_SECTIONS: { cat: PieceCategory; label: string; color: string; bg: string; hint: string }[] = [
  { cat: 'fascia_zoccolo', label: 'Fascia / Zoccolo', color: '#E65100', bg: '#FFF3E0', hint: 'Profilo fascia o zoccolo (taglio 90°)' },
  { cat: 'lamella',        label: 'Lamella',           color: '#00838F', bg: '#E0F7FA', hint: 'Lamella veneziana (taglio 90°)' },
  { cat: 'mezza_lamella',  label: 'Mezza Lamella',     color: '#00695C', bg: '#E0F2F1', hint: 'Mezza lamella (taglio 90°)' },
  { cat: 'posizionatore',  label: 'Posizionatore',     color: '#546E7A', bg: '#ECEFF1', hint: 'Posizionatore lamella (taglio 90°)' },
];

type SubConditionKey = 'always' | 'con_battente' | 'senza_battente' | 'with_soglia';
interface SubSec { key: SubConditionKey; label: string }

const SUB_SECTIONS: Partial<Record<string, { telaio: SubSec[]; anta: SubSec[] }>> = {
  porta_fredda: {
    telaio: [
      { key: 'con_battente',   label: 'Con battente' },
      { key: 'senza_battente', label: 'Senza battente' },
      { key: 'with_soglia',    label: 'Soglia ribassata' },
    ],
    anta: [
      { key: 'con_battente',   label: 'Con battente' },
      { key: 'senza_battente', label: 'Senza battente' },
      { key: 'with_soglia',    label: 'Soglia ribassata' },
    ],
  },
  porta_termica: {
    telaio: [
      { key: 'always',      label: 'Standard' },
      { key: 'with_soglia', label: 'Soglia ribassata' },
    ],
    anta: [
      { key: 'always',      label: 'Standard' },
      { key: 'with_soglia', label: 'Soglia ribassata' },
    ],
  },
};

export default function VariantEditorScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { seriesId, variantId, leafCount: paramLeafCount } = route.params;

  const [leafCount,       setLeafCount]       = useState<number>(paramLeafCount ?? 1);
  const [pieces,          setPieces]          = useState<CatalogPiece[]>([emptyPiece('anta')]);
  const [telaiOffset,     setTelaiOffset]     = useState<number>(0);
  const [articleCodes,    setArticleCodes]    = useState<Partial<Record<PieceCategory, string>>>({});
  const [saving,          setSaving]          = useState(false);
  const [tourVisible,     setTourVisible]     = useState(false);
  const [seriesName,      setSeriesName]      = useState<string>('');
  const [seriesType,      setSeriesType]      = useState<NonNullable<import('../storage/settings').CatalogSeries['seriesType']>>([]);
  const [openSections,    setOpenSections]    = useState<Set<PieceCategory>>(new Set());
  const [openSubSections, setOpenSubSections] = useState<Set<string>>(new Set());

  const toggleSection = (cat: PieceCategory) =>
    setOpenSections(prev => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s; });

  const toggleSubSection = (key: string) =>
    setOpenSubSections(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  // ID stabile: usa variantId dai params o genera uno nuovo UNA SOLA VOLTA
  const effectiveId = useRef<string>(variantId ?? uuidv4());

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
    if (seriesName) {
      navigation.setOptions({ title: `${seriesName} · ${leafCount} ant${leafCount === 1 ? 'a' : 'e'}` });
    }
  }, [seriesName, leafCount, navigation]);

  useEffect(() => {
    getCatalogSeries().then(list => {
      const s = list.find(x => x.id === seriesId);
      if (s) { setSeriesName(s.name); setSeriesType(s.seriesType ?? []); }
    });
  }, [seriesId]);

  useEffect(() => {
    if (!variantId) return;
    getCatalogSeries().then(list => {
      const s = list.find(x => x.id === seriesId);
      const v = s?.variants.find(x => x.id === variantId);
      if (v) {
        setLeafCount(v.leafCount);
        setTelaiOffset(v.telaiOffset ?? 0);
        setArticleCodes(v.articleCodes ?? {});
        const migrated = v.pieces
          .map(p => ({ ...p, pieceCategory: p.pieceCategory ?? 'anta' as PieceCategory }))
          .map(migratePiece);
        setPieces(migrated.length ? migrated : [emptyPiece('anta')]);
        // Auto-apri le sezioni che hanno già pezzi
        const catsWithPieces = new Set(migrated.map(p => (p.pieceCategory ?? 'anta') as PieceCategory));
        setOpenSections(catsWithPieces);
        // Auto-apri le sotto-sezioni che hanno già pezzi
        const subKeys = new Set(migrated
          .filter(p => (p.pieceCategory ?? 'anta') === 'telaio' || (p.pieceCategory ?? 'anta') === 'anta')
          .map(p => `${p.pieceCategory ?? 'anta'}|${p.condition ?? 'always'}`));
        setOpenSubSections(subKeys);
      }
    });
  }, [variantId, seriesId]);

  const updatePiece = (id: string, patch: Partial<CatalogPiece>) =>
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const addPiece   = (cat: PieceCategory) => setPieces(prev => [...prev, emptyPiece(cat, 45)]);
  const addPiece90 = (cat: PieceCategory) => setPieces(prev => [...prev, emptyPiece(cat, 90)]);
  const addPieceWithCondition = (cat: PieceCategory, condition: CatalogPiece['condition']) =>
    setPieces(prev => [...prev, { ...emptyPiece(cat, 45), condition }]);

  const removePiece = (id: string) =>
    setPieces(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));

  const saveVariant = async () => {
    const variant: CatalogVariant = {
      id:           effectiveId.current,
      leafCount,
      pieces:       pieces.filter(p => p.quantity >= 1),
      telaiOffset,
      articleCodes,
    };
    await upsertCatalogVariant(seriesId, variant);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveVariant();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  // Auto-salva quando si esce con il tasto indietro
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      saveVariant().catch(() => {});
    });
    return unsub;
  }, [leafCount, pieces, telaiOffset, articleCodes]);

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

  const renderPieceRow = (p: CatalogPiece, sectionColor: string) => {
    const isTelaio = (p.pieceCategory ?? 'anta') === 'telaio';
    const typeLabel = p.baseVar === 'L' ? 'Traverso' : 'Montante';
    const typeColor = p.baseVar === 'L' ? '#1565C0' : '#2E7D32';
    const typeBg    = p.baseVar === 'L' ? '#E3F2FD' : '#E8F5E9';
    return (
    <View key={p.id}>
      {/* Leggenda pezzo */}
      <View style={s.pieceLegendRow}>
        <View style={[s.pieceTypeBadge, { backgroundColor: typeBg, borderColor: typeColor }]}>
          <Text style={[s.pieceTypeTxt, { color: typeColor }]}>
            {p.baseVar === 'L' ? '↔' : '↕'} {typeLabel}
          </Text>
        </View>
        <TextInput
          style={[s.pieceNameInput, { borderColor: sectionColor + '60', flex: 1 }]}
          placeholder={`Nome (es. ${typeLabel} telaio)`}
          placeholderTextColor="#ccc"
          value={p.name}
          onChangeText={v => updatePiece(p.id, { name: v })}
          autoCapitalize="none"
        />
      </View>
      {/* Header colonne */}
      <View style={s.pieceHeaderRow}>
        <Text style={[s.pieceHdrCell, { width: 36 }]}>Qtà</Text>
        <Text style={[s.pieceHdrCell, { width: 36 }]}>L/H</Text>
        <Text style={[s.pieceHdrCell, { width: 26 }]}>Op1</Text>
        <Text style={[s.pieceHdrCell, { width: 34 }]}>Val1</Text>
        <Text style={[s.pieceHdrCell, { width: 26 }]}>Op2</Text>
        <Text style={[s.pieceHdrCell, { width: 30 }]}>Val2</Text>
        <Text style={[s.pieceHdrCell, { width: 58 }]}>Taglio</Text>
        <Text style={[s.pieceHdrCell, { width: 24 }]}></Text>
      </View>
      <View style={s.pieceRow}>
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
        {/* Op 1 */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 26, backgroundColor: opColor(p.op1 ?? '-') }]}
          onPress={() => updatePiece(p.id, { op1: nextOp(p.op1 ?? '-') })}
        >
          <Text style={s.toggleText}>{p.op1 ?? '-'}</Text>
        </TouchableOpacity>
        {/* Val 1 */}
        <TextInput
          style={[s.cellInput, { width: 34 }]}
          keyboardType="decimal-pad"
          defaultValue={(!p.val1) ? '' : String(p.val1)}
          key={`v1-${p.id}-${p.op1}`}
          placeholder={(p.op1 ?? '-') === '÷' ? '2' : '0'}
          placeholderTextColor="#ccc"
          selectTextOnFocus
          onEndEditing={e => {
            const clean = e.nativeEvent.text.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            updatePiece(p.id, { val1: parseFloat(clean) || 0 });
          }}
        />
        {/* Op 2 */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 26, backgroundColor: opColor(p.op2 ?? '÷') }]}
          onPress={() => updatePiece(p.id, { op2: nextOp(p.op2 ?? '÷') })}
        >
          <Text style={s.toggleText}>{p.op2 ?? '÷'}</Text>
        </TouchableOpacity>
        {/* Val 2 */}
        <TextInput
          style={[s.cellInput, { width: 30 }]}
          keyboardType="decimal-pad"
          defaultValue={p.val2 === 1 || !p.val2 ? '' : String(p.val2)}
          key={`v2-${p.id}-${p.op2}`}
          placeholder={(p.op2 ?? '÷') === '÷' ? '2' : '0'}
          placeholderTextColor="#ccc"
          selectTextOnFocus
          onEndEditing={e => {
            const clean = e.nativeEvent.text.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            updatePiece(p.id, { val2: parseFloat(clean) || 1 });
          }}
        />
        {/* Tipo taglio: cicla 45/45 → 45/90 → 90/90 */}
        <TouchableOpacity
          style={[s.toggleBtn, { width: 58 },
            (p.cutAngle1 === 90 || p.cutAngle2 === 90) && s.toggleBtn90]}
          onPress={() => {
            if (p.cutAngle1 === 45 && p.cutAngle2 === 45)
              updatePiece(p.id, { cutAngle1: 45, cutAngle2: 90 });
            else if (p.cutAngle1 === 45 && p.cutAngle2 === 90)
              updatePiece(p.id, { cutAngle1: 90, cutAngle2: 90 });
            else
              updatePiece(p.id, { cutAngle1: 45, cutAngle2: 45 });
          }}
        >
          <Text style={s.toggleText}>{p.cutAngle1}°/{p.cutAngle2}°</Text>
        </TouchableOpacity>
        {/* Rimuovi */}
        <TouchableOpacity style={s.removeBtn} onPress={() => removePiece(p.id)}>
          <Text style={s.removeBtnText}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={s.pieceDivider}/>
    </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TourModal visible={tourVisible} steps={VARIANT_TOUR} onClose={() => setTourVisible(false)}/>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Badge configurazione */}
        <View style={s.configBadge}>
          <Text style={s.configBadgeNum}>{leafCount}</Text>
          <Text style={s.configBadgeLabel}>{leafCount === 1 ? 'anta' : 'ante'}</Text>
        </View>

        {/* Intestazione colonne globale */}
        <View style={[s.headerRow, { backgroundColor: '#EEF2F7', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 4 }]}>
          <Text style={[s.headerCell, { width: 36 }]}>Qtà{'\n'}pezzi</Text>
          <Text style={[s.headerCell, { width: 36 }]}>L/H{'\n'}base</Text>
          <Text style={[s.headerCell, { width: 26 }]}>Op1</Text>
          <Text style={[s.headerCell, { width: 34 }]}>Val1{'\n'}(mm)</Text>
          <Text style={[s.headerCell, { width: 26 }]}>Op2</Text>
          <Text style={[s.headerCell, { width: 30 }]}>Val2</Text>
          <Text style={[s.headerCell, { width: 58 }]}>Taglio</Text>
          <Text style={[s.headerCell, { width: 24 }]}></Text>
        </View>

        {/* Sezioni per categoria — tutte a tendina */}
        {[...SECTIONS, ...EXTRA_SECTIONS].map(sec => {
          const secPieces = pieces.filter(p => (p.pieceCategory ?? 'anta') === sec.cat);
          const isOpen    = openSections.has(sec.cat);
          const isExtra   = ['fascia_zoccolo','lamella','mezza_lamella','posizionatore'].includes(sec.cat);
          return (
            <View key={sec.cat} style={[s.section, { borderColor: sec.color }]}>
              {/* Header accordion */}
              <TouchableOpacity
                style={[s.sectionHeader, { backgroundColor: sec.bg }]}
                onPress={() => toggleSection(sec.cat)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: sec.color }]}>{sec.label.toUpperCase()}</Text>
                  {!isOpen && <Text style={[s.sectionHint, { color: sec.color }]}>{sec.hint}</Text>}
                </View>
                {secPieces.length > 0 && (
                  <View style={[s.piecesCountBadge, { backgroundColor: sec.color }]}>
                    <Text style={s.piecesCountText}>{secPieces.length}</Text>
                  </View>
                )}
                <Text style={[s.sectionArrow, { color: sec.color }]}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Body: visibile solo se aperto */}
              {isOpen && (
                <View style={s.sectionBody}>
                  <View style={s.articleRowInline}>
                    <Text style={[s.articleLabel, { color: sec.color }]}>Articolo</Text>
                    <TextInput
                      style={[s.articleInput, { borderColor: sec.color }]}
                      placeholder="cod. articolo"
                      placeholderTextColor={sec.color + '88'}
                      value={articleCodes[sec.cat] ?? ''}
                      onChangeText={v => setArticleCodes(prev => ({ ...prev, [sec.cat]: v }))}
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* Sotto-sezioni fisse (telaio/anta per porta) */}
                  {(() => {
                    // Priorità: porta_fredda > porta_termica > resto (più sotto-sezioni vince)
                    const PRIORITY = ['porta_fredda', 'porta_termica'];
                    const activeType = PRIORITY.find(t => seriesType.includes(t)) ?? seriesType[0];
                    const subSecs = activeType ? SUB_SECTIONS[activeType]?.[sec.cat as 'telaio' | 'anta'] : undefined;
                    if (!subSecs) {
                      // Nessuna sotto-sezione: rendering diretto
                      return (
                        <>
                          {secPieces.length === 0 && <Text style={s.emptyHint}>Nessun pezzo — premi + per aggiungere</Text>}
                          {secPieces.map(p => renderPieceRow(p, sec.color))}
                          <TouchableOpacity
                            style={[s.addPieceBtn, { borderColor: sec.color }]}
                            onPress={() => isExtra ? addPiece90(sec.cat) : addPiece(sec.cat)}
                          >
                            <Text style={[s.addPieceBtnText, { color: sec.color }]}>+ Aggiungi {sec.label.toLowerCase()}</Text>
                          </TouchableOpacity>
                        </>
                      );
                    }
                    // Con sotto-sezioni
                    return subSecs.map(sub => {
                      const subKey     = `${sec.cat}|${sub.key}`;
                      const isSubOpen  = openSubSections.has(subKey);
                      const subPieces  = secPieces.filter(p => (p.condition ?? 'always') === sub.key);
                      return (
                        <View key={sub.key} style={s.subSection}>
                          <TouchableOpacity
                            style={[s.subHeader, { borderLeftColor: sec.color }]}
                            onPress={() => toggleSubSection(subKey)}
                            activeOpacity={0.75}
                          >
                            <Text style={[s.subTitle, { color: sec.color }]}>{sub.label.toUpperCase()}</Text>
                            {subPieces.length > 0 && (
                              <View style={[s.piecesCountBadge, { backgroundColor: sec.color }]}>
                                <Text style={s.piecesCountText}>{subPieces.length}</Text>
                              </View>
                            )}
                            <Text style={[s.sectionArrow, { color: sec.color }]}>{isSubOpen ? '▲' : '▼'}</Text>
                          </TouchableOpacity>
                          {isSubOpen && (
                            <View style={s.subBody}>
                              {subPieces.length === 0 && <Text style={s.emptyHint}>Nessun pezzo — premi + per aggiungere</Text>}
                              {subPieces.map(p => renderPieceRow(p, sec.color))}
                              <TouchableOpacity
                                style={[s.addPieceBtn, { borderColor: sec.color }]}
                                onPress={() => addPieceWithCondition(sec.cat, sub.key)}
                              >
                                <Text style={[s.addPieceBtnText, { color: sec.color }]}>+ Aggiungi pezzo</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
            </View>
          );
        })}

        {/* Legenda formula */}
        <View style={s.legend}>
          <Text style={s.legendText}>
            Formula: <Text style={s.legendBold}>base Op1 Val1 Op2 Val2</Text>{'\n'}
            Es: L − 48 ÷ 2 = (1334−48)÷2 = 643{'\n'}
            Es: L ÷ 2 − 5 = 1334÷2−5 = 662{'\n'}
            <Text style={{ color: '#2E7D32' }}>+</Text> aggiunge · <Text style={{ color: '#C62828' }}>−</Text> sottrae · <Text style={{ color: '#0c2d75' }}>÷</Text> divide
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

  telaiCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', borderRadius: 12, padding: 12, marginBottom: 16, gap: 12, borderWidth: 1.5, borderColor: '#CE93D8' },
  telaiLabel:     { fontSize: 10, fontWeight: '900', color: '#7B1FA2', letterSpacing: 1, marginBottom: 3 },
  telaiHint:      { fontSize: 10, color: '#9C27B0', lineHeight: 15 },
  telaiInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  telaiInput:     { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, borderColor: '#CE93D8', width: 56, paddingVertical: 8, paddingHorizontal: 6, fontSize: 16, fontWeight: '800', color: '#7B1FA2', textAlign: 'center' },
  telaiUnit:      { fontSize: 12, fontWeight: '700', color: '#7B1FA2' },

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
  sectionHint:  { fontSize: 10, fontWeight: '500', opacity: 0.7, marginTop: 2 },
  sectionBody:  { padding: 10 },

  articleWrap:       { alignItems: 'flex-end', gap: 2 },
  articleRowInline:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  articleLabel:      { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, opacity: 0.75 },
  articleInput:      { backgroundColor: '#fff', borderRadius: 7, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '700', textAlign: 'center', minWidth: 90, maxWidth: 110 },
  sectionArrow:      { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  piecesCountBadge:  { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 4 },
  piecesCountText:   { fontSize: 11, fontWeight: '900', color: '#fff' },

  subSection: { marginBottom: 6 },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, paddingRight: 6,
    backgroundColor: '#F7F9FC', borderRadius: 8,
  },
  subTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, flex: 1, textTransform: 'uppercase' },
  subBody:  { paddingLeft: 8, paddingTop: 6 },

  divSymbol:  { fontSize: 13, fontWeight: '900', color: '#888', width: 14, textAlign: 'center' },
  emptyHint:    { fontSize: 11, color: '#aaa', textAlign: 'center', paddingVertical: 8 },

  pieceRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  cellInput:  { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDE3ED', paddingHorizontal: 4, paddingVertical: 8, fontSize: 12, color: '#1a2a3a', textAlign: 'center' },
  toggleBtn:      { backgroundColor: '#0c2d75', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtn90:    { backgroundColor: '#2E7D32' },
  toggleBtnPlus:  { backgroundColor: '#2E7D32' },
  toggleBtnMinus: { backgroundColor: '#C62828' },
  toggleText:    { color: '#fff', fontWeight: '800', fontSize: 11 },
  removeBtn:     { width: 24, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 20, color: '#DC2626', fontWeight: '700', lineHeight: 22 },

  condRow:        { flexDirection: 'row', gap: 5, marginTop: 1, marginBottom: 8, paddingLeft: 2 },
  condChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#DDE3ED', backgroundColor: '#F8FAFC' },
  condChipText:   { fontSize: 9, fontWeight: '700', color: '#aaa' },

  pieceLegendRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, marginTop: 4 },
  pieceTypeBadge:  { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  pieceTypeTxt:    { fontSize: 10, fontWeight: '900' },
  pieceNameInput:  { backgroundColor: '#fff', borderRadius: 7, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, color: '#1a2a3a' },
  pieceHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2, paddingHorizontal: 2 },
  pieceHdrCell:    { fontSize: 8, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', textAlign: 'center' },
  pieceDivider:    { height: 1, backgroundColor: '#EEF2F7', marginVertical: 6 },

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

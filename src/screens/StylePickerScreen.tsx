import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, InteractionManager, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, OpeningStyle } from '../types';
import { getProject, saveOpening } from '../storage/database';
import { LiveDrawing } from '../components/drawings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StylePicker'>;
type Route = RouteProp<RootStackParamList, 'StylePicker'>;

interface StyleOption {
  value: OpeningStyle;
  label: string;
}

// Struttura ad albero: categoria → sub-gruppo → stili
interface SubGroup {
  label: string;
  color: string;
  items: StyleOption[];
}

interface CategoryGroup {
  label: string;
  color: string;
  subGroups: SubGroup[];
}

const GROUPS: CategoryGroup[] = [
  {
    label: 'Finestre',
    color: '#1565C0',
    subGroups: [
      {
        label: 'Taglio freddo',
        color: '#1565C0',
        items: [
          { value: 'window_fixed',     label: 'Fisso' },
          { value: 'window_single',    label: 'Battente' },
          { value: 'window_double',    label: 'Doppio battente' },
          { value: 'window_sliding',   label: 'Scorrevole' },
          { value: 'window_tilt_turn', label: 'Vasistas' },
        ],
      },
      {
        label: 'Taglio termico',
        color: '#0D47A1',
        items: [
          { value: 'window_fixed_t',     label: 'Fisso termico' },
          { value: 'window_single_t',    label: 'Battente termico' },
          { value: 'window_double_t',    label: 'Doppio battente termico' },
          { value: 'window_sliding_t',   label: 'Scorrevole termico' },
          { value: 'window_tilt_turn_t', label: 'Vasistas termico' },
        ],
      },
    ],
  },
  {
    label: 'Porte',
    color: '#6A1B9A',
    subGroups: [
      {
        label: 'Taglio freddo',
        color: '#6A1B9A',
        items: [
          { value: 'door_single',   label: 'Battente' },
          { value: 'door_entrance', label: 'Portoncino' },
          { value: 'door_sliding',  label: 'Scorrevole' },
        ],
      },
      {
        label: 'Taglio termico',
        color: '#4A148C',
        items: [
          { value: 'door_single_t',   label: 'Battente termico' },
          { value: 'door_entrance_t', label: 'Portoncino termico' },
          { value: 'door_sliding_t',  label: 'Scorrevole termico' },
        ],
      },
    ],
  },
  {
    label: 'Persiane',
    color: '#2E7D32',
    subGroups: [
      {
        label: 'Taglio freddo',
        color: '#2E7D32',
        items: [
          { value: 'shutter_single', label: 'Finestra' },
          { value: 'shutter_double', label: 'Portafinestra' },
        ],
      },
    ],
  },
  {
    label: 'Monoblocchi',
    color: '#E65100',
    subGroups: [
      {
        label: 'Con tapparella',
        color: '#E65100',
        items: [
          { value: 'roller_blind', label: 'Con tapparella' },
        ],
      },
    ],
  },
  {
    label: 'Controtelai',
    color: '#795548',
    subGroups: [
      {
        label: 'Controtelaio',
        color: '#795548',
        items: [
          { value: 'subframe_window', label: 'Controtelaio' },
        ],
      },
    ],
  },
  {
    label: 'Zanzariere',
    color: '#00838F',
    subGroups: [
      {
        label: 'Tipi',
        color: '#00838F',
        items: [
          { value: 'mosquito_fixed',   label: 'Fissa' },
          { value: 'mosquito_rollup',  label: 'Sali scendi' },
          { value: 'mosquito_lateral', label: 'Laterale' },
        ],
      },
    ],
  },
  {
    label: 'Altro',
    color: '#455A64',
    subGroups: [
      {
        label: 'Personalizzato',
        color: '#455A64',
        items: [
          { value: 'custom', label: 'Personalizzata' },
        ],
      },
    ],
  },
];

// Gruppi con un solo sub-gruppo non mostrano il sub-livello
const SINGLE_SUB = new Set(['Persiane', 'Monoblocchi', 'Controtelai', 'Zanzariere', 'Altro']);

const StyleCard = React.memo(({ option, color, onPress }: { option: StyleOption; color: string; onPress: () => void }) => {
  if (option.value === 'custom') {
    return (
      <TouchableOpacity style={styles.customCard} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.customCardIcon}>✏️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.customCardTitle}>Elemento personalizzato</Text>
          <Text style={styles.customCardDesc}>
            Per verande, box doccia, infissi fuori misura o qualsiasi elemento non presente nell'elenco.
          </Text>
        </View>
        <View style={[styles.customCardBtnWrap, { backgroundColor: color }]}>
          <Text style={styles.customCardBtn}>Seleziona</Text>
        </View>
      </TouchableOpacity>
    );
  }
  // Mappa stili termici al loro corrispettivo freddo per il disegno live
  const baseStyle = (option.value as string).replace(/_t$/, '') as OpeningStyle;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.drawingWrap}>
        <LiveDrawing style={baseStyle} previewMode previewSize={82} />
      </View>
      <Text style={styles.cardLabel}>{option.label}</Text>
    </TouchableOpacity>
  );
});

export default function StylePickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId, openingId } = route.params;
  const [ready, setReady] = useState(false);
  // Categorie aperte (livello 1)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  // Sub-gruppi aperti (livello 2) — chiave: "CatLabel|SubLabel"
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  const toggleCat = (label: string) =>
    setOpenCats(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });

  const toggleSub = (key: string) =>
    setOpenSubs(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const handleSelect = async (style: OpeningStyle) => {
    const project = await getProject(projectId);
    const opening = project?.openings.find(o => o.id === openingId);
    if (opening) {
      await saveOpening(projectId, { ...opening, style, updatedAt: new Date().toISOString() });
    }
    navigation.goBack();
  };

  if (!ready) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' }}>
      <ActivityIndicator size="large" color="#1565C0" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {GROUPS.map(group => {
        const isCatOpen = openCats.has(group.label);
        const isSingle  = SINGLE_SUB.has(group.label);
        return (
          <View key={group.label} style={styles.groupWrap}>
            {/* Livello 1 — categoria principale */}
            <TouchableOpacity
              style={[styles.catHeader, { borderLeftColor: group.color }]}
              onPress={() => toggleCat(group.label)}
              activeOpacity={0.75}
            >
              <Text style={[styles.catTitle, { color: group.color }]}>{group.label.toUpperCase()}</Text>
              <Text style={[styles.catArrow, { color: group.color }]}>{isCatOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isCatOpen && (
              <View style={styles.catBody}>
                {isSingle ? (
                  // Categorie semplici: griglia diretta senza sub-tendina
                  <View style={styles.grid}>
                    {group.subGroups[0].items.map(option => (
                      <StyleCard
                        key={option.value}
                        option={option}
                        color={group.color}
                        onPress={() => handleSelect(option.value)}
                      />
                    ))}
                  </View>
                ) : (
                  // Finestre e Porte: due sub-tendine freddo/termico
                  group.subGroups.map(sub => {
                    const subKey   = `${group.label}|${sub.label}`;
                    const isSubOpen = openSubs.has(subKey);
                    return (
                      <View key={sub.label} style={styles.subWrap}>
                        <TouchableOpacity
                          style={[styles.subHeader, { borderLeftColor: sub.color }]}
                          onPress={() => toggleSub(subKey)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.subTitle, { color: sub.color }]}>{sub.label}</Text>
                          <Text style={[styles.subArrow, { color: sub.color }]}>{isSubOpen ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {isSubOpen && (
                          <View style={styles.grid}>
                            {sub.items.map(option => (
                              <StyleCard
                                key={option.value}
                                option={option}
                                color={sub.color}
                                onPress={() => handleSelect(option.value)}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 14, paddingBottom: 40 },

  groupWrap: { marginBottom: 8 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 13,
    paddingRight: 10,
    backgroundColor: '#fff', borderRadius: 12,
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  catTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  catArrow: { fontSize: 12, fontWeight: '700' },

  catBody: { marginTop: 6, paddingLeft: 4 },

  subWrap: { marginBottom: 6 },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 10, paddingRight: 10,
    backgroundColor: '#F7F9FC', borderRadius: 10,
  },
  subTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  subArrow: { fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8, paddingBottom: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 12, alignItems: 'center',
    width: '47.5%',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  drawingWrap: { width: 82, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '700', color: '#333', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },

  customCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '100%',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    borderWidth: 1.5, borderColor: '#DDE8F0',
  },
  customCardIcon:  { fontSize: 40 },
  customCardTitle: { fontSize: 15, fontWeight: '800', color: '#455A64', marginBottom: 4 },
  customCardDesc:  { fontSize: 12.5, color: '#7a8a9a', lineHeight: 18 },
  customCardBtnWrap: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginLeft: 4 },
  customCardBtn:   { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});

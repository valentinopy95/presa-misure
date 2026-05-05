import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, InteractionManager, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, OpeningStyle } from '../types';
import { getProject, saveOpening } from '../storage/database';
import { LiveDrawing } from '../components/drawings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StylePicker'>;
type Route = RouteProp<RootStackParamList, 'StylePicker'>;

type Category = 'Finestre' | 'Porte' | 'Persiane' | 'Monoblocchi' | 'Controtelai' | 'Zanzariere' | 'Altro';

interface StyleOption {
  value: OpeningStyle;
  label: string;
  category: Category;
}

const STYLES: StyleOption[] = [
  // Finestre
  { value: 'window_fixed',     label: 'Fisso',           category: 'Finestre'    },
  { value: 'window_single',    label: 'Battente',        category: 'Finestre'    },
  { value: 'window_sliding',   label: 'Scorrevole',      category: 'Finestre'    },
  { value: 'window_tilt_turn', label: 'Vasistas',        category: 'Finestre'    },
  // Porte
  { value: 'door_single',      label: 'Battente',        category: 'Porte'       },
  { value: 'door_entrance',    label: 'Portoncino',      category: 'Porte'       },
  { value: 'door_sliding',     label: 'Scorrevole',      category: 'Porte'       },
  // Persiane
  { value: 'shutter_single',   label: 'Finestra',        category: 'Persiane'    },
  { value: 'shutter_double',   label: 'Portafinestra',   category: 'Persiane'    },
  // Monoblocchi
  { value: 'roller_blind',     label: 'Con tapparella',  category: 'Monoblocchi' },
  // Controtelaio
  { value: 'subframe_window',  label: 'Controtelaio',    category: 'Controtelai' },
  // Zanzariere
  { value: 'mosquito_fixed',   label: 'Fissa',           category: 'Zanzariere'  },
  { value: 'mosquito_rollup',  label: 'Sali scendi',     category: 'Zanzariere'  },
  { value: 'mosquito_lateral', label: 'Laterale',        category: 'Zanzariere'  },
  // Personalizzata
  { value: 'custom',           label: 'Personalizzata',  category: 'Altro'       },
];

const CATEGORIES: Category[] = ['Finestre', 'Porte', 'Persiane', 'Monoblocchi', 'Controtelai', 'Zanzariere', 'Altro'];

const CATEGORY_COLORS: Record<Category, string> = {
  Finestre:    '#1565C0',
  Porte:       '#6A1B9A',
  Persiane:    '#2E7D32',
  Monoblocchi: '#E65100',
  Controtelai: '#795548',
  Zanzariere:  '#00838F',
  Altro:       '#455A64',
};

// Card con memo — LiveDrawing non si ridisegna se le props non cambiano
const StyleCard = React.memo(({ option, onPress }: { option: StyleOption; onPress: () => void }) => {
  if (option.value === 'custom') {
    return (
      <TouchableOpacity style={styles.customCard} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.customCardIcon}>✏️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.customCardTitle}>Elemento personalizzato</Text>
          <Text style={styles.customCardDesc}>
            Per verande, box doccia, infissi fuori misura o qualsiasi elemento non presente nell'elenco. Puoi disegnare uno schizzo a mano libera e aggiungere le misure che servono.
          </Text>
        </View>
        <View style={styles.customCardBtnWrap}>
          <Text style={styles.customCardBtn}>Seleziona</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.drawingWrap}>
        <LiveDrawing style={option.value} previewMode previewSize={82} />
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

  useEffect(() => {
    // Aspetta che l'animazione di navigazione finisca prima di renderizzare le SVG
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

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
      {CATEGORIES.map(cat => {
        const items = STYLES.filter(s => s.category === cat);
        if (items.length === 0) return null;
        return (
          <View key={cat}>
            <View style={[styles.categoryHeader, { borderLeftColor: CATEGORY_COLORS[cat] }]}>
              <Text style={[styles.sectionTitle, { color: CATEGORY_COLORS[cat] }]}>{cat}</Text>
            </View>
            <View style={styles.grid}>
              {items.map(option => (
                <StyleCard
                  key={option.value}
                  option={option}
                  onPress={() => handleSelect(option.value)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 16, paddingBottom: 32 },
  categoryHeader: {
    borderLeftWidth: 4, paddingLeft: 10,
    marginTop: 22, marginBottom: 12, marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 12, alignItems: 'center',
    width: '47.5%',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  drawingWrap: {
    width: 82,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12, fontWeight: '700', color: '#333', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // ── Custom card (larghezza piena) ──
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
  customCardBtnWrap: {
    backgroundColor: '#455A64', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start', marginLeft: 4,
  },
  customCardBtn: {
    color: '#fff', fontSize: 12, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
});

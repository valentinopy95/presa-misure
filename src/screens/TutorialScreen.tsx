import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, ViewToken, Image, ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { setTutorialShown } from '../storage/settings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tutorial'>;

const { width: SCREEN_W } = Dimensions.get('window');

interface Step {
  icon?: string;
  image?: ImageSourcePropType;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    image: require('../../assets/principale.png'),
    title: 'Benvenuto in\nMisu',
    body: 'App professionale per serramentisti.\nRileva misure, gestisci aperture e calcola il materiale necessario per ogni commessa.',
  },
  {
    image: require('../../assets/menu_create.jpeg'),
    title: 'Crea un rilievo',
    body: 'Dalla schermata principale premi "Crea progetto misure".\nInserisci nome cliente, indirizzo e salva.\nOgni rilievo contiene tutte le aperture del cantiere.',
  },
  {
    image: require('../../assets/menu_saved.png'),
    title: 'Rilievi salvati',
    body: 'All\'interno del rilievo premi "+" per aggiungere un\'apertura.\nScegli la tipologia (finestra, porta, persiana…), inserisci larghezza e altezza e configura le opzioni aggiuntive.',
  },
  {
    icon: '📏',
    title: 'Misure luce e taglio',
    body: 'Inserisci sempre la misura in LUCE (rilevata sul posto).\nL\'app calcola automaticamente la misura di TAGLIO sottraendo la tolleranza configurata in Impostazioni.',
  },
  {
    icon: '⚙️',
    title: 'Opzioni apertura',
    body: 'Per ogni apertura puoi specificare:\n• Numero ante (1–4)\n• Sopraluce con altezza\n• Fermavetro\n• Soglia ribassata / Battente\n• Fascia\n• Note, foto e audio',
  },
  {
    image: require('../../assets/menu_materials.png'),
    title: 'Sviluppo materiale',
    body: 'Dal rilievo premi "Sviluppo materiale".\nL\'app calcola automaticamente il numero di barre necessarie per ogni profilo (telaio, anta, fermavetro, lamelle…) con l\'algoritmo di taglio ottimizzato.',
  },
  {
    image: require('../../assets/menu_cutting.png'),
    title: 'Distinta di taglio',
    body: 'La distinta mostra barra per barra come tagliare i profili.\nL\'algoritmo FFD assegna i pezzi più lunghi per primi, riducendo al minimo gli scarti.',
  },
  {
    icon: '📋',
    title: 'Serie catalogo',
    body: 'In Impostazioni crea le tue serie di profili con le formule di taglio per ogni numero di ante (1, 2, 3 o 4).\nAssegna la serie al progetto e l\'app seleziona la variante giusta, calcola ogni pezzo con precisione al mezzo millimetro e genera distinta e sviluppo personalizzati.',
  },
  {
    icon: '🛠️',
    title: 'Impostazioni',
    body: 'In Impostazioni puoi configurare:\n• Serie catalogo con varianti per numero ante\n• Tolleranze di taglio\n• Lunghezza barra\n• Kerf e riattestattura\n• Margine di sicurezza\n• Parametri persiane\n• Riduzioni anta e fermavetro',
  },
  {
    icon: '❓',
    title: 'Hai bisogno di aiuto?',
    body: 'Premi il pulsante "?" in alto a destra in qualsiasi schermata per riaprire la guida di quella sezione.\n\nBuon lavoro!',
  },
];

export default function TutorialScreen() {
  const navigation = useNavigation<Nav>();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrent(viewableItems[0].index ?? 0);
    }
  });
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const finish = async () => {
    await setTutorialShown();
    navigation.replace('Home');
  };

  const next = () => {
    if (current < STEPS.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      finish();
    }
  };

  const skip = () => finish();

  return (
    <View style={s.root}>
      <FlatList
        ref={flatRef}
        data={STEPS}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfig.current}
        renderItem={({ item }: { item: Step }) => (
          <View style={[s.slide, { width: SCREEN_W }]}>
            {item.image
              ? <Image source={item.image} style={s.slideImg} resizeMode="contain"/>
              : <Text style={s.icon}>{item.icon}</Text>}
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.dot, i === current && s.dotActive]}/>
        ))}
      </View>

      {/* Buttons */}
      <View style={s.btnRow}>
        {current < STEPS.length - 1 ? (
          <>
            <TouchableOpacity style={s.skipBtn} onPress={skip}>
              <Text style={s.skipText}>Salta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nextBtn} onPress={next}>
              <Text style={s.nextText}>Avanti →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={finish}>
            <Text style={s.nextText}>Inizia ad usare l'app</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#0c2d75' },
  slide:    {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, paddingBottom: 60,
  },
  slideImg: { width: 120, height: 120, marginBottom: 28, borderRadius: 24 },
  icon:     { fontSize: 72, marginBottom: 28 },
  title:    {
    fontSize: 26, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 20, lineHeight: 34,
  },
  body:     {
    fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 26,
  },
  dots:     { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:{ backgroundColor: '#fff', width: 22 },
  btnRow:   { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 40 },
  skipBtn:  {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  nextBtn:  {
    flex: 2, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  nextText: { color: '#0c2d75', fontSize: 15, fontWeight: '800' },
});

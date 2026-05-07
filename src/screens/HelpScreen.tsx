import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Section {
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: '📁',
    title: 'Rilievi',
    items: [
      {
        q: 'Come creo un nuovo rilievo?',
        a: 'Dalla schermata principale premi "Crea progetto misure". Inserisci il nome del rilievo, il nome del cliente, il telefono (opzionale) e l\'indirizzo del cantiere, poi premi "Crea".',
      },
      {
        q: 'Come apro un rilievo esistente?',
        a: 'Premi "Rilievi salvati" dalla schermata principale. Tutti i rilievi sono elencati in ordine di modifica. Tocca un rilievo per aprirlo.',
      },
      {
        q: 'Come elimino un rilievo?',
        a: 'Nell\'elenco dei rilievi salvati, scorri verso sinistra sulla riga del rilievo per visualizzare il pulsante di eliminazione.',
      },
    ],
  },
  {
    icon: '🪟',
    title: 'Aperture',
    items: [
      {
        q: 'Come aggiungo un\'apertura?',
        a: 'All\'interno di un rilievo premi il pulsante "Aggiungi" nella barra degli strumenti in alto. Seleziona prima la tipologia dell\'apertura, poi inserisci le misure e le opzioni.',
      },
      {
        q: 'Quali tipologie sono disponibili?',
        a: 'Finestre: battente, scorrevole, vasistas, fissa.\nPorte: singola, scorrevole, portoncino d\'ingresso.\nPersiane: singola, portafinestra.\nMonoblocco con tapparella.\nControtelaio.\nZanzariere: fissa, avvolgibile, laterale.\nPersonalizzata: per misure libere senza calcolo materiale.',
      },
      {
        q: 'Come modifico un\'apertura già inserita?',
        a: 'Nell\'elenco aperture del rilievo, tocca l\'apertura per aprirla in modifica. Tutte le modifiche vengono salvate automaticamente.',
      },
      {
        q: 'Come elimino un\'apertura?',
        a: 'Nell\'elenco aperture, scorri verso sinistra sull\'apertura per visualizzare il pulsante di eliminazione.',
      },
    ],
  },
  {
    icon: '📏',
    title: 'Misure',
    items: [
      {
        q: 'Misura in luce o in taglio?',
        a: 'Inserisci sempre la misura in LUCE (quella rilevata sul posto con il metro). L\'app calcola automaticamente la misura di TAGLIO sottraendo la tolleranza configurata in Impostazioni.',
      },
      {
        q: 'Cos\'è la tolleranza di taglio?',
        a: 'La tolleranza (configurabile in Impostazioni) è la riduzione applicata alla misura luce per ottenere la misura di taglio del telaio. Di default è 0 mm.',
      },
      {
        q: 'Cos\'è il sopraluce?',
        a: 'Il sopraluce è un pannello fisso posizionato sopra l\'apertura principale. Attivalo con l\'apposita opzione e inserisci la sua altezza in mm. Il calcolo del materiale terrà conto del traverso e del fermavetro del sopraluce separatamente.',
      },
    ],
  },
  {
    icon: '⚙️',
    title: 'Opzioni apertura',
    items: [
      {
        q: 'A cosa serve il numero di ante?',
        a: 'Specifica quante ante (ante apribili) ha l\'apertura. L\'app dividerà la larghezza totale per il numero di ante per calcolare le dimensioni dei profili anta.',
      },
      {
        q: 'Cos\'è il fermavetro?',
        a: 'Il fermavetro è il profilo che trattiene il vetro nell\'anta. Abilitando l\'opzione, l\'app aggiungerà 4 pezzi di fermavetro per ogni anta nel calcolo del materiale.',
      },
      {
        q: 'Cos\'è la soglia ribassata?',
        a: 'La soglia ribassata sostituisce il traverso inferiore del telaio porta con un profilo a 90° (soglia). Abilitandola, quel profilo verrà calcolato nella sezione "Taglio a 90°".',
      },
      {
        q: 'Cos\'è il battente?',
        a: 'Il battente (o traverso inferiore) è il profilo orizzontale inferiore del telaio porta. Se abilitato viene aggiunto un quarto pezzo al telaio. Per i controtelai corrisponde al 4° lato (traverso inferiore).',
      },
      {
        q: 'Cos\'è la fascia?',
        a: 'La fascia è il profilo centrale orizzontale delle porte doppie (divide le due ante a metà altezza). Viene aggiunta alla sezione "Taglio a 90°".',
      },
      {
        q: 'Cos\'è il lato vista (Interno/Esterno)?',
        a: 'Durante il rilievo puoi indicare da che lato stai misurando l\'apertura: Interno o Esterno. Questa info appare nel riepilogo del rilievo e nel PDF come etichetta colorata.',
      },
      {
        q: 'Come aggiungo note, foto e audio?',
        a: 'Nella schermata di rilievo scorri verso il basso. Trovi il campo testo per le note, il pulsante per scattare o allegare foto, e il pulsante per registrare una nota vocale. Foto e audio vengono salvati solo sul dispositivo.',
      },
    ],
  },
  {
    icon: '🔩',
    title: 'Sviluppo materiale',
    items: [
      {
        q: 'Come accedo al calcolo materiale?',
        a: 'Puoi accedere dallo sviluppo materiale: dalla schermata principale premi "Sviluppo materiale" e seleziona il rilievo, oppure dall\'interno del rilievo premi il pulsante "Sviluppo materiale".',
      },
      {
        q: 'Il calcolo usa la serie catalogo?',
        a: 'Sì. Se al progetto è assegnata una serie catalogo, le aperture idonee (finestre, porte, persiane) usano le formule della serie per calcolare ogni pezzo con precisione al mezzo millimetro. Gli altri elementi (zanzariere, monoblocchi, controtelai) usano il calcolo standard.',
      },
      {
        q: 'Cosa significano "Taglio a 45°" e "Taglio a 90°"?',
        a: 'I profili telaio e anta vengono tagliati a 45° agli angoli. I profili accessori (fermavetro, soglia, fascia, coppiglia, lamelle, zoccolo…) vengono tagliati a 90°. L\'app separa i due gruppi perché usano lame e attrezzature diverse.',
      },
      {
        q: 'Come vengono calcolate le barre?',
        a: 'L\'algoritmo First Fit Decreasing (FFD) ottimizza il taglio cercando di sprecare il meno possibile. I pezzi più lunghi vengono posizionati per primi. Al risultato viene applicato il margine di sicurezza configurato in Impostazioni.',
      },
      {
        q: 'Cosa sono gli "Avanzi riutilizzabili"?',
        a: 'Sono i pezzi di barra che rimangono dopo il taglio ottimizzato e che superano la lunghezza minima (500 mm). Possono essere conservati e usati per il prossimo progetto.',
      },
      {
        q: 'Cosa sono gli "Avvisi"?',
        a: 'Gli avvisi segnalano i pezzi che superano la lunghezza della barra configurata. Questi pezzi non possono essere tagliati da una singola barra standard e richiedono attenzione.',
      },
      {
        q: 'Cos\'è la coppiglia?',
        a: 'La coppiglia è il profilo guida superiore/inferiore delle finestre e porte scorrevoli. Ha la lunghezza dell\'anta ed è tagliata a 90°. Viene calcolata una coppiglia per ogni anta.',
      },
    ],
  },
  {
    icon: '📋',
    title: 'Serie catalogo',
    items: [
      {
        q: 'Cos\'è una serie catalogo?',
        a: 'Una serie catalogo è il tuo listino di taglio personalizzato: definisci ogni pezzo del telaio e dell\'anta (nome, formula di calcolo, angoli di taglio) e l\'app lo usa per generare la distinta e lo sviluppo con misure precise al mezzo millimetro.',
      },
      {
        q: 'Come creo una serie catalogo?',
        a: 'Vai in Impostazioni → Serie catalogo → "Nuova serie". Dai un nome alla serie (es. "Infisso termico 70mm"), poi premi "+ Aggiungi" per creare le varianti per numero di ante.',
      },
      {
        q: 'Cos\'è una variante?',
        a: 'Una variante è la tabella pezzi per un dato numero di ante (1, 2, 3 o 4). Ogni variante contiene i pezzi con le loro formule: riferimento (L = larghezza, H = altezza), offset in mm, divisore, angolo A e angolo B.\nL\'app seleziona automaticamente la variante più adatta in base al numero di ante dell\'apertura.',
      },
      {
        q: 'Come funziona la formula di taglio?',
        a: 'Formula: (Riferimento ± offset) ÷ divisore.\nEsempio: montante telaio con L − 10mm → (larghezza luce − tolleranza − 10) ÷ 1.\nPer un\'anta a 2 ante: L − 15mm ÷ 2 → (larghezza − 15) divisa per 2.\nI valori accettano il mezzo millimetro (es. 10,5 mm).',
      },
      {
        q: 'Come assegno una serie a un progetto?',
        a: 'Apri il progetto → premi il tasto modifica (matita) → seleziona la serie nel campo "Serie catalogo taglio". Puoi impostare una serie di default in Impostazioni, usata automaticamente sui nuovi progetti.',
      },
      {
        q: 'Cosa sono le condizioni Sempre / Senza soglia / Con soglia?',
        a: 'Ogni pezzo ha una condizione che decide quando viene incluso nel calcolo:\n• Sempre → il pezzo c\'è sempre\n• Senza soglia → solo se la porta NON ha soglia ribassata (es. traverso inferiore telaio)\n• Con soglia → solo se la porta HA soglia ribassata (es. profilo soglia)\nQuesto permette di avere una sola variante che si adatta automaticamente.',
      },
      {
        q: 'Quali aperture usano la serie catalogo?',
        a: 'La serie si applica a finestre (tranne fissa), porte e persiane. Zanzariere, monoblocchi con tapparella, controtelai e finestre fisse usano sempre il calcolo standard.',
      },
    ],
  },
  {
    icon: '🛠️',
    title: 'Impostazioni',
    items: [
      {
        q: 'Cos\'è la lunghezza barra?',
        a: 'La lunghezza in mm delle barre profilo che utilizzi (default 6400 mm). Il calcolo usa questa misura come capacità di ogni barra.',
      },
      {
        q: 'Cos\'è il kerf a 90°?',
        a: 'È lo spessore del disco da taglio usato per i tagli a 90°. Ogni taglio consuma questa quantità di materiale (default 4 mm).',
      },
      {
        q: 'Cos\'è la riattestattura?',
        a: 'È lo spreco tra due tagli a 45° sulla stessa barra, dovuto alla re-intestatura (riposizionamento della barra). Default 25 mm.',
      },
      {
        q: 'Cos\'è il margine di sicurezza?',
        a: 'Percentuale aggiuntiva applicata al conteggio delle barre per coprire errori di taglio e scarti. Default 5%. Esempio: 10 barre con margine 5% → 11 barre ordinate.',
      },
      {
        q: 'Cos\'è la riduzione anta?',
        a: 'Riduzione in mm applicata alle dimensioni dell\'anta rispetto al telaio (larghezza e altezza). Default 0. Utile quando i profili anta devono stare all\'interno del telaio con un preciso gioco.',
      },
      {
        q: 'Cos\'è la riduzione fermavetro?',
        a: 'Riduzione aggiuntiva in mm applicata al fermavetro rispetto all\'anta. Default 0. La riduzione è progressiva: se anta è ridotta di 10 mm e fermavetro di 5 mm, il fermavetro è 15 mm più piccolo del telaio.',
      },
      {
        q: 'Parametri persiane',
        a: 'Passo lamella: distanza tra le lamelle in mm (default 55 mm).\nAltezza zoccolo: profilo inferiore della persiana (default 120 mm).\nAltezza fascia: profilo superiore aggiuntivo per porta-finestra (default 120 mm).',
      },
      {
        q: 'Dove gestisco le serie catalogo?',
        a: 'In Impostazioni trovi la sezione "Serie catalogo". Puoi creare, modificare ed eliminare le serie. Per ogni serie puoi impostarla come "default", così verrà assegnata automaticamente ai nuovi progetti.',
      },
    ],
  },
  {
    icon: '📐',
    title: 'Persiane e monoblocchi',
    items: [
      {
        q: 'Come vengono calcolate le lamelle?',
        a: 'L\'app calcola l\'altezza netta (altezza luce − zoccolo − fascia se porta-finestra) e divide per il passo lamella. Il risultato arrotondato per difetto è il numero di lamelle per anta.',
      },
      {
        q: 'Cos\'è la mezza lamella e il posizionatore?',
        a: 'Mezza lamella e posizionatore sono profili di raccordo tra zoccolo/fascia e le lamelle complete. Le persiane semplici ne hanno 2 ciascuno, quelle porta-finestra ne hanno 4 ciascuno.',
      },
      {
        q: 'Come viene gestito il monoblocco con tapparella?',
        a: 'Il monoblocco (roller_blind) non contribuisce al calcolo del materiale profili. È presente come tipologia per documentare l\'apertura nel rilievo.',
      },
    ],
  },
  {
    icon: '📄',
    title: 'Esportazione PDF',
    items: [
      {
        q: 'Quanti tipi di PDF posso generare?',
        a: 'Tre tipi distinti:\n• Rilievo misure — elenco aperture con misure, note e foto\n• Sviluppo materiale — barre e profili da ordinare\n• Distinta di taglio — sequenza di taglio barra per barra',
      },
      {
        q: 'Come esporto i PDF dal rilievo?',
        a: 'Dall\'interno del rilievo premi il pulsante "PDF" nella barra degli strumenti. Apparirà un menù con i 3 tipi di PDF: per ognuno puoi scegliere "Condividi" (apre le app del dispositivo) oppure "Salva" (salva in una cartella a tua scelta).',
      },
      {
        q: 'Come esporto il PDF da Sviluppo materiale o Distinta taglio?',
        a: 'In entrambe le schermate trovi il pulsante "PDF" in alto a destra. Tocca per scegliere se condividere o salvare sul dispositivo il PDF relativo a quella schermata.',
      },
    ],
  },
];

export default function HelpScreen() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      <View style={s.intro}>
        <Text style={s.introTitle}>Guida all'uso</Text>
        <Text style={s.introSub}>
          Tutto quello che ti serve per usare l'app al meglio.
        </Text>
      </View>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secIcon}>{sec.icon}</Text>
            <Text style={s.secTitle}>{sec.title}</Text>
          </View>
          {sec.items.map((item, i) => (
            <View key={i} style={[s.item, i < sec.items.length - 1 && s.itemBorder]}>
              <Text style={s.question}>{item.q}</Text>
              <Text style={s.answer}>{item.a}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#F0F4F8' },
  content:  { padding: 16 },

  intro: {
    backgroundColor: '#0c2d75', borderRadius: 14,
    padding: 20, marginBottom: 16,
  },
  introTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  introSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20 },

  section: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E0E8F0',
    overflow: 'hidden', marginBottom: 14,
  },
  secHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E8F0',
  },
  secIcon:  { fontSize: 20, marginRight: 10 },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#0c2d75', letterSpacing: 0.3 },

  item: { paddingHorizontal: 14, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
  question: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 6, lineHeight: 18 },
  answer:   { fontSize: 13, color: '#555', lineHeight: 20 },
});

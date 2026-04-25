import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { supabase, createCompany, checkAndAcceptInvite, peekPendingInvite, Company } from '../lib/supabase';

type Step = 'choose' | 'create' | 'waiting';

interface Props {
  onComplete: () => Promise<void>;
}

export default function CompanySetupScreen({ onComplete }: Props) {
  const [step,         setStep]         = useState<Step>('choose');
  const [name,         setName]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [checking,     setChecking]     = useState(false);
  const [foundCompany, setFoundCompany] = useState<Company | null>(null);

  // Polling automatico ogni 10s quando si è in attesa di invito
  React.useEffect(() => {
    if (step !== 'waiting') return;
    const poll = async () => {
      const company = await peekPendingInvite();
      if (company) setFoundCompany(company);
    };
    poll(); // controllo immediato al cambio step
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [step]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Campo mancante', 'Inserisci il nome dell\'azienda.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const company = await createCompany(user.id, name.trim());
      if (company) {
        await onComplete();
      } else {
        Alert.alert('Errore', 'Impossibile creare l\'azienda. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInvite = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const company = await checkAndAcceptInvite(user.id);
      if (company) {
        await onComplete();
      } else {
        Alert.alert('Nessun invito trovato', 'Non hai ancora ricevuto un invito. Chiedi al titolare di invitarti tramite la tua email: ' + user.email);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}><Text style={s.logoText}>M</Text></View>
          <Text style={s.title}>La tua azienda</Text>
          <Text style={s.sub}>
            {step === 'choose'
              ? 'Crea una nuova azienda oppure attendi di essere invitato da un collega.'
              : step === 'create'
              ? 'Inserisci il nome della tua azienda. Potrai invitare i colleghi dalla sezione Account.'
              : 'Chiedi al titolare di invitarti usando la tua email. Quando l\'invito arriva, premi il pulsante qui sotto.'}
          </Text>
        </View>

        {/* Scelta */}
        {step === 'choose' && (
          <View style={s.choices}>
            <TouchableOpacity style={s.choiceCard} onPress={() => setStep('create')} activeOpacity={0.8}>
              <View style={[s.choiceIcon, { backgroundColor: '#EEF2FF' }]}>
                <Text style={s.choiceEmoji}>🏢</Text>
              </View>
              <View style={s.choiceBody}>
                <Text style={s.choiceTitle}>Crea azienda</Text>
                <Text style={s.choiceSub}>Sei il titolare o il primo del team</Text>
              </View>
              <Text style={s.choiceArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.choiceCard, s.choiceCardAlt]} onPress={() => setStep('waiting')} activeOpacity={0.8}>
              <View style={[s.choiceIcon, { backgroundColor: '#E8F5E9' }]}>
                <Text style={s.choiceEmoji}>✉️</Text>
              </View>
              <View style={s.choiceBody}>
                <Text style={s.choiceTitle}>Sono stato invitato</Text>
                <Text style={s.choiceSub}>Il titolare mi ha inviato un invito</Text>
              </View>
              <Text style={s.choiceArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Crea azienda */}
        {step === 'create' && (
          <View style={s.card}>
            <View style={s.inputWrap}>
              <Text style={s.label}>Nome azienda</Text>
              <TextInput
                style={s.input}
                placeholder="Es. Infissi Rossi Srl"
                placeholderTextColor="#aab"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={handleCreate} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>Crea azienda</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.back} onPress={() => setStep('choose')}>
              <Text style={s.backText}>← Indietro</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* In attesa di invito */}
        {step === 'waiting' && (
          <View style={s.card}>
            {foundCompany ? (
              <View style={s.waitingBox}>
                <Text style={s.waitingEmoji}>🎉</Text>
                <Text style={s.waitingTitle}>Invito ricevuto!</Text>
                <Text style={s.waitingText}>
                  Sei stato invitato ad unirti a{'\n'}
                </Text>
                <Text style={s.companyName}>{foundCompany.name}</Text>
              </View>
            ) : (
              <View style={s.waitingBox}>
                <Text style={s.waitingEmoji}>✉️</Text>
                <Text style={s.waitingTitle}>In attesa di invito</Text>
                <Text style={s.waitingText}>
                  Chiedi al titolare di invitarti dall'app tramite la tua email.{'\n'}
                  Controlliamo automaticamente ogni 10 secondi.
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.btnPrimary} onPress={handleCheckInvite} disabled={checking}>
              {checking
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>{foundCompany ? 'Accetta invito' : 'Controlla ora'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.back} onPress={() => { setStep('choose'); setFoundCompany(null); }}>
              <Text style={s.backText}>← Indietro</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.logout} onPress={() => supabase.auth.signOut({ scope: 'local' })}>
          <Text style={s.logoutText}>Esci dall'account</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#0c2d75';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },

  header:   { alignItems: 'center', marginBottom: 28 },
  logoBox:  { width: 56, height: 56, borderRadius: 16, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  title:    { fontSize: 22, fontWeight: '900', color: '#1a2a3a', marginBottom: 8 },
  sub:      { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },

  choices:       { gap: 12 },
  choiceCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  choiceCardAlt: { borderWidth: 1.5, borderColor: '#e0e7ff' },
  choiceIcon:    { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  choiceEmoji:   { fontSize: 22 },
  choiceBody:    { flex: 1 },
  choiceTitle:   { fontSize: 15, fontWeight: '800', color: '#1a2a3a' },
  choiceSub:     { fontSize: 12, color: '#888', marginTop: 2 },
  choiceArrow:   { fontSize: 22, color: '#ccc', fontWeight: '300' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },

  waitingBox:    { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  waitingEmoji:  { fontSize: 40, marginBottom: 12 },
  waitingTitle:  { fontSize: 16, fontWeight: '800', color: '#1a2a3a', marginBottom: 8 },
  waitingText:   { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },
  companyName:   { fontSize: 20, fontWeight: '900', color: BLUE, textAlign: 'center', marginTop: 4 },

  inputWrap: { marginBottom: 16 },
  label:     { fontSize: 11, fontWeight: '700', color: '#777', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderColor: '#DDE3ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a2a3a', backgroundColor: '#F8FAFC' },

  btnPrimary:     { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', elevation: 2, shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  back:     { marginTop: 16, alignItems: 'center' },
  backText: { color: BLUE, fontWeight: '700', fontSize: 13 },

  logout:     { marginTop: 32, alignItems: 'center' },
  logoutText: { color: '#bbb', fontSize: 12, fontWeight: '600' },
});

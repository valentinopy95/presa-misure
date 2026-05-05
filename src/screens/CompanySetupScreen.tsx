import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import * as AppAlert from '../components/AppAlert';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase, createCompany, checkAndAcceptInvite } from '../lib/supabase';
import { clearDbCache } from '../storage/database';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Step = 'choose' | 'create';

export default function CompanySetupScreen() {
  const navigation = useNavigation<Nav>();
  const [step,    setStep]    = useState<Step>('choose');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);

  const goHome = () => {
    clearDbCache();
    // Refresh sessione per aggiornare profile in AppContent
    supabase.auth.refreshSession().catch(() => {});
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      AppAlert.show('Campo mancante', 'Inserisci il nome dell\'azienda.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const company = await createCompany(user.id, name.trim());
      if (company) {
        goHome();
      } else {
        AppAlert.show('Errore', 'Impossibile creare l\'azienda. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <Text style={s.title}>La tua azienda</Text>
          <Text style={s.sub}>
            {step === 'choose'
              ? 'Crea una nuova azienda per iniziare a collaborare con il tuo team.'
              : 'Inserisci il nome della tua azienda. Potrai invitare i colleghi dalla sezione Account.'}
          </Text>
        </View>

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
          </View>
        )}

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

        <TouchableOpacity style={s.logout} onPress={() => supabase.auth.signOut({ scope: 'local' })}>
          <Text style={s.logoutText}>Esci dall'account</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#0c2d75';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center' },

  header: { alignItems: 'center', paddingTop: 64, paddingBottom: 32, paddingHorizontal: 28 },
  title:  { fontSize: 26, fontWeight: '900', color: BLUE, marginBottom: 10 },
  sub:    { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  choices:    { gap: 12, padding: 20 },
  choiceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, borderWidth: 1, borderColor: '#EEF2F7' },
  choiceIcon:  { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  choiceEmoji: { fontSize: 22 },
  choiceBody:  { flex: 1 },
  choiceTitle: { fontSize: 15, fontWeight: '800', color: BLUE },
  choiceSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  choiceArrow: { fontSize: 22, color: BLUE, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },

  inputWrap: { marginBottom: 16 },
  label:     { fontSize: 11, fontWeight: '700', color: '#777', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderColor: '#DDE3ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a2a3a', backgroundColor: '#F8FAFC' },

  btnPrimary:     { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', elevation: 2, shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  back:     { marginTop: 16, alignItems: 'center' },
  backText: { color: BLUE, fontWeight: '700', fontSize: 13 },

  logout:     { marginTop: 40, alignItems: 'center', marginBottom: 24 },
  logoutText: { color: '#bbb', fontSize: 12, fontWeight: '600' },
});

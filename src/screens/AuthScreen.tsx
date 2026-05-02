import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AppLogo from '../components/AppLogo';

const MASCOT = require('../../assets/principale.png');

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode,      setMode]      = useState<Mode>('login');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campi mancanti', 'Inserisci email e password.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Campi mancanti', 'Inserisci il tuo nome e cognome.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      Alert.alert('Password non corrispondenti', 'Le due password non coincidono.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) Alert.alert('Accesso non riuscito', error.message === 'Invalid login credentials'
          ? 'Email o password errati. Riprova.'
          : error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          Alert.alert('Registrazione non riuscita', error.message);
        } else {
          setEmailSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={s.root}>
        <View style={s.verifyContainer}>
          <View style={s.verifyIconBox}>
            <Image source={MASCOT} style={s.verifyIcon} resizeMode="contain"/>
          </View>
          <Text style={s.verifyTitle}>Controlla la tua email</Text>
          <Text style={s.verifySub}>
            Abbiamo inviato un link di conferma a{'\n'}
            <Text style={s.verifyEmail}>{email.trim()}</Text>
          </Text>
          <Text style={s.verifyNote}>
            Apri il link nell'email per attivare il tuo account, poi torna qui ad accedere.
          </Text>
          <TouchableOpacity style={s.verifyBtn} onPress={() => { setEmailSent(false); setMode('login'); setPassword(''); setConfirm(''); }}>
            <Text style={s.verifyBtnText}>Vai al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Titolo in alto */}
        <View style={s.header}>
          <Text style={s.appName}>Misu</Text>
          <Text style={s.appSub}>Gestione rilievi infissi</Text>
        </View>

        <View style={s.card}>
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, mode === 'login' && s.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Accedi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, mode === 'register' && s.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Registrati</Text>
            </TouchableOpacity>
          </View>

          <View style={s.form}>
            {mode === 'register' && (
              <View style={s.inputWrap}>
                <Text style={s.label}>Nome e cognome</Text>
                <TextInput
                  style={s.input}
                  placeholder="Mario Rossi"
                  placeholderTextColor="#aab"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={s.inputWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="mario@email.com"
                placeholderTextColor="#aab"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.inputWrap}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                placeholder="Minimo 6 caratteri"
                placeholderTextColor="#aab"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {mode === 'register' && (
              <View style={s.inputWrap}>
                <Text style={s.label}>Conferma password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ripeti la password"
                  placeholderTextColor="#aab"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                />
              </View>
            )}

            <TouchableOpacity style={s.btnPrimary} onPress={handleEmailAuth} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>{mode === 'login' ? 'Accedi' : 'Crea account'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Mascotte grande in basso */}
        <Image source={MASCOT} style={s.mascotBottom} resizeMode="contain"/>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#0c2d75';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 48 },

  header:    { alignItems: 'center', marginBottom: 28 },
  appName:   { fontSize: 36, fontWeight: '900', color: BLUE, letterSpacing: 0.5 },
  appSub:    { fontSize: 13, color: '#999', marginTop: 6 },
  mascotBottom: { width: 220, height: 220, alignSelf: 'center', marginTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },

  tabs:          { flexDirection: 'row', backgroundColor: '#F0F4F8' },
  tab:           { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:     { backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: BLUE },
  tabText:       { fontSize: 14, fontWeight: '700', color: '#aaa' },
  tabTextActive: { color: BLUE },

  form: { padding: 24 },

  inputWrap: { marginBottom: 14 },
  label:     { fontSize: 11, fontWeight: '700', color: '#777', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderColor: '#DDE3ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a2a3a', backgroundColor: '#F8FAFC' },

  btnPrimary:     { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, elevation: 2, shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  verifyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  verifyIconBox:   { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  verifyIcon:      { width: 140, height: 140 },
  verifyTitle:     { fontSize: 24, fontWeight: '900', color: BLUE, textAlign: 'center', marginBottom: 12 },
  verifySub:       { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  verifyEmail:     { fontWeight: '800', color: BLUE },
  verifyNote:      { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 36, paddingHorizontal: 8 },
  verifyBtn:       { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, elevation: 2, shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  verifyBtnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});

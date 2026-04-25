import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { Session } from '@supabase/supabase-js';

import { supabase, fetchProfile, checkAndAcceptInvite, Profile } from './src/lib/supabase';
import { migrateLocalToSupabase, clearDbCache } from './src/storage/database';
import { RootStackParamList } from './src/types';

import SplashScreen            from './src/screens/SplashScreen';
import AuthScreen              from './src/screens/AuthScreen';
import CompanySetupScreen      from './src/screens/CompanySetupScreen';
import HomeScreen              from './src/screens/HomeScreen';
import SavedProjectsScreen     from './src/screens/SavedProjectsScreen';
import CatalogScreen           from './src/screens/CatalogScreen';
import ProjectScreen           from './src/screens/ProjectScreen';
import MeasurementScreen       from './src/screens/MeasurementScreen';
import StylePickerScreen       from './src/screens/StylePickerScreen';
import DocumentScreen          from './src/screens/DocumentScreen';
import MaterialsScreen         from './src/screens/MaterialsScreen';
import MaterialsProjectsScreen from './src/screens/MaterialsProjectsScreen';
import SettingsScreen          from './src/screens/SettingsScreen';
import AccountScreen           from './src/screens/AccountScreen';
import DuplicateProjectScreen  from './src/screens/DuplicateProjectScreen';
import TutorialScreen          from './src/screens/TutorialScreen';
import HelpScreen              from './src/screens/HelpScreen';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

function HelpButton() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      onPress={() => nav.navigate('Help')}
      style={{ marginRight: 4, paddingHorizontal: 10, paddingVertical: 6 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>?</Text>
    </TouchableOpacity>
  );
}

function AppNavigator() {
  const helpRight = { headerRight: () => <HelpButton /> };
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0c2d75' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home"              component={HomeScreen}             options={{ headerShown: false }}/>
        <Stack.Screen name="SavedProjects"     component={SavedProjectsScreen}    options={{ title: 'Rilievi salvati', ...helpRight }}/>
        <Stack.Screen name="Catalog"           component={CatalogScreen}          options={{ title: 'Catalogo profili', ...helpRight }}/>
        <Stack.Screen name="Project"           component={ProjectScreen}          options={{ title: 'Progetto', ...helpRight }}/>
        <Stack.Screen name="Measurement"       component={MeasurementScreen}      options={({ route }) => ({ title: route.params.openingId ? 'Modifica apertura' : 'Nuova apertura', headerRight: () => <HelpButton /> })}/>
        <Stack.Screen name="StylePicker"       component={StylePickerScreen}      options={{ title: 'Seleziona tipologia', ...helpRight }}/>
        <Stack.Screen name="Document"          component={DocumentScreen}         options={{ title: 'Documento rilievo', ...helpRight }}/>
        <Stack.Screen name="Materials"         component={MaterialsScreen}        options={{ title: 'Calcolo materiale', ...helpRight }}/>
        <Stack.Screen name="MaterialsProjects" component={MaterialsProjectsScreen} options={{ title: 'Sviluppo materiale', ...helpRight }}/>
        <Stack.Screen name="Settings"          component={SettingsScreen}         options={{ title: 'Impostazioni', ...helpRight }}/>
        <Stack.Screen name="Account"           component={AccountScreen}          options={{ title: 'Account' }}/>
        <Stack.Screen name="DuplicateProject" component={DuplicateProjectScreen} options={{ title: 'Duplica progetto' }}/>
        <Stack.Screen name="Tutorial"          component={TutorialScreen}         options={{ headerShown: false }}/>
        <Stack.Screen name="Help"              component={HelpScreen}             options={{ title: 'Guida' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const [session,  setSession]  = useState<Session | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    // getUser() valida il JWT con il server (forza refresh se scaduto)
    // così la query RLS su profiles non fallisce mai per token stale
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); return; }

    let p = await fetchProfile(user.id);

    // Se l'utente è loggato ma senza azienda, controlla inviti pendenti
    if (p && !p.company_id) {
      await checkAndAcceptInvite(user.id);
      p = await fetchProfile(user.id); // ricarica dopo eventuale accettazione
    }

    // Non sovrascrivere un profilo valido con null a causa di errori di rete transienti.
    // Se fetchProfile restituisce null ma avevamo già un profilo con azienda, lo manteniamo.
    setProfile(prev => {
      if (p === null && prev?.company_id != null) return prev;
      return p;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadProfile(user.id);
  }, [loadProfile]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 10000);

    // Pattern Supabase v2: onAuthStateChange gestisce sia il caricamento iniziale
    // (evento INITIAL_SESSION) che i cambi successivi di sessione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        try { await loadProfile(session.user.id); } catch { /* mantieni profilo esistente su errori di rete */ }
      } else {
        setProfile(null);
        clearDbCache();
      }
      // INITIAL_SESSION è il primo evento: segna la fine del loading
      if (event === 'INITIAL_SESSION') {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, [loadProfile]);

  // Migrazione locale → Supabase (una tantum)
  useEffect(() => {
    if (session && profile?.company_id) {
      migrateLocalToSupabase();
    }
  }, [session, profile?.company_id]);

  if (loading) return <SplashScreen />;

  if (!session)             return <AuthScreen />;
  if (!profile?.company_id) return <CompanySetupScreen onComplete={refreshProfile} />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

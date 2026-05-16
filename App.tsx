import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { Session } from '@supabase/supabase-js';

import { supabase } from './src/lib/supabase';
import * as AppAlert from './src/components/AppAlert';
import { migrateLocalToSupabase, clearDbCache } from './src/storage/database';
import { migrateSeriesToSupabase, migrateSettingsToSupabase, loadSettingsFromCloud, clearSeriesCache } from './src/storage/settings';
import { migrateMagazzinoToSupabase } from './src/storage/magazzino';
import { migrateStatusToSupabase } from './src/storage/statusTracker';
import { RootStackParamList } from './src/types';

import SplashScreen            from './src/screens/SplashScreen';
import AuthScreen              from './src/screens/AuthScreen';
import CompanySetupScreen      from './src/screens/CompanySetupScreen';
import HomeScreen              from './src/screens/HomeScreen';

import SavedProjectsScreen     from './src/screens/SavedProjectsScreen';
import ProjectScreen           from './src/screens/ProjectScreen';
import MeasurementScreen       from './src/screens/MeasurementScreen';
import StylePickerScreen       from './src/screens/StylePickerScreen';
import DocumentScreen          from './src/screens/DocumentScreen';
import MaterialsScreen         from './src/screens/MaterialsScreen';
import MaterialsProjectsScreen from './src/screens/MaterialsProjectsScreen';
import SettingsScreen          from './src/screens/SettingsScreen';
import AccountScreen           from './src/screens/AccountScreen';
import DuplicateProjectScreen  from './src/screens/DuplicateProjectScreen';
import HelpScreen              from './src/screens/HelpScreen';
import StatsScreen             from './src/screens/StatsScreen';
import CuttingListScreen        from './src/screens/CuttingListScreen';
import CuttingProjectsScreen   from './src/screens/CuttingProjectsScreen';
import PaywallScreen           from './src/screens/PaywallScreen';
import SeriesEditorScreen      from './src/screens/SeriesEditorScreen';
import VariantEditorScreen     from './src/screens/VariantEditorScreen';
import MagazzinoScreen         from './src/screens/MagazzinoScreen';
import CatalogSeriesScreen     from './src/screens/CatalogSeriesScreen';
import DeliveryNoteScreen      from './src/screens/DeliveryNoteScreen';
import {
  SettingsTolleranzeScreen,
  SettingsParametriScreen,
  SettingsPrezziScreen,
  SettingsGenericoScreen,
} from './src/screens/SettingsSubScreens';
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
        <Stack.Screen name="Project"           component={ProjectScreen}          options={{ title: 'Progetto', ...helpRight }}/>
        <Stack.Screen name="Measurement"       component={MeasurementScreen}      options={({ route }) => ({ title: route.params.openingId ? 'Modifica apertura' : 'Nuova apertura', headerRight: () => <HelpButton /> })}/>
        <Stack.Screen name="StylePicker"       component={StylePickerScreen}      options={{ title: 'Seleziona tipologia', ...helpRight }}/>
        <Stack.Screen name="Document"          component={DocumentScreen}         options={{ title: 'Documento rilievo', ...helpRight }}/>
        <Stack.Screen name="Materials"         component={MaterialsScreen}        options={{ title: 'Calcolo materiale', ...helpRight }}/>
        <Stack.Screen name="MaterialsProjects" component={MaterialsProjectsScreen} options={{ title: 'Sviluppo materiale', ...helpRight }}/>
        <Stack.Screen name="Settings"          component={SettingsScreen}         options={{ title: 'Impostazioni', ...helpRight }}/>
        <Stack.Screen name="Account"           component={AccountScreen}          options={{ title: 'Account' }}/>
        <Stack.Screen name="DuplicateProject" component={DuplicateProjectScreen} options={{ title: 'Duplica progetto' }}/>
        <Stack.Screen name="Help"              component={HelpScreen}             options={{ title: 'Guida' }}/>
        <Stack.Screen name="Stats"             component={StatsScreen}            options={{ title: 'Statistiche' }}/>
        <Stack.Screen name="CuttingProjects"    component={CuttingProjectsScreen}  options={{ title: 'Distinta di taglio', ...helpRight }}/>
        <Stack.Screen name="CuttingList"       component={CuttingListScreen}      options={{ title: 'Distinta di taglio' }}/>
        <Stack.Screen name="CompanySetup"      component={CompanySetupScreen}     options={{ headerShown: false }}/>
        <Stack.Screen name="Paywall"           component={PaywallScreen}          options={{ title: 'Piano e abbonamento', presentation: 'modal' }}/>
        <Stack.Screen name="SeriesEditor"  component={SeriesEditorScreen}  options={({ route }) => ({ title: route.params?.seriesId ? 'Modifica serie' : 'Nuova serie' })}/>
        <Stack.Screen name="VariantEditor" component={VariantEditorScreen} options={({ route }) => ({ title: route.params?.variantId ? 'Modifica variante' : 'Nuova variante' })}/>
        <Stack.Screen name="SettingsTolleranze" component={SettingsTolleranzeScreen} options={{ title: 'Tolleranze' }}/>
        <Stack.Screen name="SettingsParametri"  component={SettingsParametriScreen}  options={{ title: 'Parametri barra' }}/>
        <Stack.Screen name="SettingsPrezzi"     component={SettingsPrezziScreen}     options={{ title: 'Prezzi al m²' }}/>
        <Stack.Screen name="SettingsGenerico"   component={SettingsGenericoScreen}   options={{ title: 'Calcolo generico' }}/>
        <Stack.Screen name="Magazzino"          component={MagazzinoScreen}          options={{ title: 'Magazzino avanzi' }}/>
        <Stack.Screen name="CatalogSeries"      component={CatalogSeriesScreen}      options={{ title: 'Serie catalogo' }}/>
        <Stack.Screen name="DeliveryNote"       component={DeliveryNoteScreen}       options={{ title: 'Bolla di consegna' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(timeout);
        setSession(session);
        setLoading(false);
        return;
      }
      setSession(session);
      if (!session) { clearDbCache(); clearSeriesCache(); }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  // Migrazione locale → Supabase + caricamento impostazioni dal cloud (al login)
  useEffect(() => {
    if (session) {
      migrateLocalToSupabase();
      migrateSeriesToSupabase();
      migrateMagazzinoToSupabase();
      migrateStatusToSupabase();
      // Prima migra le impostazioni locali, poi carica quelle del cloud
      migrateSettingsToSupabase().then(loadSettingsFromCloud);
    }
  }, [session]);

  if (loading) return <SplashScreen />;
  if (!session) return <AuthScreen />;
  return (
    <SubscriptionProvider>
      <AppNavigator />
    </SubscriptionProvider>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(state.isConnected === false);
    });
    return unsub;
  }, []);

  if (!offline) return null;
  return (
    <View style={ob.banner}>
      <Text style={ob.text}>⚠️  Nessuna connessione — alcune funzioni non sono disponibili</Text>
    </View>
  );
}

const ob = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    backgroundColor: '#B71C1C', paddingVertical: 8, paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <OfflineBanner />
      <AppAlert.Host />
    </ThemeProvider>
  );
}

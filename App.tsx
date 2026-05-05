import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { Session } from '@supabase/supabase-js';

import { supabase } from './src/lib/supabase';
import * as AppAlert from './src/components/AppAlert';
import { migrateLocalToSupabase, clearDbCache } from './src/storage/database';
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
      if (!session) clearDbCache();
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  // Migrazione locale → Supabase (una tantum al login)
  useEffect(() => {
    if (session) migrateLocalToSupabase();
  }, [session]);

  if (loading) return <SplashScreen />;
  if (!session) return <AuthScreen />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <AppAlert.Host />
    </ThemeProvider>
  );
}

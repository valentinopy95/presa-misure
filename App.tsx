import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import SavedProjectsScreen from './src/screens/SavedProjectsScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import MeasurementScreen from './src/screens/MeasurementScreen';
import StylePickerScreen from './src/screens/StylePickerScreen';
import DocumentScreen from './src/screens/DocumentScreen';
import MaterialsScreen from './src/screens/MaterialsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1565C0' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SavedProjects"
          component={SavedProjectsScreen}
          options={{ title: 'Rilievi salvati' }}
        />
        <Stack.Screen
          name="Catalog"
          component={CatalogScreen}
          options={{ title: 'Catalogo profili' }}
        />
        <Stack.Screen
          name="Project"
          component={ProjectScreen}
          options={{ title: 'Progetto' }}
        />
        <Stack.Screen
          name="Measurement"
          component={MeasurementScreen}
          options={({ route }) => ({
            title: route.params.openingId ? 'Modifica apertura' : 'Nuova apertura',
          })}
        />
        <Stack.Screen
          name="StylePicker"
          component={StylePickerScreen}
          options={{ title: 'Seleziona tipologia' }}
        />
        <Stack.Screen
          name="Document"
          component={DocumentScreen}
          options={{ title: 'Documento rilievo' }}
        />
        <Stack.Screen
          name="Materials"
          component={MaterialsScreen}
          options={{ title: 'Calcolo materiale' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Impostazioni' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

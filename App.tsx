import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TouchableOpacity, Text } from 'react-native';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import MeasurementScreen from './src/screens/MeasurementScreen';
import StylePickerScreen from './src/screens/StylePickerScreen';
import DocumentScreen from './src/screens/DocumentScreen';
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
          options={({ navigation }) => ({
            title: 'Presa Misure',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 4 }}>
                <Text style={{ color: '#fff', fontSize: 22 }}>⚙️</Text>
              </TouchableOpacity>
            ),
          })}
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
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Impostazioni' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

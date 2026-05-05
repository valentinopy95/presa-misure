/**
 * Custom alert that replaces React Native's Alert.alert with an app-styled modal.
 * Usage: AppAlert.show(title, message?, buttons?)  — same API as Alert.alert
 * Render <AppAlert.Host /> once at the app root.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible:  boolean;
  title:    string;
  message?: string;
  buttons:  AlertButton[];
}

let _trigger: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

/** Drop-in replacement for Alert.alert */
export function show(title: string, message?: string, buttons?: AlertButton[]) {
  _trigger?.(title, message, buttons);
}

const NAVY = '#0c2d75';

/** Render this once at the root of the app */
export function Host() {
  const [state, setState] = useState<AlertState>({
    visible: false, title: '', buttons: [],
  });

  useEffect(() => {
    _trigger = (title, message, buttons) => {
      setState({
        visible: true,
        title,
        message,
        buttons: buttons ?? [{ text: 'OK', style: 'default' }],
      });
    };
    return () => { _trigger = null; };
  }, []);

  const dismiss = (btn: AlertButton) => {
    setState(s => ({ ...s, visible: false }));
    // small delay so modal hides before callback
    setTimeout(() => btn.onPress?.(), 50);
  };

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setState(s => ({ ...s, visible: false }))}
    >
      <View style={s.backdrop}>
        <View style={s.box}>
          <Text style={s.title}>{state.title}</Text>
          {state.message ? <Text style={s.message}>{state.message}</Text> : null}

          <View style={[s.btnRow, state.buttons.length > 2 && s.btnCol]}>
            {state.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.btn,
                  state.buttons.length === 1 && s.btnFull,
                  btn.style === 'cancel'      && s.btnCancel,
                  btn.style === 'destructive' && s.btnDestructive,
                ]}
                onPress={() => dismiss(btn)}
                activeOpacity={0.8}
              >
                <Text style={[
                  s.btnText,
                  btn.style === 'cancel'      && s.btnTextCancel,
                  btn.style === 'destructive' && s.btnTextDestructive,
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  box: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  title:   { fontSize: 17, fontWeight: '900', color: NAVY, marginBottom: 6 },
  message: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 20 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnCol: { flexDirection: 'column' },

  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: NAVY,
  },
  btnFull:        { flex: undefined, width: '100%' },
  btnCancel:      { backgroundColor: '#F0F4F8' },
  btnDestructive: { backgroundColor: '#FEE2E2' },

  btnText:            { fontSize: 15, fontWeight: '800', color: '#fff' },
  btnTextCancel:      { color: '#555' },
  btnTextDestructive: { color: '#DC2626' },
});

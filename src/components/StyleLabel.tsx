import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OpeningStyle } from '../types';
import { LiveDrawing } from './drawings';

const LABELS: Record<OpeningStyle, string> = {
  window_single:        'Finestra singola',
  window_double:        'Finestra doppia',
  window_sliding:       'Finestra scorrevole',
  window_tilt_turn:     'Finestra vasistas',
  door_single:          'Porta singola',
  door_double:          'Porta doppia',
  door_sliding:         'Porta scorrevole',
  door_french:          'Porta finestra',
  door_bifold:          'Porta a libro',
  shutter_single:       'Persiana singola',
  shutter_double:       'Persiana doppia',
  roller_blind:         'Monoblocco tapparella',
  subframe_window:      'Controtelaio finestra',
};

interface Props {
  style: OpeningStyle;
  compact?: boolean;
}

export default function StyleLabel({ style, compact }: Props) {
  const label = LABELS[style] ?? style;
  const iconSize = compact ? 24 : 32;

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <LiveDrawing style={style} previewMode previewSize={iconSize} />
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start', gap: 8,
  },
  badgeCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  label: { fontSize: 14, color: '#1565C0', fontWeight: '600' },
  labelCompact: { fontSize: 12 },
});

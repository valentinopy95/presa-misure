import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Opening } from '../types';
import StyleLabel from './StyleLabel';

interface Props {
  opening: Opening;
  onPress: () => void;
  onDelete: () => void;
}

const formatDim = (v: number | null) => (v ? `${v}` : '—');

export default function OpeningCard({ opening, onPress, onDelete }: Props) {
  const hasDims = opening.width || opening.height;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Foto thumbnail se presente */}
      {opening.photos.length > 0 && (
        <Image source={{ uri: opening.photos[0].uri }} style={styles.thumb} />
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{opening.name}</Text>

        {hasDims && (
          <View style={styles.dims}>
            <Text style={styles.dim}>L: <Text style={styles.dimVal}>{formatDim(opening.width)}</Text> mm</Text>
            <Text style={styles.dimSep}>×</Text>
            <Text style={styles.dim}>H: <Text style={styles.dimVal}>{formatDim(opening.height)}</Text> mm</Text>
          </View>
        )}

        {opening.style && <StyleLabel style={opening.style} compact />}

        {(opening.profileSeries || opening.glassType) && (
          <View style={styles.specRow}>
            {opening.profileSeries && (
              <Text style={styles.specTag}>{opening.profileSeries}</Text>
            )}
            {opening.glassType && (
              <Text style={[styles.specTag, styles.specGlass]}>{opening.glassType}</Text>
            )}
          </View>
        )}

        <View style={styles.badges}>
          {opening.photos.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📷 {opening.photos.length}</Text>
            </View>
          )}
          {!!opening.textNote && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📝</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.delete}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden', elevation: 2,
  },
  thumb: { width: 80, height: 80, resizeMode: 'cover' },
  body: { flex: 1, padding: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  dims: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dim: { fontSize: 13, color: '#666' },
  dimVal: { fontWeight: '700', color: '#1565C0', fontSize: 15 },
  dimSep: { color: '#AAA', marginHorizontal: 6, fontSize: 13 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  specTag: {
    fontSize: 10, fontWeight: '600', color: '#555',
    backgroundColor: '#F0F0F0', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  specGlass: { backgroundColor: '#E3F2FD', color: '#1565C0' },

  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: {
    backgroundColor: '#F0F4FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { fontSize: 11, color: '#1565C0' },
  delete: { padding: 12, justifyContent: 'center' },
  deleteIcon: { fontSize: 18 },
});

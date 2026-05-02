import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Opening, OpeningStyle } from '../types';
import StyleLabel from './StyleLabel';

interface Props {
  opening: Opening;
  onPress: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const formatDim = (v: number | null) => (v ? `${v}` : '—');

function accentColor(style: OpeningStyle | null): string {
  if (!style) return '#90A4AE';
  if (style.startsWith('window'))   return '#1565C0';
  if (style.startsWith('door'))     return '#6A1B9A';
  if (style.startsWith('shutter'))  return '#2E7D32';
  if (style === 'roller_blind')     return '#E65100';
  if (style.startsWith('subframe')) return '#5D4037';
  if (style.startsWith('mosquito')) return '#00838F';
  return '#455A64';
}

export default function OpeningCard({ opening, onPress, onDelete, onDuplicate }: Props) {
  const hasDims = opening.width || opening.height;
  const color = accentColor(opening.style);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Left accent */}
      <View style={[styles.accent, { backgroundColor: color }]}/>

      {/* Photo thumbnail */}
      {opening.photos.length > 0 && (
        <Image source={{ uri: opening.photos[0].uri }} style={styles.thumb}/>
      )}

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{opening.name}</Text>

        {opening.style && (
          <View style={styles.styleRow}>
            <StyleLabel style={opening.style} compact/>
            <View style={styles.infoBadges}>
              {opening.leafCount != null && opening.leafCount > 0 && (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>{opening.leafCount} ant{opening.leafCount === 1 ? 'a' : 'e'}</Text>
                </View>
              )}
              {opening.width && opening.height && (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>{(opening.width * opening.height / 1_000_000).toFixed(2)} m²</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {hasDims && (
          <View style={styles.dims}>
            <View style={[styles.dimChip, { borderColor: color + '40' }]}>
              <Text style={styles.dimLabel}>L</Text>
              <Text style={[styles.dimVal, { color }]}>{formatDim(opening.width)}</Text>
              <Text style={styles.dimUnit}>mm</Text>
            </View>
            <Text style={styles.dimSep}>×</Text>
            <View style={[styles.dimChip, { borderColor: color + '40' }]}>
              <Text style={styles.dimLabel}>H</Text>
              <Text style={[styles.dimVal, { color }]}>{formatDim(opening.height)}</Text>
              <Text style={styles.dimUnit}>mm</Text>
            </View>
          </View>
        )}

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

        {(opening.photos.length > 0 || !!opening.textNote) && (
          <View style={styles.badges}>
            {opening.photos.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>📷 {opening.photos.length}</Text>
              </View>
            )}
            {!!opening.textNote && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>📝 Nota</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions: duplica + elimina */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDuplicate}
          hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
        >
          <View style={styles.dupBox}>
            <Text style={styles.dupIcon}>⧉</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDelete}
          hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
        >
          <View style={styles.deleteBox}>
            <Text style={styles.deleteIcon}>✕</Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1a3a5c', shadowOpacity: 0.09, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  accent: { width: 4 },
  thumb: { width: 76, height: 76, resizeMode: 'cover' },
  body: { flex: 1, padding: 13 },
  name: { fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 4 },

  dims: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dimChip: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    backgroundColor: '#F4F7FC', borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dimLabel: { fontSize: 10, fontWeight: '700', color: '#8a9ab0' },
  dimVal: { fontSize: 15, fontWeight: '800' },
  dimUnit: { fontSize: 10, color: '#8a9ab0', fontWeight: '600' },
  dimSep: { color: '#CCC', fontSize: 13 },

  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  specTag: {
    fontSize: 10, fontWeight: '700', color: '#556070',
    backgroundColor: '#EEF2F7', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  specGlass: { backgroundColor: '#E3F2FD', color: '#1565C0' },

  styleRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  infoBadges: { flexDirection: 'row', gap: 4 },
  infoBadge:  { backgroundColor: '#F0F4FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  infoBadgeText: { fontSize: 11, color: '#1565C0', fontWeight: '700' },

  badges: { flexDirection: 'row', gap: 6, marginTop: 7 },
  badge: {
    backgroundColor: '#F0F4FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { fontSize: 11, color: '#1565C0', fontWeight: '600' },

  actions: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  actionBtn: {},
  dupBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center',
  },
  dupIcon: { fontSize: 13, color: '#1565C0', fontWeight: '800' },
  deleteBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE8E8', alignItems: 'center', justifyContent: 'center',
  },
  deleteIcon: { fontSize: 12, color: '#D32F2F', fontWeight: '800' },
});

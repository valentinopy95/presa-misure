import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, GestureResponderEvent,
  Modal, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

interface Props {
  value: string | null;
  onChange: (data: string) => void;
}

interface StrokePoint { x: number; y: number; }

function pointsToPath(pts: StrokePoint[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1)
    return `M${pts[0].x} ${pts[0].y} L${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++)
    d += ` L${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  return d;
}

const CANVAS_H = 420;

export default function SketchCanvas({ value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const savedPaths: string[] = (() => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  })();

  const [modalOpen,   setModalOpen]   = useState(false);
  // paths inside the modal (not yet committed)
  const [draftPaths,  setDraftPaths]  = useState<string[]>([]);
  const [activePath,  setActivePath]  = useState('');
  const currentPts = useRef<StrokePoint[]>([]);

  const openModal = () => {
    // start draft from current saved value
    try { setDraftPaths(value ? JSON.parse(value) : []); } catch { setDraftPaths([]); }
    setActivePath('');
    setModalOpen(true);
  };

  const handleAccept = () => {
    onChange(JSON.stringify(draftPaths));
    setModalOpen(false);
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  const handleStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    currentPts.current = [{ x: locationX, y: locationY }];
    setActivePath(pointsToPath(currentPts.current));
  };

  const handleMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    currentPts.current.push({ x: locationX, y: locationY });
    setActivePath(pointsToPath(currentPts.current));
  };

  const handleEnd = () => {
    const d = pointsToPath(currentPts.current);
    if (d) setDraftPaths(prev => [...prev, d]);
    currentPts.current = [];
    setActivePath('');
  };

  const undo = () => setDraftPaths(prev => prev.slice(0, -1));
  const clear = () => setDraftPaths([]);

  return (
    <>
      {/* ── Anteprima / pulsante attiva ── */}
      <TouchableOpacity style={styles.preview} onPress={openModal} activeOpacity={0.85}>
        {savedPaths.length > 0 ? (
          <Svg width="100%" height={120}>
            {savedPaths.map((d, i) => (
              <Path key={i} d={d} stroke="#0c2d75" strokeWidth={2} fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyIcon}>✏️</Text>
            <Text style={styles.emptyTxt}>Tocca per disegnare uno schizzo</Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeTxt}>{savedPaths.length > 0 ? 'Modifica' : 'Aggiungi schizzo'}</Text>
        </View>
      </TouchableOpacity>

      {/* ── Modal disegno fullscreen ── */}
      <Modal visible={modalOpen} animationType="slide" statusBarTranslucent onRequestClose={handleCancel}>
        <View style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />

          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleCancel}>
              <Text style={styles.headerBtnTxtCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schizzo</Text>
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnAccept]} onPress={handleAccept}>
              <Text style={styles.headerBtnTxtAccept}>Accetta</Text>
            </TouchableOpacity>
          </View>

          {/* Canvas — occupa tutto lo spazio disponibile */}
          <View style={styles.canvasWrap}>
            <View
              style={styles.canvas}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleStart}
              onResponderMove={handleMove}
              onResponderRelease={handleEnd}
            >
              <Svg style={StyleSheet.absoluteFill}>
                {draftPaths.map((d, i) => (
                  <Path key={i} d={d} stroke="#0c2d75" strokeWidth={2.5}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {activePath ? (
                  <Path d={activePath} stroke="#0c2d75" strokeWidth={2.5}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
              </Svg>
              {draftPaths.length === 0 && !activePath && (
                <Text style={styles.placeholder}>Disegna con il dito o il pennino…</Text>
              )}
            </View>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolBtn, draftPaths.length === 0 && styles.toolBtnDisabled]}
              onPress={undo} disabled={draftPaths.length === 0}
            >
              <Text style={styles.toolBtnTxt}>↩ Annulla tratto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolBtn, styles.toolBtnClear, draftPaths.length === 0 && styles.toolBtnDisabled]}
              onPress={clear} disabled={draftPaths.length === 0}
            >
              <Text style={[styles.toolBtnTxt, styles.toolBtnClearTxt]}>🗑 Cancella tutto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const NAVY = '#0c2d75';

const styles = StyleSheet.create({
  // ── Anteprima ──
  preview: {
    borderWidth: 1.5, borderColor: '#DDE4EE', borderRadius: 16,
    backgroundColor: '#F4F7FC', overflow: 'hidden', minHeight: 80,
  },
  emptyPreview: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 },
  emptyIcon:    { fontSize: 28 },
  emptyTxt:     { fontSize: 13, color: '#8a9ab0', fontWeight: '500' },
  editBadge: {
    position: 'absolute', bottom: 8, right: 10,
    backgroundColor: 'rgba(12,45,117,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  editBadgeTxt: { fontSize: 11, fontWeight: '700', color: NAVY },

  // ── Modal ──
  modalRoot:   { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e6ef',
  },
  modalTitle:           { fontSize: 16, fontWeight: '800', color: NAVY },
  headerBtn:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  headerBtnAccept:      { backgroundColor: NAVY },
  headerBtnTxtCancel:   { fontSize: 15, fontWeight: '700', color: '#888' },
  headerBtnTxtAccept:   { fontSize: 15, fontWeight: '800', color: '#fff' },

  canvasWrap: { flex: 1, padding: 12 },
  canvas: {
    flex: 1, backgroundColor: '#F4F7FC',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#DDE4EE',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  placeholder: { fontSize: 14, color: '#b0bac8', textAlign: 'center', paddingHorizontal: 32 },

  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
  toolBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#EEF2F7', alignItems: 'center',
  },
  toolBtnDisabled: { opacity: 0.35 },
  toolBtnTxt:      { fontSize: 13, fontWeight: '700', color: NAVY },
  toolBtnClear:    { backgroundColor: '#FEE8E8' },
  toolBtnClearTxt: { color: '#D32F2F' },
});

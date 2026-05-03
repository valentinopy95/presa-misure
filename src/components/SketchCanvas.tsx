import React, { useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  value: string | null;        // SVG path data serializzato (JSON array di path string)
  onChange: (data: string) => void;
  width?: number;
  height?: number;
}

interface StrokePoint { x: number; y: number; }

function pointsToPath(points: StrokePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M${points[0].x} ${points[0].y} L${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

export default function SketchCanvas({ value, onChange, width = 320, height = 280 }: Props) {
  const [paths, setPaths] = useState<string[]>(() => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  });
  const currentPoints = useRef<StrokePoint[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const canvasRef = useRef<View>(null);
  const canvasLayout = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const commit = useCallback((newPaths: string[]) => {
    onChange(JSON.stringify(newPaths));
  }, [onChange]);

  const handleStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    currentPoints.current = [{ x: locationX, y: locationY }];
    setActivePath(pointsToPath(currentPoints.current));
  };

  const handleMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    currentPoints.current.push({ x: locationX, y: locationY });
    setActivePath(pointsToPath(currentPoints.current));
  };

  const handleEnd = () => {
    const d = pointsToPath(currentPoints.current);
    if (d) {
      const newPaths = [...paths, d];
      setPaths(newPaths);
      commit(newPaths);
    }
    currentPoints.current = [];
    setActivePath('');
  };

  const undo = () => {
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    commit(newPaths);
  };

  const clear = () => {
    setPaths([]);
    commit([]);
  };

  return (
    <View style={styles.wrapper}>
      {/* Canvas */}
      <View
        ref={canvasRef}
        style={[styles.canvas, { width, height }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleStart}
        onResponderMove={handleMove}
        onResponderRelease={handleEnd}
      >
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke="#0c2d75" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          ))}
          {activePath ? (
            <Path d={activePath} stroke="#0c2d75" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          ) : null}
        </Svg>
        {paths.length === 0 && !activePath && (
          <Text style={styles.placeholder}>Disegna qui con il dito o il pennino…</Text>
        )}
      </View>

      {/* Controlli */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.btn, paths.length === 0 && styles.btnDisabled]}
          onPress={undo}
          disabled={paths.length === 0}
        >
          <Text style={styles.btnTxt}>↩ Annulla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnClear, paths.length === 0 && styles.btnDisabled]}
          onPress={clear}
          disabled={paths.length === 0}
        >
          <Text style={[styles.btnTxt, styles.btnClearTxt]}>🗑 Cancella tutto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  canvas: {
    backgroundColor: '#F4F7FC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DDE4EE',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 13, color: '#aab0ba', textAlign: 'center',
    paddingHorizontal: 24, pointerEvents: 'none',
  },
  toolbar: {
    flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch',
  },
  btn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#EEF2F7', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { fontSize: 13, fontWeight: '700', color: '#0c2d75' },
  btnClear: { backgroundColor: '#FEE8E8' },
  btnClearTxt: { color: '#D32F2F' },
});

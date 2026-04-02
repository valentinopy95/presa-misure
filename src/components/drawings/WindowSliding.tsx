import React from 'react';
import Svg, { Rect, Line, Path, Text } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function WindowSliding({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame esterno */}
      <Rect x={4} y={4} width={72} height={72} fill="none" stroke={color} strokeWidth={3} />
      {/* Binario superiore */}
      <Line x1={4} y1={16} x2={76} y2={16} stroke={color} strokeWidth={1.5} />
      {/* Binario inferiore */}
      <Line x1={4} y1={64} x2={76} y2={64} stroke={color} strokeWidth={1.5} />
      {/* Pannello fisso (sx) */}
      <Rect x={8} y={18} width={28} height={44} fill="rgba(173,216,230,0.3)" stroke={color} strokeWidth={1.5} />
      {/* Pannello mobile (dx, leggermente sovrapposto) */}
      <Rect x={32} y={18} width={38} height={44} fill="rgba(173,216,230,0.15)" stroke={color} strokeWidth={2} />
      {/* Freccia scorrevole */}
      <Path d="M 48 37 L 60 37" stroke={color} strokeWidth={2} />
      <Path d="M 58 33 L 62 37 L 58 41" fill={color} stroke={color} strokeWidth={1} />
      <Path d="M 44 41 L 32 41" stroke={color} strokeWidth={2} />
      <Path d="M 34 37 L 30 41 L 34 45" fill={color} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

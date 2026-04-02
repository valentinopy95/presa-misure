import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function DoorSliding({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame */}
      <Line x1={4} y1={4} x2={4} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={76} y1={4} x2={76} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={4} x2={76} y2={4} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={76} x2={76} y2={76} stroke={color} strokeWidth={2} strokeDasharray="4,2" />
      {/* Binario superiore */}
      <Line x1={4} y1={16} x2={76} y2={16} stroke={color} strokeWidth={1.5} />
      {/* Pannello fisso (sx) */}
      <Rect x={8} y={18} width={28} height={54} fill="rgba(173,216,230,0.25)" stroke={color} strokeWidth={1.5} />
      {/* Pannello scorrevole (dx, sovrapposto) */}
      <Rect x={32} y={18} width={40} height={54} fill="rgba(173,216,230,0.1)" stroke={color} strokeWidth={2} />
      {/* Frecce scorrevoli */}
      <Path d="M 46 42 L 62 42" stroke={color} strokeWidth={2} />
      <Path d="M 60 38 L 65 42 L 60 46" fill={color} stroke={color} strokeWidth={1} />
      {/* Maniglia */}
      <Rect x={36} y={38} width={4} height={8} rx={2} fill={color} />
    </Svg>
  );
}

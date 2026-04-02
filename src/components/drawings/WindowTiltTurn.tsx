import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function WindowTiltTurn({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame esterno */}
      <Rect x={4} y={4} width={72} height={72} fill="none" stroke={color} strokeWidth={3} />
      {/* Anta */}
      <Rect x={10} y={10} width={60} height={60} fill="none" stroke={color} strokeWidth={1.5} />
      {/* Diagonali vasistas (X al centro) */}
      <Line x1={10} y1={10} x2={70} y2={70} stroke={color} strokeWidth={1.5} />
      <Line x1={70} y1={10} x2={10} y2={70} stroke={color} strokeWidth={1.5} />
      {/* Cerniere laterali (apertura laterale) */}
      <Line x1={14} y1={14} x2={14} y2={66} stroke={color} strokeWidth={2} />
      {/* Cerniere in basso (ribaltamento) */}
      <Line x1={14} y1={66} x2={66} y2={66} stroke={color} strokeWidth={2} />
      {/* Freccia apertura laterale */}
      <Path d="M 20 40 L 10 40" stroke={color} strokeWidth={1.5} />
      <Path d="M 12 36 L 8 40 L 12 44" fill="none" stroke={color} strokeWidth={1.5} />
      {/* Freccia ribaltamento */}
      <Path d="M 40 70 L 40 76" stroke={color} strokeWidth={1.5} />
      <Path d="M 36 74 L 40 78 L 44 74" fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

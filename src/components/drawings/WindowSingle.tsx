import React from 'react';
import Svg, { Rect, Line, Path, G } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function WindowSingle({ size = 80, color = '#1565C0' }: Props) {
  const s = size;
  const sw = 3; // stroke width frame
  const sw2 = 1.5; // stroke width inner
  const pad = 6;

  return (
    <Svg width={s} height={s} viewBox="0 0 80 80">
      {/* Frame esterno */}
      <Rect x={4} y={4} width={72} height={72} fill="none" stroke={color} strokeWidth={sw} />
      {/* Anta unica */}
      <Rect x={10} y={10} width={60} height={60} fill="none" stroke={color} strokeWidth={sw2} />
      {/* Linea apertura sx (cerniera) */}
      <Line x1={14} y1={14} x2={14} y2={66} stroke={color} strokeWidth={sw2} />
      {/* Arco apertura */}
      <Path
        d="M 14 14 Q 66 14 66 66"
        fill="none"
        stroke={color}
        strokeWidth={sw2}
        strokeDasharray="3,3"
      />
      {/* Freccia apertura */}
      <Path
        d="M 60 20 L 66 14 L 72 20"
        fill="none"
        stroke={color}
        strokeWidth={sw2}
      />
    </Svg>
  );
}

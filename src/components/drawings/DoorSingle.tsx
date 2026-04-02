import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function DoorSingle({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame vano porta */}
      <Line x1={4} y1={4} x2={4} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={76} y1={4} x2={76} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={4} x2={76} y2={4} stroke={color} strokeWidth={3} />
      {/* Pavimento */}
      <Line x1={4} y1={76} x2={76} y2={76} stroke={color} strokeWidth={2} strokeDasharray="4,2" />
      {/* Anta porta (aperta, proiettata) */}
      <Rect x={10} y={10} width={60} height={60} fill="none" stroke={color} strokeWidth={2} />
      {/* Cerniera sx */}
      <Line x1={14} y1={14} x2={14} y2={66} stroke={color} strokeWidth={2.5} />
      {/* Arco apertura porta */}
      <Path
        d="M 14 14 A 56 56 0 0 1 70 14"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="3,3"
      />
      {/* Maniglia */}
      <Rect x={60} y={36} width={4} height={8} rx={2} fill={color} />
    </Svg>
  );
}

import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function DoorFrench({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame */}
      <Line x1={4} y1={4} x2={4} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={76} y1={4} x2={76} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={4} x2={76} y2={4} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={76} x2={76} y2={76} stroke={color} strokeWidth={2} strokeDasharray="4,2" />
      {/* Montante centrale */}
      <Line x1={40} y1={4} x2={40} y2={76} stroke={color} strokeWidth={2} />
      {/* Anta sx (apre verso esterno sx) */}
      <Rect x={10} y={10} width={24} height={62} fill="none" stroke={color} strokeWidth={1.5} />
      <Line x1={14} y1={14} x2={14} y2={68} stroke={color} strokeWidth={2} />
      <Path d="M 14 14 A 26 26 0 0 0 14 68" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      {/* Anta dx (apre verso esterno dx) */}
      <Rect x={46} y={10} width={24} height={62} fill="none" stroke={color} strokeWidth={1.5} />
      <Line x1={66} y1={14} x2={66} y2={68} stroke={color} strokeWidth={2} />
      <Path d="M 66 14 A 26 26 0 0 1 66 68" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      {/* Maniglie */}
      <Rect x={33} y={36} width={4} height={8} rx={2} fill={color} />
      <Rect x={43} y={36} width={4} height={8} rx={2} fill={color} />
    </Svg>
  );
}

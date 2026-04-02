import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function DoorBifold({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame */}
      <Line x1={4} y1={4} x2={4} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={76} y1={4} x2={76} y2={76} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={4} x2={76} y2={4} stroke={color} strokeWidth={3} />
      <Line x1={4} y1={76} x2={76} y2={76} stroke={color} strokeWidth={2} strokeDasharray="4,2" />
      {/* Pannello sx piegato */}
      <Line x1={10} y1={68} x2={28} y2={20} stroke={color} strokeWidth={2} />
      <Line x1={28} y1={20} x2={40} y2={68} stroke={color} strokeWidth={2} />
      {/* Pannello dx piegato (specchiato) */}
      <Line x1={40} y1={68} x2={52} y2={20} stroke={color} strokeWidth={2} />
      <Line x1={52} y1={20} x2={70} y2={68} stroke={color} strokeWidth={2} />
      {/* Archi apertura (a terra) */}
      <Path d="M 10 68 A 30 30 0 0 0 40 68" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      <Path d="M 40 68 A 30 30 0 0 0 70 68" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
    </Svg>
  );
}

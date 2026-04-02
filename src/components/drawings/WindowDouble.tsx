import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function WindowDouble({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Frame esterno */}
      <Rect x={4} y={4} width={72} height={72} fill="none" stroke={color} strokeWidth={3} />
      {/* Montante centrale */}
      <Line x1={40} y1={4} x2={40} y2={76} stroke={color} strokeWidth={3} />
      {/* Anta sx */}
      <Rect x={10} y={10} width={24} height={60} fill="none" stroke={color} strokeWidth={1.5} />
      {/* Cerniera sx (destra dell'anta sx) */}
      <Line x1={34} y1={14} x2={34} y2={66} stroke={color} strokeWidth={1.5} />
      {/* Arco anta sx */}
      <Path d="M 34 14 Q 10 14 10 66" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      {/* Anta dx */}
      <Rect x={46} y={10} width={24} height={60} fill="none" stroke={color} strokeWidth={1.5} />
      {/* Cerniera dx (sinistra dell'anta dx) */}
      <Line x1={46} y1={14} x2={46} y2={66} stroke={color} strokeWidth={1.5} />
      {/* Arco anta dx */}
      <Path d="M 46 14 Q 70 14 70 66" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
    </Svg>
  );
}

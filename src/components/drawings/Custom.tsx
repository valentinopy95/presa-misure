import React from 'react';
import Svg, { Rect, Line, Text } from 'react-native-svg';

interface Props { size?: number; color?: string; }

export default function Custom({ size = 80, color = '#1565C0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Rect x={4} y={4} width={72} height={72} fill="none" stroke={color} strokeWidth={3} strokeDasharray="6,4" />
      <Line x1={20} y1={40} x2={60} y2={40} stroke={color} strokeWidth={2} />
      <Line x1={40} y1={20} x2={40} y2={60} stroke={color} strokeWidth={2} />
      <Text x={40} y={72} fontSize={10} fill={color} textAnchor="middle" fontWeight="bold">CUSTOM</Text>
    </Svg>
  );
}

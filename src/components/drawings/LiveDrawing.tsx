import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Rect, Line, Path, Text, Defs, Pattern, G, Circle,
} from 'react-native-svg';
import { OpeningStyle, OpeningSide } from '../../types';

// ─── ViewBox & layout ────────────────────────────────────────────────────────
const VB_W = 320, VB_H = 340;
const ML = 50, MR = 12, MT = 36, MB = 52;
const FX = ML, FY = MT;
const FW = VB_W - ML - MR; // 258
const FH = VB_H - MT - MB; // 252
const FT = 18;
const GX = FX + FT, GY = FY + FT;
const GW = FW - FT * 2, GH = FH - FT * 2;
const GX2 = GX + GW, GY2 = GY + GH;
const CX = GX + GW / 2, CY = GY + GH / 2;

const DIM_LUCE_Y   = FY + FH + 14;
const DIM_TAGLIO_Y = FY + FH + 30;
const DIM_LUCE_X   = FX - 14;
const DIM_TAGLIO_X = FX - 28;

// ─── Colors ──────────────────────────────────────────────────────────────────
const C_FRAME      = '#1a3a5c';
const C_FRAME_FILL = '#dde4ec'; // frame cross-section (no wall hatch)
const C_GLASS      = 'rgba(176,213,232,0.4)';
const C_GLASS_REFL = 'rgba(255,255,255,0.35)';
const C_SHUTTER    = '#5a7a3a';
const C_SLAT       = 'rgba(255,255,255,0.4)';
const C_BOX        = '#2a2a2a';
const C_IND        = '#1565C0';
const C_DIM_LUCE   = '#E53935';
const C_DIM_TAG    = '#C62828';
const C_SUBFRAME_F = '#7a5030';
const C_SUBFRAME_B = '#c8a06a';
const C_WOOD_BG    = '#d4b483';
const C_HATCH_WOOD = '#7a5c2e';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function p(n: number) { return n.toFixed(1); }

function arrow(x: number, y: number, angle: number, size = 5): string {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const h = size * 2, w = size * 0.8;
  const bx1 = x - cos * h + (-sin) * w, by1 = y - sin * h + cos * w;
  const bx2 = x - cos * h - (-sin) * w, by2 = y - sin * h - cos * w;
  return `M ${p(x)} ${p(y)} L ${p(bx1)} ${p(by1)} L ${p(bx2)} ${p(by2)} Z`;
}

// ─── Patterns (only for wood-grain subframe) ─────────────────────────────────
function WoodPattern({ id }: { id: string }) {
  return (
    <Defs>
      <Pattern id={id} x="0" y="0" width="6" height="4" patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width="6" height="4" fill={C_WOOD_BG}/>
        <Line x1="0" y1="2" x2="6" y2="2" stroke={C_HATCH_WOOD} strokeWidth="0.6"/>
      </Pattern>
    </Defs>
  );
}

// ─── Corner marks ────────────────────────────────────────────────────────────
function CornerMarks({ x, y, dx, dy, color = C_FRAME }: {
  x: number; y: number; dx: number; dy: number; color?: string;
}) {
  return (
    <G>
      <Line x1={x} y1={y} x2={x + dx * 6} y2={y} stroke={color} strokeWidth={1}/>
      <Line x1={x} y1={y} x2={x} y2={y + dy * 6} stroke={color} strokeWidth={1}/>
    </G>
  );
}

// ─── FrameBase: clean frame cross-section, NO wall hatch ─────────────────────
function FrameBase({ color = C_FRAME }: { color?: string }) {
  return (
    <G>
      {/* Frame body (solid profile color, no wall hatch) */}
      <Rect x={FX} y={FY} width={FW} height={FH} fill={C_FRAME_FILL} stroke={color} strokeWidth={2.5}/>
      {/* Glass area */}
      <Rect x={GX} y={GY} width={GW} height={GH} fill="white"/>
      <Rect x={GX} y={GY} width={GW} height={GH} fill={C_GLASS} stroke={color} strokeWidth={1}/>
      {/* Glass reflection */}
      <Line x1={GX+6} y1={GY+4} x2={GX+6} y2={GY2-4} stroke={C_GLASS_REFL} strokeWidth={3} strokeLinecap="round"/>
      <Line x1={GX+12} y1={GY+4} x2={GX+12} y2={GY+GH*0.4} stroke={C_GLASS_REFL} strokeWidth={1.5} strokeLinecap="round"/>
      {/* Corner marks */}
      <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}  color={color}/>
      <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}  color={color}/>
      <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1} color={color}/>
      <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1} color={color}/>
    </G>
  );
}

// ─── SubframeBase: U-shape (3 sides, no bottom) ──────────────────────────────
function SubframeBase({ woodPatternId }: { woodPatternId: string }) {
  return (
    <G>
      {/* Left bar */}
      <Rect x={FX} y={FY} width={FT} height={FH} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Right bar */}
      <Rect x={FX+FW-FT} y={FY} width={FT} height={FH} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Top bar */}
      <Rect x={FX} y={FY} width={FW} height={FT} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Interior white (covers joint areas) */}
      <Rect x={GX} y={GY} width={GW} height={GH+FT+4} fill="white"/>
      {/* Inner dashed border (U-shape: top + two sides, open at bottom) */}
      <Path
        d={`M ${GX+4} ${FY+FH+2} L ${GX+4} ${GY+4} L ${GX2-4} ${GY+4} L ${GX2-4} ${FY+FH+2}`}
        fill="none" stroke={C_SUBFRAME_B} strokeWidth={1} strokeDasharray="4,2"
      />
      {/* Corner marks */}
      <CornerMarks x={FX}    y={FY} dx={1}  dy={1}  color={C_SUBFRAME_F}/>
      <CornerMarks x={FX+FW} y={FY} dx={-1} dy={1}  color={C_SUBFRAME_F}/>
    </G>
  );
}

// ─── Leaf dividers ────────────────────────────────────────────────────────────
function LeafDividers({ leafCount }: { leafCount: number }) {
  if (leafCount <= 1) return null;
  return (
    <G>
      {Array.from({ length: leafCount - 1 }).map((_, i) => {
        const x = GX + (GW * (i + 1)) / leafCount;
        return (
          <G key={i}>
            <Rect x={x - FT / 4} y={FY} width={FT / 2} height={FH}
                  fill={C_FRAME_FILL} stroke={C_FRAME} strokeWidth={1}/>
            <Rect x={x - 1} y={GY} width={2} height={GH} fill="white"/>
          </G>
        );
      })}
    </G>
  );
}

// ─── Animated opening indicator ───────────────────────────────────────────────
interface AnimProps {
  openingSide: OpeningSide;
  leafCount: number;
  progress: number; // 0-1
}

function AnimatedOpening({ openingSide, leafCount, progress }: AnimProps) {
  const c = C_IND;
  const da = '5,3';
  const n = Math.max(1, leafCount);
  const sashW = GW / n; // width of each sash

  // Draw plan-view swing arc for a sash
  function swingArc(hingeX: number, sashLen: number, dir: 'cw' | 'ccw'): React.ReactNode {
    if (progress < 0.02) return null;
    const angle = progress * 80 * (Math.PI / 180);
    const sign = dir === 'cw' ? 1 : -1;
    const tipX = hingeX + sign * sashLen * Math.cos(angle);
    const tipY = GY2 - sashLen * Math.sin(angle);
    const startX = hingeX + sign * sashLen;
    const sweep = dir === 'cw' ? 1 : 0;
    return (
      <G>
        <Line x1={p(hingeX)} y1={p(GY2)} x2={p(tipX)} y2={p(tipY)}
              stroke={c} strokeWidth={2}/>
        <Path
          d={`M ${p(startX)} ${p(GY2)} A ${p(sashLen)} ${p(sashLen)} 0 0 ${sweep} ${p(tipX)} ${p(tipY)}`}
          fill="rgba(176,213,232,0.13)" stroke={c} strokeWidth={1.4} strokeDasharray={da}
        />
      </G>
    );
  }

  if (openingSide === 'right') {
    // Right-most sash: hinge on its LEFT side, opens right (clockwise arc)
    const hingeX = n > 1 ? GX + sashW * (n - 1) + 3 : GX + 3;
    const sLen = sashW - 6;
    return (
      <G>
        <Line x1={p(hingeX)} y1={p(GY)} x2={p(hingeX)} y2={p(GY2)} stroke={c} strokeWidth={2.5}/>
        {swingArc(hingeX, sLen, 'cw')}
        <Rect x={GX2 - 14} y={CY - 5} width={4} height={10} rx={2} fill={c}/>
      </G>
    );
  }

  if (openingSide === 'left') {
    // Left-most sash: hinge on its RIGHT side, opens left (counter-clockwise)
    const hingeX = n > 1 ? GX + sashW - 3 : GX2 - 3;
    const sLen = sashW - 6;
    return (
      <G>
        <Line x1={p(hingeX)} y1={p(GY)} x2={p(hingeX)} y2={p(GY2)} stroke={c} strokeWidth={2.5}/>
        {swingArc(hingeX, sLen, 'ccw')}
        <Rect x={GX + 10} y={CY - 5} width={4} height={10} rx={2} fill={c}/>
      </G>
    );
  }

  if (openingSide === 'both') {
    // Left sash opens left, right sash opens right
    const leftHingeX = GX + 3;
    const rightHingeX = GX2 - 3;
    const halfLen = (n >= 2 ? sashW : GW / 2) - 6;
    return (
      <G>
        <Line x1={p(leftHingeX)}  y1={p(GY)} x2={p(leftHingeX)}  y2={p(GY2)} stroke={c} strokeWidth={2.5}/>
        <Line x1={p(rightHingeX)} y1={p(GY)} x2={p(rightHingeX)} y2={p(GY2)} stroke={c} strokeWidth={2.5}/>
        {swingArc(leftHingeX,  halfLen, 'cw')}
        {swingArc(rightHingeX, halfLen, 'ccw')}
        <Rect x={CX - 8} y={CY - 5} width={4} height={10} rx={2} fill={c}/>
        <Rect x={CX + 4} y={CY - 5} width={4} height={10} rx={2} fill={c}/>
      </G>
    );
  }

  if (openingSide === 'tilt') {
    const op = progress;
    return (
      <G opacity={op}>
        <Line x1={GX} y1={GY} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5}/>
        <Line x1={GX2} y1={GY} x2={GX} y2={GY2} stroke={c} strokeWidth={1.5}/>
        {/* Hinge bar at bottom */}
        <Line x1={CX - 14} y1={GY2 - 4} x2={CX + 14} y2={GY2 - 4}
              stroke={c} strokeWidth={3} strokeLinecap="round"/>
        {/* Tilt arc at top */}
        <Path
          d={`M ${GX+4} ${GY+4} A ${GW/2-8} ${GH*0.25} 0 0 1 ${GX2-4} ${GY+4}`}
          fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={1.4} strokeDasharray={da}
        />
        <Rect x={GX2 - 12} y={CY - 5} width={4} height={10} rx={2} fill={c}/>
      </G>
    );
  }

  return null;
}

// ─── Default style-based indicator (used when openingSide is null) ────────────
function DefaultIndicator({ style, woodId }: { style: OpeningStyle; woodId: string }) {
  const c = C_IND;
  const da = '5,3';
  const sw = 1.6;

  switch (style) {
    case 'window_single':
      return <G>
        <Line x1={GX+3} y1={GY} x2={GX+3} y2={GY2} stroke={c} strokeWidth={2.5} strokeLinecap="round"/>
        <Path d={`M ${GX+3} ${GY} Q ${GX2-3} ${GY} ${GX2-3} ${GY2}`}
              fill="none" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Path d={arrow(GX2-3, GY2, Math.PI*0.75)} fill={c}/>
        <Rect x={GX2-12} y={CY-5} width={4} height={10} rx={2} fill={c}/>
      </G>;

    case 'window_double':
      return <G>
        <Line x1={CX} y1={GY} x2={CX} y2={GY2} stroke={c} strokeWidth={2}/>
        <Line x1={GX+3} y1={GY} x2={GX+3} y2={GY2} stroke={c} strokeWidth={2.5} strokeLinecap="round"/>
        <Path d={`M ${GX+3} ${GY} Q ${CX-3} ${GY} ${CX-3} ${GY2}`}
              fill="none" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Path d={arrow(CX-3, GY2, Math.PI*0.8)} fill={c}/>
        <Line x1={GX2-3} y1={GY} x2={GX2-3} y2={GY2} stroke={c} strokeWidth={2.5} strokeLinecap="round"/>
        <Path d={`M ${GX2-3} ${GY} Q ${CX+3} ${GY} ${CX+3} ${GY2}`}
              fill="none" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Path d={arrow(CX+3, GY2, Math.PI*0.2)} fill={c}/>
        <Rect x={CX-6} y={CY-5} width={4} height={10} rx={2} fill={c}/>
        <Rect x={CX+2} y={CY-5} width={4} height={10} rx={2} fill={c}/>
      </G>;

    case 'window_sliding':
      return <G>
        <Line x1={GX} y1={GY+10} x2={GX2} y2={GY+10} stroke={c} strokeWidth={1.2}/>
        <Line x1={GX} y1={GY2-10} x2={GX2} y2={GY2-10} stroke={c} strokeWidth={1.2}/>
        <Rect x={GX} y={GY+10} width={GW/2+8} height={GH-20}
              fill="rgba(176,213,232,0.18)" stroke={c} strokeWidth={1.2}/>
        <Rect x={CX-8} y={GY+10} width={GW/2+8} height={GH-20}
              fill="rgba(255,255,255,0.1)" stroke={c} strokeWidth={2}/>
        <Line x1={CX+4} y1={CY} x2={GX2-14} y2={CY} stroke={c} strokeWidth={2}/>
        <Path d={arrow(GX2-14, CY, 0)} fill={c}/>
        <Rect x={CX-4} y={CY-8} width={4} height={16} rx={2} fill={c}/>
      </G>;

    case 'window_tilt_turn':
      return <G>
        <Line x1={GX} y1={GY} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5}/>
        <Line x1={GX2} y1={GY} x2={GX} y2={GY2} stroke={c} strokeWidth={1.5}/>
        <Line x1={GX+4} y1={CY-14} x2={GX+4} y2={CY+14} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={CX-14} y1={GY2-4} x2={CX+14} y2={GY2-4} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Path d={arrow(GX+14, CY, Math.PI)} fill={c}/>
        <Path d={arrow(CX, GY2-14, Math.PI/2)} fill={c}/>
        <Rect x={GX2-12} y={CY-5} width={4} height={10} rx={2} fill={c}/>
      </G>;

    case 'door_single':
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Line x1={GX+3} y1={GY} x2={GX+3} y2={GY2-2} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={GX+3} y1={GY} x2={GX2-3} y2={GY} stroke={c} strokeWidth={2}/>
        <Path d={`M ${GX+3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 1 ${Math.min(GX2-3,GX+3+GH*0.82)} ${GY2}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Rect x={GX2-12} y={CY-6} width={5} height={13} rx={2.5} fill={c}/>
        <Circle cx={GX2-14} cy={CY+9} r={2} fill={c}/>
      </G>;

    case 'door_double':
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Rect x={CX-FT/2} y={FY} width={FT} height={FH} fill={C_FRAME_FILL} stroke={C_FRAME} strokeWidth={1}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        <Line x1={GX+3} y1={GY} x2={GX+3} y2={GY2-2} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={GX+3} y1={GY} x2={CX-2} y2={GY} stroke={c} strokeWidth={2}/>
        <Path d={`M ${GX+3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 1 ${Math.min(CX-2,GX+3+GH*0.82)} ${GY2}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Line x1={GX2-3} y1={GY} x2={GX2-3} y2={GY2-2} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={CX+2} y1={GY} x2={GX2-3} y2={GY} stroke={c} strokeWidth={2}/>
        <Path d={`M ${GX2-3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 0 ${Math.max(CX+2,GX2-3-GH*0.82)} ${GY2}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Rect x={CX-8} y={CY-6} width={5} height={13} rx={2.5} fill={c}/>
        <Rect x={CX+3} y={CY-6} width={5} height={13} rx={2.5} fill={c}/>
      </G>;

    case 'door_sliding':
      return <G>
        <Line x1={GX} y1={GY+10} x2={GX2} y2={GY+10} stroke={c} strokeWidth={1.2}/>
        <Rect x={GX} y={GY+10} width={GW/2+8} height={GH-12}
              fill="rgba(176,213,232,0.18)" stroke={c} strokeWidth={1.2}/>
        <Rect x={CX-8} y={GY+10} width={GW/2+8} height={GH-12}
              fill="rgba(255,255,255,0.1)" stroke={c} strokeWidth={2}/>
        <Line x1={CX+4} y1={CY} x2={GX2-14} y2={CY} stroke={c} strokeWidth={2}/>
        <Path d={arrow(GX2-14, CY, 0)} fill={c}/>
        <Rect x={CX-4} y={CY-8} width={4} height={16} rx={2} fill={c}/>
      </G>;

    case 'door_french':
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Rect x={CX-FT/2} y={FY} width={FT} height={FH} fill={C_FRAME_FILL} stroke={C_FRAME} strokeWidth={1}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        <Line x1={GX+3} y1={GY} x2={GX+3} y2={GY2-2} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Path d={`M ${GX+3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 0 ${GX+3} ${GY2}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Line x1={GX2-3} y1={GY} x2={GX2-3} y2={GY2-2} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Path d={`M ${GX2-3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 1 ${GX2-3} ${GY2}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Rect x={CX-8} y={CY-6} width={5} height={13} rx={2.5} fill={c}/>
        <Rect x={CX+3} y={CY-6} width={5} height={13} rx={2.5} fill={c}/>
      </G>;

    case 'door_bifold': {
      const pL = GX+GW*0.25, pR = GX+GW*0.75, pY = GY+14, arcR = GW/2-8;
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Line x1={GX+4} y1={GY2-4} x2={pL} y2={pY} stroke={c} strokeWidth={2}/>
        <Line x1={pL} y1={pY} x2={CX-4} y2={GY2-4} stroke={c} strokeWidth={2}/>
        <Line x1={CX+4} y1={GY2-4} x2={pR} y2={pY} stroke={c} strokeWidth={2}/>
        <Line x1={pR} y1={pY} x2={GX2-4} y2={GY2-4} stroke={c} strokeWidth={2}/>
        <Path d={`M ${GX+4} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${CX} ${GY2-4}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Path d={`M ${CX} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${GX2-4} ${GY2-4}`}
              fill="rgba(176,213,232,0.15)" stroke={c} strokeWidth={sw} strokeDasharray={da}/>
        <Circle cx={pL} cy={pY} r={3} fill={c}/>
        <Circle cx={pR} cy={pY} r={3} fill={c}/>
      </G>;
    }

    // ── PERSIANE ─────────────────────────────────────────────────────────────
    case 'shutter_single': {
      const slats = 8, slotH = GH / slats;
      return <G>
        {Array.from({length: slats+1}).map((_,i)=>(
          <Line key={i} x1={GX+2} y1={GY+i*slotH} x2={GX2-2} y2={GY+i*slotH}
                stroke={C_SLAT} strokeWidth={1}/>
        ))}
        {[0.25, 0.5, 0.75].map((f,i)=>(
          <Circle key={i} cx={GX+4} cy={GY+GH*f} r={3} fill={C_SHUTTER} stroke="white" strokeWidth={1}/>
        ))}
        <Path d={`M ${GX+4} ${GY} Q ${GX2-4} ${GY} ${GX2-4} ${GY2}`}
              fill="none" stroke={C_SHUTTER} strokeWidth={1.5} strokeDasharray="5,3"/>
        <Path d={arrow(GX2-4, GY2, Math.PI*0.75)} fill={C_SHUTTER}/>
      </G>;
    }

    case 'shutter_double': {
      const slats = 8, slotH = GH / slats;
      return <G>
        {Array.from({length: slats+1}).map((_,i)=>(
          <Line key={i} x1={GX+2} y1={GY+i*slotH} x2={CX-2} y2={GY+i*slotH}
                stroke={C_SLAT} strokeWidth={1}/>
        ))}
        {Array.from({length: slats+1}).map((_,i)=>(
          <Line key={`r${i}`} x1={CX+2} y1={GY+i*slotH} x2={GX2-2} y2={GY+i*slotH}
                stroke={C_SLAT} strokeWidth={1}/>
        ))}
        <Line x1={CX} y1={FY} x2={CX} y2={FY+FH} stroke={C_FRAME} strokeWidth={FT/2}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        {[0.3, 0.7].map((f,i)=>(
          <Circle key={i} cx={GX+4} cy={GY+GH*f} r={3} fill={C_SHUTTER} stroke="white" strokeWidth={1}/>
        ))}
        {[0.3, 0.7].map((f,i)=>(
          <Circle key={`r${i}`} cx={GX2-4} cy={GY+GH*f} r={3} fill={C_SHUTTER} stroke="white" strokeWidth={1}/>
        ))}
        <Path d={`M ${GX+4} ${GY} Q ${CX-4} ${GY} ${CX-4} ${GY2}`}
              fill="none" stroke={C_SHUTTER} strokeWidth={1.5} strokeDasharray="5,3"/>
        <Path d={`M ${GX2-4} ${GY} Q ${CX+4} ${GY} ${CX+4} ${GY2}`}
              fill="none" stroke={C_SHUTTER} strokeWidth={1.5} strokeDasharray="5,3"/>
      </G>;
    }

    // ── MONOBLOCCO ────────────────────────────────────────────────────────────
    case 'roller_blind': {
      const boxH = FH * 0.22;
      const winY = FY + boxH;
      const winH = FH - boxH;
      const wGY = winY + FT;
      const wGH = winH - FT;
      const slats = 5, slotH = wGH / slats;
      return <G>
        <Rect x={FX} y={FY} width={FW} height={boxH} fill={C_BOX} stroke={C_FRAME} strokeWidth={2}/>
        {Array.from({length: 4}).map((_,i)=>(
          <Line key={i} x1={FX+10+i*(FW-20)/3} y1={FY+2} x2={FX+10+i*(FW-20)/3} y2={FY+boxH-2}
                stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
        ))}
        <G transform={`translate(${FX+FW/2}, ${FY+boxH/2+4})`}>
          <Text textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)" fontWeight="700">
            CASSONETTO
          </Text>
        </G>
        <Line x1={FX} y1={winY} x2={FX+FW} y2={winY} stroke={C_FRAME} strokeWidth={2}/>
        {/* Frame finestra sotto (no hatch) */}
        <Rect x={FX} y={winY} width={FW} height={winH} fill={C_FRAME_FILL} stroke={C_FRAME} strokeWidth={2}/>
        <Rect x={GX} y={wGY} width={GW} height={wGH} fill="white"/>
        {Array.from({length: slats}).map((_,i)=>(
          <Rect key={i} x={GX+1} y={wGY+i*slotH} width={GW-2} height={slotH*0.85}
                fill={`rgba(200,180,100,${0.9-i*0.15})`}
                stroke="rgba(150,120,50,0.5)" strokeWidth={0.5}/>
        ))}
        <Rect x={GX} y={wGY+slats*slotH} width={GW} height={Math.max(0,wGH-slats*slotH)}
              fill={C_GLASS}/>
        <Rect x={GX} y={wGY} width={4} height={wGH} fill="rgba(80,60,20,0.4)"/>
        <Rect x={GX2-4} y={wGY} width={4} height={wGH} fill="rgba(80,60,20,0.4)"/>
      </G>;
    }

    // ── CONTROTELAIO ──────────────────────────────────────────────────────────
    case 'subframe_window':
      return <G>
        <G transform={`translate(${CX}, ${GY+GH/2+5})`}>
          <Text textAnchor="middle" fontSize={10} fill={C_SUBFRAME_B} fontWeight="700">
            CONTROTELAIO
          </Text>
        </G>
      </G>;

    case 'custom':
      return <G>
        <Line x1={GX+16} y1={CY} x2={GX2-16} y2={CY}
              stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Line x1={CX} y1={GY+16} x2={CX} y2={GY2-16}
              stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <G transform={`translate(${CX}, ${CY-8})`}>
          <Text textAnchor="middle" fontSize={11} fill={c} fontWeight="700">CUSTOM</Text>
        </G>
      </G>;

    default:
      return null;
  }
}

// ─── Dimension lines ──────────────────────────────────────────────────────────
interface DimLinesProps {
  luceW: number | null; luceH: number | null;
  taglioW: number | null; taglioH: number | null;
  boxHeight?: number | null;
}

function DimLines({ luceW, luceH, taglioW, taglioH, boxHeight }: DimLinesProps) {
  const wLbl  = luceW   != null ? `L: ${luceW} mm`   : 'L: — mm';
  const wTLbl = taglioW != null ? `T: ${taglioW} mm` : 'T: — mm';
  const hLbl  = luceH   != null ? `L: ${luceH} mm`   : 'L: — mm';
  const hTLbl = taglioH != null ? `T: ${taglioH} mm` : 'T: — mm';

  return <G>
    <Line x1={FX} y1={FY+FH} x2={FX} y2={DIM_TAGLIO_Y+6} stroke={C_DIM_LUCE} strokeWidth={0.8}/>
    <Line x1={FX+FW} y1={FY+FH} x2={FX+FW} y2={DIM_TAGLIO_Y+6} stroke={C_DIM_LUCE} strokeWidth={0.8}/>
    <Line x1={FX} y1={FY} x2={DIM_TAGLIO_X-6} y2={FY} stroke={C_DIM_LUCE} strokeWidth={0.8}/>
    <Line x1={FX} y1={FY+FH} x2={DIM_TAGLIO_X-6} y2={FY+FH} stroke={C_DIM_LUCE} strokeWidth={0.8}/>

    <Line x1={FX} y1={DIM_LUCE_Y} x2={FX+FW} y2={DIM_LUCE_Y} stroke={C_DIM_LUCE} strokeWidth={1.4}/>
    <Path d={arrow(FX, DIM_LUCE_Y, 0)} fill={C_DIM_LUCE}/>
    <Path d={arrow(FX+FW, DIM_LUCE_Y, Math.PI)} fill={C_DIM_LUCE}/>
    <G transform={`translate(${FX+FW/2}, ${DIM_LUCE_Y-4})`}>
      <Text textAnchor="middle" fontSize={9} fontWeight="700" fill={C_DIM_LUCE}>{wLbl}</Text>
    </G>

    <Line x1={FX} y1={DIM_TAGLIO_Y} x2={FX+FW} y2={DIM_TAGLIO_Y} stroke={C_DIM_TAG} strokeWidth={1.2}/>
    <Path d={arrow(FX, DIM_TAGLIO_Y, 0)} fill={C_DIM_TAG}/>
    <Path d={arrow(FX+FW, DIM_TAGLIO_Y, Math.PI)} fill={C_DIM_TAG}/>
    <G transform={`translate(${FX+FW/2}, ${DIM_TAGLIO_Y-4})`}>
      <Text textAnchor="middle" fontSize={8} fontWeight="600" fill={C_DIM_TAG}>{wTLbl}</Text>
    </G>

    <Line x1={DIM_LUCE_X} y1={FY} x2={DIM_LUCE_X} y2={FY+FH} stroke={C_DIM_LUCE} strokeWidth={1.4}/>
    <Path d={arrow(DIM_LUCE_X, FY, Math.PI/2)} fill={C_DIM_LUCE}/>
    <Path d={arrow(DIM_LUCE_X, FY+FH, -Math.PI/2)} fill={C_DIM_LUCE}/>
    <G transform={`translate(${DIM_LUCE_X}, ${FY+FH/2}) rotate(-90)`}>
      <Text textAnchor="middle" fontSize={9} fontWeight="700" fill={C_DIM_LUCE}>{hLbl}</Text>
    </G>

    <Line x1={DIM_TAGLIO_X} y1={FY} x2={DIM_TAGLIO_X} y2={FY+FH} stroke={C_DIM_TAG} strokeWidth={1.2}/>
    <Path d={arrow(DIM_TAGLIO_X, FY, Math.PI/2)} fill={C_DIM_TAG}/>
    <Path d={arrow(DIM_TAGLIO_X, FY+FH, -Math.PI/2)} fill={C_DIM_TAG}/>
    <G transform={`translate(${DIM_TAGLIO_X}, ${FY+FH/2}) rotate(-90)`}>
      <Text textAnchor="middle" fontSize={8} fontWeight="600" fill={C_DIM_TAG}>{hTLbl}</Text>
    </G>

    {/* Cassonetto height annotation */}
    {boxHeight != null && (
      <G>
        <Line x1={FX+FW+6} y1={FY} x2={FX+FW+18} y2={FY} stroke="#FF6F00" strokeWidth={1}/>
        <Line x1={FX+FW+6} y1={FY+FH*0.22} x2={FX+FW+18} y2={FY+FH*0.22} stroke="#FF6F00" strokeWidth={1}/>
        <Line x1={FX+FW+12} y1={FY} x2={FX+FW+12} y2={FY+FH*0.22} stroke="#FF6F00" strokeWidth={1.2}/>
        <Path d={arrow(FX+FW+12, FY, Math.PI/2, 4)} fill="#FF6F00"/>
        <Path d={arrow(FX+FW+12, FY+FH*0.22, -Math.PI/2, 4)} fill="#FF6F00"/>
        <G transform={`translate(${FX+FW+22}, ${FY+FH*0.11}) rotate(-90)`}>
          <Text textAnchor="middle" fontSize={7} fill="#FF6F00" fontWeight="700">
            {boxHeight > 0 ? `${boxHeight}mm` : '? mm'}
          </Text>
        </G>
      </G>
    )}
  </G>;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LiveDrawingProps {
  style: OpeningStyle | null;
  width?: number | null;
  height?: number | null;
  tolerance?: number;
  toleranceW?: number;
  toleranceH?: number;
  boxHeight?: number | null;
  leafCount?: number | null;
  openingSide?: OpeningSide | null;
  previewMode?: boolean;
  previewSize?: number;
  displayWidth?: number;
}

export default function LiveDrawing({
  style,
  width = null,
  height = null,
  tolerance = 0,
  toleranceW,
  toleranceH,
  boxHeight = null,
  leafCount = null,
  openingSide = null,
  previewMode = false,
  previewSize = 80,
  displayWidth,
}: LiveDrawingProps) {
  const tW = toleranceW ?? tolerance;
  const tH = toleranceH ?? tolerance;
  const taglioW = width  != null ? width  - tW : null;
  const taglioH = height != null ? height - tH : null;

  const woodId = `wood_${style ?? 'none'}`;

  const isSubframe  = style === 'subframe_window';
  const isShutter   = style === 'shutter_single' || style === 'shutter_double';
  const isMonoblocco = style === 'roller_blind';
  const resolvedLeaf = Math.max(1, leafCount ?? 1);

  // ── Animation ──────────────────────────────────────────────────────────────
  const [animProgress, setAnimProgress] = useState(previewMode ? 1 : 0);
  const animRef = useRef(new Animated.Value(previewMode ? 1 : 0));

  useEffect(() => {
    if (previewMode) { setAnimProgress(1); return; }
    animRef.current.setValue(0);
    setAnimProgress(0);
    const id = animRef.current.addListener(({ value }) => setAnimProgress(value));
    Animated.timing(animRef.current, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animRef.current.removeListener(id);
  }, [openingSide, resolvedLeaf, style, previewMode]);

  // ── Frame layer ────────────────────────────────────────────────────────────
  let frameLayer: React.ReactNode;
  if (isSubframe) {
    frameLayer = (
      <>
        <WoodPattern id={woodId}/>
        <SubframeBase woodPatternId={woodId}/>
      </>
    );
  } else if (isShutter) {
    // Shutter: frame fill is shutter-green, no hatch
    frameLayer = (
      <G>
        <Rect x={FX} y={FY} width={FW} height={FH} fill={`${C_SHUTTER}cc`} stroke={C_FRAME} strokeWidth={2.5}/>
        <Rect x={GX} y={GY} width={GW} height={GH} fill={C_SHUTTER}/>
        <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}/>
        <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}/>
        <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1}/>
        <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1}/>
      </G>
    );
  } else if (isMonoblocco) {
    frameLayer = null; // drawn inside DefaultIndicator
  } else {
    frameLayer = <FrameBase/>;
  }

  // ── Indicator layer ────────────────────────────────────────────────────────
  let indicatorLayer: React.ReactNode = null;
  if (style) {
    if (openingSide && !isSubframe && !isShutter) {
      indicatorLayer = (
        <>
          {!isMonoblocco && <DefaultIndicator style={style} woodId={woodId}/>}
          <LeafDividers leafCount={resolvedLeaf}/>
          <AnimatedOpening openingSide={openingSide} leafCount={resolvedLeaf} progress={animProgress}/>
        </>
      );
    } else {
      indicatorLayer = (
        <>
          <DefaultIndicator style={style} woodId={woodId}/>
          {leafCount != null && leafCount > 1 && <LeafDividers leafCount={resolvedLeaf}/>}
        </>
      );
    }
  }

  const svgContent = (
    <>
      {frameLayer}
      {indicatorLayer}
    </>
  );

  if (previewMode) {
    const svgW = previewSize;
    const svgH = Math.round(previewSize * VB_H / VB_W);
    return (
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
        {svgContent}
      </Svg>
    );
  }

  const svgW = displayWidth ?? VB_W;
  const svgH = Math.round(svgW * VB_H / VB_W);

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
      {svgContent}
      <DimLines
        luceW={width} luceH={height}
        taglioW={taglioW} taglioH={taglioH}
        boxHeight={isMonoblocco ? boxHeight : undefined}
      />
    </Svg>
  );
}

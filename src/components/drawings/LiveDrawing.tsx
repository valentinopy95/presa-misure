import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Rect, Line, Path, Text, Defs, Pattern, G, Circle,
  LinearGradient, Stop,
} from 'react-native-svg';
import { OpeningStyle, OpeningSide } from '../../types';

// ─── ViewBox & layout ────────────────────────────────────────────────────────
const VB_W = 320, VB_H = 340;
const ML = 50, MR = 12, MT = 36, MB = 52;
const FX = ML, FY = MT;
const FW = VB_W - ML - MR; // 258
const FH = VB_H - MT - MB; // 252
const FT = 18;  // outer frame thickness
const ST = 8;   // sash frame thickness
const GX = FX + FT, GY = FY + FT;   // sash area start
const GW = FW - FT * 2, GH = FH - FT * 2;
const GX2 = GX + GW, GY2 = GY + GH;
const CX = GX + GW / 2, CY = GY + GH / 2;

const DIM_LUCE_Y   = FY + FH + 14;
const DIM_TAGLIO_Y = FY + FH + 30;
const DIM_LUCE_X   = FX - 14;
const DIM_TAGLIO_X = FX - 28;

// ─── Colors ──────────────────────────────────────────────────────────────────
const C_FRAME      = '#263040';   // frame/sash border
const C_FRAME_FILL = '#ECF0F4';   // outer frame fill
const C_SASH_FILL  = '#F7FAFB';   // sash fill (slightly lighter)
const C_GLASS      = 'rgba(176,213,232,0.4)'; // fallback
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

// ─── Patterns ────────────────────────────────────────────────────────────────
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

// Aluminum diagonal hatch (used by catalog cross-section drawings and special cases)
function AlumPatterns() {
  return (
    <Defs>
      <Pattern id="al_hatch" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
        <Rect width="5" height="5" fill="#cdd4dc"/>
        <Line x1="0" y1="5" x2="5" y2="0" stroke="#8c9bab" strokeWidth="0.9"/>
      </Pattern>
    </Defs>
  );
}

// Glass gradient + inner shadow defs
function GlassDefs() {
  return (
    <Defs>
      <LinearGradient id="glass_grad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#EEF7FD" stopOpacity="0.96"/>
        <Stop offset="1" stopColor="#B8D8EE" stopOpacity="0.72"/>
      </LinearGradient>
      <LinearGradient id="frame_grad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F4F7FA" stopOpacity="1"/>
        <Stop offset="1" stopColor="#DDE4EC" stopOpacity="1"/>
      </LinearGradient>
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

// ─── SashFrames: one properly bordered sash rect per leaf ────────────────────
// Each leaf gets its own visible sash frame + glass pane.
// Adjacent sashes share a meeting rail (visible as a slightly heavier border).
function SashFrames({ n }: { n: number }) {
  const sashW = GW / n;
  return (
    <G>
      {Array.from({ length: n }).map((_, i) => {
        const sx = GX + i * sashW;
        const gx = sx + ST;
        const gy = GY + ST;
        const gw = sashW - ST * 2;
        const gh = GH - ST * 2;
        return (
          <G key={i}>
            {/* Sash frame border */}
            <Rect x={sx} y={GY} width={sashW} height={GH}
                  fill={C_SASH_FILL} stroke={C_FRAME} strokeWidth={1.5}/>
            {/* Glass pane */}
            <Rect x={gx} y={gy} width={gw} height={gh}
                  fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
            {/* Glass reflections */}
            <Line x1={gx+5} y1={gy+6} x2={gx+5} y2={gy+gh*0.6}
                  stroke="rgba(255,255,255,0.85)" strokeWidth={3} strokeLinecap="round"/>
            <Line x1={gx+13} y1={gy+6} x2={gx+13} y2={gy+gh*0.38}
                  stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeLinecap="round"/>
          </G>
        );
      })}
    </G>
  );
}

// ─── FrameBase: outer aluminum frame + individual sash frames ────────────────
function FrameBase({ leafCount = 1 }: { leafCount?: number }) {
  return (
    <G>
      {/* Outer fixed frame */}
      <Rect x={FX} y={FY} width={FW} height={FH} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={2.5}/>
      {/* Individual sash frames (one per leaf) */}
      <SashFrames n={leafCount}/>
      {/* Corner marks */}
      <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}/>
      <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}/>
      <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1}/>
      <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1}/>
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

// ─── Leaf dividers (central mullion between sashes) ───────────────────────────
function LeafDividers({ leafCount }: { leafCount: number }) {
  if (leafCount <= 1) return null;
  const mw = FT / 2; // mullion width
  return (
    <G>
      {Array.from({ length: leafCount - 1 }).map((_, i) => {
        const x = GX + (GW * (i + 1)) / leafCount;
        return (
          <G key={i}>
            {/* Mullion bar — same style as outer frame */}
            <Rect x={x - mw / 2} y={FY} width={mw} height={FH}
                  fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={1.5}/>
            {/* Sash gap line */}
            <Line x1={x} y1={GY + ST + 2} x2={x} y2={GY2 - ST - 2}
                  stroke="rgba(180,200,215,0.6)" strokeWidth={0.5}/>
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

// Handle symbol — realistic euro-style lever handle
// hx = x of escutcheon plate; leverRight = lever extends toward right
function HandleSymbol({ hx, hy = CY, leverRight, progress: pr }: {
  hx: number; hy?: number; leverRight: boolean; progress: number;
}) {
  const c = '#1E2832';
  const lx = leverRight ? hx + 3.5 : hx - 15.5; // lever rect start x
  const kx = leverRight ? hx + 17  : hx - 21;    // knob center x
  return (
    <G opacity={pr}>
      {/* Escutcheon plate — tall narrow */}
      <Rect x={hx - 3} y={hy - 15} width={6} height={30} rx={3} fill={c}/>
      {/* Inner slot line on plate */}
      <Line x1={hx} y1={hy - 10} x2={hx} y2={hy + 10}
            stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
      {/* Lever bar */}
      <Rect x={lx} y={hy - 3} width={12} height={6} rx={3} fill={c}/>
      {/* Lever end knob (round) */}
      <Circle cx={kx} cy={hy} r={5} fill={c}/>
      {/* Highlight on knob */}
      <Circle cx={kx + (leverRight ? -1.5 : 1.5)} cy={hy - 1.5} r={1.5}
              fill="rgba(255,255,255,0.25)"/>
    </G>
  );
}

// Hinge marks — 3 hinges along the hinge-side edge
function HingeMarks({ x, color }: { x: number; color: string }) {
  const positions = [GY + GH * 0.18, GY + GH * 0.5, GY + GH * 0.82];
  return (
    <G>
      {positions.map((y, i) => (
        <G key={i}>
          <Rect x={x - 4} y={y - 5} width={8} height={10}
                rx={1.5} fill="white" stroke={color} strokeWidth={1.5}/>
          {/* Center pin line */}
          <Line x1={x - 4} y1={y} x2={x + 4} y2={y}
                stroke={color} strokeWidth={0.7}/>
        </G>
      ))}
    </G>
  );
}

// V mark: two lines from vertex (vx,vy) to animated endpoints
function VMark({ vx, vy, ex, ey1, ey2, progress: pr, color, sw = 2 }: {
  vx: number; vy: number; ex: number; ey1: number; ey2: number;
  progress: number; color: string; sw?: number;
}) {
  const tx = vx + (ex - vx) * pr;
  const ty1 = vy + (ey1 - vy) * pr;
  const ty2 = vy + (ey2 - vy) * pr;
  return (
    <G>
      <Line x1={p(vx)} y1={p(vy)} x2={p(tx)} y2={p(ty1)}
            stroke={color} strokeWidth={sw} strokeLinecap="round"/>
      <Line x1={p(vx)} y1={p(vy)} x2={p(tx)} y2={p(ty2)}
            stroke={color} strokeWidth={sw} strokeLinecap="round"/>
    </G>
  );
}

function AnimatedOpening({ openingSide, leafCount, progress }: AnimProps) {
  const c = C_IND;
  const n = Math.max(1, leafCount);
  const sashW = GW / n;
  const M = 12; // inset margin from glass edge

  // Standard convention: triangle vertex at HANDLE side (opening side),
  // arms extend to HINGE corners. The ">" points toward where the window opens.

  const multi = n >= 2;

  if (openingSide === 'right') {
    const sx = GX + sashW * (n - 1), sx2 = sx + sashW;
    // Multi-leaf: cerniera DESTRA esterna, maniglia al CENTRO (sinistra dell'anta)
    // Singola: cerniera sinistra, maniglia destra
    return multi ? (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx + 10} leverRight={true} progress={progress}/>
      </G>
    ) : (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx2 - 10} leverRight={false} progress={progress}/>
      </G>
    );
  }

  if (openingSide === 'left') {
    const sx = GX, sx2 = GX + sashW;
    // Multi-leaf: cerniera SINISTRA esterna, maniglia al CENTRO (destra dell'anta)
    // Singola: cerniera destra, maniglia sinistra
    return multi ? (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx2 - 10} leverRight={false} progress={progress}/>
      </G>
    ) : (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx + 10} leverRight={true} progress={progress}/>
      </G>
    );
  }

  if (openingSide === 'center') {
    // 3 ante: anta centrale (indice 1), cerniera destra, maniglia sinistra (verso centro)
    const sx = GX + sashW, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx + 10} leverRight={true} progress={progress}/>
      </G>
    );
  }

  if (openingSide === 'center-left') {
    // 4 ante: anta centro-sinistra (indice 1), cerniera sinistra, maniglia destra (centro)
    const sx = GX + sashW, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx2 - 10} leverRight={false} progress={progress}/>
      </G>
    );
  }

  if (openingSide === 'center-right') {
    // 4 ante: anta centro-destra (indice 2), cerniera destra, maniglia sinistra (centro)
    const sx = GX + sashW * 2, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        <HandleSymbol hx={sx + 10} leverRight={true} progress={progress}/>
      </G>
    );
  }

  if (openingSide === 'bottom') {
    // Vasistas: cerniera in alto, maniglia in basso al centro
    return (
      <G opacity={progress}>
        <Line x1={GX+6} y1={GY+4} x2={GX2-6} y2={GY+4} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={CX} y1={GY2-M} x2={GX+M} y2={GY+M} stroke={c} strokeWidth={2} strokeLinecap="round"/>
        <Line x1={CX} y1={GY2-M} x2={GX2-M} y2={GY+M} stroke={c} strokeWidth={2} strokeLinecap="round"/>
        <HandleSymbol hx={CX} hy={GY2-20} leverRight={true} progress={1}/>
      </G>
    );
  }

  if (openingSide === 'top') {
    // Vasistas inverso: cerniera in basso, maniglia in alto al centro
    return (
      <G opacity={progress}>
        <Line x1={GX+6} y1={GY2-4} x2={GX2-6} y2={GY2-4} stroke={c} strokeWidth={3} strokeLinecap="round"/>
        <Line x1={CX} y1={GY+M} x2={GX+M} y2={GY2-M} stroke={c} strokeWidth={2} strokeLinecap="round"/>
        <Line x1={CX} y1={GY+M} x2={GX2-M} y2={GY2-M} stroke={c} strokeWidth={2} strokeLinecap="round"/>
        <HandleSymbol hx={CX} hy={GY+20} leverRight={true} progress={1}/>
      </G>
    );
  }

  return null;
}

// ─── Sliding indicator: n sashes, active one moves ───────────────────────────
function SlidingIndicator({ leafCount, openingSide, progress }: AnimProps) {
  const c = C_IND;
  const n = Math.max(2, leafCount);
  const sashW = GW / n;

  // Which sash index slides?
  let activeIdx = 0;
  if (openingSide === 'left')         activeIdx = 0;
  else if (openingSide === 'right')   activeIdx = n - 1;
  else if (openingSide === 'center')  activeIdx = Math.floor(n / 2);
  else if (openingSide === 'center-left')  activeIdx = 1;
  else if (openingSide === 'center-right') activeIdx = n - 2;

  // Arrow direction: left sashes slide right, right sashes slide left
  const slidesRight = activeIdx < n / 2;

  return (
    <G>
      {Array.from({ length: n }).map((_, i) => {
        const sx = GX + i * sashW;
        const gx = sx + ST, gy = GY + ST, gw = sashW - ST * 2, gh = GH - ST * 2;
        const isActive = i === activeIdx;
        return (
          <G key={i}>
            <Rect x={sx} y={GY} width={sashW} height={GH}
                  fill={C_SASH_FILL} stroke={isActive ? c : 'rgba(100,150,200,0.35)'}
                  strokeWidth={isActive ? 2 : 1}/>
            <Rect x={gx} y={gy} width={gw} height={gh}
                  fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
            {isActive && (
              <G opacity={progress}>
                {/* Slide arrow */}
                <Line x1={sx + sashW * 0.25} y1={CY} x2={sx + sashW * 0.75} y2={CY}
                      stroke={c} strokeWidth={1.8}/>
                <Path d={arrow(slidesRight ? sx + sashW * 0.75 : sx + sashW * 0.25, CY,
                               slidesRight ? 0 : Math.PI)} fill={c}/>
                {/* Handle on opposite side of arrow */}
                <Rect x={slidesRight ? sx + 3 : sx + sashW - 8}
                      y={CY - 10} width={5} height={20} rx={2.5} fill={c}/>
              </G>
            )}
          </G>
        );
      })}
    </G>
  );
}

// ─── Default style-based indicator (used when openingSide is null) ────────────
function DefaultIndicator({ style, woodId, leafCount = 1, openingSide }: { style: OpeningStyle; woodId: string; leafCount?: number; openingSide?: OpeningSide | null }) {
  const c = C_IND;
  const da = '5,3';
  const sw = 1.6;

  switch (style) {
    case 'window_single':
      // Hinge left, handle right — ">" vertex at right
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <VMark vx={GX2-12} vy={CY} ex={GX+12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <HandleSymbol hx={GX2-10} leverRight={false} progress={1}/>
      </G>;

    case 'window_double':
      // Left leaf: hinge outer-left, opens right toward center
      // Right leaf: hinge outer-right, opens left toward center — "><" meeting in middle
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <HingeMarks x={GX2-4} color={c}/>
        <VMark vx={CX-8} vy={CY} ex={GX+12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <VMark vx={CX+8} vy={CY} ex={GX2-12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <HandleSymbol hx={CX-8} leverRight={true} progress={1}/>
        <HandleSymbol hx={CX+8} leverRight={false} progress={1}/>
      </G>;

    case 'window_sliding':
      return <G>
        {/* Two sashes with sash borders */}
        <Rect x={GX} y={GY} width={GW/2+6} height={GH} fill={C_SASH_FILL} stroke={c} strokeWidth={1.2}/>
        <Rect x={GX+ST} y={GY+ST} width={GW/2+6-ST*2} height={GH-ST*2} fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
        <Rect x={CX-6} y={GY} width={GW/2+6} height={GH} fill={C_SASH_FILL} stroke={c} strokeWidth={1.8}/>
        <Rect x={CX-6+ST} y={GY+ST} width={GW/2+6-ST*2} height={GH-ST*2} fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
        {/* Arrow indicator */}
        <Line x1={CX+6} y1={CY} x2={GX2-16} y2={CY} stroke={c} strokeWidth={1.8}/>
        <Path d={arrow(GX2-16, CY, 0)} fill={c}/>
        {/* Handle on front sash */}
        <Rect x={CX-7} y={CY-10} width={5} height={20} rx={2.5} fill={c}/>
      </G>;

    case 'window_tilt_turn': {
      // X pattern = opens both ways; handle at bottom center per leaf
      const n = Math.max(1, leafCount);
      const sashW = GW / n;
      return <G>
        {Array.from({length: n}).map((_, i) => {
          const sx  = GX + i * sashW;
          const sx2 = sx + sashW;
          const scx = (sx + sx2) / 2;
          const hingeX = i === 0 ? sx + 4 : sx2 - 4;
          return <G key={i}>
            <Line x1={sx+4}  y1={GY+6}   x2={sx2-4} y2={GY2-6} stroke={c} strokeWidth={1.4}/>
            <Line x1={sx2-4} y1={GY+6}   x2={sx+4}  y2={GY2-6} stroke={c} strokeWidth={1.4}/>
            <Line x1={hingeX} y1={GY+8}  x2={hingeX} y2={GY2-8}
                  stroke={c} strokeWidth={3} strokeLinecap="round"/>
            <Line x1={sx+6}  y1={GY2-4}  x2={sx2-6} y2={GY2-4}
                  stroke={c} strokeWidth={3} strokeLinecap="round"/>
            <HandleSymbol hx={scx} hy={GY2-20} leverRight={i % 2 === 0} progress={1}/>
          </G>;
        })}
      </G>;
    }

    case 'door_single':
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <VMark vx={GX2-12} vy={CY} ex={GX+12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <HandleSymbol hx={GX2-10} leverRight={false} progress={1}/>
      </G>;

    case 'door_entrance': {
      // Portoncino: anta cieca, 4 pannelli decorativi (2×2), 3 cerniere, maniglia+serratura
      const iW   = GW - ST * 2;  // inner width
      const iH   = GH - ST * 2;  // inner height
      const iX   = GX + ST;      // inner start x
      const iY   = GY + ST;      // inner start y
      const pp   = 10;           // panel padding from inner edge
      const gap  = 8;            // gap between panels
      const colW = (iW - pp * 2 - gap) / 2;
      const row1H = Math.round(iH * 0.35);  // upper panels (shorter)
      const row2H = iH - pp * 2 - gap - row1H; // lower panels (taller)
      const col1X = iX + pp;
      const col2X = iX + pp + colW + gap;
      const row1Y = iY + pp;
      const row2Y = iY + pp + row1H + gap;
      const lockY = row2Y + row2H * 0.4;
      return <G>
        {/* Anta piena */}
        <Rect x={GX} y={GY} width={GW} height={GH} fill={C_FRAME_FILL}/>
        {/* 4 pannelli incassati */}
        {/* Top-left */}
        <Rect x={col1X} y={row1Y} width={colW} height={row1H}
              fill="#E0E4E8" stroke={C_FRAME} strokeWidth={1.5} rx={2}/>
        {/* Top-right */}
        <Rect x={col2X} y={row1Y} width={colW} height={row1H}
              fill="#E0E4E8" stroke={C_FRAME} strokeWidth={1.5} rx={2}/>
        {/* Bottom-left */}
        <Rect x={col1X} y={row2Y} width={colW} height={row2H}
              fill="#E0E4E8" stroke={C_FRAME} strokeWidth={1.5} rx={2}/>
        {/* Bottom-right */}
        <Rect x={col2X} y={row2Y} width={colW} height={row2H}
              fill="#E0E4E8" stroke={C_FRAME} strokeWidth={1.5} rx={2}/>
        {/* 3 cerniere sinistra */}
        <HingeMarks x={GX+4} color={c}/>
        {/* Maniglia */}
        <HandleSymbol hx={GX2-12} leverRight={false} progress={1}/>
        {/* Cilindro serratura */}
        <Rect x={GX2-16} y={lockY-5} width={8} height={10}
              fill={c} rx={2} stroke={C_FRAME} strokeWidth={0.8}/>
        <Circle cx={GX2-12} cy={lockY} r={2.5} fill="#fff" opacity={0.5}/>
      </G>;
    }

    case 'door_double':
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Rect x={CX-FT/2} y={FY} width={FT} height={FH} fill="url(#al_hatch)" stroke={C_FRAME} strokeWidth={1}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        <HingeMarks x={GX+4} color={c}/>
        <HingeMarks x={GX2-4} color={c}/>
        <VMark vx={CX-8} vy={CY} ex={GX+12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <VMark vx={CX+8} vy={CY} ex={GX2-12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <HandleSymbol hx={CX-8} leverRight={true} progress={1}/>
        <HandleSymbol hx={CX+8} leverRight={false} progress={1}/>
      </G>;

    case 'door_sliding':
      return <G>
        <Rect x={GX} y={GY} width={GW/2+6} height={GH} fill={C_SASH_FILL} stroke={c} strokeWidth={1.2}/>
        <Rect x={GX+ST} y={GY+ST} width={GW/2+6-ST*2} height={GH-ST*2} fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
        <Rect x={CX-6} y={GY} width={GW/2+6} height={GH} fill={C_SASH_FILL} stroke={c} strokeWidth={1.8}/>
        <Rect x={CX-6+ST} y={GY+ST} width={GW/2+6-ST*2} height={GH-ST*2} fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
        <Line x1={CX+6} y1={CY} x2={GX2-16} y2={CY} stroke={c} strokeWidth={1.8}/>
        <Path d={arrow(GX2-16, CY, 0)} fill={c}/>
        <Rect x={CX-7} y={CY-10} width={5} height={20} rx={2.5} fill={c}/>
      </G>;

    case 'door_french':
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Rect x={CX-FT/2} y={FY} width={FT} height={FH} fill="url(#al_hatch)" stroke={C_FRAME} strokeWidth={1}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        <HingeMarks x={GX+4} color={c}/>
        <HingeMarks x={GX2-4} color={c}/>
        <VMark vx={CX-8} vy={CY} ex={GX+12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <VMark vx={CX+8} vy={CY} ex={GX2-12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <HandleSymbol hx={CX-8} leverRight={true} progress={1}/>
        <HandleSymbol hx={CX+8} leverRight={false} progress={1}/>
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
    case 'shutter_single':
    case 'shutter_double': {
      // Disegno dinamico basato su leafCount
      const n      = Math.max(1, leafCount);
      const sashW  = GW / n;
      const slats  = 8;
      const slotH  = GH / slats;
      // openingSide 'right' → prima anta con cerniera a destra (inverte l'alternanza)
      const startRight = openingSide === 'right';

      return <G>
        {/* Ante */}
        {Array.from({length: n}).map((_, i) => {
          const sx  = GX + i * sashW;
          const sx2 = sx + sashW;
          const hingeLeft = startRight ? (i % 2 !== 0) : (i % 2 === 0);
          const hingeX    = hingeLeft ? sx + 4 : sx2 - 4;
          const freeX     = hingeLeft ? sx2 - 4 : sx + 4;

          return <G key={i}>
            {/* Lamelle */}
            {Array.from({length: slats + 1}).map((_, j) => (
              <Line key={j}
                x1={sx + 2} y1={GY + j * slotH}
                x2={sx2 - 2} y2={GY + j * slotH}
                stroke={C_SLAT} strokeWidth={1}/>
            ))}
            {/* Cerniere */}
            {[0.25, 0.5, 0.75].map((f, j) => (
              <Circle key={j}
                cx={hingeX} cy={GY + GH * f} r={3}
                fill={C_SHUTTER} stroke="white" strokeWidth={1}/>
            ))}
            {/* Arco apertura */}
            <Path
              d={`M ${p(hingeX)} ${p(GY)} Q ${p(freeX)} ${p(GY)} ${p(freeX)} ${p(GY2)}`}
              fill="none" stroke={C_SHUTTER} strokeWidth={1.5} strokeDasharray="5,3"/>
            <Path d={arrow(freeX, GY2, hingeLeft ? Math.PI * 0.75 : Math.PI * 0.25)}
                  fill={C_SHUTTER}/>
          </G>;
        })}

        {/* Montanti divisori tra le ante */}
        {Array.from({length: n - 1}).map((_, i) => {
          const dx = GX + (i + 1) * sashW;
          return <G key={i}>
            <Line x1={p(dx)} y1={FY} x2={p(dx)} y2={FY + FH}
                  stroke={C_FRAME} strokeWidth={FT / 2}/>
            <Rect x={dx - 1} y={GY} width={2} height={GH} fill="white"/>
          </G>;
        })}
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
        <Rect x={FX} y={winY} width={FW} height={winH} fill="url(#al_hatch)" stroke={C_FRAME} strokeWidth={2}/>
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

    // ── ZANZARIERE ────────────────────────────────────────────────────────────
    case 'mosquito_fixed': {
      const rows = 14, cols = 9;
      const cellW = GW / cols, cellH = GH / rows;
      return <G>
        <Rect x={GX} y={GY} width={GW} height={GH} fill="rgba(100,170,210,0.08)"/>
        {Array.from({length: rows + 1}).map((_, i) => (
          <Line key={`h${i}`} x1={GX} y1={GY + i * cellH} x2={GX2} y2={GY + i * cellH}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {Array.from({length: cols + 1}).map((_, i) => (
          <Line key={`v${i}`} x1={GX + i * cellW} y1={GY} x2={GX + i * cellW} y2={GY2}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        <G transform={`translate(${CX}, ${CY})`}>
          <Text textAnchor="middle" fontSize={9} fill="rgba(30,80,130,0.6)" fontWeight="700">FISSO</Text>
        </G>
      </G>;
    }

    case 'mosquito_rollup': {
      const casH = FH * 0.13;
      const meshY = GY;
      const meshH = GH * 0.62;
      const rows = 9, cols = 7;
      const cellW = GW / cols, cellH = meshH / rows;
      const handleY = meshY + meshH;
      return <G>
        {/* Cassonetto */}
        <Rect x={FX} y={FY} width={FW} height={casH} fill={C_BOX} stroke={C_FRAME} strokeWidth={2}/>
        <G transform={`translate(${CX}, ${FY + casH / 2 + 3})`}>
          <Text textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.85)" fontWeight="700">
            SALI / SCENDI
          </Text>
        </G>
        {/* Mesh panel (parzialmente calato) */}
        <Rect x={GX} y={meshY} width={GW} height={meshH} fill="rgba(100,170,210,0.08)"/>
        {Array.from({length: rows + 1}).map((_, i) => (
          <Line key={`h${i}`} x1={GX} y1={meshY + i * cellH} x2={GX2} y2={meshY + i * cellH}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {Array.from({length: cols + 1}).map((_, i) => (
          <Line key={`v${i}`} x1={GX + i * cellW} y1={meshY} x2={GX + i * cellW} y2={meshY + meshH}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {/* Barra maniglia */}
        <Rect x={GX + 4} y={handleY - 3} width={GW - 8} height={6} rx={3}
              fill={C_IND} stroke={C_FRAME} strokeWidth={0.8}/>
        {/* Freccia giù */}
        <Line x1={CX} y1={handleY + 4} x2={CX} y2={handleY + 16}
              stroke={C_IND} strokeWidth={1.8}/>
        <Path d={arrow(CX, handleY + 16, Math.PI / 2, 5)} fill={C_IND}/>
      </G>;
    }

    case 'mosquito_lateral': {
      const goesLeft = openingSide !== 'right';
      const scrW = Math.round(GW * 0.65);
      const scrX = goesLeft ? GX2 - scrW : GX;
      const rows = 12, cols = 5;
      const cellW = scrW / cols, cellH = GH / rows;
      const handleX = goesLeft ? scrX - 2 : scrX + scrW - 2;
      const arrowTipX = goesLeft ? GX + 10 : GX2 - 10;
      const arrowBaseX = goesLeft ? scrX + scrW * 0.4 : scrX + scrW * 0.6;
      return <G>
        {/* Pannello rete */}
        <Rect x={scrX} y={GY} width={scrW} height={GH}
              fill="rgba(100,170,210,0.08)" stroke="rgba(60,110,160,0.4)" strokeWidth={1}/>
        {Array.from({length: rows + 1}).map((_, i) => (
          <Line key={`h${i}`} x1={scrX} y1={GY + i * cellH} x2={scrX + scrW} y2={GY + i * cellH}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {Array.from({length: cols + 1}).map((_, i) => (
          <Line key={`v${i}`} x1={scrX + i * cellW} y1={GY} x2={scrX + i * cellW} y2={GY2}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {/* Maniglia sul bordo libero */}
        <Rect x={handleX} y={CY - 14} width={4} height={28} rx={2} fill={C_IND}/>
        {/* Freccia di scorrimento */}
        <Line x1={arrowBaseX} y1={CY} x2={arrowTipX} y2={CY}
              stroke={C_IND} strokeWidth={1.8} strokeDasharray="5,3"/>
        <Path d={arrow(arrowTipX, CY, goesLeft ? Math.PI : 0, 5)} fill={C_IND}/>
      </G>;
    }

    default:
      return null;
  }
}

// ─── Dimension lines ──────────────────────────────────────────────────────────
interface DimLinesProps {
  luceW: number | null; luceH: number | null;
  taglioW: number | null; taglioH: number | null;
  boxHeight?: number | null;
  dimMode?: 'taglio' | 'luce';
}

function DimLines({ luceW, luceH, taglioW, taglioH, boxHeight, dimMode = 'taglio' }: DimLinesProps) {
  const showTaglio = dimMode === 'taglio';
  const wVal  = showTaglio ? taglioW : luceW;
  const hVal  = showTaglio ? taglioH : luceH;
  const wPfx  = showTaglio ? 'Lt' : 'Ll';
  const hPfx  = showTaglio ? 'Ht' : 'Hl';
  const wLbl  = wVal != null ? `${wPfx} ${wVal} mm` : `${wPfx} — mm`;
  const hLbl  = hVal != null ? `${hPfx} ${hVal} mm` : `${hPfx} — mm`;
  const dimY  = showTaglio ? DIM_TAGLIO_Y : DIM_LUCE_Y;
  const dimX  = showTaglio ? DIM_TAGLIO_X : DIM_LUCE_X;
  const arrowSz = showTaglio ? 3.5 : 5;
  const sw    = showTaglio ? 0.9 : 1.4;
  const fs    = showTaglio ? 8 : 9;
  const fw    = showTaglio ? '600' : '700';
  const c     = showTaglio ? C_DIM_TAG : C_DIM_LUCE;

  return <G>
    {/* Leader lines from frame corners to dim line */}
    <Line x1={FX}    y1={FY+FH} x2={FX}    y2={dimY+6} stroke={c} strokeWidth={0.8}/>
    <Line x1={FX+FW} y1={FY+FH} x2={FX+FW} y2={dimY+6} stroke={c} strokeWidth={0.8}/>
    <Line x1={FX}    y1={FY}    x2={dimX-6} y2={FY}    stroke={c} strokeWidth={0.8}/>
    <Line x1={FX}    y1={FY+FH} x2={dimX-6} y2={FY+FH} stroke={c} strokeWidth={0.8}/>

    {/* Horizontal dim line — width */}
    <Line x1={FX} y1={dimY} x2={FX+FW} y2={dimY} stroke={c} strokeWidth={sw}/>
    <Path d={arrow(FX,    dimY, 0,         arrowSz)} fill={c}/>
    <Path d={arrow(FX+FW, dimY, Math.PI,   arrowSz)} fill={c}/>
    <G transform={`translate(${FX+FW/2}, ${dimY-4})`}>
      <Text textAnchor="middle" fontSize={fs} fontWeight={fw} fill={c}>{wLbl}</Text>
    </G>

    {/* Vertical dim line — height */}
    <Line x1={dimX} y1={FY} x2={dimX} y2={FY+FH} stroke={c} strokeWidth={sw}/>
    <Path d={arrow(dimX, FY,    Math.PI/2,  arrowSz)} fill={c}/>
    <Path d={arrow(dimX, FY+FH, -Math.PI/2, arrowSz)} fill={c}/>
    <G transform={`translate(${dimX}, ${FY+FH/2}) rotate(-90)`}>
      <Text textAnchor="middle" fontSize={fs} fontWeight={fw} fill={c}>{hLbl}</Text>
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
  dimMode?: 'taglio' | 'luce';
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
  dimMode = 'taglio',
}: LiveDrawingProps) {
  const tW = toleranceW ?? tolerance;
  const tH = toleranceH ?? tolerance;
  const taglioW = width  != null ? width  - tW : null;
  const taglioH = height != null ? height - tH : null;

  const woodId = `wood_${style ?? 'none'}`;

  const isSubframe    = style === 'subframe_window';
  const isShutter     = style === 'shutter_single' || style === 'shutter_double';
  const isMonoblocco  = style === 'roller_blind';
  const isSlidingType = style === 'window_sliding' || style === 'door_sliding';
  const isZanzariera  = style === 'mosquito_fixed' || style === 'mosquito_rollup' || style === 'mosquito_lateral';
  const resolvedLeaf  = Math.max(1, leafCount ?? 1);

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
  } else if (isZanzariera) {
    // Thin aluminum frame, inner area left empty for DefaultIndicator mesh
    frameLayer = (
      <>
        <GlassDefs/>
        <G>
          <Rect x={FX} y={FY} width={FW} height={FH}
                fill="#DDE8EE" stroke={C_FRAME} strokeWidth={2.5}/>
          <Rect x={GX} y={GY} width={GW} height={GH} fill="#EEF4F8"/>
          <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}/>
          <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}/>
          <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1}/>
          <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1}/>
        </G>
      </>
    );
  } else if (isMonoblocco) {
    frameLayer = <><AlumPatterns/><GlassDefs/></>;
  } else if (isSlidingType) {
    // Sliding: just outer frame — DefaultIndicator renders the overlapping sliding sashes
    frameLayer = (
      <>
        <AlumPatterns/>
        <GlassDefs/>
        <G>
          <Rect x={FX} y={FY} width={FW} height={FH}
                fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={2.5}/>
          <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}/>
          <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}/>
          <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1}/>
          <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1}/>
        </G>
      </>
    );
  } else {
    // Casement / fixed: draw one visible sash frame per leaf
    frameLayer = (
      <>
        <AlumPatterns/>
        <GlassDefs/>
        <FrameBase leafCount={resolvedLeaf}/>
      </>
    );
  }

  // ── Indicator layer ────────────────────────────────────────────────────────
  let indicatorLayer: React.ReactNode = null;
  if (style) {
    if (openingSide && !isSubframe && !isShutter && !isMonoblocco && !isZanzariera) {
      if (isSlidingType) {
        indicatorLayer = (
          <SlidingIndicator
            openingSide={openingSide}
            leafCount={resolvedLeaf}
            progress={animProgress}
          />
        );
      } else {
        indicatorLayer = (
          <AnimatedOpening
            openingSide={openingSide}
            leafCount={resolvedLeaf}
            progress={animProgress}
          />
        );
      }
    } else {
      indicatorLayer = <DefaultIndicator style={style} woodId={woodId} leafCount={resolvedLeaf} openingSide={openingSide}/>;
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
        dimMode={dimMode}
      />
    </Svg>
  );
}

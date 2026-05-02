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

// ─── SubframeBase: U-shape (3 sides) or closed rectangle (4 sides) ──────────
function SubframeBase({ woodPatternId, showBottom = false }: { woodPatternId: string; showBottom?: boolean }) {
  return (
    <G>
      {/* Left bar */}
      <Rect x={FX} y={FY} width={FT} height={FH} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Right bar */}
      <Rect x={FX+FW-FT} y={FY} width={FT} height={FH} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Top bar */}
      <Rect x={FX} y={FY} width={FW} height={FT} fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
      {/* Bottom bar (traverso inferiore) — visible only when hasBattente */}
      {showBottom && (
        <>
          <Rect x={FX} y={FY+FH-FT} width={FW} height={FT}
                fill={`url(#${woodPatternId})`} stroke={C_SUBFRAME_F} strokeWidth={2}/>
          {/* thin threshold strip at very bottom, like soglia */}
          <Rect x={FX+2} y={FY+FH-5} width={FW-4} height={5}
                fill={C_SUBFRAME_B} opacity={0.55}/>
        </>
      )}
      {/* Interior white (covers joint areas; height stops at bottom bar when present) */}
      <Rect x={GX} y={GY} width={GW} height={showBottom ? GH : GH+FT+4} fill="white"/>
      {/* Inner dashed border */}
      {showBottom ? (
        // Closed rectangle — 4 sides
        <Rect x={GX+4} y={GY+4} width={GW-8} height={GH-8}
              fill="none" stroke={C_SUBFRAME_B} strokeWidth={1} strokeDasharray="4,2" rx={1}/>
      ) : (
        // U-shape: top + two sides, open at bottom
        <Path
          d={`M ${GX+4} ${FY+FH+2} L ${GX+4} ${GY+4} L ${GX2-4} ${GY+4} L ${GX2-4} ${FY+FH+2}`}
          fill="none" stroke={C_SUBFRAME_B} strokeWidth={1} strokeDasharray="4,2"
        />
      )}
      {/* Corner marks — always top; add bottom corners when 4-sided */}
      <CornerMarks x={FX}    y={FY} dx={1}  dy={1}  color={C_SUBFRAME_F}/>
      <CornerMarks x={FX+FW} y={FY} dx={-1} dy={1}  color={C_SUBFRAME_F}/>
      {showBottom && (
        <>
          <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1} color={C_SUBFRAME_F}/>
          <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1} color={C_SUBFRAME_F}/>
        </>
      )}
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
  isDoor?: boolean;
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

// ─── Cremonese — window espagnolette lock ────────────────────────────────────
// Vertical rod running full height of sash, T-handle at center, engagement
// bolts at top/bottom. hx = x position on the closing stile; flip = handle left
function CremoneseSymbol({ hx, hy = CY, flip = false }: {
  hx: number; hy?: number; flip?: boolean;
}) {
  const c = C_IND;
  const lx = flip ? hx - 14 : hx + 2;   // lever rect start x
  const kx = flip ? hx - 18 : hx + 16;  // knob center x
  return (
    <G>
      {/* Vertical rod */}
      <Line x1={hx} y1={GY + 14} x2={hx} y2={GY2 - 14}
            stroke={c} strokeWidth={1.8}/>
      {/* Top engagement bolt */}
      <Rect x={hx - 5} y={GY + 8} width={10} height={9} rx={2} fill={c}/>
      {/* Bottom engagement bolt */}
      <Rect x={hx - 5} y={GY2 - 17} width={10} height={9} rx={2} fill={c}/>
      {/* Central backplate */}
      <Rect x={hx - 4} y={hy - 18} width={8} height={36} rx={2.5} fill={c}/>
      {/* Horizontal T-handle lever */}
      <Rect x={lx} y={hy - 4} width={12} height={8} rx={4} fill={c}/>
      {/* Knob/grip */}
      <Circle cx={kx} cy={hy} r={5} fill={c}/>
      <Circle cx={kx + (flip ? 1.5 : -1.5)} cy={hy - 1.5} r={1.8}
              fill="rgba(255,255,255,0.3)"/>
    </G>
  );
}

// ─── Maniglia Porta — door lever handle with rosette & cylinder ───────────────
// Round rosette, horizontal lever, lock cylinder below. hx = rosette center x
function ManigliaDoor({ hx, hy = CY, leverRight }: {
  hx: number; hy?: number; leverRight: boolean;
}) {
  const c = C_IND;
  const lx = leverRight ? hx + 8 : hx - 8 - 16; // lever rect start x
  const kx = leverRight ? hx + 26 : hx - 26;     // knob center x
  return (
    <G>
      {/* Round rosette */}
      <Circle cx={hx} cy={hy} r={9} fill={c}/>
      <Circle cx={hx} cy={hy} r={5.5} fill="rgba(255,255,255,0.18)"/>
      {/* Lever handle */}
      <Rect x={lx} y={hy - 4} width={16} height={8} rx={4} fill={c}/>
      <Circle cx={kx} cy={hy} r={5.5} fill={c}/>
      <Circle cx={kx + (leverRight ? -1.5 : 1.5)} cy={hy - 1.5} r={1.8}
              fill="rgba(255,255,255,0.28)"/>
      {/* Lock cylinder */}
      <Rect x={hx - 6} y={hy + 12} width={12} height={17} rx={3.5} fill={c}/>
      <Circle cx={hx} cy={hy + 18} r={4} fill="rgba(255,255,255,0.2)"/>
      <Rect x={hx - 1.5} y={hy + 19} width={3} height={7} rx={1} fill="rgba(255,255,255,0.15)"/>
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

function AnimatedOpening({ openingSide, leafCount, progress, isDoor = false }: AnimProps) {
  const c = C_IND;
  const n = Math.max(1, leafCount);
  const sashW = GW / n;
  const M = 12; // inset margin from glass edge

  // Render the appropriate handle based on window/door type
  const Handle = (hx: number, leverRight: boolean) => isDoor
    ? <G opacity={progress}><ManigliaDoor hx={hx} leverRight={leverRight}/></G>
    : <G opacity={progress}><CremoneseSymbol hx={hx} flip={!leverRight}/></G>;

  const multi = n >= 2;

  if (openingSide === 'right') {
    const sx = GX + sashW * (n - 1), sx2 = sx + sashW;
    return multi ? (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx + (isDoor ? 14 : 10), true)}
      </G>
    ) : (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx2 - (isDoor ? 14 : 10), false)}
      </G>
    );
  }

  if (openingSide === 'left') {
    const sx = GX, sx2 = GX + sashW;
    return multi ? (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx2 - (isDoor ? 14 : 10), false)}
      </G>
    ) : (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx + (isDoor ? 14 : 10), true)}
      </G>
    );
  }

  if (openingSide === 'center') {
    const sx = GX + sashW, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx + (isDoor ? 14 : 10), true)}
      </G>
    );
  }

  if (openingSide === 'center-left') {
    const sx = GX + sashW, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx + 4} color={c}/>
        <VMark vx={sx2 - M} vy={CY} ex={sx + M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx2 - (isDoor ? 14 : 10), false)}
      </G>
    );
  }

  if (openingSide === 'center-right') {
    const sx = GX + sashW * 2, sx2 = sx + sashW;
    return (
      <G>
        <HingeMarks x={sx2 - 4} color={c}/>
        <VMark vx={sx + M} vy={CY} ex={sx2 - M} ey1={GY + M} ey2={GY2 - M}
               progress={progress} color={c}/>
        {Handle(sx + (isDoor ? 14 : 10), true)}
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
function DefaultIndicator({ style, woodId, leafCount = 1, openingSide, boxHeight, totalHeight, blindType }: {
  style: OpeningStyle; woodId: string; leafCount?: number; openingSide?: OpeningSide | null;
  boxHeight?: number | null; totalHeight?: number | null; blindType?: 'cintino' | 'motore' | null;
}) {
  const c = C_IND;
  const da = '5,3';
  const sw = 1.6;

  switch (style) {
    case 'window_fixed':
      // Fisso: vetro incassato direttamente nel telaio, badge FISSO, nessuna maniglia
      return <G>
        {/* Fermavetro strips (4 thin bars around glass edge) */}
        <Rect x={GX} y={GY} width={GW} height={5} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={0.8}/>
        <Rect x={GX} y={GY2-5} width={GW} height={5} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={0.8}/>
        <Rect x={GX} y={GY} width={5} height={GH} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={0.8}/>
        <Rect x={GX2-5} y={GY} width={5} height={GH} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={0.8}/>
        {/* FISSO badge */}
        <Rect x={CX-24} y={CY-13} width={48} height={26} rx={6}
              fill="rgba(21,101,192,0.10)" stroke={C_IND} strokeWidth={1.4}/>
        <G transform={`translate(${CX}, ${CY+5})`}>
          <Text textAnchor="middle" fontSize={11} fill={C_IND} fontWeight="800">FISSO</Text>
        </G>
      </G>;

    case 'window_single':
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <VMark vx={GX2-12} vy={CY} ex={GX+12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <CremoneseSymbol hx={GX2-10} flip={true}/>
      </G>;

    case 'window_double':
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <HingeMarks x={GX2-4} color={c}/>
        <VMark vx={CX-8} vy={CY} ex={GX+12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <VMark vx={CX+8} vy={CY} ex={GX2-12} ey1={GY+12} ey2={GY2-12} progress={1} color={c}/>
        <CremoneseSymbol hx={CX-8} flip={false}/>
        <CremoneseSymbol hx={CX+8} flip={true}/>
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
            <CremoneseSymbol hx={scx} hy={GY2-20} flip={i % 2 !== 0}/>
          </G>;
        })}
      </G>;
    }

    case 'door_single':
      return <G>
        <HingeMarks x={GX+4} color={c}/>
        <VMark vx={GX2-12} vy={CY} ex={GX+12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <ManigliaDoor hx={GX2-14} leverRight={false}/>
      </G>;

    case 'door_entrance': {
      const doorBg  = '#2a3240';
      const panelBg = '#333d50';
      const hi      = 'rgba(255,255,255,0.20)';
      const sh      = 'rgba(0,0,0,0.55)';
      const pp = 8, g = 6, bevel = 4;

      const bugna = (x: number, y: number, w: number, h: number, bv: number, key: number) => (
        <G key={key}>
          <Rect x={x} y={y} width={w} height={h} fill={panelBg} rx={2}/>
          <Line x1={x} y1={y+h} x2={x} y2={y} stroke={hi} strokeWidth={2}/>
          <Line x1={x} y1={y} x2={x+w} y2={y} stroke={hi} strokeWidth={2}/>
          <Line x1={x+w} y1={y} x2={x+w} y2={y+h} stroke={sh} strokeWidth={2}/>
          <Line x1={x} y1={y+h} x2={x+w} y2={y+h} stroke={sh} strokeWidth={2}/>
          <Rect x={x+bv} y={y+bv} width={w-bv*2} height={h-bv*2}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.8}/>
          <Line x1={x+bv} y1={y+bv} x2={x+w-bv} y2={y+bv} stroke={hi} strokeWidth={0.8}/>
          <Line x1={x+bv} y1={y+bv} x2={x+bv} y2={y+h-bv} stroke={hi} strokeWidth={0.8}/>
        </G>
      );

      const row1H = Math.round(GH * 0.16);
      const row2H = Math.round(GH * 0.46);
      const row1Y = GY + pp;
      const row2Y = row1Y + row1H + g;
      const row3Y = row2Y + row2H + g;
      const row3H = (GY + GH - pp) - row3Y;

      // leafCount=1 → 1 anta singola; leafCount=2 → 2 ante; else → 1 anta e mezzo
      const n = Math.max(1, leafCount);

      if (n === 1) {
        // ── 1 anta singola ──
        const colW = Math.round((GW - pp*2 - g) / 2);
        const col1X = GX + pp, col2X = col1X + colW + g;
        const lockY = row2Y + Math.round(row2H * 0.42);
        const hx = openingSide === 'right' ? GX + GW - 14 : GX + 14;
        const lr = openingSide !== 'right';
        const hinge = openingSide === 'right' ? GX + GW - 4 : GX + 4;
        const lx = openingSide === 'right' ? GX + GW - 13 : GX + 13;
        return <G>
          <Rect x={GX} y={GY} width={GW} height={GH} fill={doorBg}/>
          {bugna(col1X, row1Y, colW, row1H, bevel, 0)}
          {bugna(col2X, row1Y, colW, row1H, bevel, 1)}
          {bugna(col1X, row2Y, colW, row2H, bevel, 2)}
          {bugna(col2X, row2Y, colW, row2H, bevel, 3)}
          {bugna(col1X, row3Y, colW, row3H, bevel, 4)}
          {bugna(col2X, row3Y, colW, row3H, bevel, 5)}
          <HingeMarks x={hinge} color="#8090a4"/>
          <ManigliaDoor hx={hx} leverRight={lr}/>
          <Rect x={lx-5} y={row2Y+Math.round(row2H*0.42)-7} width={10} height={14}
                rx={2.5} fill="#4a5a6a" stroke="#2a3a4a" strokeWidth={0.8}/>
          <Circle cx={lx} cy={row2Y+Math.round(row2H*0.42)} r={3.5} fill="#8090a4"/>
          <Circle cx={lx} cy={row2Y+Math.round(row2H*0.42)} r={2} fill="#5a6a7a"/>
        </G>;
      }

      if (n >= 2) {
        // ── 2 ante simmetriche ──
        const halfW = Math.round(GW / 2);
        const colW  = Math.round((halfW - pp*2 - g) / 2);
        const lockY = row2Y + Math.round(row2H * 0.42);
        return <G>
          {[0, 1].map(i => {
            const ax = GX + i * halfW;
            const c1 = ax + pp, c2 = c1 + colW + g;
            const hx = i === 0 ? ax + halfW - 14 : ax + 14;
            const lr = i === 0;
            const hinge = i === 0 ? ax + 4 : ax + halfW - 4;
            const lx = i === 0 ? ax + halfW - 13 : ax + 13;
            return <G key={i}>
              <Rect x={ax} y={GY} width={halfW} height={GH} fill={doorBg}/>
              {bugna(c1, row1Y, colW, row1H, bevel, i*10+0)}
              {bugna(c2, row1Y, colW, row1H, bevel, i*10+1)}
              {bugna(c1, row2Y, colW, row2H, bevel, i*10+2)}
              {bugna(c2, row2Y, colW, row2H, bevel, i*10+3)}
              {bugna(c1, row3Y, colW, row3H, bevel, i*10+4)}
              {bugna(c2, row3Y, colW, row3H, bevel, i*10+5)}
              <HingeMarks x={hinge} color="#8090a4"/>
              <ManigliaDoor hx={hx} leverRight={lr}/>
              <Rect x={lx-5} y={lockY-7} width={10} height={14}
                    rx={2.5} fill="#4a5a6a" stroke="#2a3a4a" strokeWidth={0.8}/>
              <Circle cx={lx} cy={lockY} r={3.5} fill="#8090a4"/>
              <Circle cx={lx} cy={lockY} r={2} fill="#5a6a7a"/>
            </G>;
          })}
        </G>;
      }

      // ── 1 anta e mezzo (default) ──
      const mainW  = Math.round(GW * 3 / 5);
      const smallW = GW - mainW;
      const mainLeft = openingSide !== 'right';
      const mainX  = mainLeft ? GX : GX + smallW;
      const smallX = mainLeft ? GX + mainW : GX;
      const mainColW = Math.round((mainW - pp*2 - g) / 2);
      const mainCol1X = mainX + pp;
      const mainCol2X = mainCol1X + mainColW + g;
      const smPP = 7;
      const smColW = smallW - smPP * 2;
      const smallCol1X = smallX + smPP;
      const handleX  = mainLeft ? mainX + mainW - 14 : mainX + 14;
      const leverRight = mainLeft;
      const hingeX   = mainLeft ? mainX + 4 : mainX + mainW - 4;
      const lockCX   = mainLeft ? mainX + mainW - 13 : mainX + 13;
      const lockY    = row2Y + Math.round(row2H * 0.42);
      return <G>
        <Rect x={GX} y={GY} width={GW} height={GH} fill={doorBg}/>
        {bugna(mainCol1X, row1Y, mainColW, row1H, bevel, 0)}
        {bugna(mainCol2X, row1Y, mainColW, row1H, bevel, 1)}
        {bugna(mainCol1X, row2Y, mainColW, row2H, bevel, 2)}
        {bugna(mainCol2X, row2Y, mainColW, row2H, bevel, 3)}
        {bugna(mainCol1X, row3Y, mainColW, row3H, bevel, 4)}
        {bugna(mainCol2X, row3Y, mainColW, row3H, bevel, 5)}
        {bugna(smallCol1X, row1Y, smColW, row1H, 3, 6)}
        {bugna(smallCol1X, row2Y, smColW, row2H, 3, 7)}
        {bugna(smallCol1X, row3Y, smColW, row3H, 3, 8)}
        <HingeMarks x={hingeX} color="#8090a4"/>
        <ManigliaDoor hx={handleX} leverRight={leverRight}/>
        <Rect x={lockCX-5} y={lockY-7} width={10} height={14}
              rx={2.5} fill="#4a5a6a" stroke="#2a3a4a" strokeWidth={0.8}/>
        <Circle cx={lockCX} cy={lockY} r={3.5} fill="#8090a4"/>
        <Circle cx={lockCX} cy={lockY} r={2} fill="#5a6a7a"/>
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
        <ManigliaDoor hx={CX-14} leverRight={true}/>
        <ManigliaDoor hx={CX+14} leverRight={false}/>
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

    case 'door_french': {
      const _fH = 14;
      const _fY = Math.round(GY + GH * 0.58 - _fH / 2);
      return <G>
        <Line x1={GX} y1={GY2} x2={GX2} y2={GY2} stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>
        <Rect x={CX-FT/2} y={FY} width={FT} height={FH} fill="url(#al_hatch)" stroke={C_FRAME} strokeWidth={1}/>
        <Rect x={CX-1} y={GY} width={2} height={GH} fill="white"/>
        {/* Fascia orizzontale colore telaio */}
        <Rect x={GX} y={_fY} width={GW} height={_fH} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={1.5}/>
        <Line x1={GX+4} y1={_fY+4} x2={GX2-4} y2={_fY+4} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8}/>
        <Line x1={GX+4} y1={_fY+_fH-4} x2={GX2-4} y2={_fY+_fH-4} stroke="rgba(80,110,140,0.2)" strokeWidth={0.6}/>
        <HingeMarks x={GX+4} color={c}/>
        <HingeMarks x={GX2-4} color={c}/>
        <VMark vx={CX-8} vy={CY} ex={GX+12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <VMark vx={CX+8} vy={CY} ex={GX2-12} ey1={GY+14} ey2={GY2-10} progress={1} color={c}/>
        <ManigliaDoor hx={CX-14} leverRight={true}/>
        <ManigliaDoor hx={CX+14} leverRight={false}/>
      </G>;
    }

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
      const n          = Math.max(1, leafCount);
      const sashW      = GW / n;
      const slats      = 11;
      const slotH      = GH / slats;
      const startRight = openingSide === 'right';
      const C_AL_BG    = '#D8E2EC';
      const C_AL_SLAT  = '#7A9BB0';
      const C_HINGE_AL = '#5A6878';
      const C_HANDLE   = '#8098B0';

      return <G>
        {Array.from({length: n}).map((_, i) => {
          const sx        = GX + i * sashW;
          const sx2       = sx + sashW;
          const hingeLeft = startRight ? (i % 2 !== 0) : (i % 2 === 0);
          const hingeX    = hingeLeft ? sx + 5 : sx2 - 5;
          const freeX     = hingeLeft ? sx2 - 5 : sx + 5;

          return <G key={i}>
            {/* Sfondo anta alluminio */}
            <Rect x={sx + 2} y={GY + 2} width={sashW - 4} height={GH - 4}
                  fill={C_AL_BG} stroke="#4A6070" strokeWidth={2} rx={1}/>

            {/* Lamelle con effetto profondità */}
            {Array.from({length: slats}).map((_, j) => {
              const y = GY + (j + 0.5) * slotH;
              return <G key={j}>
                <Line x1={sx + 4} y1={y + 1.5} x2={sx2 - 4} y2={y + 1.5}
                      stroke="rgba(60,80,100,0.18)" strokeWidth={2}/>
                <Line x1={sx + 4} y1={y} x2={sx2 - 4} y2={y}
                      stroke={C_AL_SLAT} strokeWidth={1.2}/>
              </G>;
            })}

            {/* Cerniere rettangolari */}
            {[0.2, 0.5, 0.8].map((f, j) => (
              <Rect key={j}
                x={hingeX - 3} y={GY + GH * f - 7} width={6} height={14}
                fill={C_HINGE_AL} stroke="rgba(255,255,255,0.5)" strokeWidth={1} rx={1}/>
            ))}

            {/* Maniglia sul bordo libero */}
            <Rect x={freeX - 3} y={CY - 18} width={6} height={36}
                  fill={C_HANDLE} stroke="rgba(255,255,255,0.6)" strokeWidth={0.8} rx={3}/>

            {/* Arco apertura */}
            <Path d={`M ${p(hingeX)} ${p(GY + 4)} Q ${p(freeX)} ${p(GY + 4)} ${p(freeX)} ${p(GY2 - 4)}`}
                  fill="none" stroke={`${C_IND}99`} strokeWidth={1.5} strokeDasharray="6,3"/>
            <Path d={arrow(freeX, GY2 - 4, hingeLeft ? Math.PI * 0.75 : Math.PI * 0.25)}
                  fill={C_IND}/>
          </G>;
        })}

        {/* Montanti divisori tra le ante */}
        {Array.from({length: n - 1}).map((_, i) => {
          const dx = GX + (i + 1) * sashW;
          return <G key={i}>
            <Line x1={p(dx)} y1={FY} x2={p(dx)} y2={FY + FH}
                  stroke={C_FRAME} strokeWidth={FT / 2}/>
            <Rect x={dx - 1} y={GY} width={2} height={GH} fill="#B8C8D4"/>
          </G>;
        })}

        {/* Fascia centrale — solo portafinestra (shutter_double), sempre presente */}
        {style === 'shutter_double' && (() => {
          const fasciaH = 16;
          const fasciaY = GY + GH * 0.58 - fasciaH / 2;
          return (
            <G>
              {Array.from({ length: n }).map((_, i) => {
                const sx = GX + i * sashW;
                const fx = sx + 4;
                const fw = sashW - 8;
                const midY = fasciaY + fasciaH / 2;
                return (
                  <G key={i}>
                    <Rect x={p(fx)} y={p(fasciaY)} width={p(fw)} height={p(fasciaH)}
                          fill="#B8C8D4" stroke="#4A6070" strokeWidth={1.5} rx={1}/>
                    <Line x1={p(fx + 3)} y1={p(midY - 3)} x2={p(fx + fw - 3)} y2={p(midY - 3)}
                          stroke="rgba(255,255,255,0.45)" strokeWidth={1}/>
                    <Line x1={p(fx + 3)} y1={p(midY + 3)} x2={p(fx + fw - 3)} y2={p(midY + 3)}
                          stroke="rgba(40,60,80,0.15)" strokeWidth={0.8}/>
                  </G>
                );
              })}
            </G>
          );
        })()}
      </G>;
    }

    // ── MONOBLOCCO ────────────────────────────────────────────────────────────
    case 'roller_blind': {
      const boxRatio = (boxHeight && totalHeight && totalHeight > 0)
        ? Math.max(0.10, Math.min(0.42, boxHeight / totalHeight))
        : 0.22;
      const boxH = FH * boxRatio;
      const winY = FY + boxH;
      const winH = FH - boxH;
      const wGY = winY + FT;
      const wGH = Math.max(1, winH - FT);
      const slats = 5, slotH = wGH / slats;
      const labelY = FY + boxH / 2;
      const showType = blindType === 'cintino' || blindType === 'motore';
      return <G>
        <Rect x={FX} y={FY} width={FW} height={boxH} fill={C_BOX} stroke={C_FRAME} strokeWidth={2}/>
        {Array.from({length: 4}).map((_,i)=>(
          <Line key={i} x1={FX+10+i*(FW-20)/3} y1={FY+2} x2={FX+10+i*(FW-20)/3} y2={FY+boxH-2}
                stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
        ))}
        {/* Etichetta cassonetto */}
        <G transform={`translate(${FX+FW/2}, ${labelY + (showType ? -4 : 4)})`}>
          <Text textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)" fontWeight="700">
            CASSONETTO
          </Text>
        </G>
        {showType && (
          <G transform={`translate(${FX+FW/2}, ${labelY + 8})`}>
            <Text textAnchor="middle" fontSize={8} fill="rgba(255,200,80,0.95)" fontWeight="700">
              {blindType === 'motore' ? '⚙ MOTORE' : '≡ CINTINO'}
            </Text>
          </G>
        )}
        <Line x1={FX} y1={winY} x2={FX+FW} y2={winY} stroke={C_FRAME} strokeWidth={2}/>
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
      // cassonetto è il lato dove si ritrae la rete
      // openingSide 'left' → cassonetto a sinistra; 'right' → a destra; null → sinistra default
      const casOnLeft = openingSide !== 'right';
      const casW = Math.round(GW * 0.14);

      // Cassonetto: striscia verticale scura sul lato scelto
      const casX = casOnLeft ? GX : GX2 - casW;

      // Rete parzialmente estesa (70% dello spazio disponibile)
      const availW = GW - casW;
      const meshW  = Math.round(availW * 0.72);
      const meshX  = casOnLeft ? GX + casW : GX2 - casW - meshW;

      const rows = 11;
      const cols = Math.max(3, Math.round(meshW / 13));
      const cellW = meshW / cols, cellH = GH / rows;

      // Maniglia sul bordo libero della rete (opposto al cassonetto)
      const handleX = casOnLeft ? meshX + meshW - 3 : meshX - 1;
      // Freccia indica la direzione di rientro nel cassonetto
      const arrowTipX  = casOnLeft ? casX + casW + 6 : casX - 6;
      const arrowBaseX = casOnLeft ? meshX + meshW * 0.72 : meshX + meshW * 0.28;
      const arrowDir   = casOnLeft ? Math.PI : 0;

      return <G>
        {/* Cassonetto laterale */}
        <Rect x={casX} y={GY} width={casW} height={GH} fill={C_BOX} rx={1}/>
        <Line x1={casX + casW / 2} y1={GY + 4} x2={casX + casW / 2} y2={GY2 - 4}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1}/>
        <G transform={`translate(${casX + casW / 2}, ${GY + GH / 2}) rotate(${casOnLeft ? -90 : 90})`}>
          <Text textAnchor="middle" fontSize={6.5} fill="rgba(255,255,255,0.75)" fontWeight="700">
            LATERALE
          </Text>
        </G>

        {/* Pannello rete */}
        <Rect x={meshX} y={GY} width={meshW} height={GH} fill="rgba(100,170,210,0.08)"/>
        {Array.from({length: rows + 1}).map((_, i) => (
          <Line key={`h${i}`} x1={meshX} y1={GY + i * cellH} x2={meshX + meshW} y2={GY + i * cellH}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {Array.from({length: cols + 1}).map((_, i) => (
          <Line key={`v${i}`} x1={meshX + i * cellW} y1={GY} x2={meshX + i * cellW} y2={GY2}
                stroke="rgba(60,110,160,0.35)" strokeWidth={0.7}/>
        ))}
        {/* Bordo rete sul lato libero */}
        <Line x1={casOnLeft ? meshX + meshW : meshX} y1={GY}
              x2={casOnLeft ? meshX + meshW : meshX} y2={GY2}
              stroke="rgba(60,110,160,0.55)" strokeWidth={1.5}/>

        {/* Maniglia */}
        <Rect x={handleX} y={CY - 16} width={4} height={32} rx={2} fill={C_IND}/>

        {/* Freccia di rientro */}
        <Line x1={arrowBaseX} y1={CY} x2={arrowTipX} y2={CY}
              stroke={C_IND} strokeWidth={1.8} strokeDasharray="5,3"/>
        <Path d={arrow(arrowTipX, CY, arrowDir, 5)} fill={C_IND}/>
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
  totalHeight?: number | null;
  dimMode?: 'taglio' | 'luce';
  outOfSquare?: boolean;
  heightLeft?: number | null;
  heightRight?: number | null;
  /** When sopraluce is active, offset the top of the vertical arrow by this amount upward */
  slTotal?: number;
}

function DimLines({ luceW, luceH, taglioW, taglioH, boxHeight, totalHeight, dimMode = 'taglio', outOfSquare, heightLeft, heightRight, slTotal = 0 }: DimLinesProps) {
  const showTaglio = dimMode === 'taglio';
  const wVal  = showTaglio ? taglioW : luceW;
  const hVal  = showTaglio ? taglioH : luceH;
  const wLbl  = wVal != null ? `L ${wVal} mm` : 'L — mm';
  const dimY  = showTaglio ? DIM_TAGLIO_Y : DIM_LUCE_Y;
  const dimX  = showTaglio ? DIM_TAGLIO_X : DIM_LUCE_X;
  const arrowSz = showTaglio ? 3.5 : 5;
  const sw    = showTaglio ? 0.9 : 1.4;
  const fs    = showTaglio ? 8 : 9;
  const fw    = showTaglio ? '600' : '700';
  const c     = showTaglio ? C_DIM_TAG : C_DIM_LUCE;
  const cFS   = '#E53935';

  const showFS  = outOfSquare && (heightLeft != null || heightRight != null);
  // When sopraluce is present, the vertical arrow spans the full height (sopraluce + main frame)
  const vtTopY  = FY - slTotal;
  const vtMid   = (vtTopY + FY + FH) / 2;

  return <G>
    {/* Leader lines from frame corners to dim line */}
    <Line x1={FX}    y1={FY+FH} x2={FX}    y2={dimY+6} stroke={c} strokeWidth={0.8}/>
    <Line x1={FX+FW} y1={FY+FH} x2={FX+FW} y2={dimY+6} stroke={c} strokeWidth={0.8}/>
    <Line x1={FX}    y1={vtTopY} x2={dimX-6} y2={vtTopY} stroke={c} strokeWidth={0.8}/>
    <Line x1={FX}    y1={FY+FH}  x2={dimX-6} y2={FY+FH}  stroke={c} strokeWidth={0.8}/>

    {/* Horizontal dim line — width */}
    <Line x1={FX} y1={dimY} x2={FX+FW} y2={dimY} stroke={c} strokeWidth={sw}/>
    <Path d={arrow(FX,    dimY, 0,         arrowSz)} fill={c}/>
    <Path d={arrow(FX+FW, dimY, Math.PI,   arrowSz)} fill={c}/>
    <G transform={`translate(${FX+FW/2}, ${dimY-4})`}>
      <Text textAnchor="middle" fontSize={fs} fontWeight={fw} fill={c}>{wLbl}</Text>
    </G>

    {/* Vertical dim line — spans full height (including sopraluce when present) */}
    <Line x1={dimX} y1={vtTopY} x2={dimX} y2={FY+FH} stroke={showFS ? cFS : c} strokeWidth={sw}/>
    <Path d={arrow(dimX, vtTopY, Math.PI/2,  arrowSz)} fill={showFS ? cFS : c}/>
    <Path d={arrow(dimX, FY+FH, -Math.PI/2, arrowSz)} fill={showFS ? cFS : c}/>
    {showFS ? (
      // Two annotations: SX / DX along the full-height arrow
      <>
        <G transform={`translate(${dimX}, ${vtMid - 9}) rotate(-90)`}>
          <Text textAnchor="middle" fontSize={7.5} fontWeight="800" fill={cFS}>
            {`SX ${heightLeft ?? '—'} mm`}
          </Text>
        </G>
        <G transform={`translate(${dimX}, ${vtMid + 9}) rotate(-90)`}>
          <Text textAnchor="middle" fontSize={7.5} fontWeight="800" fill={cFS}>
            {`DX ${heightRight ?? '—'} mm`}
          </Text>
        </G>
      </>
    ) : (
      <G transform={`translate(${dimX}, ${vtMid}) rotate(-90)`}>
        <Text textAnchor="middle" fontSize={fs} fontWeight={fw} fill={c}>
          {hVal != null ? `H ${hVal} mm` : 'H — mm'}
        </Text>
      </G>
    )}

    {/* Cassonetto height annotation */}
    {boxHeight != null && (
      <G>
        {(() => {
          const ratio = (boxHeight && totalHeight && totalHeight > 0)
            ? Math.max(0.10, Math.min(0.42, boxHeight / totalHeight))
            : 0.22;
          const boxBotY = FY + FH * ratio;
          const midY    = FY + FH * ratio / 2;
          const bx = 8;
          return <>
            <Line x1={4}  y1={FY}      x2={12} y2={FY}      stroke="#FF6F00" strokeWidth={1}/>
            <Line x1={4}  y1={boxBotY} x2={12} y2={boxBotY} stroke="#FF6F00" strokeWidth={1}/>
            <Line x1={bx} y1={FY}      x2={bx} y2={boxBotY} stroke="#FF6F00" strokeWidth={1.2}/>
            <Path d={arrow(bx, FY,      Math.PI/2,  4)} fill="#FF6F00"/>
            <Path d={arrow(bx, boxBotY, -Math.PI/2, 4)} fill="#FF6F00"/>
            <G transform={`translate(${bx}, ${midY}) rotate(-90)`}>
              <Text textAnchor="middle" fontSize={7} fill="#FF6F00" fontWeight="700">
                {boxHeight > 0 ? `H ${boxHeight} mm` : 'H — mm'}
              </Text>
            </G>
          </>;
        })()}
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
  hasFascia?: boolean | null;
  hasSoglia?: boolean | null;
  hasBattente?: boolean | null;
  blindType?: 'cintino' | 'motore' | null;
  sopraluce?: boolean | null;
  sopraluceHeight?: number | null;
  outOfSquare?: boolean;
  heightLeft?: number | null;
  heightRight?: number | null;
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
  hasFascia = null,
  hasSoglia = null,
  hasBattente = null,
  blindType = null,
  sopraluce = null,
  sopraluceHeight = null,
  outOfSquare = false,
  heightLeft = null,
  heightRight = null,
}: LiveDrawingProps) {
  const tW = toleranceW ?? tolerance;
  const tH = toleranceH ?? tolerance;
  const taglioW = width  != null ? width  - tW : null;
  const taglioH = height != null ? height - tH : null;

  const woodId = `wood_${style ?? 'none'}`;

  const isSubframe    = style === 'subframe_window';
  const isFixed       = style === 'window_fixed';
  const isShutter     = style === 'shutter_single' || style === 'shutter_double';
  const isMonoblocco  = style === 'roller_blind';
  const isSlidingType = style === 'window_sliding' || style === 'door_sliding';
  const isZanzariera  = style === 'mosquito_fixed' || style === 'mosquito_rollup' || style === 'mosquito_lateral';
  const isDoor        = style?.startsWith('door') ?? false;
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

  // ── Sopraluce geometry (needed early for outOfSquare overlay placement) ─────
  // Sliding windows allow sopraluce only when outOfSquare compensates the slope
  const hasSL = sopraluce === true && (style?.startsWith('window') || style?.startsWith('door'))
                && !isSubframe && !isMonoblocco && !isZanzariera
                && (!isSlidingType || outOfSquare);

  const slRatio  = hasSL && sopraluceHeight != null && height != null && height > 0
    ? sopraluceHeight / height : 0.25;
  const SL_H_SVG = hasSL ? Math.max(44, Math.min(82, Math.round(FH * slRatio))) : 0;
  const TR_SVG_H = hasSL ? 12 : 0;
  const SL_TOTAL = SL_H_SVG + TR_SVG_H;
  const adjVB_H  = VB_H + SL_TOTAL;

  // ── Frame layer ────────────────────────────────────────────────────────────
  let frameLayer: React.ReactNode;
  if (isSubframe) {
    frameLayer = (
      <>
        <WoodPattern id={woodId}/>
        <SubframeBase woodPatternId={woodId} showBottom={hasBattente === true}/>
      </>
    );
  } else if (isShutter) {
    // Shutter: aluminum frame, no hatch
    frameLayer = (
      <G>
        <Rect x={FX} y={FY} width={FW} height={FH} fill="#B8C8D4" stroke={C_FRAME} strokeWidth={2.5}/>
        <Rect x={GX} y={GY} width={GW} height={GH} fill="#D8E2EC"/>
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
  } else if (isFixed) {
    // Fisso: telaio esterno + vetro diretto (nessun sash interno)
    frameLayer = (
      <>
        <AlumPatterns/>
        <GlassDefs/>
        <G>
          {/* Outer frame — più spesso per evidenziare l'assenza di anta */}
          <Rect x={FX} y={FY} width={FW} height={FH} fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={2.5}/>
          {/* Glass pane directly in frame */}
          <Rect x={GX} y={GY} width={GW} height={GH} fill="url(#glass_grad)" stroke="#7AAFC8" strokeWidth={0.8}/>
          {/* Glass reflections */}
          <Line x1={GX+7} y1={GY+8} x2={GX+7} y2={GY+GH*0.65}
                stroke="rgba(255,255,255,0.88)" strokeWidth={3.5} strokeLinecap="round"/>
          <Line x1={GX+17} y1={GY+8} x2={GX+17} y2={GY+GH*0.42}
                stroke="rgba(255,255,255,0.55)" strokeWidth={1.8} strokeLinecap="round"/>
          <CornerMarks x={FX}    y={FY}    dx={1}  dy={1}/>
          <CornerMarks x={FX+FW} y={FY}    dx={-1} dy={1}/>
          <CornerMarks x={FX}    y={FY+FH} dx={1}  dy={-1}/>
          <CornerMarks x={FX+FW} y={FY+FH} dx={-1} dy={-1}/>
        </G>
      </>
    );
  } else {
    // Casement: draw one visible sash frame per leaf
    frameLayer = (
      <>
        <AlumPatterns/>
        <GlassDefs/>
        <FrameBase leafCount={resolvedLeaf}/>
        {isDoor && hasSoglia && (
          // Soglia ribassata: cover most of bottom rail, leaving only a thin threshold strip
          <G>
            <Rect x={FX + 2} y={GY2} width={FW - 4} height={FT - 5}
                  fill={C_SASH_FILL}/>
            <Rect x={FX} y={FY + FH - 5} width={FW} height={5}
                  fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={1}/>
          </G>
        )}
      </>
    );
  }

  // ── Indicator layer ────────────────────────────────────────────────────────
  let indicatorLayer: React.ReactNode = null;
  if (style) {
    if (openingSide && !isSubframe && !isShutter && !isMonoblocco && !isZanzariera) {
      if (style === 'door_entrance') {
        // Portoncino: draw door appearance + animated opening arc for main leaf only
        const entMainW  = Math.round(GW * 3 / 5);
        const entSmallW = GW - entMainW;
        const entMainLeft = openingSide !== 'right';
        const entMainX  = entMainLeft ? GX : GX + entSmallW;
        const M = 12;
        indicatorLayer = (
          <>
            <DefaultIndicator style={style} woodId={woodId} leafCount={resolvedLeaf} openingSide={openingSide} boxHeight={boxHeight} totalHeight={height} blindType={blindType}/>
            <VMark
              vx={entMainLeft ? entMainX + M : entMainX + entMainW - M}
              vy={CY}
              ex={entMainLeft ? entMainX + entMainW - M : entMainX + M}
              ey1={GY + M} ey2={GY2 - M}
              progress={animProgress} color={C_IND}
            />
          </>
        );
      } else if (isSlidingType) {
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
            isDoor={isDoor}
          />
        );
      }
    } else {
      indicatorLayer = <DefaultIndicator style={style} woodId={woodId} leafCount={resolvedLeaf} openingSide={openingSide} boxHeight={boxHeight} totalHeight={height} blindType={blindType}/>;
    }
  }

  const fasciaBar = hasFascia && isDoor && style !== 'door_sliding' ? (() => {
    const n      = resolvedLeaf;
    const sashW  = GW / n;
    const fasciaH = 20;
    // Position at 62% of glass height (lower third — realistic traverso position)
    const fasciaY = GY + GH * 0.62 - fasciaH / 2;
    return (
      <G>
        {Array.from({ length: n }).map((_, i) => {
          const sx = GX + i * sashW;
          const fx = sx + ST;       // flush with inner sash border
          const fw = sashW - ST * 2;
          const midY = fasciaY + fasciaH / 2;
          return (
            <G key={i}>
              <Rect x={fx} y={fasciaY} width={fw} height={fasciaH}
                    fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={1.8}/>
              <Line x1={fx + 4} y1={midY - 4} x2={fx + fw - 4} y2={midY - 4}
                    stroke="rgba(255,255,255,0.5)" strokeWidth={0.9}/>
              <Line x1={fx + 4} y1={midY + 4} x2={fx + fw - 4} y2={midY + 4}
                    stroke="rgba(80,110,140,0.22)" strokeWidth={0.7}/>
            </G>
          );
        })}
      </G>
    );
  })() : null;

  // OutOfSquare on the main frame — only when no sopraluce takes it
  const showFsOnFrame = outOfSquare && !hasSL && !isSlidingType && !isSubframe && !isMonoblocco && !isZanzariera;
  const fsHasData     = showFsOnFrame && (heightLeft ?? 0) > 0 && (heightRight ?? 0) > 0;
  const fsMaxH        = fsHasData ? Math.max(heightLeft!, heightRight!) : 1;
  const fsLeftTopY    = fsHasData ? FY + FH * (1 - heightLeft!  / fsMaxH) : FY;
  const fsRightTopY   = fsHasData ? FY + FH * (1 - heightRight! / fsMaxH) : FY;
  const fsDeltaH      = fsHasData ? Math.abs(heightLeft! - heightRight!) : 0;
  const fsMidDiagY    = (fsLeftTopY + fsRightTopY) / 2;
  // Inner top corners (frame thickness below slanted top)
  const fsInnerLeftY  = fsHasData ? Math.min(GY2 - 8, Math.max(GY, fsLeftTopY  + FT)) : GY;
  const fsInnerRightY = fsHasData ? Math.min(GY2 - 8, Math.max(GY, fsRightTopY + FT)) : GY;
  // Trapezoidal frame ring drawn with evenodd — outer trapezoid minus inner glass area
  const fsRingPath = fsHasData ? [
    // Outer trapezoid (clockwise)
    `M ${FX} ${fsLeftTopY}`,
    `L ${FX+FW} ${fsRightTopY}`,
    `L ${FX+FW} ${FY+FH}`,
    `L ${FX} ${FY+FH}`,
    'Z',
    // Inner glass hole (clockwise → evenodd punches through)
    `M ${GX} ${fsInnerLeftY}`,
    `L ${GX2} ${fsInnerRightY}`,
    `L ${GX2} ${GY2}`,
    `L ${GX} ${GY2}`,
    'Z',
  ].join(' ') : '';

  const svgContent = fsHasData ? (
    <>
      {/* Defs only — no visible rectangular frame drawn */}
      <AlumPatterns/>
      <GlassDefs/>
      {/* Trapezoidal glass pane */}
      <Path
        d={`M ${GX} ${fsInnerLeftY} L ${GX2} ${fsInnerRightY} L ${GX2} ${GY2} L ${GX} ${GY2} Z`}
        fill="url(#glass_grad)"
      />
      {/* Glass reflections (ring will cover any that leak into aluminum area) */}
      <Line x1={GX+7} y1={GY+8} x2={GX+7} y2={GY+GH*0.65}
            stroke="rgba(255,255,255,0.88)" strokeWidth={3.5} strokeLinecap="round"/>
      <Line x1={GX+17} y1={GY+8} x2={GX+17} y2={GY+GH*0.42}
            stroke="rgba(255,255,255,0.55)" strokeWidth={1.8} strokeLinecap="round"/>
      {fasciaBar}
      {indicatorLayer}
      {/* Aluminum ring — evenodd punches glass hole; rendered after indicator so ring
          covers any indicator content that leaks into the aluminum zone */}
      <Path d={fsRingPath} fill="url(#frame_grad)" fillRule="evenodd"/>
      {/* Outer trapezoid border */}
      <Path
        d={`M ${FX} ${fsLeftTopY} L ${FX+FW} ${fsRightTopY} L ${FX+FW} ${FY+FH} L ${FX} ${FY+FH} Z`}
        fill="none" stroke={C_FRAME} strokeWidth={2.5}
      />
      {/* Inner glass border */}
      <Path
        d={`M ${GX} ${fsInnerLeftY} L ${GX2} ${fsInnerRightY} L ${GX2} ${GY2} L ${GX} ${GY2} Z`}
        fill="none" stroke={C_FRAME} strokeWidth={0.8} opacity={0.5}
      />
      {/* Corner marks at slanted top corners + bottom corners */}
      <CornerMarks x={FX}      y={fsLeftTopY}  dx={1}  dy={1}/>
      <CornerMarks x={FX + FW} y={fsRightTopY} dx={-1} dy={1}/>
      <CornerMarks x={FX}      y={FY+FH}       dx={1}  dy={-1}/>
      <CornerMarks x={FX+FW}   y={FY+FH}       dx={-1} dy={-1}/>
      {/* ΔH badge */}
      {fsDeltaH > 0 && (
        <G>
          <Rect
            x={FX + FW / 2 - 24} y={fsMidDiagY - 20}
            width={48} height={14} rx={3}
            fill={C_FRAME} opacity={0.88}
          />
          <Text
            x={FX + FW / 2} y={fsMidDiagY - 9.5}
            textAnchor="middle" fontSize={7.5}
            fill="white" fontWeight="800"
          >
            {`Δ ${fsDeltaH} mm`}
          </Text>
        </G>
      )}
    </>
  ) : (
    <>
      {frameLayer}
      {fasciaBar}
      {indicatorLayer}
    </>
  );

  // ── Sopraluce panel ────────────────────────────────────────────────────────
  // Fuori squadra slant on the sopraluce top edge (when both FS and SL are active)
  const showFsOnSopraluce = outOfSquare && hasSL && (heightLeft ?? 0) > 0 && (heightRight ?? 0) > 0;
  const slMaxH     = showFsOnSopraluce ? Math.max(heightLeft!, heightRight!) : 1;
  const slLeftTopY = showFsOnSopraluce ? MT + SL_H_SVG * (1 - heightLeft!  / slMaxH) : MT;
  const slRightTopY= showFsOnSopraluce ? MT + SL_H_SVG * (1 - heightRight! / slMaxH) : MT;
  const slMidY     = (slLeftTopY + slRightTopY) / 2;
  const slDeltaH   = showFsOnSopraluce ? Math.abs(heightLeft! - heightRight!) : 0;
  // Inner glass corners for sopraluce FS trapezoid
  const slInnerLeftY  = showFsOnSopraluce ? Math.min(MT+SL_H_SVG-4, slLeftTopY  + FT) : MT + FT;
  const slInnerRightY = showFsOnSopraluce ? Math.min(MT+SL_H_SVG-4, slRightTopY + FT) : MT + FT;
  // Aluminum ring for sopraluce FS: outer slanted trapezoid minus inner glass hole
  const slRingPath = showFsOnSopraluce ? [
    `M ${FX} ${slLeftTopY}`,
    `L ${FX+FW} ${slRightTopY}`,
    `L ${FX+FW} ${MT+SL_H_SVG}`,
    `L ${FX} ${MT+SL_H_SVG}`,
    'Z',
    `M ${GX} ${slInnerLeftY}`,
    `L ${GX2} ${slInnerRightY}`,
    `L ${GX2} ${MT+SL_H_SVG}`,
    `L ${GX} ${MT+SL_H_SVG}`,
    'Z',
  ].join(' ') : '';

  const sopralucePanel = hasSL ? (
    <G>
      {showFsOnSopraluce ? (
        // FS active: trapezoid glass pane (no rectangular rect)
        <Path
          d={`M ${GX} ${slInnerLeftY} L ${GX2} ${slInnerRightY} L ${GX2} ${MT+SL_H_SVG} L ${GX} ${MT+SL_H_SVG} Z`}
          fill="url(#glass_grad)"
        />
      ) : (
        // Normal: rectangular glass panel
        <>
          <Rect x={FX} y={MT} width={FW} height={SL_H_SVG}
                fill="url(#glass_grad)" stroke={C_FRAME} strokeWidth={2.5}/>
          <CornerMarks x={FX}    y={MT} dx={1}  dy={1}/>
          <CornerMarks x={FX+FW} y={MT} dx={-1} dy={1}/>
        </>
      )}
      {/* Glass reflections */}
      <Line x1={GX+5} y1={MT+6} x2={GX+5} y2={MT+SL_H_SVG-6}
            stroke="rgba(255,255,255,0.75)" strokeWidth={3} strokeLinecap="round"/>
      <Line x1={GX+13} y1={MT+6} x2={GX+13} y2={MT+SL_H_SVG*0.55}
            stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} strokeLinecap="round"/>
      {/* SOPRALUCE label */}
      <G transform={`translate(${FX+FW/2}, ${MT+SL_H_SVG/2+3})`}>
        <Text textAnchor="middle" fontSize={9} fill={C_IND} fontWeight="700">SOPRALUCE</Text>
      </G>
      {/* Height label */}
      {sopraluceHeight != null && (
        <G transform={`translate(${FX+FW/2}, ${MT+SL_H_SVG/2-6})`}>
          <Text textAnchor="middle" fontSize={7.5} fill="rgba(30,80,180,0.75)" fontWeight="600">
            {`H ${sopraluceHeight} mm`}
          </Text>
        </G>
      )}
      {/* Traverso bar */}
      <Rect x={FX} y={MT+SL_H_SVG} width={FW} height={TR_SVG_H}
            fill="url(#frame_grad)" stroke={C_FRAME} strokeWidth={1.5}/>
      <G transform={`translate(${FX+FW/2}, ${MT+SL_H_SVG+TR_SVG_H/2+2})`}>
        <Text textAnchor="middle" fontSize={6} fill="rgba(40,60,80,0.6)" fontWeight="700">TRAVERSO</Text>
      </G>
      {/* Trapezoidal frame ring for FS on sopraluce — drawn last to cover any leakage */}
      {showFsOnSopraluce && (
        <G>
          <Path d={slRingPath} fill="url(#frame_grad)" fillRule="evenodd"/>
          <Path
            d={`M ${FX} ${slLeftTopY} L ${FX+FW} ${slRightTopY} L ${FX+FW} ${MT+SL_H_SVG} L ${FX} ${MT+SL_H_SVG} Z`}
            fill="none" stroke={C_FRAME} strokeWidth={2.5}
          />
          <CornerMarks x={FX}      y={slLeftTopY}  dx={1}  dy={1}/>
          <CornerMarks x={FX + FW} y={slRightTopY} dx={-1} dy={1}/>
          {slDeltaH > 0 && (
            <G>
              <Rect x={FX+FW/2-24} y={slMidY-20} width={48} height={14} rx={3}
                    fill={C_FRAME} opacity={0.88}/>
              <Text x={FX+FW/2} y={slMidY-9.5}
                    textAnchor="middle" fontSize={7.5} fill="white" fontWeight="800">
                {`Δ ${slDeltaH} mm`}
              </Text>
            </G>
          )}
        </G>
      )}
    </G>
  ) : null;

  if (previewMode) {
    const svgW = previewSize;
    const svgH = Math.round(previewSize * (hasSL ? adjVB_H : VB_H) / VB_W);
    return (
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${VB_W} ${hasSL ? adjVB_H : VB_H}`} preserveAspectRatio="xMidYMid meet">
        {hasSL && <GlassDefs/>}
        {sopralucePanel}
        {hasSL ? <G transform={`translate(0, ${SL_TOTAL})`}>{svgContent}</G> : svgContent}
      </Svg>
    );
  }

  const svgW = displayWidth ?? VB_W;
  const svgH = Math.round(svgW * (hasSL ? adjVB_H : VB_H) / VB_W);

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${VB_W} ${hasSL ? adjVB_H : VB_H}`} preserveAspectRatio="xMidYMid meet">
      {hasSL && <GlassDefs/>}
      {sopralucePanel}
      {hasSL ? (
        <G transform={`translate(0, ${SL_TOTAL})`}>
          {svgContent}
          <DimLines
            luceW={width} luceH={height}
            taglioW={taglioW} taglioH={taglioH}
            boxHeight={isMonoblocco ? boxHeight : undefined}
            totalHeight={isMonoblocco ? height : undefined}
            dimMode={dimMode}
            outOfSquare={outOfSquare}
            heightLeft={heightLeft}
            heightRight={heightRight}
            slTotal={SL_TOTAL}
          />
        </G>
      ) : (
        <>
          {svgContent}
          <DimLines
            luceW={width} luceH={height}
            taglioW={taglioW} taglioH={taglioH}
            boxHeight={isMonoblocco ? boxHeight : undefined}
            totalHeight={isMonoblocco ? height : undefined}
            dimMode={dimMode}
            outOfSquare={outOfSquare}
            heightLeft={heightLeft}
            heightRight={heightRight}
          />
        </>
      )}
    </Svg>
  );
}

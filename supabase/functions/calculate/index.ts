import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PieceOp = '+' | '-' | '÷';
type PieceGroup = 'telaio' | 'anta' | 'fermavetro' | 'riporto' | 'fascia_zoccolo' | 'lamella' | 'mezza_lamella' | 'posizionatore';

interface Opening {
  id: string;
  style: string | null;
  width: number | null;
  height: number | null;
  leafCount: number | null;
  hasFascia: boolean | null;
  hasSoglia: boolean | null;
  hasBattente: boolean | null;
  hasFermavetro: boolean | null;
  sopraluce: boolean;
  sopraluceHeight: number | null;
  outOfSquare: boolean;
  heightLeft: number | null;
  heightRight: number | null;
}

interface CatalogPiece {
  id: string;
  name: string;
  quantity: number;
  baseVar: 'L' | 'H';
  offset: number;
  divisor: number;
  cutAngle1: 45 | 90;
  cutAngle2: 45 | 90;
  condition?: 'always' | 'no_soglia' | 'with_soglia' | 'con_battente' | 'senza_battente';
  pieceCategory?: PieceGroup;
  divideFirst?: boolean;
  op1?: PieceOp;
  val1?: number;
  op2?: PieceOp;
  val2?: number;
}

interface CatalogVariant {
  id: string;
  leafCount: number;
  pieces: CatalogPiece[];
  telaiOffset: number;
}

interface CatalogSeries {
  id: string;
  name: string;
  variants: CatalogVariant[];
}

interface TolerancePair { w: number; h: number; }
interface ToleranceByType {
  finestre:   TolerancePair;
  porte:      TolerancePair;
  persiane:   TolerancePair;
  zanzariere: TolerancePair;
}

interface MaterialsConfig {
  riattestattura?:  number;
  barLength?:       number;
  kerf90?:          number;
  safetyMarginPct?: number;
  slatPitch?:       number;
  zoccoloH?:        number;
  fasciaH?:         number;
  antaTopRail?:     number;
  antaReduction?:   number;
}

interface ProfileResult {
  label:     string;
  bars:      number;
  offcuts:   number[];
  nearLimit: boolean;
}

interface MaterialsResult {
  profiles45:  ProfileResult[];
  profiles90:  ProfileResult[];
  totalBars45: number;
  totalBars90: number;
  warnings:    string[];
}

interface CuttingBinPiece { length: number; label: string; }
interface CuttingBin      { pieces: CuttingBinPiece[]; remaining: number; }
interface CuttingProfile  { label: string; cutAngle: 45 | 90; bins: CuttingBin[]; group?: PieceGroup; }
interface CuttingListResult {
  profiles45: CuttingProfile[];
  profiles90: CuttingProfile[];
  warnings:   string[];
  barLength:  number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BAR_MM       = 6400;
const DEFAULT_KERF_90      = 4;
const PF_THRESHOLD         = 1500;
const MIN_REMNANT_MM       = 500;
const NEAR_LIMIT_THRESHOLD = 250;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computePieceLength(base: number, piece: CatalogPiece): number {
  if (piece.op1 !== undefined && piece.op2 !== undefined) {
    const v1 = piece.val1 ?? 0;
    const v2 = piece.val2 ?? 1;
    let r = base;
    if      (piece.op1 === '+') r += v1;
    else if (piece.op1 === '-') r -= v1;
    else                        r = v1 === 0 ? r : r / v1;
    if      (piece.op2 === '+') r += v2;
    else if (piece.op2 === '-') r -= v2;
    else                        r = v2 === 0 ? r : r / v2;
    return Math.round(r * 2) / 2;
  }
  const df = piece.divideFirst === true;
  return df
    ? Math.round(((base / piece.divisor) + piece.offset) * 2) / 2
    : Math.round(((base + piece.offset) / piece.divisor) * 2) / 2;
}

function toleranceForStyle(style: string | null, config: ToleranceByType): TolerancePair {
  if (!style) return config.finestre;
  if (style.startsWith('window')) return config.finestre;
  if (style.startsWith('door'))   return config.porte;
  if (style.startsWith('shutter')) return config.persiane;
  if (style.startsWith('mosquito')) return config.zanzariere;
  return config.finestre;
}

function findBestVariant(series: CatalogSeries, leafCount: number | null): CatalogVariant | null {
  if (!series.variants.length) return null;
  if (!leafCount) return series.variants[0];
  const exact = series.variants.find(v => v.leafCount === leafCount);
  if (exact) return exact;
  return series.variants.reduce((best, v) =>
    Math.abs(v.leafCount - leafCount) < Math.abs(best.leafCount - leafCount) ? v : best
  );
}

function calcBars(
  pieces: CuttingBinPiece[],
  barMm: number,
  wastePerCut: number,
  kerfOnFirstCut = false,
): { count: number; offcuts: number[]; nearLimitCount: number; binDetails: CuttingBin[] } {
  if (!pieces.length) return { count: 0, offcuts: [], nearLimitCount: 0, binDetails: [] };
  const valid = pieces.filter(p => p.length > 0 && p.length <= barMm);
  if (!valid.length) return { count: 0, offcuts: [], nearLimitCount: 0, binDetails: [] };

  const sorted = [...valid].sort((a, b) => b.length - a.length);
  const bins: number[] = [barMm];
  const binPieces: CuttingBinPiece[][] = [[]];

  for (const piece of sorted) {
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      const rem     = bins[i];
      const isFirst = !kerfOnFirstCut && rem === barMm;
      const needed  = piece.length + (isFirst ? 0 : wastePerCut);
      if (needed <= rem) {
        bins[i] -= needed;
        binPieces[i].push(piece);
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push(barMm - piece.length - (kerfOnFirstCut ? wastePerCut : 0));
      binPieces.push([piece]);
    }
  }

  const binDetails: CuttingBin[] = bins.map((rem, i) => ({
    pieces:    binPieces[i],
    remaining: rem,
  }));
  const lastBinRem = bins[bins.length - 1];
  const nearLimitCount = (lastBinRem > 0 && lastBinRem < NEAR_LIMIT_THRESHOLD) ? 1 : 0;

  return {
    count: bins.length,
    offcuts: bins.filter(s => s >= MIN_REMNANT_MM),
    nearLimitCount,
    binDetails,
  };
}

function calcBarsN(lengths: number[], barMm: number, wastePerCut: number, kerfOnFirstCut = false) {
  return calcBars(lengths.map(l => ({ length: l, label: '' })), barMm, wastePerCut, kerfOnFirstCut);
}

// ─── Piece gathering ──────────────────────────────────────────────────────────

function gatherPieces(openings: Opening[], config: MaterialsConfig) {
  const {
    barLength     = DEFAULT_BAR_MM,
    slatPitch     = 55,
    zoccoloH      = 110,
    fasciaH       = 994,
    antaTopRail   = 68,
    antaReduction = 0,
  } = config;

  const b45: Record<string, number[]> = {
    'Profilo telaio': [], 'Profilo anta': [], 'Profilo controtelaio': [],
  };
  const b90: Record<string, number[]> = {
    'Soglia ribassata': [], 'Fascia': [], 'Fermavetro': [], 'Traverso': [],
    'Coppiglia': [], 'Zoccolo': [], 'Mezza lamella': [], 'Posizionatore': [],
    'Lamella': [], 'Riporto': [],
  };
  const oversized: Record<string, number[]> = {};

  function push45(label: string, ...pieces: number[]) {
    for (const p of pieces) {
      if (p > barLength) { oversized[label] = [...(oversized[label] ?? []), p]; }
      else { b45[label].push(p); }
    }
  }
  function push90(label: string, ...pieces: number[]) {
    for (const p of pieces) {
      if (p > barLength) { oversized[label] = [...(oversized[label] ?? []), p]; }
      else { b90[label].push(p); }
    }
  }

  const PUNTA_W             = 50;
  const PUNTA_H_BATTENTE    = 50;
  const PUNTA_H_NO_BATTENTE = 25;

  for (const o of openings) {
    const W = o.width  ?? 0;
    const H = o.height ?? 0;
    const n = Math.max(1, o.leafCount ?? 1);
    const { style } = o;
    if (!style || W <= 0 || H <= 0) continue;

    const useFS = !!(o.outOfSquare && o.heightLeft && o.heightRight);
    const hL    = useFS ? (o.heightLeft  ?? H) : H;
    const hR    = useFS ? (o.heightRight ?? H) : H;
    if (style === 'roller_blind' || style.startsWith('mosquito') || style === 'custom') continue;

    const isSliding = style === 'window_sliding' || style === 'door_sliding';
    const hasBattenteStyle = ['window_single','window_double','window_tilt_turn','door_single','door_double','door_french','door_entrance','door_bifold'].includes(style);
    const telW  = isSliding ? W  : W  + PUNTA_W;
    const telDH = isSliding ? 0  : hasBattenteStyle ? PUNTA_H_BATTENTE : PUNTA_H_NO_BATTENTE;
    const telHL = hL + telDH;
    const telHR = hR + telDH;

    if (style === 'subframe_window') {
      push45('Profilo controtelaio', W, H, H);
      if (o.hasBattente) push45('Profilo controtelaio', W);
      continue;
    }

    if (style === 'window_fixed') {
      const hasSL  = (o.sopraluce ?? false) && !!o.sopraluceHeight;
      const SLH    = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      const mainHL = Math.max(1, hL - SLH);
      const mainHR = Math.max(1, hR - SLH);
      push45('Profilo telaio', telW, telW, telHL, telHR);
      push90('Fermavetro', W, W, mainHL, mainHR);
      if (hasSL) { push90('Traverso', Math.max(1, W - 50)); push90('Fermavetro', W, W, SLH, SLH); }
      continue;
    }

    const isWindow  = style.startsWith('window');
    const isDoor    = style.startsWith('door');
    const isShutter = style.startsWith('shutter');

    if (isWindow) {
      const hasSL = (o.sopraluce ?? false) && !!o.sopraluceHeight;
      const SLH   = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      push45('Profilo telaio', telW, telW, telHL, telHR);
      const nLeaves = isSliding ? Math.max(2, n) : n;
      const leafW = Math.round(W / nLeaves);
      const antaW = Math.max(1, leafW - antaReduction);
      const luceW = Math.max(0, antaW - 2 * antaTopRail);
      for (let i = 0; i < nLeaves; i++) {
        const fL = i / nLeaves, fR = (i + 1) / nLeaves;
        const leafHL = Math.max(1, Math.round(hL + (hR - hL) * fL) - SLH - antaReduction);
        const leafHR = Math.max(1, Math.round(hL + (hR - hL) * fR) - SLH - antaReduction);
        push45('Profilo anta', antaW, antaW, leafHL, leafHR);
        if (o.hasFermavetro) {
          const luceHL = Math.max(0, leafHL - 2 * antaTopRail);
          const luceHR = Math.max(0, leafHR - 2 * antaTopRail);
          push90('Fermavetro', luceW, luceW, luceHL, luceHR);
        }
        if (isSliding) push90('Coppiglia', Math.round(hL + (hR - hL) * (i + 0.5)) - SLH);
      }
      if (!isSliding) {
        for (let i = 0; i < nLeaves - 1; i++) push90('Riporto', Math.round(hL + (hR - hL) * ((i + 1) / nLeaves)) - SLH);
      }
      if (hasSL) { push90('Traverso', Math.max(1, W - 50)); push90('Fermavetro', W, W, SLH, SLH); }
    }

    if (isDoor) {
      const hasSL = (o.sopraluce ?? false) && !!o.sopraluceHeight && style !== 'door_sliding';
      const SLH   = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      if (style === 'door_sliding') {
        push45('Profilo telaio', telW, telW, telHL, telHR);
      } else if (o.hasSoglia) {
        push45('Profilo telaio', telW, telHL, telHR);
        push90('Soglia ribassata', W);
      } else if (!o.hasBattente) {
        push45('Profilo telaio', telW, telHL, telHR);
      } else {
        push45('Profilo telaio', telW, telW, telHL, telHR);
      }
      if (o.hasFascia) push90('Fascia', W);
      const nDoorLeaves = style === 'door_sliding' ? Math.max(2, n) : n;
      const leafW = Math.round(W / nDoorLeaves);
      const antaW = Math.max(1, leafW - antaReduction);
      const luceW = Math.max(0, antaW - 2 * antaTopRail);
      const noBattenteDoor = !o.hasBattente && style !== 'door_sliding';
      for (let i = 0; i < nDoorLeaves; i++) {
        const fL = i / nDoorLeaves, fR = (i + 1) / nDoorLeaves;
        const leafHL = Math.max(1, Math.round(hL + (hR - hL) * fL) - SLH - antaReduction);
        const leafHR = Math.max(1, Math.round(hL + (hR - hL) * fR) - SLH - antaReduction);
        if (noBattenteDoor) {
          push45('Profilo anta', antaW, leafHL, leafHR); // 3 pezzi: traverso sup + 2 montanti
          push90('Zoccolo', Math.max(0, antaW - 2 * antaReduction)); // zoccolo inferiore
        } else {
          push45('Profilo anta', antaW, antaW, leafHL, leafHR);
        }
        if (o.hasFermavetro) {
          if (o.hasFascia) {
            const FASCIA_PROFILE_H = 110;
            const fasciaBottom = fasciaH - FASCIA_PROFILE_H / 2;
            const fasciaTop    = fasciaH + FASCIA_PROFILE_H / 2;
            const botH  = Math.max(0, fasciaBottom - zoccoloH);
            const topHL = Math.max(0, leafHL - fasciaTop - antaTopRail);
            const topHR = Math.max(0, leafHR - fasciaTop - antaTopRail);
            push90('Fermavetro', luceW, luceW, botH, botH);
            push90('Fermavetro', luceW, luceW, topHL, topHR);
          } else {
            const luceHL = Math.max(0, leafHL - 2 * antaTopRail);
            const luceHR = Math.max(0, leafHR - 2 * antaTopRail);
            push90('Fermavetro', luceW, luceW, luceHL, luceHR);
          }
        }
        if (style === 'door_sliding') push90('Coppiglia', Math.round(hL + (hR - hL) * (i + 0.5)) - SLH);
      }
      if (hasSL) { push90('Traverso', Math.max(1, W - 50)); push90('Fermavetro', W, W, SLH, SLH); }
    }

    if (isShutter) {
      const isPF   = style === 'shutter_double' || H > PF_THRESHOLD;
      const leafW  = Math.round(W / n);
      const antaW  = Math.max(1, leafW - antaReduction);
      const innerW = Math.max(0, antaW - 2 * antaReduction);
      const FASCIA_PROFILE_H = 110;
      push45('Profilo telaio', telW, telHL, telHR);
      for (let i = 0; i < n; i++) {
        const fL = i / n, fR = (i + 1) / n;
        const leafHL = Math.round(hL + (hR - hL) * fL);
        const leafHR = Math.round(hL + (hR - hL) * fR);
        push45('Profilo anta', leafW, leafHL, leafHR);
        push90('Zoccolo', innerW);
        const mlCount = isPF ? 4 : 2;
        for (let j = 0; j < mlCount; j++) { push90('Mezza lamella', innerW); push90('Posizionatore', innerW); }
        if (isPF) push90('Fascia', innerW);
        let slats: number;
        if (isPF) {
          const fasciaBottom = fasciaH - FASCIA_PROFILE_H / 2;
          const netBottom    = Math.max(0, fasciaBottom - zoccoloH);
          const fasciaTop    = fasciaH + FASCIA_PROFILE_H / 2;
          const netTop       = Math.max(0, H - fasciaTop - antaTopRail);
          slats = Math.floor(netBottom / slatPitch) + Math.floor(netTop / slatPitch);
        } else {
          slats = Math.floor(Math.max(0, H - zoccoloH - antaTopRail) / slatPitch);
        }
        for (let j = 0; j < slats; j++) push90('Lamella', innerW);
      }
    }
  }

  return { b45, b90, oversized };
}

// ─── calculateMaterials ───────────────────────────────────────────────────────

function calculateMaterials(openings: Opening[], config: MaterialsConfig = {}): MaterialsResult {
  const { riattestattura = 25, barLength = DEFAULT_BAR_MM, kerf90 = DEFAULT_KERF_90, safetyMarginPct = 5 } = config;
  const { b45, b90, oversized } = gatherPieces(openings, config);

  function applyMargin(n: number) { return safetyMarginPct <= 0 ? n : n + Math.round(n * safetyMarginPct / 100); }

  function toResult45(label: string, pieces: number[]): ProfileResult | null {
    if (!pieces.length) return null;
    const { count, offcuts, nearLimitCount } = calcBarsN(pieces, barLength, riattestattura, false);
    if (count === 0) return null;
    return { label, bars: applyMargin(count), offcuts, nearLimit: nearLimitCount > 0 };
  }
  function toResult90(label: string, pieces: number[]): ProfileResult | null {
    if (!pieces.length) return null;
    const { count, offcuts, nearLimitCount } = calcBarsN(pieces, barLength, kerf90, true);
    if (count === 0) return null;
    return { label, bars: applyMargin(count), offcuts, nearLimit: nearLimitCount > 0 };
  }

  const profiles45 = Object.entries(b45).map(([l, p]) => toResult45(l, p)).filter(Boolean) as ProfileResult[];
  const profiles90 = Object.entries(b90).map(([l, p]) => toResult90(l, p)).filter(Boolean) as ProfileResult[];
  const warnings = Object.entries(oversized).map(([label, pieces]) =>
    `${label}: ${pieces.length} pezzo${pieces.length > 1 ? 'i' : ''} supera${pieces.length > 1 ? 'no' : ''} la lunghezza barra (${pieces.map(p => `${p}mm`).join(', ')})`
  );

  return { profiles45, profiles90, totalBars45: profiles45.reduce((s, p) => s + p.bars, 0), totalBars90: profiles90.reduce((s, p) => s + p.bars, 0), warnings };
}

// ─── calculateCuttingList ─────────────────────────────────────────────────────

function calculateCuttingList(openings: Opening[], config: MaterialsConfig = {}): CuttingListResult {
  const { riattestattura = 25, barLength = DEFAULT_BAR_MM, kerf90 = DEFAULT_KERF_90 } = config;
  const { b45, b90, oversized } = gatherPieces(openings, config);

  const profiles45 = Object.entries(b45).map(([label, pieces]): CuttingProfile | null => {
    if (!pieces.length) return null;
    const { binDetails } = calcBarsN(pieces, barLength, riattestattura, false);
    if (!binDetails.length) return null;
    return { label, cutAngle: 45, bins: binDetails };
  }).filter(Boolean) as CuttingProfile[];

  const profiles90 = Object.entries(b90).map(([label, pieces]): CuttingProfile | null => {
    if (!pieces.length) return null;
    const { binDetails } = calcBarsN(pieces, barLength, kerf90, true);
    if (!binDetails.length) return null;
    return { label, cutAngle: 90, bins: binDetails };
  }).filter(Boolean) as CuttingProfile[];

  const warnings = Object.entries(oversized).map(([label, pieces]) =>
    `${label}: ${pieces.length} pezzo${pieces.length > 1 ? 'i' : ''} supera${pieces.length > 1 ? 'no' : ''} la lunghezza barra (${pieces.map(p => `${p}mm`).join(', ')})`
  );

  return { profiles45, profiles90, warnings, barLength };
}

// ─── calculateCatalogCuttingList ──────────────────────────────────────────────

const GROUP_ORDER:  PieceGroup[]               = ['telaio', 'anta', 'fermavetro', 'riporto', 'fascia_zoccolo', 'lamella', 'mezza_lamella', 'posizionatore'];
const GROUP_LABELS: Record<PieceGroup, string> = { telaio: 'Telaio', anta: 'Anta', fermavetro: 'Fermavetro', riporto: 'Riporto', fascia_zoccolo: 'Fascia/Zoccolo', lamella: 'Lamella', mezza_lamella: 'Mezza Lamella', posizionatore: 'Posizionatore' };

function isSeriesEligible(o: Opening): boolean {
  if (!o.width || !o.height || !o.style) return false;
  const s = o.style;
  return s.startsWith('window') || s.startsWith('door') || s.startsWith('shutter');
}

function calculateCatalogCuttingList(
  openings: Opening[],
  series: CatalogSeries,
  toleranceW: number,
  toleranceH: number,
  config: MaterialsConfig = {},
  toleranceByType?: ToleranceByType,
): CuttingListResult {
  const { riattestattura = 25, barLength = DEFAULT_BAR_MM, kerf90 = DEFAULT_KERF_90 } = config;

  const b45: Partial<Record<PieceGroup, CuttingBinPiece[]>> = {};
  const b90: Partial<Record<PieceGroup, CuttingBinPiece[]>> = {};
  const warnings: string[] = [];

  function push(group: PieceGroup, is90: boolean, length: number, label: string) {
    if (length <= 0) return;
    if (length > barLength) { warnings.push(`${label}: ${length}mm supera la barra (${barLength}mm)`); return; }
    const target = is90 ? b90 : b45;
    if (!target[group]) target[group] = [];
    target[group]!.push({ length, label });
  }

  for (const o of openings) {
    if (!isSeriesEligible(o)) continue;
    const variant = findBestVariant(series, o.leafCount);
    if (!variant || !variant.pieces.length) continue;

    const tol    = toleranceByType ? toleranceForStyle(o.style, toleranceByType) : { w: toleranceW, h: toleranceH };
    const pcL    = o.width!  - tol.w;
    const pcH    = o.height! - tol.h;
    const hasSoglia = o.hasSoglia === true;

    const hasTelaioInVariant = variant.pieces.some(p => (p.pieceCategory ?? 'anta') === 'telaio');
    if (!hasTelaioInVariant) {
      const tOff       = variant.telaiOffset ?? 0;
      const useFS      = !!(o.outOfSquare && o.heightLeft && o.heightRight);
      const baseHL     = useFS ? o.heightLeft!  - tol.h : pcH;
      const baseHR     = useFS ? o.heightRight! - tol.h : pcH;
      const s          = o.style!;
      const isSlidingT = s === 'window_sliding' || s === 'door_sliding';
      const isShutterT = s.startsWith('shutter');
      const isDoorT    = s.startsWith('door');
      const nTraversi  = (isShutterT || (isDoorT && !isSlidingT && !o.hasBattente)) ? 1 : 2;
      const rW   = Math.round(pcL);
      const rHL  = Math.round(baseHL);
      const rHR  = Math.round(baseHR);
      const rOff = Math.round(tOff);
      const wLbl  = tOff > 0 ? `Traverso (${rW}+${rOff})` : 'Traverso';
      const hLLbl = tOff > 0 ? `Montante (${rHL}+${rOff})` : 'Montante';
      const hRLbl = tOff > 0 ? `Montante (${rHR}+${rOff})` : 'Montante';
      for (let t = 0; t < nTraversi; t++) push('telaio', false, pcL + tOff, wLbl);
      push('telaio', false, baseHL + tOff, hLLbl);
      if (Math.round(baseHR) !== Math.round(baseHL)) push('telaio', false, baseHR + tOff, hRLbl);
      else push('telaio', false, baseHR + tOff, hLLbl);
    }

    for (const piece of variant.pieces) {
      const cond = piece.condition ?? 'always';
      const hasBatt = o.hasBattente === true;
      if (cond === 'no_soglia'      &&  hasSoglia)            continue;
      if (cond === 'with_soglia'    && !hasSoglia)            continue;
      if (cond === 'con_battente'   && !hasBatt)              continue;
      if (cond === 'senza_battente' && (hasBatt || hasSoglia)) continue;

      const cat = piece.pieceCategory ?? 'anta';
      if (o.style === 'window_fixed' && (cat === 'anta' || cat === 'riporto')) continue;
      if (cat === 'fermavetro' && !o.hasFermavetro) continue;
      if (cat === 'riporto' && (o.leafCount ?? 1) <= 1) continue;

      const base   = piece.baseVar === 'L' ? pcL : pcH;
      const length = computePieceLength(base, piece);
      if (length <= 0) continue;

      const is90     = piece.cutAngle1 === 90 && piece.cutAngle2 === 90;
      const typeLabel = piece.baseVar === 'L' ? 'Traverso' : 'Montante';
      const cutLabel  = piece.name ? `${typeLabel} — ${piece.name}` : typeLabel;
      for (let q = 0; q < piece.quantity; q++) push(cat, is90, length, cutLabel);
    }
  }

  const profiles45 = GROUP_ORDER.filter(g => b45[g]?.length).map((g): CuttingProfile => {
    const { binDetails } = calcBars(b45[g]!, barLength, riattestattura, false);
    return { label: GROUP_LABELS[g], cutAngle: 45, bins: binDetails, group: g };
  });
  const profiles90 = GROUP_ORDER.filter(g => b90[g]?.length).map((g): CuttingProfile => {
    const { binDetails } = calcBars(b90[g]!, barLength, kerf90, true);
    return { label: GROUP_LABELS[g], cutAngle: 90, bins: binDetails, group: g };
  });

  return { profiles45, profiles90, warnings, barLength };
}

// ─── catalogCuttingToMaterials ────────────────────────────────────────────────

function catalogCuttingToMaterials(cuttingResult: CuttingListResult, safetyMarginPct = 5): MaterialsResult {
  function applyMargin(n: number) { return safetyMarginPct <= 0 ? n : n + Math.round(n * safetyMarginPct / 100); }
  const toProfile = (cp: CuttingProfile): ProfileResult => ({
    label:     cp.label,
    bars:      applyMargin(cp.bins.length),
    offcuts:   cp.bins.map(b => b.remaining).filter(r => r >= MIN_REMNANT_MM),
    nearLimit: cp.bins.some(b => b.remaining > 0 && b.remaining < NEAR_LIMIT_THRESHOLD),
  });
  const p45 = cuttingResult.profiles45.map(toProfile);
  const p90 = cuttingResult.profiles90.map(toProfile);
  return {
    profiles45: p45, profiles90: p90,
    totalBars45: p45.reduce((s, p) => s + p.bars, 0),
    totalBars90: p90.reduce((s, p) => s + p.bars, 0),
    warnings: cuttingResult.warnings,
  };
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const {
      openings,
      config,
      series,
      toleranceW = 10,
      toleranceH = 10,
      toleranceByType,
    } = await req.json();

    if (!Array.isArray(openings)) {
      return new Response(JSON.stringify({ error: 'openings must be an array' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const cfg: MaterialsConfig = config ?? {};
    const safetyMarginPct = cfg.safetyMarginPct ?? 5;

    // Se c'è una serie, il calcolo standard copre solo le aperture non eligibili
    const standardOpenings = series
      ? openings.filter((o: Opening) => !isSeriesEligible(o))
      : openings;

    const cuttingResult   = calculateCuttingList(standardOpenings, cfg);
    const materialsResult = calculateMaterials(standardOpenings, cfg);

    // Catalogo (con serie)
    let catalogCuttingResult:   CuttingListResult | null = null;
    let catalogMaterialsResult: MaterialsResult   | null = null;
    if (series) {
      catalogCuttingResult   = calculateCatalogCuttingList(openings, series, toleranceW, toleranceH, cfg, toleranceByType);
      catalogMaterialsResult = catalogCuttingToMaterials(catalogCuttingResult, safetyMarginPct);
    }

    return new Response(
      JSON.stringify({ cuttingResult, materialsResult, catalogCuttingResult, catalogMaterialsResult }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

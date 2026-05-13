import { Opening } from '../types';
import { CatalogSeries, findBestVariant, ToleranceByType, toleranceForStyle } from '../storage/settings';

const DEFAULT_BAR_MM  = 6400;
const DEFAULT_KERF_90 = 4;
const PF_THRESHOLD    = 1500;

export const MIN_REMNANT_MM    = 500;
const NEAR_LIMIT_THRESHOLD = 250; // barra "quasi piena" — meno di questo di avanzo

export interface MaterialsConfig {
  riattestattura?:  number;  // waste between 45° cuts on same bar (default 25mm)
  barLength?:       number;  // usable bar length (default 6400mm)
  kerf90?:          number;  // blade kerf per 90° cut (default 4mm)
  safetyMarginPct?: number;  // safety margin % on bar count (default 5)
  slatPitch?:       number;  // shutter slat pitch (default 55mm)
  zoccoloH?:        number;  // shutter bottom rail height (default 110mm)
  fasciaH?:         number;  // shutter fascia height for porta-finestra (default 110mm)
  antaTopRail?:     number;  // shutter top rail of leaf (default 68mm)
  antaReduction?:   number;  // total reduction telaio→anta (default 0mm)
}

export interface ProfileResult {
  label:        string;
  bars:         number;
  offcuts:      number[];
  nearLimit:    boolean;   // almeno una barra è usata quasi al limite (< 250mm liberi)
}

export interface MaterialsResult {
  profiles45:  ProfileResult[];
  profiles90:  ProfileResult[];
  totalBars45: number;
  totalBars90: number;
  warnings:    string[];  // pieces exceeding bar length
}

// ─── Cutting list types ───────────────────────────────────────────────────────

export interface CuttingBinPiece {
  length: number;
  label:  string;  // nome del taglio (es. "Traverso", "Montante", nome pezzo)
}

export interface CuttingBin {
  pieces:    CuttingBinPiece[];
  remaining: number;   // leftover mm after all cuts
}

export type PieceGroup = 'telaio' | 'anta' | 'fermavetro' | 'riporto';

export interface CuttingProfile {
  label:     string;
  cutAngle:  45 | 90;
  bins:      CuttingBin[];
  group?:    PieceGroup;
}

export interface CuttingListResult {
  profiles45: CuttingProfile[];
  profiles90: CuttingProfile[];
  warnings:   string[];
  barLength:  number;
}

/**
 * First Fit Decreasing bin-packing con pezzi etichettati.
 * kerfOnFirstCut=true  (90°): ogni taglio paga kerf, incluso il primo su barra nuova.
 * kerfOnFirstCut=false (45°): la barra arriva già attestata, il primo pezzo non paga.
 */
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
  const bins: number[]               = [barMm];
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

  // L'alert scatta solo se l'ULTIMA barra ha pochissimo avanzo.
  const lastBinRem = bins[bins.length - 1];
  const nearLimitCount = (lastBinRem > 0 && lastBinRem < NEAR_LIMIT_THRESHOLD) ? 1 : 0;

  return {
    count: bins.length,
    offcuts: bins.filter(s => s >= MIN_REMNANT_MM),
    nearLimitCount,
    binDetails,
  };
}

// Helper per percorso standard (pezzi senza nome individuale)
function calcBarsN(
  lengths: number[],
  barMm: number,
  wastePerCut: number,
  kerfOnFirstCut = false,
) {
  return calcBars(lengths.map(l => ({ length: l, label: '' })), barMm, wastePerCut, kerfOnFirstCut);
}

// ─── Shared piece-gathering (percorso standard) ───────────────────────────────

function gatherPieces(
  openings: Opening[],
  config: MaterialsConfig,
): {
  b45:      Record<string, number[]>;
  b90:      Record<string, number[]>;
  oversized: Record<string, number[]>;
} {
  const {
    barLength     = DEFAULT_BAR_MM,
    slatPitch     = 55,
    zoccoloH      = 110,
    fasciaH       = 994,  // posizione centro fascia dal basso
    antaTopRail   = 68,
    antaReduction = 0,
  } = config;

  const b45: Record<string, number[]> = {
    'Profilo telaio':       [],
    'Profilo anta':         [],
    'Profilo controtelaio': [],
  };
  const b90: Record<string, number[]> = {
    'Soglia ribassata': [],
    'Fascia':           [],
    'Fermavetro':       [],
    'Traverso':         [],
    'Coppiglia':        [],
    'Zoccolo':          [],
    'Mezza lamella':    [],
    'Posizionatore':    [],
    'Lamella':          [],
    'Riporto':          [],
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

    const useFS  = !!(o.outOfSquare && o.heightLeft && o.heightRight);
    const hL     = useFS ? (o.heightLeft ?? H) : H;
    const hR     = useFS ? (o.heightRight ?? H) : H;
    if (style === 'roller_blind' || style.startsWith('mosquito') || style === 'custom') continue;

    const isSliding = style === 'window_sliding' || style === 'door_sliding';
    const hasBattenteStyle = style === 'window_single' || style === 'window_double' ||
      style === 'window_tilt_turn' || style === 'door_single' || style === 'door_double' ||
      style === 'door_french' || style === 'door_entrance' || style === 'door_bifold';
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
      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
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
      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
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
      for (let i = 0; i < nDoorLeaves; i++) {
        const fL = i / nDoorLeaves, fR = (i + 1) / nDoorLeaves;
        const leafHL = Math.max(1, Math.round(hL + (hR - hL) * fL) - SLH - antaReduction);
        const leafHR = Math.max(1, Math.round(hL + (hR - hL) * fR) - SLH - antaReduction);
        push45('Profilo anta', antaW, antaW, leafHL, leafHR);
        if (o.hasFermavetro) {
          if (o.hasFascia) {
            const FASCIA_PROFILE_H = 110;
            const fasciaBottom = fasciaH - FASCIA_PROFILE_H / 2;
            const fasciaTop    = fasciaH + FASCIA_PROFILE_H / 2;
            const botH = Math.max(0, fasciaBottom - zoccoloH);
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
      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
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
        for (let j = 0; j < mlCount; j++) {
          push90('Mezza lamella', innerW);
          push90('Posizionatore', innerW);
        }
        if (isPF) push90('Fascia', innerW);
        let slats: number;
        if (isPF) {
          const fasciaBottom = fasciaH - FASCIA_PROFILE_H / 2;
          const netBottom    = Math.max(0, fasciaBottom - zoccoloH);
          const fasciaTop    = fasciaH + FASCIA_PROFILE_H / 2;
          const netTop       = Math.max(0, H - fasciaTop - antaTopRail);
          slats = Math.floor(netBottom / slatPitch) + Math.floor(netTop / slatPitch);
        } else {
          const netH = Math.max(0, H - zoccoloH - antaTopRail);
          slats = Math.floor(netH / slatPitch);
        }
        for (let j = 0; j < slats; j++) push90('Lamella', innerW);
      }
    }
  }

  return { b45, b90, oversized };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function calculateMaterials(
  openings: Opening[],
  config: MaterialsConfig = {},
): MaterialsResult {
  const {
    riattestattura  = 25,
    barLength       = DEFAULT_BAR_MM,
    kerf90          = DEFAULT_KERF_90,
    safetyMarginPct = 5,
  } = config;

  const { b45, b90, oversized } = gatherPieces(openings, config);

  function applyMargin(n: number): number {
    if (safetyMarginPct <= 0) return n;
    return n + Math.round(n * safetyMarginPct / 100);
  }

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

  const profiles45 = Object.entries(b45)
    .map(([l, p]) => toResult45(l, p))
    .filter(Boolean) as ProfileResult[];

  const profiles90 = Object.entries(b90)
    .map(([l, p]) => toResult90(l, p))
    .filter(Boolean) as ProfileResult[];

  const warnings = Object.entries(oversized).map(
    ([label, pieces]) =>
      `${label}: ${pieces.length} pezzo${pieces.length > 1 ? 'i' : ''} supera${pieces.length > 1 ? 'no' : ''} la lunghezza barra (${pieces.map(p => `${p}mm`).join(', ')})`
  );

  return {
    profiles45,
    profiles90,
    totalBars45: profiles45.reduce((s, p) => s + p.bars, 0),
    totalBars90: profiles90.reduce((s, p) => s + p.bars, 0),
    warnings,
  };
}

// ─── Cutting list (percorso standard) ────────────────────────────────────────

export function calculateCuttingList(
  openings: Opening[],
  config: MaterialsConfig = {},
): CuttingListResult {
  const {
    riattestattura = 25,
    barLength      = DEFAULT_BAR_MM,
    kerf90         = DEFAULT_KERF_90,
  } = config;

  const { b45, b90, oversized } = gatherPieces(openings, config);

  const profiles45 = Object.entries(b45)
    .map(([label, pieces]): CuttingProfile | null => {
      if (!pieces.length) return null;
      const { binDetails } = calcBarsN(pieces, barLength, riattestattura, false);
      if (!binDetails.length) return null;
      return { label, cutAngle: 45, bins: binDetails };
    })
    .filter(Boolean) as CuttingProfile[];

  const profiles90 = Object.entries(b90)
    .map(([label, pieces]): CuttingProfile | null => {
      if (!pieces.length) return null;
      const { binDetails } = calcBarsN(pieces, barLength, kerf90, true);
      if (!binDetails.length) return null;
      return { label, cutAngle: 90, bins: binDetails };
    })
    .filter(Boolean) as CuttingProfile[];

  const warnings = Object.entries(oversized).map(
    ([label, pieces]) =>
      `${label}: ${pieces.length} pezzo${pieces.length > 1 ? 'i' : ''} supera${pieces.length > 1 ? 'no' : ''} la lunghezza barra (${pieces.map(p => `${p}mm`).join(', ')})`
  );

  return { profiles45, profiles90, warnings, barLength };
}

// ─── Catalog cutting list ─────────────────────────────────────────────────────

function isSeriesEligible(o: Opening): boolean {
  if (!o.width || !o.height || !o.style) return false;
  const s = o.style;
  return s.startsWith('window') || s.startsWith('door') || s.startsWith('shutter');
}

const GROUP_ORDER:  PieceGroup[]                  = ['telaio', 'anta', 'fermavetro', 'riporto'];
const GROUP_LABELS: Record<PieceGroup, string>    = { telaio: 'Telaio', anta: 'Anta', fermavetro: 'Fermavetro', riporto: 'Riporto' };

export function calculateCatalogCuttingList(
  openings: Opening[],
  series: CatalogSeries,
  toleranceW: number,
  toleranceH: number,
  config: MaterialsConfig = {},
  toleranceByType?: ToleranceByType,
): CuttingListResult {
  const {
    riattestattura = 25,
    barLength      = DEFAULT_BAR_MM,
    kerf90         = DEFAULT_KERF_90,
  } = config;

  // Accumula per GRUPPO (profilo fisico), non per nome pezzo
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

    // ── Auto-telaio se la variante non ha pezzi categoria telaio ──────────────
    const hasTelaioInVariant = variant.pieces.some(p => (p.pieceCategory ?? 'anta') === 'telaio');
    if (!hasTelaioInVariant) {
      const tOff       = variant.telaiOffset ?? 0;
      const useFS      = !!(o.outOfSquare && o.heightLeft && o.heightRight);
      const baseHL     = useFS ? o.heightLeft!  - tol.h : pcH;
      const baseHR     = useFS ? o.heightRight! - tol.h : pcH;
      const tW         = pcL + tOff;
      const tHL        = baseHL + tOff;
      const tHR        = baseHR + tOff;
      const s          = o.style!;
      const isSlidingT = s === 'window_sliding' || s === 'door_sliding';
      const isShutterT = s.startsWith('shutter');
      const isDoorT    = s.startsWith('door');
      const nTraversi  = (isShutterT || (isDoorT && !isSlidingT && !o.hasBattente)) ? 1 : 2;
      const rW  = Math.round(pcL);
      const rHL = Math.round(baseHL);
      const rHR = Math.round(baseHR);
      const rOff = Math.round(tOff);
      const wLbl  = tOff > 0 ? `Traverso (${rW}+${rOff})`  : 'Traverso';
      const hLLbl = tOff > 0 ? `Montante (${rHL}+${rOff})` : 'Montante';
      const hRLbl = tOff > 0 ? `Montante (${rHR}+${rOff})` : 'Montante';
      for (let t = 0; t < nTraversi; t++) push('telaio', false, tW, wLbl);
      push('telaio', false, tHL, hLLbl);
      if (tHR !== tHL) push('telaio', false, tHR, hRLbl);
      else             push('telaio', false, tHR, hLLbl);
    }

    // ── Pezzi dalla variante ───────────────────────────────────────────────────
    for (const piece of variant.pieces) {
      const cond = piece.condition ?? 'always';
      if (cond === 'no_soglia'   &&  hasSoglia) continue;
      if (cond === 'with_soglia' && !hasSoglia) continue;

      const cat = piece.pieceCategory ?? 'anta';

      // Finestra fissa: solo telaio e fermavetro
      if (o.style === 'window_fixed' && (cat === 'anta' || cat === 'riporto')) continue;
      if (cat === 'fermavetro' && !o.hasFermavetro) continue;
      if (cat === 'riporto' && (o.leafCount ?? 1) <= 1) continue;

      const base = piece.baseVar === 'L' ? pcL : pcH;
      const df   = piece.divideFirst === true;
      const length = df
        ? Math.round(((base / piece.divisor) + piece.offset) * 2) / 2
        : Math.round(((base + piece.offset) / piece.divisor) * 2) / 2;
      if (length <= 0) continue;

      const is90 = piece.cutAngle1 === 90 && piece.cutAngle2 === 90;
      for (let q = 0; q < piece.quantity; q++) push(cat, is90, length, piece.name);
    }
  }

  const profiles45 = GROUP_ORDER
    .filter(g => b45[g]?.length)
    .map((g): CuttingProfile => {
      const { binDetails } = calcBars(b45[g]!, barLength, riattestattura, false);
      return { label: GROUP_LABELS[g], cutAngle: 45, bins: binDetails, group: g };
    });

  const profiles90 = GROUP_ORDER
    .filter(g => b90[g]?.length)
    .map((g): CuttingProfile => {
      const { binDetails } = calcBars(b90[g]!, barLength, kerf90, true);
      return { label: GROUP_LABELS[g], cutAngle: 90, bins: binDetails, group: g };
    });

  return { profiles45, profiles90, warnings, barLength };
}

// Converte CuttingListResult → MaterialsResult (sviluppo: barre per profilo)
export function catalogCuttingToMaterials(
  cuttingResult: CuttingListResult,
  safetyMarginPct = 5,
): MaterialsResult {
  function applyMargin(n: number) {
    return safetyMarginPct <= 0 ? n : n + Math.round(n * safetyMarginPct / 100);
  }
  const toProfile = (cp: CuttingProfile): ProfileResult => ({
    label:     cp.label,
    bars:      applyMargin(cp.bins.length),
    offcuts:   cp.bins.map(b => b.remaining).filter(r => r >= MIN_REMNANT_MM),
    nearLimit: cp.bins.some(b => b.remaining > 0 && b.remaining < NEAR_LIMIT_THRESHOLD),
  });
  const p45 = cuttingResult.profiles45.map(toProfile);
  const p90 = cuttingResult.profiles90.map(toProfile);
  return {
    profiles45:  p45,
    profiles90:  p90,
    totalBars45: p45.reduce((s, p) => s + p.bars, 0),
    totalBars90: p90.reduce((s, p) => s + p.bars, 0),
    warnings:    cuttingResult.warnings,
  };
}

// Aperture non coperte dalla serie → calcolo default
export function openingsWithoutSeries(openings: Opening[]): Opening[] {
  return openings.filter(o => !isSeriesEligible(o));
}

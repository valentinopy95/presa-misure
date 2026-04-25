import { Opening } from '../types';

const DEFAULT_BAR_MM  = 6400;
const DEFAULT_KERF_90 = 4;
const PF_THRESHOLD    = 1500;

export const MIN_REMNANT_MM = 500;

export interface MaterialsConfig {
  riattestattura?:  number;  // waste between 45° cuts on same bar (default 25mm)
  barLength?:       number;  // usable bar length (default 6400mm)
  kerf90?:          number;  // blade kerf per 90° cut (default 4mm)
  safetyMarginPct?: number;  // safety margin % on bar count (default 5)
  slatPitch?:       number;  // shutter slat pitch (default 55mm)
  zoccoloH?:        number;  // shutter bottom rail height (default 120mm)
  fasciaH?:         number;  // shutter top fascia height for porta-finestra (default 120mm)
  antaReduction?:   number;  // total reduction telaio→anta (default 0mm)
}

export interface ProfileResult {
  label:   string;
  bars:    number;
  offcuts: number[];
}

export interface MaterialsResult {
  profiles45:  ProfileResult[];
  profiles90:  ProfileResult[];
  totalBars45: number;
  totalBars90: number;
  warnings:    string[];  // pieces exceeding bar length
}

/**
 * First Fit Decreasing bin-packing.
 * kerfOnFirstCut=true  (90°): every cut pays kerf, including first on a fresh bar.
 * kerfOnFirstCut=false (45°): bar arrives pre-squared, first piece pays no kerf.
 */
function calcBars(
  pieces: number[],
  barMm: number,
  wastePerCut: number,
  kerfOnFirstCut = false,
): { count: number; offcuts: number[] } {
  if (!pieces.length) return { count: 0, offcuts: [] };

  const valid = pieces.filter(p => p > 0 && p <= barMm);
  if (!valid.length) return { count: 0, offcuts: [] };

  const sorted = [...valid].sort((a, b) => b - a);
  const bins: number[] = [barMm];

  for (const piece of sorted) {
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      const rem     = bins[i];
      const isFirst = !kerfOnFirstCut && rem === barMm;
      const needed  = piece + (isFirst ? 0 : wastePerCut);
      if (needed <= rem) {
        bins[i] -= needed;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push(barMm - piece - (kerfOnFirstCut ? wastePerCut : 0));
    }
  }

  return {
    count:   bins.length,
    offcuts: bins.filter(s => s >= MIN_REMNANT_MM),
  };
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
    slatPitch       = 55,
    zoccoloH        = 100,
    fasciaH         = 100,
    antaReduction   = 0,
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

  // Pieces exceeding bar length — collected for warnings
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

  for (const o of openings) {
    const W = o.width  ?? 0;
    const H = o.height ?? 0;
    const n = Math.max(1, o.leafCount ?? 1);
    const { style } = o;

    if (!style || W <= 0 || H <= 0) continue;
    if (style === 'roller_blind' || style.startsWith('mosquito')) continue;

    // ── Controtelaio ──────────────────────────────────────────────────────────
    if (style === 'subframe_window') {
      // U shape: 2 montanti + 1 traverso superiore at 45°
      push45('Profilo controtelaio', W, H, H);
      // Optional 4th piece (traverso inferiore) if requested
      if (o.hasBattente) push45('Profilo controtelaio', W);
      continue;
    }

    // Fisso: telaio 4 lati + fermavetro sempre (nessuna anta)
    if (style === 'window_fixed') {
      const hasSL = (o.sopraluce ?? false) && !!o.sopraluceHeight;
      const SLH   = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      const mainH = H - SLH;

      push45('Profilo telaio', W, W, H, H);
      push90('Fermavetro', W, W, mainH, mainH);

      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
      continue;
    }

    const isWindow  = style.startsWith('window');
    const isDoor    = style.startsWith('door');
    const isShutter = style.startsWith('shutter');

    // ── Finestre ──────────────────────────────────────────────────────────────
    if (isWindow) {
      const hasSL = (o.sopraluce ?? false) && !!o.sopraluceHeight;
      const SLH   = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      const antaH = H - SLH;

      push45('Profilo telaio', W, W, H, H);

      const leafW  = Math.round(W / n);
      const antaW  = Math.max(1, leafW  - antaReduction);
      const antaHr = Math.max(1, antaH  - antaReduction);
      for (let i = 0; i < n; i++) {
        push45('Profilo anta', antaW, antaW, antaHr, antaHr);
        if (o.hasFermavetro) push90('Fermavetro', antaW, antaW, antaHr, antaHr);
        if (style === 'window_sliding') push90('Coppiglia', antaH);
      }
      for (let i = 0; i < n - 1; i++) push90('Riporto', antaH);

      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
    }

    // ── Porte ─────────────────────────────────────────────────────────────────
    if (isDoor) {
      const hasSL = (o.sopraluce ?? false) && !!o.sopraluceHeight && style !== 'door_sliding';
      const SLH   = hasSL ? (o.sopraluceHeight ?? 0) : 0;
      const antaH = H - SLH;

      if (style === 'door_sliding') {
        push45('Profilo telaio', W, W, H, H);
      } else if (o.hasSoglia) {
        push45('Profilo telaio', W, H, H);
        push90('Soglia ribassata', W);
      } else if (!o.hasBattente) {
        push45('Profilo telaio', W, H, H);
      } else {
        push45('Profilo telaio', W, W, H, H);
      }
      if (o.hasFascia) push90('Fascia', W);

      const leafW  = Math.round(W / n);
      const antaW  = Math.max(1, leafW  - antaReduction);
      const antaHr = Math.max(1, antaH  - antaReduction);
      for (let i = 0; i < n; i++) {
        push45('Profilo anta', antaW, antaW, antaHr, antaHr);
        if (o.hasFermavetro) push90('Fermavetro', antaW, antaW, antaHr, antaHr);
        if (style === 'door_sliding') push90('Coppiglia', antaH);
      }

      if (hasSL) {
        push90('Traverso', Math.max(1, W - 50));
        push90('Fermavetro', W, W, SLH, SLH);
      }
    }

    // ── Persiane ──────────────────────────────────────────────────────────────
    if (isShutter) {
      const isPF   = style === 'shutter_double' || H > PF_THRESHOLD;
      const leafW  = Math.round(W / n);
      const innerW = Math.max(0, leafW - 50);

      push45('Profilo telaio', W, H, H);

      for (let i = 0; i < n; i++) {
        push45('Profilo anta', leafW, H, H);
        push90('Zoccolo', innerW);

        const mlCount = isPF ? 4 : 2;
        for (let j = 0; j < mlCount; j++) {
          push90('Mezza lamella', innerW);
          push90('Posizionatore', innerW);
        }

        if (isPF) push90('Fascia', innerW);

        const netH  = H - zoccoloH - (isPF ? fasciaH : 0);
        const slats = Math.max(0, Math.floor(netH / slatPitch));
        for (let j = 0; j < slats; j++) push90('Lamella', innerW);
      }
    }
  }

  // ── Build results ─────────────────────────────────────────────────────────

  function applyMargin(n: number): number {
    if (safetyMarginPct <= 0) return n;
    return n + Math.round(n * safetyMarginPct / 100);
  }

  function toResult45(label: string, pieces: number[]): ProfileResult | null {
    if (!pieces.length) return null;
    const { count, offcuts } = calcBars(pieces, barLength, riattestattura, false);
    if (count === 0) return null;
    return { label, bars: applyMargin(count), offcuts };
  }

  function toResult90(label: string, pieces: number[]): ProfileResult | null {
    if (!pieces.length) return null;
    const { count, offcuts } = calcBars(pieces, barLength, kerf90, true);
    if (count === 0) return null;
    return { label, bars: applyMargin(count), offcuts };
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

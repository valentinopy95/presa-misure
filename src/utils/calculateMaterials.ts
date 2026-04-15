import { Opening } from '../types';

const BAR_MM       = 6400;  // usable bar length (6500mm commercial - squaring waste)
const KERF_90      = 4;     // blade kerf for 90° cuts (mm)
const SLAT_PITCH   = 55;    // lamella pitch (mm)
const ZOCCOLO_H    = 120;   // zoccolo height (mm)
const FASCIA_H     = 120;   // fascia height (mm)
const PF_THRESHOLD = 1500;  // above this H, shutter is "porta-finestra" → add fascia

export interface ProfileResult {
  label: string;
  bars: number;
}

export interface MaterialsResult {
  profiles45: ProfileResult[];
  profiles90: ProfileResult[];
  totalBars45: number;
  totalBars90: number;
}

/**
 * First Fit Decreasing bin-packing.
 *
 * Rules:
 *  - Pieces sorted longest first.
 *  - First piece on each bar: no preceding waste (bar already squared to 45°).
 *  - Every subsequent piece on the same bar: wastePerCut mm of riattestattura
 *    consumed between cuts.
 *  - A piece that doesn't fit opens a new bar.
 */
function calcBars(pieces: number[], barMm: number, wastePerCut: number): number {
  if (!pieces.length) return 0;

  // Guard: skip pieces longer than a full bar (shouldn't happen for valid data)
  const valid = pieces.filter(p => p > 0 && p <= barMm);
  if (!valid.length) return 0;

  const sorted = [...valid].sort((a, b) => b - a);

  // Each bin holds the remaining space
  const bins: number[] = [barMm];

  for (const piece of sorted) {
    let placed = false;

    for (let i = 0; i < bins.length; i++) {
      const rem = bins[i];
      const isFirst = rem === barMm; // nothing placed on this bar yet
      const needed  = piece + (isFirst ? 0 : wastePerCut);

      if (needed <= rem) {
        bins[i] -= needed;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Open a new bar — first piece has no preceding waste
      bins.push(barMm - piece);
    }
  }

  return bins.length;
}

// ─── Piece generation per opening ───────────────────────────────────────────

export function calculateMaterials(openings: Opening[], riattestattura = 25): MaterialsResult {
  // 45° cut pieces grouped by profile category
  const b45: Record<string, number[]> = {
    'Profilo telaio': [],
    'Profilo anta':   [],
  };
  // 90° cut pieces grouped by profile category
  const b90: Record<string, number[]> = {
    'Soglia / fascia': [],
    'Zoccolo':         [],
    'Mezza lamella':   [],
    'Posizionatore':   [],
    'Lamella':         [],
    'Riporto':         [],
  };

  for (const o of openings) {
    const W = o.width  ?? 0;
    const H = o.height ?? 0;
    const n = Math.max(1, o.leafCount ?? 1);
    const { style } = o;

    if (!style || W <= 0 || H <= 0) continue;
    if (style === 'roller_blind' || style === 'subframe_window' || style.startsWith('mosquito')) continue;

    const isWindow  = style.startsWith('window');
    const isDoor    = style.startsWith('door');
    const isShutter = style.startsWith('shutter');

    if (isWindow) {
      // Telaio fisso: 4 lati (rettangolo chiuso) → 2×W + 2×H a 45°
      b45['Profilo telaio'].push(W, W, H, H);

      // Anta: 4 lati per ogni foglio → 2×leafW + 2×H a 45°
      const leafW = Math.round(W / n);
      for (let i = 0; i < n; i++) {
        b45['Profilo anta'].push(leafW, leafW, H, H);
      }

      // Montante intermedio tra le ante (riporto) a 90° — 1 per ogni giunzione
      for (let i = 0; i < n - 1; i++) {
        b90['Riporto'].push(H);
      }
    }

    if (isDoor) {
      // Telaio fisso porta: 3 lati (traverso superiore + 2 montanti) a 45°
      // Il basso è la soglia, tagliata a 90°
      b45['Profilo telaio'].push(W, H, H);
      b90['Soglia / fascia'].push(W);

      // Anta: 4 lati per ogni foglio a 45°
      const leafW = Math.round(W / n);
      for (let i = 0; i < n; i++) {
        b45['Profilo anta'].push(leafW, leafW, H, H);
      }
    }

    if (isShutter) {
      const isPF  = H > PF_THRESHOLD; // porta-finestra → aggiunge fascia centrale
      const leafW = Math.round(W / n);

      // Telaio fisso persiana: traverso superiore (W) + 2 montanti (H) a 45°
      // Il basso è lo zoccolo fisso (incluso nel telaio a 90°)
      b45['Profilo telaio'].push(W, H, H);

      for (let i = 0; i < n; i++) {
        // Anta: traverso anta (leafW) + 2 montanti (H) a 45°
        b45['Profilo anta'].push(leafW, H, H);

        // Componenti interni all'anta — tutti a 90°
        b90['Zoccolo'].push(leafW);
        if (isPF) b90['Soglia / fascia'].push(leafW);
        b90['Mezza lamella'].push(leafW);
        b90['Posizionatore'].push(leafW);

        // Lamelle: riempiono l'altezza netta dell'anta
        const netH = H - ZOCCOLO_H - (isPF ? FASCIA_H : 0);
        const slats = Math.max(0, Math.floor(netH / SLAT_PITCH));
        for (let j = 0; j < slats; j++) {
          b90['Lamella'].push(leafW);
        }
      }
    }
  }

  function toResult(label: string, pieces: number[], waste: number): ProfileResult | null {
    if (!pieces.length) return null;
    const bars = calcBars(pieces, BAR_MM, waste);
    if (bars === 0) return null;
    return { label, bars };
  }

  const profiles45 = Object.entries(b45)
    .map(([l, p]) => toResult(l, p, riattestattura))
    .filter(Boolean) as ProfileResult[];

  const profiles90 = Object.entries(b90)
    .map(([l, p]) => toResult(l, p, KERF_90))
    .filter(Boolean) as ProfileResult[];

  return {
    profiles45,
    profiles90,
    totalBars45: profiles45.reduce((s, p) => s + p.bars, 0),
    totalBars90: profiles90.reduce((s, p) => s + p.bars, 0),
  };
}

import { Opening } from '../types';

const BAR_MM       = 6400;
const KERF_90      = 4;
const SLAT_PITCH   = 55;   // Rolltek 55mm orientabile
const ZOCCOLO_H    = 120;
const FASCIA_H     = 120;
const PF_THRESHOLD = 1500; // H > 1500 → portafinestra, aggiunge fascia

export interface ProfileResult {
  label: string;
  pieces: number;
  totalMl: number;
  bars: number;
}

export interface MaterialsResult {
  profiles45: ProfileResult[];
  profiles90: ProfileResult[];
  totalBars45: number;
  totalBars90: number;
}

// Bin-packing sequenziale: pezzi ordinati dal più lungo
function calcBars(
  pieces: number[],
  barMm: number,
  wastePerCut: number,
): { bars: number; totalMm: number } {
  if (!pieces.length) return { bars: 0, totalMm: 0 };
  const sorted = [...pieces].sort((a, b) => b - a);
  let bars = 1, rem = barMm, totalMm = 0;
  for (const p of sorted) {
    if (p + wastePerCut > rem) { bars++; rem = barMm; }
    rem -= (p + wastePerCut);
    totalMm += p;
  }
  return { bars, totalMm };
}

export function calculateMaterials(
  openings: Opening[],
  riattestattura = 25,
): MaterialsResult {
  const b45: Record<string, number[]> = {
    'Profilo telaio': [],
    'Profilo anta':   [],
  };
  const b90: Record<string, number[]> = {
    'Riporto':      [],
    'Fascia':       [],
    'Zoccolo':      [],
    'Mezza lamella':[],
    'Posizionatore':[],
    'Lamella':      [],
  };

  for (const o of openings) {
    const W = o.width  ?? 0;
    const H = o.height ?? 0;
    const n = Math.max(1, o.leafCount ?? 1);
    const style = o.style;
    if (!style || W <= 0 || H <= 0) continue;
    if (style === 'roller_blind' || style === 'subframe_window') continue;

    const isWindow  = style.startsWith('window');
    const isDoor    = style.startsWith('door');
    const isShutter = style.startsWith('shutter');
    const leafW     = Math.round(W / n);

    if (isWindow) {
      b45['Profilo telaio'].push(W, W, H, H);
      for (let i = 0; i < n; i++) {
        b45['Profilo anta'].push(leafW, leafW, H, H);
      }
      for (let i = 0; i < n - 1; i++) {
        b90['Riporto'].push(H);
      }
    }

    if (isDoor) {
      b45['Profilo telaio'].push(W, W, H, H);
      b90['Fascia'].push(W);
      for (let i = 0; i < n; i++) {
        b45['Profilo anta'].push(leafW, leafW, H, H);
      }
    }

    if (isShutter) {
      const isPF = H > PF_THRESHOLD;
      // Telaio: 3 lati (no sotto), 45°
      b45['Profilo telaio'].push(W, H, H);
      for (let i = 0; i < n; i++) {
        const lw = Math.round(W / n);
        // Anta: 3 lati (no sotto), 45°
        b45['Profilo anta'].push(lw, H, H);
        // Componenti interni, 90°
        b90['Zoccolo'].push(lw);
        if (isPF) b90['Fascia'].push(lw);
        b90['Mezza lamella'].push(lw);
        b90['Posizionatore'].push(lw);
        // Lamelle
        const availH = H - ZOCCOLO_H - (isPF ? FASCIA_H : 0);
        const slats  = Math.floor(Math.max(0, availH) / SLAT_PITCH);
        for (let j = 0; j < slats; j++) b90['Lamella'].push(lw);
      }
    }
  }

  function toResult(label: string, pieces: number[], waste: number): ProfileResult | null {
    if (!pieces.length) return null;
    const { bars, totalMm } = calcBars(pieces, BAR_MM, waste);
    return { label, pieces: pieces.length, totalMl: Math.round(totalMm / 100) / 10, bars };
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

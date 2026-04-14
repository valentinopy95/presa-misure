import { Opening } from '../types';

const BAR_MM       = 6400;
const KERF_90      = 4;
const SLAT_PITCH   = 55;
const ZOCCOLO_H    = 120;
const FASCIA_H     = 120;
const PF_THRESHOLD = 1500;

export interface ProfileResult {
  label: string;
  pieces: number;
  totalMl: number;    // ml puri dei pezzi
  bars: number;       // barre necessarie
  sfridoMl: number;   // sfrido totale in ml
  sfridoPct: number;  // % sfrido su materiale acquistato
}

export interface MaterialsResult {
  profiles45: ProfileResult[];
  profiles90: ProfileResult[];
  totalBars45: number;
  totalBars90: number;
}

/**
 * Bin-packing First Fit Decreasing.
 * - Il primo pezzo di ogni barra NON ha riattestattura prima di sé.
 * - Ogni pezzo successivo sulla stessa barra consuma: lunghezza + wastePerCut.
 * - Lo sfrido è il materiale rimanente inutilizzato a fine barre.
 */
function calcBars(pieces: number[], barMm: number, wastePerCut: number) {
  if (!pieces.length) return { bars: 0, totalPieceMm: 0, sfridoMm: 0 };

  const sorted = [...pieces].sort((a, b) => b - a);
  let bars = 1;
  let rem = barMm;
  let totalPieceMm = 0;
  let totalConsumed = 0; // materiale effettivamente consumato (pezzi + scarti tra tagli)
  let firstOnBar = true;

  for (const p of sorted) {
    const cutWaste = firstOnBar ? 0 : wastePerCut;
    const needed   = p + cutWaste;

    if (needed > rem) {
      // Apri nuova barra
      bars++;
      rem = barMm;
      firstOnBar = true;
    }

    const actualWaste = firstOnBar ? 0 : wastePerCut;
    rem             -= (p + actualWaste);
    totalConsumed   += (p + actualWaste);
    totalPieceMm    += p;
    firstOnBar       = false;
  }

  // Sfrido = capacità totale acquistata - materiale effettivamente consumato
  const sfridoMm = bars * barMm - totalConsumed;

  return { bars, totalPieceMm, sfridoMm };
}

// ─── Raccolta pezzi per apertura ─────────────────────────────────────────────

export function calculateMaterials(openings: Opening[], riattestattura = 25): MaterialsResult {
  const b45: Record<string, number[]> = {
    'Profilo telaio': [],
    'Profilo anta':   [],
  };
  const b90: Record<string, number[]> = {
    'Riporto':       [],
    'Fascia':        [],
    'Zoccolo':       [],
    'Mezza lamella': [],
    'Posizionatore': [],
    'Lamella':       [],
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

    if (isWindow) {
      b45['Profilo telaio'].push(W, W, H, H);
      const leafW = Math.round(W / n);
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
      const leafW = Math.round(W / n);
      for (let i = 0; i < n; i++) {
        b45['Profilo anta'].push(leafW, leafW, H, H);
      }
    }

    if (isShutter) {
      const isPF = H > PF_THRESHOLD;
      b45['Profilo telaio'].push(W, H, H);
      for (let i = 0; i < n; i++) {
        const lw = Math.round(W / n);
        b45['Profilo anta'].push(lw, H, H);
        b90['Zoccolo'].push(lw);
        if (isPF) b90['Fascia'].push(lw);
        b90['Mezza lamella'].push(lw);
        b90['Posizionatore'].push(lw);
        const availH = H - ZOCCOLO_H - (isPF ? FASCIA_H : 0);
        const slats  = Math.floor(Math.max(0, availH) / SLAT_PITCH);
        for (let j = 0; j < slats; j++) b90['Lamella'].push(lw);
      }
    }
  }

  function toResult(label: string, pieces: number[], waste: number): ProfileResult | null {
    if (!pieces.length) return null;
    const { bars, totalPieceMm, sfridoMm } = calcBars(pieces, BAR_MM, waste);
    const totalBarMm = bars * BAR_MM;
    return {
      label,
      pieces: pieces.length,
      totalMl:   Math.round(totalPieceMm / 100) / 10,
      bars,
      sfridoMl:  Math.round(sfridoMm / 100) / 10,
      sfridoPct: Math.round((sfridoMm / totalBarMm) * 100),
    };
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

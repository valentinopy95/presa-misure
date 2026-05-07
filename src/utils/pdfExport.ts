import { Project, Opening, OpeningStyle } from '../types';
import { calculateMaterials, MaterialsResult, MaterialsConfig, CuttingListResult, CuttingProfile } from './calculateMaterials';
import { PriceConfig, priceForStyle, CatalogSeries, findBestVariant } from '../storage/settings';

export type PdfMode = 'both' | 'misure' | 'materiale';

// ─── ViewBox constants ────────────────────────────────────────────────────────
const FX = 20, FY = 14, FW = 120, FH = 140, FT = 12;
const GX = FX + FT, GY = FY + FT;
const GW = FW - FT * 2, GH = FH - FT * 2;
const GX2 = GX + GW, GY2 = GY + GH;
const CX = GX + GW / 2, CY = GY + GH / 2;

// ─── Patterns + Gradients ────────────────────────────────────────────────────
const DEFS = `<defs>
  <pattern id="wp" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#d4b483"/>
    <line x1="0" y1="2" x2="8" y2="2" stroke="#b8903c" stroke-width="0.6" opacity="0.5"/>
    <line x1="0" y1="5" x2="8" y2="5" stroke="#b8903c" stroke-width="0.4" opacity="0.35"/>
  </pattern>
  <pattern id="mesh" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="7" y2="0" stroke="#777" stroke-width="0.5" opacity="0.45"/>
    <line x1="0" y1="0" x2="0" y2="7" stroke="#777" stroke-width="0.5" opacity="0.45"/>
  </pattern>
  <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"  stop-color="#cce4f7" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#eaf4fc" stop-opacity="0.3"/>
  </linearGradient>
</defs>`;

// Frame: aluminium cross-section
const FRAME = `
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#c8d4df" stroke="#4a6070" stroke-width="2"/>
  <rect x="${FX+2}" y="${FY+2}" width="${FW-4}" height="${FH-4}" fill="none" stroke="#8aa4b4" stroke-width="0.6"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="url(#glassGrad)" stroke="#4a6070" stroke-width="1"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="white" opacity="0.5"/>
  <line x1="${GX + GW*0.18}" y1="${GY+2}" x2="${GX + GW*0.36}" y2="${GY2-2}" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
  <line x1="${GX + GW*0.26}" y1="${GY+2}" x2="${GX + GW*0.44}" y2="${GY2-2}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;

// ─── Style indicators ─────────────────────────────────────────────────────────
function indicator(style: OpeningStyle, boxHeight: number | null): string {
  const col = '#1565C0';
  const da = 'stroke-dasharray="5,3"';

  // Helper: 3 hinge marks along the vertical edge
  const hingeMarks = (x: number) =>
    [GY + GH*0.18, GY + GH*0.5, GY + GH*0.82].map(y =>
      `<rect x="${(x-3).toFixed(1)}" y="${(y-4).toFixed(1)}" width="6" height="8" rx="1.5"
             fill="white" stroke="${col}" stroke-width="1.2"/>
       <line x1="${(x-3).toFixed(1)}" y1="${y.toFixed(1)}"
             x2="${(x+3).toFixed(1)}" y2="${y.toFixed(1)}"
             stroke="${col}" stroke-width="0.6"/>`
    ).join('');

  // Helper: simplified cremonese lock (vertical rod + T-handle)
  const cremonese = (hx: number, flipLeft = false) => {
    const lx = flipLeft ? hx - 10 : hx + 2;
    const kx = flipLeft ? hx - 14 : hx + 14;
    return `
      <line x1="${hx}" y1="${GY+10}" x2="${hx}" y2="${GY2-10}"
            stroke="${col}" stroke-width="1.5"/>
      <rect x="${hx-4}" y="${GY+6}" width="8" height="7" rx="1.5" fill="${col}"/>
      <rect x="${hx-4}" y="${GY2-13}" width="8" height="7" rx="1.5" fill="${col}"/>
      <rect x="${hx-3}" y="${CY-14}" width="6" height="28" rx="2" fill="${col}"/>
      <rect x="${lx}" y="${CY-3}" width="10" height="6" rx="3" fill="${col}"/>
      <circle cx="${kx}" cy="${CY}" r="4" fill="${col}"/>`;
  };

  // Helper: door lever handle with rosette + cylinder
  const doorHandle = (hx: number, leverRight: boolean) => {
    const lx = leverRight ? hx + 8 : hx - 20;
    const kx = leverRight ? hx + 20 : hx - 20;
    return `
      <circle cx="${hx}" cy="${CY}" r="7" fill="${col}"/>
      <circle cx="${hx}" cy="${CY}" r="4.5" fill="rgba(255,255,255,0.18)"/>
      <rect x="${lx}" y="${CY-3}" width="12" height="6" rx="3" fill="${col}"/>
      <circle cx="${kx}" cy="${CY}" r="4.5" fill="${col}"/>
      <rect x="${hx-5}" y="${CY+10}" width="10" height="14" rx="3" fill="${col}"/>
      <circle cx="${hx}" cy="${CY+15}" r="3" fill="rgba(255,255,255,0.2)"/>`;
  };

  switch (style) {
    case 'window_fixed':
      return `
        <rect x="${GX}" y="${GY}" width="${GW}" height="5" fill="#c8d4df" stroke="#4a6070" stroke-width="0.8"/>
        <rect x="${GX}" y="${GY2-5}" width="${GW}" height="5" fill="#c8d4df" stroke="#4a6070" stroke-width="0.8"/>
        <rect x="${GX}" y="${GY}" width="5" height="${GH}" fill="#c8d4df" stroke="#4a6070" stroke-width="0.8"/>
        <rect x="${GX2-5}" y="${GY}" width="5" height="${GH}" fill="#c8d4df" stroke="#4a6070" stroke-width="0.8"/>
        <rect x="${CX-22}" y="${CY-9}" width="44" height="18" rx="4"
              fill="rgba(21,101,192,0.10)" stroke="${col}" stroke-width="1.2"/>
        <text x="${CX}" y="${CY+5}" text-anchor="middle" font-size="9" fill="${col}"
              font-weight="800" font-family="Arial,sans-serif">FISSO</text>`;

    case 'window_single':
      return `
        ${hingeMarks(GX+3)}
        <line x1="${GX2-10}" y1="${CY}" x2="${GX+10}" y2="${GY+10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="${GX2-10}" y1="${CY}" x2="${GX+10}" y2="${GY2-10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        ${cremonese(GX2-8, true)}`;

    case 'window_double':
      return `
        ${hingeMarks(GX+3)}
        ${hingeMarks(GX2-3)}
        <line x1="${CX-6}" y1="${CY}" x2="${GX+10}" y2="${GY+10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="${CX-6}" y1="${CY}" x2="${GX+10}" y2="${GY2-10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="${CX+6}" y1="${CY}" x2="${GX2-10}" y2="${GY+10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="${CX+6}" y1="${CY}" x2="${GX2-10}" y2="${GY2-10}"
              stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        ${cremonese(CX-6, false)}
        ${cremonese(CX+6, true)}`;

    case 'window_sliding':
      return `
        <rect x="${GX}" y="${GY}" width="${GW/2+6}" height="${GH}"
              fill="rgba(21,101,192,0.06)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}"
              fill="rgba(255,255,255,0.15)" stroke="${col}" stroke-width="2"/>
        <line x1="${CX+4}" y1="${CY}" x2="${GX2-12}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <polygon points="${GX2-12},${CY-5} ${GX2-6},${CY} ${GX2-12},${CY+5}" fill="${col}"/>
        <rect x="${CX-7}" y="${CY-8}" width="4" height="16" rx="2" fill="${col}"/>
        <text x="${CX}" y="${GY2-6}" text-anchor="middle" font-size="7" fill="${col}"
              font-weight="700" font-family="Arial,sans-serif">SCOR.</text>`;

    case 'window_tilt_turn':
      return `
        <line x1="${GX+4}" y1="${GY+4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX2-4}" y1="${GY+4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${CX}" y1="${GY2-4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX+4}" y1="${GY}" x2="${GX+4}" y2="${GY2}"
              stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${GX+6}" y1="${GY2-4}" x2="${GX2-6}" y2="${GY2-4}"
              stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        ${cremonese(CX, false)}`;

    case 'door_single':
      return `
        ${hingeMarks(GX+3)}
        <line x1="${GX2-12}" y1="${CY}" x2="${GX+12}" y2="${GY+14}"
              stroke="${col}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="${GX2-12}" y1="${CY}" x2="${GX+12}" y2="${GY2-10}"
              stroke="${col}" stroke-width="1.8" stroke-linecap="round"/>
        ${doorHandle(GX2-14, false)}`;

    case 'door_sliding':
      return `
        <rect x="${GX}" y="${GY}" width="${GW/2+6}" height="${GH}"
              fill="rgba(21,101,192,0.06)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}"
              fill="rgba(255,255,255,0.15)" stroke="${col}" stroke-width="2"/>
        <rect x="${CX-3}" y="${CY-8}" width="4" height="16" rx="2" fill="${col}"/>
        <text x="${CX}" y="${GY2-6}" text-anchor="middle" font-size="7" fill="${col}"
              font-weight="700" font-family="Arial,sans-serif">SCOR.</text>`;

    case 'shutter_single': {
      const slats = 7, slH = FH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#D8E2EC" stroke="#4A6070" stroke-width="2"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${FX+2}" y1="${FY + i * slH}" x2="${FX+FW-2}" y2="${FY + i * slH}" stroke="#7A9BB0" stroke-width="1"/>`;
        s += `<line x1="${FX+2}" y1="${FY + i * slH + slH*0.45}" x2="${FX+FW-2}" y2="${FY + i * slH + slH*0.45}" stroke="rgba(60,80,100,0.12)" stroke-width="0.6"/>`;
      }
      [0.2, 0.5, 0.8].forEach(p => {
        s += `<rect x="${FX+3}" y="${FY + FH*p - 7}" width="6" height="14" rx="1" fill="#5A6878" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>`;
      });
      s += `<path d="M ${FX+4} ${FY} Q ${FX-FW*0.38} ${FY+FH/2} ${FX+4} ${FY+FH}" fill="rgba(21,101,192,0.08)" stroke="#1565C0" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      return s;
    }

    case 'shutter_double': {
      const slats = 7, slH = FH / slats;
      const fasciaY = FY + FH * 0.58 - 5;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#D8E2EC" stroke="#4A6070" stroke-width="2"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${FX+2}" y1="${FY + i * slH}" x2="${FX+FW-2}" y2="${FY + i * slH}" stroke="#7A9BB0" stroke-width="1"/>`;
      }
      s += `<line x1="${FX + FW/2}" y1="${FY}" x2="${FX + FW/2}" y2="${FY+FH}" stroke="#B8C8D4" stroke-width="2"/>`;
      s += `<rect x="${FX+4}" y="${fasciaY}" width="${FW/2-8}" height="10" rx="1" fill="#c8d4df" stroke="#4a6070" stroke-width="1"/>`;
      s += `<rect x="${FX+FW/2+4}" y="${fasciaY}" width="${FW/2-8}" height="10" rx="1" fill="#c8d4df" stroke="#4a6070" stroke-width="1"/>`;
      [0.2, 0.5, 0.8].forEach(p => {
        s += `<rect x="${FX+3}" y="${FY + FH*p - 7}" width="6" height="14" rx="1" fill="#5A6878" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>`;
        s += `<rect x="${FX+FW-9}" y="${FY + FH*p - 7}" width="6" height="14" rx="1" fill="#5A6878" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>`;
      });
      s += `<path d="M ${FX+4} ${FY} Q ${FX-FW*0.2} ${FY+FH/2} ${FX+4} ${FY+FH}" fill="rgba(21,101,192,0.08)" stroke="#1565C0" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      s += `<path d="M ${FX+FW-4} ${FY} Q ${FX+FW+FW*0.2} ${FY+FH/2} ${FX+FW-4} ${FY+FH}" fill="rgba(21,101,192,0.08)" stroke="#1565C0" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      return s;
    }

    case 'roller_blind': {
      const boxH = Math.round(FH * 0.22);
      const boxY2 = FY + boxH;
      const frameH = FY + FH - FT - boxY2 - 4;
      const slats = 5, slH = frameH / slats;
      let s = `
        <rect x="${FX}" y="${FY}" width="${FW}" height="${boxH}" fill="#333" stroke="#222" stroke-width="1.5" rx="2"/>
        <line x1="${FX+8}" y1="${FY + boxH/2}" x2="${FX+FW-8}" y2="${FY + boxH/2}" stroke="#555" stroke-width="1"/>
        <text x="${FX + FW/2}" y="${FY + boxH/2 + 3.5}" text-anchor="middle" font-size="7" fill="#aaa" font-weight="700" font-family="Arial,sans-serif">CASS.</text>
        <rect x="${FX}" y="${boxY2}" width="${FW}" height="${FY+FH-boxY2}" fill="#c8d4df" stroke="#4a6070" stroke-width="2"/>
        <rect x="${GX}" y="${boxY2+4}" width="${GW}" height="${frameH}" fill="white"/>`;
      for (let i = 0; i <= slats; i++) {
        const lw = i === 0 ? 1.5 : 0.8;
        s += `<line x1="${GX}" y1="${boxY2+4 + i * slH}" x2="${GX2}" y2="${boxY2+4 + i * slH}" stroke="#c8a06a" stroke-width="${lw}"/>`;
      }
      s += `<rect x="${GX}" y="${boxY2+4}" width="5" height="${frameH}" fill="#9aacba" opacity="0.6"/>`;
      s += `<rect x="${GX2-5}" y="${boxY2+4}" width="5" height="${frameH}" fill="#9aacba" opacity="0.6"/>`;
      if (boxHeight != null) {
        s += `<text x="${FX + FW/2}" y="${FY + boxH/2 + 14}" text-anchor="middle" font-size="6.5" fill="#E65100" font-weight="700" font-family="Arial,sans-serif">${boxHeight} mm</text>`;
      }
      return s;
    }

    case 'subframe_window': {
      const bw = FT + 2;
      return `
        <rect x="${FX}" y="${FY}" width="${bw}" height="${FH}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${FX+FW-bw}" y="${FY}" width="${bw}" height="${FH}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${FX}" y="${FY}" width="${FW}" height="${bw}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH+bw+4}" fill="white"/>
        <path d="M ${GX+5} ${FY+FH+4} L ${GX+5} ${GY+5} L ${GX2-5} ${GY+5} L ${GX2-5} ${FY+FH+4}"
              fill="none" stroke="#c8a06a" stroke-width="1" stroke-dasharray="4,2"/>
        <text x="${FX+FW/2}" y="${FY+bw*2+GH/2}" text-anchor="middle" font-size="8" fill="#7a5030"
              font-weight="700" font-family="Arial,sans-serif">CONTROTELAIO</text>`;
    }

    case 'door_entrance': {
      let s = `<rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="#2a3240"/>`;
      const bugnas: [number, number, number, number][] = [
        [40, 34, 37, 25], [83, 34, 37, 25],
        [40, 65, 37, 42], [83, 65, 37, 42],
        [40, 113, 37, 21], [83, 113, 37, 21],
      ];
      bugnas.forEach(([bx, by, bw, bh]) => {
        s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#333d50" rx="1"/>`;
        s += `<line x1="${bx}" y1="${by}" x2="${bx + bw}" y2="${by}" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>`;
        s += `<line x1="${bx}" y1="${by}" x2="${bx}" y2="${by + bh}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`;
        s += `<line x1="${bx}" y1="${by + bh}" x2="${bx + bw}" y2="${by + bh}" stroke="rgba(0,0,0,0.45)" stroke-width="1"/>`;
        s += `<line x1="${bx + bw}" y1="${by}" x2="${bx + bw}" y2="${by + bh}" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>`;
      });
      [Math.round(GY + GH * 0.25), Math.round(GY + GH * 0.75)].forEach(hy => {
        s += `<rect x="${GX + 2}" y="${hy - 6}" width="8" height="12" rx="1.5" fill="#8090a4" stroke="#5a6a7a" stroke-width="0.8"/>`;
        s += `<circle cx="${GX + 6}" cy="${hy}" r="2" fill="#5a6a7a"/>`;
      });
      s += `<rect x="${GX2 - 16}" y="${CY - 14}" width="6" height="28" rx="3" fill="#8090a4" stroke="#5a6a7a" stroke-width="0.8"/>`;
      s += `<circle cx="${GX2 - 13}" cy="${CY}" r="4" fill="#a0b0c0" stroke="#5a6a7a" stroke-width="0.8"/>`;
      s += `<ellipse cx="${GX2 - 13}" cy="${CY + 20}" rx="3.5" ry="4" fill="#5a6a7a" stroke="#3a4a5a" stroke-width="0.8"/>`;
      s += `<ellipse cx="${GX2 - 13}" cy="${CY + 20}" rx="1.5" ry="2" fill="#8090a4"/>`;
      return s;
    }

    // ── Zanzariere ─────────────────────────────────────────────────────────────
    case 'mosquito_fixed': {
      return `
        <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#d8e8d0" stroke="#5a7a4a" stroke-width="2"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="url(#mesh)" stroke="#5a7a4a" stroke-width="1"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="rgba(200,230,180,0.18)"/>
        <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="9" fill="#3a5a2a" font-weight="800"
              font-family="Arial,sans-serif">FISSA</text>`;
    }

    case 'mosquito_rollup': {
      const boxH = Math.round(FH * 0.2);
      const boxY2 = FY + boxH;
      const meshH = FH - boxH;
      return `
        <rect x="${FX}" y="${FY}" width="${FW}" height="${boxH}" fill="#444" stroke="#222" stroke-width="1.5" rx="2"/>
        <text x="${FX + FW/2}" y="${FY + boxH/2 + 3.5}" text-anchor="middle" font-size="7" fill="#aaa"
              font-weight="700" font-family="Arial,sans-serif">CASS.</text>
        <rect x="${FX}" y="${boxY2}" width="${FW}" height="${meshH}" fill="#d8e8d0" stroke="#5a7a4a" stroke-width="2"/>
        <rect x="${GX}" y="${boxY2+4}" width="${GW}" height="${meshH - FT - 4}" fill="url(#mesh)"/>
        <rect x="${GX}" y="${boxY2+4}" width="${GW}" height="${meshH - FT - 4}" fill="rgba(200,230,180,0.2)"/>
        <text x="${CX}" y="${boxY2 + (meshH)/2 + 4}" text-anchor="middle" font-size="8" fill="#3a5a2a"
              font-weight="700" font-family="Arial,sans-serif">AVVOLG.</text>`;
    }

    case 'mosquito_lateral': {
      return `
        <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#d8e8d0" stroke="#5a7a4a" stroke-width="2"/>
        <rect x="${GX}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(200,230,180,0.25)" stroke="#5a7a4a" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="url(#mesh)" stroke="#3a5a2a" stroke-width="1.5"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(200,230,180,0.18)"/>
        <line x1="${CX+4}" y1="${CY}" x2="${GX2-12}" y2="${CY}" stroke="#3a5a2a" stroke-width="1.5"/>
        <polygon points="${GX2-12},${CY-5} ${GX2-6},${CY} ${GX2-12},${CY+5}" fill="#3a5a2a"/>
        <text x="${CX}" y="${GY2-6}" text-anchor="middle" font-size="7" fill="#3a5a2a"
              font-weight="700" font-family="Arial,sans-serif">LATER.</text>`;
    }

    default:
      return `
        <line x1="${GX+14}" y1="${CY}" x2="${GX2-14}" y2="${CY}" stroke="#ccc" stroke-width="1.5" stroke-dasharray="4,3"/>
        <line x1="${CX}" y1="${GY+14}" x2="${CX}" y2="${GY2-14}" stroke="#ccc" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  }
}

function svgForStyle(style: OpeningStyle | null, boxHeight: number | null): string {
  if (!style) {
    return `<svg width="80" height="90" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="14" width="120" height="140" fill="#f0f4f8" stroke="#ccc" stroke-width="2" rx="4"/>
      <text x="80" y="90" text-anchor="middle" font-size="28" fill="#ccc" font-family="Arial">?</text>
    </svg>`;
  }
  const isSubframe = style.startsWith('subframe');
  const isShutter  = style.startsWith('shutter');
  const isRoller   = style === 'roller_blind';
  const isMosquito = style.startsWith('mosquito');
  const content = isSubframe || isShutter || isRoller || isMosquito
    ? indicator(style, boxHeight)
    : `${FRAME}${indicator(style, boxHeight)}`;
  return `<svg width="80" height="90" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
    ${DEFS}${content}
  </svg>`;
}

// ─── Labels ───────────────────────────────────────────────────────────────────
const STYLE_LABELS: Partial<Record<OpeningStyle, string>> = {
  window_fixed:     'Finestra fissa',
  window_single:    'Finestra battente',
  window_sliding:   'Finestra scorrevole',
  window_tilt_turn: 'Finestra vasistas',
  door_single:      'Porta singola',
  door_sliding:     'Porta scorrevole',
  door_entrance:    'Portoncino ingresso',
  shutter_single:   'Persiana singola',
  shutter_double:   'Persiana portafinestra',
  roller_blind:     'Monoblocco tapparella',
  subframe_window:  'Controtelaio',
  mosquito_fixed:   'Zanzariera fissa',
  mosquito_rollup:  'Zanzariera avvolgibile',
  mosquito_lateral: 'Zanzariera laterale',
  custom:           'Elemento personalizzato',
};

function dim(v: number | null) { return v != null ? `${v}` : '—'; }

function openingRow(
  o: Opening,
  globalIdx: number,
  groupIdx: number,
  toleranceW: number,
  toleranceH: number,
  photoMap?: Record<string, string[]>,
): string {
  const tagW = o.width  != null ? o.width  - toleranceW : null;
  const tagH = o.height != null ? o.height - toleranceH : null;
  const styleLabel = o.style ? (STYLE_LABELS[o.style] ?? '—') : '—';
  const isRoller   = o.style === 'roller_blind';
  const isSubframe = o.style === 'subframe_window';
  const bg = groupIdx % 2 === 0 ? '#ffffff' : '#fafbfc';

  // Options info
  const opts: string[] = [];
  if (o.leafCount && o.leafCount > 1) opts.push(`${o.leafCount} ante`);
  if (o.sopraluce && o.sopraluceHeight) opts.push(`Sopraluce ${o.sopraluceHeight}mm`);
  if (o.hasFermavetro) opts.push('Fermavetro');
  if (o.hasSoglia) opts.push('Soglia ribassata');
  if (o.hasBattente) opts.push('Battente');
  if (o.hasFascia) opts.push('Fascia');
  if (o.outOfSquare) {
    const parts: string[] = [];
    if (o.heightLeft != null)  parts.push(`Sx ${o.heightLeft}mm`);
    if (o.heightRight != null) parts.push(`Dx ${o.heightRight}mm`);
    opts.push(`Fuori squadra${parts.length ? ` (${parts.join(', ')})` : ''}`);
  }

  const photos = photoMap?.[o.id] ?? [];

  return `<tr style="background:${bg}; border-bottom:1px solid #e8edf0; page-break-inside:avoid;">
    <td style="padding:8px 10px; text-align:center; width:32px; color:#888; font-size:11px; font-weight:700; border-right:1px solid #eee; vertical-align:top;">
      ${globalIdx + 1}
    </td>
    <td style="padding:6px 8px; width:86px; text-align:center; border-right:1px solid #eee; vertical-align:top;">
      ${svgForStyle(o.style, o.boxHeight ?? null)}
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee; vertical-align:top;">
      <div style="font-size:13px;font-weight:800;color:#1a2a3a;">${o.name}</div>
      <div style="font-size:9px;color:#555;font-style:italic;margin-top:2px;">${styleLabel}</div>
      ${o.profileSeries ? `<div style="font-size:9px;color:#1565C0;font-weight:700;margin-top:3px;">Serie: ${o.profileSeries}</div>` : ''}
      ${o.glassType ? `<div style="font-size:9px;color:#2E7D32;margin-top:1px;">Vetro: ${o.glassType}</div>` : ''}
      ${o.viewSide ? `<span style="display:inline-block;background:${o.viewSide==='interno'?'#E3F2FD':'#E8F5E9'};color:${o.viewSide==='interno'?'#1565C0':'#2E7D32'};font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px;margin-top:4px;">${o.viewSide==='interno'?'INTERNO':'ESTERNO'}</span>` : ''}
      ${opts.length > 0 ? `<div style="font-size:8px;color:#888;margin-top:4px;">${opts.join(' · ')}</div>` : ''}
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee; white-space:nowrap; text-align:center; vertical-align:top;">
      <div style="font-size:12px;font-weight:700;color:#1a2a3a;">${dim(o.width)}</div>
      <div style="font-size:12px;font-weight:700;color:#1a2a3a;">${dim(o.height)}</div>
      ${isRoller && o.boxHeight != null ? `<div style="font-size:10px;color:#E65100;margin-top:4px;font-weight:700;">Cass. ${o.boxHeight}</div>` : ''}
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee; white-space:nowrap; text-align:center; vertical-align:top;">
      ${isSubframe
        ? `<div style="font-size:11px;color:#bbb;font-style:italic;">—</div>`
        : `<div style="font-size:12px;font-weight:700;color:#1565C0;">${dim(tagW)}</div>
           <div style="font-size:12px;font-weight:700;color:#1565C0;">${dim(tagH)}</div>`}
    </td>
    <td style="padding:8px 12px; vertical-align:top;">
      ${o.textNote
        ? `<div style="font-size:9px;color:#555;background:#fffde7;padding:4px 6px;
                       border-left:2px solid #FFC107;border-radius:2px;margin-bottom:6px;">${o.textNote}</div>`
        : ''}
      ${photos.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${photos.map(b64 =>
              `<img src="data:image/jpeg;base64,${b64}"
                    style="max-width:160px;max-height:120px;object-fit:cover;border-radius:4px;border:1px solid #ddd;"/>`
            ).join('')}
           </div>`
        : o.photos.length > 0
          ? `<div style="font-size:9px;color:#aaa;">📷 ${o.photos.length} foto</div>`
          : ''}
      ${!o.textNote && photos.length === 0 && o.photos.length === 0
        ? `<span style="color:#ccc;font-size:10px;">—</span>` : ''}
    </td>
  </tr>`;
}

// ─── Group tables ─────────────────────────────────────────────────────────────
type GroupDef = { label: string; color: string; filter: (o: Opening) => boolean };
const GROUPS: GroupDef[] = [
  { label: 'FINESTRE',    color: '#1565C0', filter: o => !!o.style?.startsWith('window') },
  { label: 'PORTE',       color: '#6A1B9A', filter: o => !!o.style?.startsWith('door') },
  { label: 'PERSIANE',    color: '#2E7D32', filter: o => !!o.style?.startsWith('shutter') },
  { label: 'MONOBLOCCHI', color: '#E65100', filter: o => o.style === 'roller_blind' },
  { label: 'CONTROTELAI', color: '#5D4037', filter: o => o.style === 'subframe_window' },
  { label: 'ZANZARIERE',  color: '#00796B', filter: o => !!o.style?.startsWith('mosquito') },
  { label: 'ALTRO',       color: '#455A64', filter: o => !o.style },
];

function groupTable(
  group: GroupDef,
  openings: Opening[],
  startIdx: number,
  toleranceW: number,
  toleranceH: number,
  photoMap?: Record<string, string[]>,
): string {
  if (openings.length === 0) return '';
  const rows = openings.map((o, i) => openingRow(o, startIdx + i, i, toleranceW, toleranceH, photoMap)).join('');
  return `
  <div style="margin-bottom:20px; page-break-inside:avoid;">
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <tr style="background:${group.color};">
        <td colspan="2" style="padding:7px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">${group.label}</span>
        </td>
        <td style="padding:7px 14px; text-align:right;">
          <span style="color:rgba(255,255,255,0.7);font-size:9px;">Q.tà: </span>
          <span style="color:white;font-size:11px;font-weight:700;">${openings.length}</span>
        </td>
      </tr>
      <tr style="background:#f5f7fa;border-bottom:1px solid #dde4ec;">
        <th style="padding:6px 10px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;width:32px;border-right:1px solid #eee;">#</th>
        <th style="padding:6px 8px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;width:86px;border-right:1px solid #eee;">Disegno</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;border-right:1px solid #eee;">Descrizione</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;border-right:1px solid #eee;">Luce L/H (mm)</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;border-right:1px solid #eee;">Taglio L/H (mm)</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;">Note / Foto</th>
      </tr>
      ${rows}
      <tr style="background:#f5f7fa;border-top:2px solid ${group.color}30;">
        <td colspan="6" style="padding:6px 14px;text-align:right;">
          <span style="font-size:9px;color:#888;">Totale ${group.label.toLowerCase()}: </span>
          <span style="font-size:11px;font-weight:700;color:${group.color};">${openings.length} pz</span>
        </td>
      </tr>
    </table>
  </div>`;
}

// ─── Materials section ────────────────────────────────────────────────────────
function materialsSection(result: MaterialsResult, barLength: number): string {
  const { profiles45, profiles90, totalBars45, totalBars90, warnings } = result;
  if (profiles45.length === 0 && profiles90.length === 0) return '';

  const row = (label: string, bars: number, color: string) =>
    `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:7px 14px;font-size:11px;font-weight:600;color:#1a2a3a;">${label}</td>
      <td style="padding:7px 14px;text-align:right;font-size:13px;font-weight:800;color:${color};">
        ${bars} barr${bars !== 1 ? 'e' : 'a'}
      </td>
    </tr>`;

  const table45 = profiles45.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde4ec;border-radius:6px;overflow:hidden;">
      <tr style="background:#1565C0;">
        <td colspan="2" style="padding:8px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;letter-spacing:1.5px;">TAGLI A 45°</span>
        </td>
      </tr>
      ${profiles45.map(p => row(p.label, p.bars, '#1565C0')).join('')}
      <tr style="background:#f5f7fa;border-top:2px solid rgba(21,101,192,0.2);">
        <td style="padding:7px 14px;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;">Totale</td>
        <td style="padding:7px 14px;text-align:right;font-size:15px;font-weight:900;color:#1565C0;">${totalBars45}</td>
      </tr>
    </table>` : '';

  const table90 = profiles90.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde4ec;border-radius:6px;overflow:hidden;">
      <tr style="background:#E65100;">
        <td colspan="2" style="padding:8px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;letter-spacing:1.5px;">TAGLI A 90°</span>
        </td>
      </tr>
      ${profiles90.map(p => row(p.label, p.bars, '#E65100')).join('')}
      <tr style="background:#f5f7fa;border-top:2px solid rgba(230,81,0,0.2);">
        <td style="padding:7px 14px;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;">Totale</td>
        <td style="padding:7px 14px;text-align:right;font-size:15px;font-weight:900;color:#E65100;">${totalBars90}</td>
      </tr>
    </table>` : '';

  const grand = totalBars45 + totalBars90;

  const warningsHtml = warnings.length > 0 ? `
    <div style="margin-top:10px;padding:10px 14px;background:#fff3e0;border-left:3px solid #E65100;border-radius:4px;">
      <div style="font-size:9px;font-weight:700;color:#E65100;text-transform:uppercase;margin-bottom:6px;">Avvisi</div>
      ${warnings.map(w => `<div style="font-size:9px;color:#bf360c;margin-bottom:3px;">⚠ ${w}</div>`).join('')}
    </div>` : '';

  return `
  <div style="margin-top:28px; page-break-before:auto;">
    <hr style="border:none;border-top:2px solid #E65100;margin-bottom:14px;"/>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
      <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;">SVILUPPO MATERIALE</span>
      <span style="font-size:9px;color:#888;">barre da ${barLength} mm</span>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="width:49%;vertical-align:top;">${table45}</td>
        <td style="width:2%;"></td>
        <td style="width:49%;vertical-align:top;">${table90}</td>
      </tr>
    </table>
    ${warningsHtml}
    <div style="text-align:right;padding:10px 16px;background:#1a2a3a;border-radius:6px;margin-top:10px;">
      <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">TOTALE BARRE: </span>
      <span style="font-size:18px;font-weight:900;color:#ffffff;">${grand}</span>
    </div>
  </div>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface GenerateHTMLOptions {
  mode?: PdfMode;
  photoMap?: Record<string, string[]>;
  materialsConfig?: MaterialsConfig;
  prices?: PriceConfig;
}

function preventivoSection(openings: Opening[], prices: PriceConfig): string {
  const LABELS: Record<string, string> = {
    interni: 'Interni (finestre e porte)',
    persiane: 'Persiane',
    monoblocchi: 'Monoblocchi',
    controtelai: 'Controtelai',
    zanzariere: 'Zanzariere',
  };
  const CATS = ['interni','persiane','monoblocchi','controtelai','zanzariere'] as (keyof PriceConfig)[];
  type Row = { label: string; sqm: number; price: number; total: number };
  const rows: Row[] = [];
  let grandTotal = 0;
  for (const cat of CATS) {
    const unitPrice = prices[cat];
    if (!unitPrice) continue;
    const sqm = openings.reduce((s, o) => {
      if (priceForStyle(o.style, prices) !== unitPrice) return s;
      if (!o.width || !o.height) return s;
      return s + (o.width * o.height / 1_000_000);
    }, 0);
    if (sqm === 0) continue;
    const total = sqm * unitPrice;
    grandTotal += total;
    rows.push({ label: LABELS[cat], sqm, price: unitPrice, total });
  }
  if (rows.length === 0) return '';
  const rowsHtml = rows.map((r, i) => `
    <tr style="background:${i%2===0?'#fff':'#F7FAFF'};">
      <td style="padding:8px 12px;font-size:11px;color:#1a2a3a;font-weight:600;">${r.label}</td>
      <td style="padding:8px 12px;font-size:11px;text-align:right;color:#555;">${r.sqm.toFixed(2)} m²</td>
      <td style="padding:8px 12px;font-size:11px;text-align:right;color:#555;">€ ${r.price.toFixed(2)}/m²</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:800;color:#1565C0;">€ ${r.total.toFixed(0)}</td>
    </tr>`).join('');
  return `
  <div style="margin-top:24px;page-break-inside:avoid;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
      <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;">PREVENTIVO ORIENTATIVO</span>
      <span style="font-size:9px;color:#aaa;font-style:italic;">Stima al m² — verificare prima dell'ordine</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E0E8F0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1565C0;">
          <th style="padding:8px 12px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Categoria</th>
          <th style="padding:8px 12px;text-align:right;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">m²</th>
          <th style="padding:8px 12px;text-align:right;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Prezzo/m²</th>
          <th style="padding:8px 12px;text-align:right;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Totale</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr style="background:#0c2d75;">
          <td colspan="3" style="padding:10px 12px;font-size:12px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Totale stimato</td>
          <td style="padding:10px 12px;font-size:16px;font-weight:900;color:#FFE082;text-align:right;">€ ${grandTotal.toFixed(0)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="font-size:9px;color:#aaa;margin-top:6px;">
      ⚠️ Stima orientativa basata sui prezzi al m² configurati. Non include posa, accessori, trasporto o IVA.
    </div>
  </div>`;
}

export function generateHTML(
  project: Project,
  toleranceW: number,
  toleranceH: number = toleranceW,
  logoBase64?: string,
  opts?: GenerateHTMLOptions,
): string {
  const mode = opts?.mode ?? 'both';
  const photoMap = opts?.photoMap;
  const matConfig = opts?.materialsConfig ?? {};
  const barLength = matConfig.barLength ?? 6400;

  const showMisure   = mode === 'both' || mode === 'misure';
  const showMateriale = mode === 'both' || mode === 'materiale';

  const date = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const createdDate = new Date(project.createdAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  let globalIdx = 0;
  const groupedContent = GROUPS.map(group => {
    const items = project.openings.filter(group.filter);
    const html = groupTable(group, items, globalIdx, toleranceW, toleranceH, photoMap);
    globalIdx += items.length;
    return html;
  }).join('');

  const matResult = showMateriale ? calculateMaterials(project.openings, matConfig) : null;
  const matHTML = matResult ? materialsSection(matResult, barLength) : '';
  const prevHTML = opts?.prices ? preventivoSection(project.openings, opts.prices) : '';

  const modeLabel = mode === 'misure' ? 'Rilievo misure' : mode === 'materiale' ? 'Sviluppo materiale' : 'Rilievo completo';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; background:#fff; color:#1a1a1a; font-size:11px; }
  @media print { body { background:white; } }
</style>
</head>
<body>
<div style="max-width:860px; margin:0 auto; padding:28px 32px; background:white;">

  <!-- ── HEADER ── -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
    <div style="display:inline-flex; align-items:center; gap:10px;">
      ${logoBase64
        ? `<img src="data:image/jpeg;base64,${logoBase64}" style="width:52px;height:52px;object-fit:contain;"/>`
        : `<div style="width:44px;height:44px;background:#FFC107;border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:16px;font-weight:900;">M</span></div>`
      }
      <div>
        <div style="font-size:15px;font-weight:900;color:#0c2d75;">Misu</div>
        <div style="font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">${modeLabel}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;color:#aaa;">${date}</div>
      <div style="font-size:9px;color:#aaa;margin-top:2px;">Totale aperture: <strong style="color:#1a1a1a;">${project.openings.length}</strong></div>
    </div>
  </div>
  <hr style="border:none;border-top:2px solid #1565C0;margin-bottom:16px;"/>

  <!-- ── INFO PROGETTO ── -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
    <tr>
      <td style="width:50%;padding-bottom:6px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:90px;padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Progetto</td>
            <td style="padding:3px 0;font-weight:700;font-size:12px;color:#1a1a1a;border-bottom:1px solid #ddd;">${project.name}</td>
          </tr>
          ${project.clientName ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Cliente</td>
            <td style="padding:3px 0;font-weight:600;border-bottom:1px solid #ddd;">${project.clientName}</td>
          </tr>` : ''}
          ${project.clientPhone ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Tel.</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${project.clientPhone}</td>
          </tr>` : ''}
          ${project.address ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Indirizzo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${project.address}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Data rilievo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${createdDate}</td>
          </tr>
        </table>
      </td>
      <td style="width:50%;padding-left:28px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          ${showMisure ? `
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Tol. larghezza</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;font-weight:600;">${toleranceW} mm</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Tol. altezza</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;font-weight:600;">${toleranceH} mm</td>
          </tr>` : ''}
          ${showMateriale ? `
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Barra</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;font-weight:600;">${barLength} mm</td>
          </tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  ${showMisure ? `
  <!-- ── RIEPILOGO MISURE ── -->
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
    <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;">RIEPILOGO MISURE</span>
    <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1565C0;">INFISSI</span>
  </div>
  ${project.openings.length > 0 ? groupedContent : `
    <div style="text-align:center;padding:40px;color:#bbb;font-size:13px;">Nessuna apertura inserita</div>`}
  ` : ''}

  ${matHTML}

  ${prevHTML}

  <!-- ── FOOTER ── -->
  <hr style="border:none;border-top:1px solid #e0e0e0;margin-top:24px;"/>
  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;">
    <div style="font-size:8px;color:#bbb;">Tol.: L ${toleranceW} mm / H ${toleranceH} mm &mdash; ${new Date().toLocaleString('it-IT')}</div>
    <div style="font-size:8px;color:#ccc;font-weight:600;letter-spacing:0.3px;">Powered by <span style="color:#0c2d75;font-weight:800;">Misu</span> &middot; misu.pro</div>
  </div>

</div>
</body>
</html>`;
}

// ─── PDF Unico (Rilievo + Materiale + Distinta) ───────────────────────────────
export function generateFullPDF(
  project: Project,
  toleranceW: number,
  toleranceH: number,
  cuttingResult: CuttingListResult,
  logoBase64?: string,
  matConfig?: Partial<MaterialsConfig>,
  prices?: PriceConfig,
): string {
  const rilievoBody   = generateHTML(project, toleranceW, toleranceH, logoBase64, { mode: 'misure', prices });
  const materialeBody = generateHTML(project, toleranceW, toleranceH, logoBase64, { mode: 'materiale', materialsConfig: matConfig });
  const distintatBody = generateCuttingListHTML(project, cuttingResult, logoBase64);

  // Estrai il contenuto <body> da ciascun HTML e li unisce con page-break
  const extractBody = (html: string) => {
    const match = html.match(/<body>([\s\S]*)<\/body>/i);
    return match ? match[1] : html;
  };

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; background:#fff; color:#1a1a1a; font-size:11px; }
  .page-break { page-break-before:always; break-before:page; padding-top:4px; }
  @media print { body { background:white; } }
</style>
</head>
<body>
${extractBody(rilievoBody)}
<div class="page-break"></div>
${extractBody(materialeBody)}
<div class="page-break"></div>
${extractBody(distintatBody)}
</body>
</html>`;
}

// ─── Cutting list HTML ────────────────────────────────────────────────────────

const CUTTING_COLORS = [
  '#1565C0','#2E7D32','#6A1B9A','#E65100',
  '#00796B','#C62828','#37474F','#F57F17',
  '#0277BD','#558B2F',
];

function cuttingProfileHTML(profile: CuttingProfile, barLength: number): string {
  const angleColor = profile.cutAngle === 45 ? '#1565C0' : '#2E7D32';
  const totalBars  = profile.bins.length;

  const barsHtml = profile.bins.map((bin, binIdx) => {
    const segmentsHtml = bin.pieces.map((piece, pi) => {
      const widthPct = ((piece / barLength) * 100).toFixed(2);
      const color    = CUTTING_COLORS[pi % CUTTING_COLORS.length];
      return `<div style="width:${widthPct}%;height:100%;background:${color};display:inline-block;"></div>`;
    }).join('');

    const remPct = ((bin.remaining / barLength) * 100).toFixed(2);
    const remSeg = bin.remaining > 0
      ? `<div style="width:${remPct}%;height:100%;background:#E0E8F0;display:inline-block;"></div>`
      : '';

    const tagsHtml = bin.pieces.map((piece, pi) => {
      const color = CUTTING_COLORS[pi % CUTTING_COLORS.length];
      return `<span style="display:inline-flex;align-items:center;gap:4px;background:#F0F4F8;border-radius:5px;padding:3px 8px;margin:2px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};"></span>
        <span style="font-size:10px;font-weight:700;color:#1a2a3a;">${piece.toFixed(1)} mm</span>
      </span>`;
    }).join('');

    const remTag = bin.remaining > 0
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#F0F4F8;border-radius:5px;padding:3px 8px;margin:2px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#C8D4E0;"></span>
          <span style="font-size:10px;font-weight:600;color:#8A9AB0;">${bin.remaining.toFixed(1)} mm avanzo</span>
        </span>`
      : '';

    const usedMm = barLength - bin.remaining;

    return `
    <tr style="border-bottom:1px solid #F0F4F8;page-break-inside:avoid;">
      <td style="padding:10px 12px;vertical-align:top;text-align:center;width:40px;">
        <div style="font-size:13px;font-weight:900;color:#1a2a3a;">B${binIdx + 1}</div>
        <div style="font-size:9px;color:#aaa;">/${totalBars}</div>
      </td>
      <td style="padding:10px 12px;vertical-align:top;">
        <!-- Visual bar -->
        <div style="height:18px;border-radius:5px;overflow:hidden;border:1px solid #DDE4EF;background:#EEF2F7;font-size:0;margin-bottom:8px;">
          ${segmentsHtml}${remSeg}
        </div>
        <!-- Tags -->
        <div style="display:flex;flex-wrap:wrap;">${tagsHtml}${remTag}</div>
        <div style="font-size:9px;color:#A0B0C8;margin-top:5px;">
          Usata: ${usedMm.toFixed(1)} / ${barLength} mm${bin.remaining === 0 ? ' — barra piena' : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  return `
  <div style="margin-bottom:20px;page-break-inside:avoid;">
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                background:#F7FAFF;border-left:4px solid ${angleColor};
                border-radius:8px 8px 0 0;border:1px solid #E0E8F0;">
      <span style="flex:1;font-size:13px;font-weight:800;color:#1a2a3a;">${profile.label}</span>
      <span style="background:${angleColor};color:#fff;font-size:9px;font-weight:800;
                   padding:3px 8px;border-radius:6px;">${profile.cutAngle}°</span>
      <span style="font-size:11px;color:#7090C0;font-weight:600;">${totalBars} barr${totalBars !== 1 ? 'e' : 'a'}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E0E8F0;border-top:none;
                  border-radius:0 0 8px 8px;overflow:hidden;">
      ${barsHtml}
    </table>
  </div>`;
}

export function generateCuttingListHTML(
  project: Project,
  result: CuttingListResult,
  logoBase64?: string,
): string {
  const { profiles45, profiles90, warnings, barLength } = result;

  const date        = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const createdDate = new Date(project.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  const section45 = profiles45.length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="border-left:4px solid #1565C0;padding-left:10px;margin-bottom:14px;">
        <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1565C0;">Tagli a 45°</span>
      </div>
      ${profiles45.map(p => cuttingProfileHTML(p, barLength)).join('')}
    </div>` : '';

  const section90 = profiles90.length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="border-left:4px solid #2E7D32;padding-left:10px;margin-bottom:14px;">
        <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#2E7D32;">Tagli a 90°</span>
      </div>
      ${profiles90.map(p => cuttingProfileHTML(p, barLength)).join('')}
    </div>` : '';

  const warningsHtml = warnings.length > 0 ? `
    <div style="margin-top:10px;padding:10px 14px;background:#fff3e0;border-left:3px solid #E65100;border-radius:4px;">
      <div style="font-size:9px;font-weight:700;color:#E65100;text-transform:uppercase;margin-bottom:6px;">Avvisi</div>
      ${warnings.map(w => `<div style="font-size:9px;color:#bf360c;margin-bottom:3px;">⚠ ${w}</div>`).join('')}
    </div>` : '';

  const totalBars = profiles45.reduce((s, p) => s + p.bins.length, 0)
                  + profiles90.reduce((s, p) => s + p.bins.length, 0);

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; background:#fff; color:#1a1a1a; font-size:11px; }
  @media print { body { background:white; } }
</style>
</head>
<body>
<div style="max-width:860px;margin:0 auto;padding:28px 32px;background:white;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
    <div style="display:inline-flex;align-items:center;gap:10px;">
      ${logoBase64
        ? `<img src="data:image/jpeg;base64,${logoBase64}" style="width:52px;height:52px;object-fit:contain;"/>`
        : `<div style="width:44px;height:44px;background:#FFC107;border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:16px;font-weight:900;">M</span></div>`}
      <div>
        <div style="font-size:15px;font-weight:900;color:#0c2d75;">Misu</div>
        <div style="font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Distinta di taglio</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;color:#aaa;">${date}</div>
      <div style="font-size:9px;color:#aaa;margin-top:2px;">Barre da <strong style="color:#1a1a1a;">${barLength} mm</strong></div>
    </div>
  </div>
  <hr style="border:none;border-top:2px solid #1565C0;margin-bottom:16px;"/>

  <!-- PROJECT INFO -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
    <tr>
      <td style="width:50%;padding-bottom:6px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:90px;padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Progetto</td>
            <td style="padding:3px 0;font-weight:700;font-size:12px;color:#1a1a1a;border-bottom:1px solid #ddd;">${project.name}</td>
          </tr>
          ${project.clientName ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Cliente</td>
            <td style="padding:3px 0;font-weight:600;border-bottom:1px solid #ddd;">${project.clientName}</td>
          </tr>` : ''}
          ${project.address ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Indirizzo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${project.address}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;">Data rilievo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${createdDate}</td>
          </tr>
        </table>
      </td>
      <td style="width:50%;padding-left:28px;vertical-align:top;">
        <div style="background:#1a2a3a;border-radius:8px;padding:12px 16px;text-align:center;">
          <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Totale barre</div>
          <div style="font-size:32px;font-weight:900;color:#fff;line-height:1.1;">${totalBars}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.5);margin-top:2px;">da ${barLength} mm</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- LEGENDA -->
  <div style="background:#EBF3FF;border-radius:8px;padding:10px 14px;margin-bottom:20px;border:1px solid #BBDEFB;">
    <div style="font-size:10px;font-weight:800;color:#1565C0;margin-bottom:4px;">Come leggere la distinta</div>
    <div style="font-size:9px;color:#455A64;line-height:15px;">
      Ogni barra (B1, B2, …) mostra i pezzi nell'ordine in cui conviene tagliarli, dal più lungo al più corto.
      La lunghezza in grigio è l'avanzo di barra. Il grafico colorato mostra la proporzione di ogni pezzo rispetto alla barra intera.
    </div>
  </div>

  ${section45}
  ${section90}
  ${warningsHtml}

  <!-- FOOTER -->
  <hr style="border:none;border-top:1px solid #e0e0e0;margin-top:24px;"/>
  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;">
    <div style="font-size:8px;color:#bbb;">Barre da ${barLength} mm &mdash; ${new Date().toLocaleString('it-IT')}</div>
    <div style="font-size:8px;color:#ccc;font-weight:600;letter-spacing:0.3px;">Powered by <span style="color:#0c2d75;font-weight:800;">Misu</span> &middot; misu.pro</div>
  </div>

</div>
</body>
</html>`;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
// Se le aperture hanno una serie catalogo assegnata, genera CSV con formule
// reali da catalogo. Altrimenti usa la distinta di taglio generica.
export function generateCuttingListCSV(
  projectName: string,
  cuttingResult: CuttingListResult,
  openings?: Opening[],
  catalogSeries?: CatalogSeries[],
  toleranceW?: number,
  toleranceH?: number,
  projectSeriesId?: string | null,
): string {
  const lines: string[] = [];
  lines.push('sep=;');
  lines.push(`Progetto;${projectName}`);
  lines.push(`Data;${new Date().toLocaleDateString('it-IT')}`);
  lines.push('');

  // Usa la serie del progetto (unica per tutto il progetto)
  // Le aperture fisse (style === 'window_fixed') usano la regola +50mm, non il catalogo
  const projectSeries = projectSeriesId && catalogSeries
    ? catalogSeries.find(s => s.id === projectSeriesId) ?? null
    : null;
  const seriesEligible = (o: Opening) => {
    if (!o.width || !o.height || !o.style) return false;
    const s = o.style;
    // Serie valida solo per infissi, porte e persiane — escluso fisso (nessuna anta da tagliare)
    return (s.startsWith('window') || s.startsWith('door') || s.startsWith('shutter'))
      && s !== 'window_fixed';
  };
  const seriesOpenings = projectSeries
    ? (openings ?? []).filter(seriesEligible)
    : (openings ?? []).filter(o => o.catalogSeriesId && seriesEligible(o));

  if (seriesOpenings.length > 0) {
    const seriesName = projectSeries?.name ?? 'Da catalogo';
    lines.push(`DISTINTA TAGLIO - ${seriesName}`);
    lines.push('Vano;Tipologia;Ante;Variante usata;Pezzo;Qtà;Misura (mm);Ang.A;Ang.B');
    const tolW = toleranceW ?? 0;
    const tolH = toleranceH ?? 0;

    for (const o of seriesOpenings) {
      // Usa serie progetto se disponibile, altrimenti serie per-apertura (retrocompat)
      const series = projectSeries ?? catalogSeries?.find(s => s.id === o.catalogSeriesId);
      if (!series || !o.width || !o.height) continue;

      const variant = findBestVariant(series, o.leafCount);
      if (!variant || !variant.pieces.length) continue;

      const pcL = o.width  - tolW;
      const pcH = o.height - tolH;
      const styleLabel   = STYLE_LABELS[o.style ?? 'custom' as OpeningStyle] ?? o.style ?? '';
      const variantLabel = variant.leafCount === 1 ? '1 anta' : `${variant.leafCount} ante`;

      const hasSoglia = o.hasSoglia === true;
      for (const piece of variant.pieces) {
        const cond = piece.condition ?? 'always';
        if (cond === 'no_soglia'   &&  hasSoglia) continue;
        if (cond === 'with_soglia' && !hasSoglia) continue;
        const base   = piece.baseVar === 'L' ? pcL : pcH;
        const length = Math.round(((base - piece.offset) / piece.divisor) * 2) / 2;
        const angA   = piece.cutAngle1 === 45 ? '45°' : '90°';
        const angB   = piece.cutAngle2 === 45 ? '45°' : '90°';
        lines.push(`${o.name};${styleLabel};${o.leafCount ?? '—'};${variantLabel};${piece.name};${piece.quantity};${length};${angA};${angB}`);
      }
    }
    lines.push('');
  }

  // Sezione distinta generica — aperture non coperte dalla serie
  // (zanzariere, monoblocchi, controtelai, fissi, e tutto ciò senza serie assegnata)
  const genericOpenings = openings?.filter(o => !seriesEligible(o) || (!projectSeries && !o.catalogSeriesId)) ?? [];
  const hasGeneric = genericOpenings.length > 0 || !openings;

  if (hasGeneric) {
    const { profiles45, profiles90, barLength } = cuttingResult;
    lines.push(`DISTINTA TAGLIO GENERICA (barre da ${barLength} mm)`);
    lines.push('Profilo;Angolo;Barra N.;Pezzo N.;Lunghezza (mm);Avanzo barra (mm)');

    const addProfile = (profile: CuttingProfile) => {
      const angle = profile.cutAngle === 45 ? '45°' : '90°';
      profile.bins.forEach((bin, barIdx) => {
        bin.pieces.forEach((len, pieceIdx) => {
          const avanzo = pieceIdx === bin.pieces.length - 1 ? bin.remaining.toString() : '';
          lines.push(`${profile.label};${angle};${barIdx + 1};${pieceIdx + 1};${len};${avanzo}`);
        });
      });
    };

    if (profiles45.length > 0) { lines.push(''); lines.push('--- 45° ---'); profiles45.forEach(addProfile); }
    if (profiles90.length > 0) { lines.push(''); lines.push('--- 90° ---'); profiles90.forEach(addProfile); }
  }

  return lines.join('\r\n');
}

import { Project, Opening, OpeningStyle } from '../types';
import { calculateMaterials, MaterialsResult } from './calculateMaterials';

// ─── ViewBox constants ────────────────────────────────────────────────────────
const FX = 20, FY = 14, FW = 120, FH = 140, FT = 12;
const GX = FX + FT, GY = FY + FT;
const GW = FW - FT * 2, GH = FH - FT * 2;
const GX2 = GX + GW, GY2 = GY + GH;
const CX = GX + GW / 2, CY = GY + GH / 2;

// ─── Patterns ─────────────────────────────────────────────────────────────────
const DEFS = `<defs>
  <pattern id="wp" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#d4b483"/>
    <line x1="0" y1="2" x2="8" y2="2" stroke="#b8903c" stroke-width="0.6" opacity="0.5"/>
    <line x1="0" y1="5" x2="8" y2="5" stroke="#b8903c" stroke-width="0.4" opacity="0.35"/>
  </pattern>
  <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"  stop-color="#cce4f7" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#eaf4fc" stop-opacity="0.3"/>
  </linearGradient>
</defs>`;

// Frame: solid aluminium-grey cross-section
const FRAME = `
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#c8d4df" stroke="#4a6070" stroke-width="2"/>
  <rect x="${FX+2}" y="${FY+2}" width="${FW-4}" height="${FH-4}" fill="none" stroke="#8aa4b4" stroke-width="0.6"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="url(#glassGrad)" stroke="#4a6070" stroke-width="1"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="white" opacity="0.5"/>
  <line x1="${GX + GW*0.18}" y1="${GY+2}" x2="${GX + GW*0.36}" y2="${GY2-2}" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
  <line x1="${GX + GW*0.26}" y1="${GY+2}" x2="${GX + GW*0.44}" y2="${GY2-2}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;

// ─── Style indicators ─────────────────────────────────────────────────────────
function indicator(style: OpeningStyle, boxHeight: number | null): string {
  const col = '#1a5296';
  const da = 'stroke-dasharray="5,3"';
  const arcFill = 'fill="rgba(26,82,150,0.08)"';

  switch (style) {
    case 'window_single':
      return `
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY} Q ${GX2-3} ${GY} ${GX2-3} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-14}" y1="${CY-4}" x2="${GX2-14}" y2="${CY+4}" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`;

    case 'window_double':
      return `
        <line x1="${CX}" y1="${GY}" x2="${CX}" y2="${GY2}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY} Q ${CX-3} ${GY} ${CX-3} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX2-3} ${GY} Q ${CX+3} ${GY} ${CX+3} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'window_sliding':
      return `
        <rect x="${GX}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(26,82,150,0.06)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(255,255,255,0.15)" stroke="${col}" stroke-width="2"/>
        <line x1="${CX+4}" y1="${CY}" x2="${GX2-14}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <polygon points="${GX2-14},${CY-5} ${GX2-8},${CY} ${GX2-14},${CY+5}" fill="${col}"/>`;

    case 'window_tilt_turn':
      return `
        <line x1="${GX+4}" y1="${GY+4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX2-4}" y1="${GY+4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${CX}" y1="${GY2-4}" x2="${CX}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX+4}" y1="${GY}" x2="${GX+4}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${CX-10}" y1="${GY2-4}" x2="${CX+10}" y2="${GY2-4}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;

    case 'door_single':
      return `
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY2} A ${GH*0.85} ${GH*0.85} 0 0 1 ${Math.min(GX2-3, GX+3+GH*0.85)} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <rect x="${GX2-12}" y="${CY-8}" width="5" height="16" rx="2.5" fill="${col}"/>`;

    case 'door_double':
      return `
        <line x1="${CX}" y1="${FY}" x2="${CX}" y2="${FY+FH}" stroke="#aabccc" stroke-width="${FT+2}"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 1 ${Math.min(CX-2, GX+3+GH*0.82)} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX2-3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 0 ${Math.max(CX+2, GX2-3-GH*0.82)} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'door_sliding':
      return `
        <rect x="${GX}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(26,82,150,0.06)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY}" width="${GW/2+6}" height="${GH}" fill="rgba(255,255,255,0.15)" stroke="${col}" stroke-width="2"/>
        <rect x="${CX-3}" y="${CY-8}" width="4" height="16" rx="2" fill="${col}"/>`;

    case 'door_french':
      return `
        <line x1="${CX}" y1="${FY}" x2="${CX}" y2="${FY+FH}" stroke="#aabccc" stroke-width="${FT+2}"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 0 ${GX+3} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX2-3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 1 ${GX2-3} ${GY2}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'door_bifold': {
      const pL = GX + GW * 0.25, pR = GX + GW * 0.75, pY = GY + 16;
      const arcR = GW / 2 - 6;
      return `
        <line x1="${GX+4}" y1="${GY2-4}" x2="${pL}" y2="${pY}" stroke="${col}" stroke-width="2"/>
        <line x1="${pL}" y1="${pY}" x2="${CX-4}" y2="${GY2-4}" stroke="${col}" stroke-width="2"/>
        <line x1="${CX+4}" y1="${GY2-4}" x2="${pR}" y2="${pY}" stroke="${col}" stroke-width="2"/>
        <line x1="${pR}" y1="${pY}" x2="${GX2-4}" y2="${GY2-4}" stroke="${col}" stroke-width="2"/>
        <path d="M ${GX+4} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${CX} ${GY2-4}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>
        <path d="M ${CX} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${GX2-4} ${GY2-4}" ${arcFill} stroke="${col}" stroke-width="1.5" ${da}/>`;
    }

    case 'shutter_single': {
      const slats = 7, slH = FH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#5a7a3a" stroke="#3a5a22" stroke-width="2"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${FX+1}" y1="${FY + i * slH}" x2="${FX+FW-1}" y2="${FY + i * slH}" stroke="#3a5a22" stroke-width="0.8" opacity="0.7"/>`;
        s += `<line x1="${FX+1}" y1="${FY + i * slH + slH*0.45}" x2="${FX+FW-1}" y2="${FY + i * slH + slH*0.45}" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>`;
      }
      [0.2, 0.5, 0.8].forEach(p => {
        s += `<circle cx="${FX+6}" cy="${FY + FH*p}" r="3.5" fill="#2a4a18" stroke="#1a3a0a" stroke-width="0.5"/>`;
      });
      s += `<path d="M ${FX+4} ${FY} Q ${FX-FW*0.38} ${FY+FH/2} ${FX+4} ${FY+FH}" fill="rgba(90,122,58,0.12)" stroke="#3a5a22" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      return s;
    }

    case 'shutter_double': {
      const slats = 7, slH = FH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#5a7a3a" stroke="#3a5a22" stroke-width="2"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${FX+1}" y1="${FY + i * slH}" x2="${FX+FW-1}" y2="${FY + i * slH}" stroke="#3a5a22" stroke-width="0.8" opacity="0.7"/>`;
      }
      s += `<line x1="${FX + FW/2}" y1="${FY}" x2="${FX + FW/2}" y2="${FY+FH}" stroke="#3a5a22" stroke-width="2"/>`;
      [0.2, 0.5, 0.8].forEach(p => {
        s += `<circle cx="${FX+6}" cy="${FY + FH*p}" r="3.5" fill="#2a4a18"/>`;
        s += `<circle cx="${FX+FW-6}" cy="${FY + FH*p}" r="3.5" fill="#2a4a18"/>`;
      });
      s += `<path d="M ${FX+4} ${FY} Q ${FX-FW*0.2} ${FY+FH/2} ${FX+4} ${FY+FH}" fill="rgba(90,122,58,0.1)" stroke="#3a5a22" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      s += `<path d="M ${FX+FW-4} ${FY} Q ${FX+FW+FW*0.2} ${FY+FH/2} ${FX+FW-4} ${FY+FH}" fill="rgba(90,122,58,0.1)" stroke="#3a5a22" stroke-width="1.5" stroke-dasharray="5,3"/>`;
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
        <text x="${FX + FW/2}" y="${FY + boxH/2 + 3.5}" text-anchor="middle" font-size="7" fill="#aaa" font-weight="700" font-family="Arial,sans-serif" letter-spacing="0.5">CASS.</text>
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
              font-weight="700" font-family="Arial,sans-serif" letter-spacing="0.5">CONTROTELAIO</text>`;
    }

    case 'door_entrance': {
      // Cover glass area with anthracite door slab
      let s = `<rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="#2a3240"/>`;
      // Bugna panels: 2 cols × 3 rows
      // col width=37, gap=6; row heights=25,42,21, gap=6
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
        s += `<rect x="${bx + 4}" y="${by + 4}" width="${bw - 8}" height="${bh - 8}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.8" rx="1"/>`;
      });
      // Hinges (left side, at 25% and 75% of door height)
      [Math.round(GY + GH * 0.25), Math.round(GY + GH * 0.75)].forEach(hy => {
        s += `<rect x="${GX + 2}" y="${hy - 6}" width="8" height="12" rx="1.5" fill="#8090a4" stroke="#5a6a7a" stroke-width="0.8"/>`;
        s += `<circle cx="${GX + 6}" cy="${hy}" r="2" fill="#5a6a7a"/>`;
      });
      // Handle (right side, centre height)
      s += `<rect x="${GX2 - 16}" y="${CY - 14}" width="6" height="28" rx="3" fill="#8090a4" stroke="#5a6a7a" stroke-width="0.8"/>`;
      s += `<circle cx="${GX2 - 13}" cy="${CY}" r="4" fill="#a0b0c0" stroke="#5a6a7a" stroke-width="0.8"/>`;
      // Lock cylinder
      s += `<ellipse cx="${GX2 - 13}" cy="${CY + 20}" rx="3.5" ry="4" fill="#5a6a7a" stroke="#3a4a5a" stroke-width="0.8"/>`;
      s += `<ellipse cx="${GX2 - 13}" cy="${CY + 20}" rx="1.5" ry="2" fill="#8090a4"/>`;
      return s;
    }

    default:
      return `
        <line x1="${GX+14}" y1="${CY}" x2="${GX2-14}" y2="${CY}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4,3"/>
        <line x1="${CX}" y1="${GY+14}" x2="${CX}" y2="${GY2-14}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4,3"/>
        <text x="${CX}" y="${CY+16}" text-anchor="middle" font-size="9" fill="#aaa" font-family="Arial,sans-serif">—</text>`;
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
  const content = isSubframe || isShutter || isRoller
    ? indicator(style, boxHeight)
    : `${FRAME}${indicator(style, boxHeight)}`;
  return `<svg width="80" height="90" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
    ${DEFS}${content}
  </svg>`;
}

// ─── Labels ───────────────────────────────────────────────────────────────────
const STYLE_LABELS: Partial<Record<OpeningStyle, string>> & Record<string, string> = {
  window_single:    'Finestra singola',
  window_double:    'Finestra doppia',
  window_sliding:   'Finestra scorrevole',
  window_tilt_turn: 'Finestra vasistas',
  door_single:      'Porta singola',
  door_double:      'Porta doppia',
  door_sliding:     'Porta scorrevole',
  door_french:      'Porta finestra',
  door_bifold:      'Porta a libro',
  door_entrance:    'Portoncino',
  shutter_single:   'Persiana singola',
  shutter_double:   'Persiana doppia',
  roller_blind:     'Monoblocco tapparella',
  subframe_window:  'Controtelaio',
  mosquito_fixed:   'Zanzariera fissa',
  mosquito_rollup:  'Zanzariera avvolgibile',
  mosquito_lateral: 'Zanzariera laterale',
};

const STYLE_COLORS: Partial<Record<OpeningStyle, string>> = {
  window_single:    '#1565C0', window_double: '#1565C0',
  window_sliding:   '#1565C0', window_tilt_turn: '#1565C0',
  door_single:      '#6A1B9A', door_double:   '#6A1B9A',
  door_sliding:     '#6A1B9A', door_french:   '#6A1B9A',
  door_bifold:      '#6A1B9A',
  shutter_single:   '#2E7D32', shutter_double: '#2E7D32',
  roller_blind:     '#E65100',
  subframe_window:  '#5D4037',
  custom:           '#455A64',
};

function dim(v: number | null) { return v != null ? `${v}` : '—'; }

function openingRow(o: Opening, globalIdx: number, groupIdx: number, toleranceW: number, toleranceH: number): string {
  const tagW = o.width  != null ? o.width  - toleranceW : null;
  const tagH = o.height != null ? o.height - toleranceH : null;
  const styleLabel = o.style ? STYLE_LABELS[o.style] : '—';
  const isRoller   = o.style === 'roller_blind';
  const isSubframe = o.style === 'subframe_window';
  const bg = groupIdx % 2 === 0 ? '#ffffff' : '#fafbfc';

  return `<tr style="background:${bg}; border-bottom:1px solid #e8edf0;">
    <td style="padding:8px 10px; text-align:center; width:32px; color:#888; font-size:11px; font-weight:700; border-right:1px solid #eee;">
      ${globalIdx + 1}
    </td>
    <td style="padding:6px 8px; width:86px; text-align:center; border-right:1px solid #eee;">
      ${svgForStyle(o.style, o.boxHeight ?? null)}
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee;">
      <div style="font-size:12px;font-weight:700;color:#1a2a3a;">${o.name}</div>
      <div style="font-size:9px;color:#888;font-style:italic;margin-top:1px;">${styleLabel}</div>
      ${o.profileSeries ? `<div style="font-size:9px;color:#1565C0;font-weight:700;margin-top:2px;">⬛ ${o.profileSeries}</div>` : ''}
      ${o.glassType ? `<div style="font-size:9px;color:#2E7D32;margin-top:1px;">🪟 ${o.glassType}</div>` : ''}
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee; white-space:nowrap; text-align:center;">
      <div style="font-size:12px;font-weight:700;color:#1a2a3a;">${dim(o.width)}</div>
      <div style="font-size:12px;font-weight:700;color:#1a2a3a;">${dim(o.height)}</div>
    </td>
    <td style="padding:8px 12px; border-right:1px solid #eee; white-space:nowrap; text-align:center;">
      ${isSubframe
        ? `<div style="font-size:11px;color:#bbb;font-style:italic;">—</div>`
        : `<div style="font-size:12px;font-weight:700;color:#1565C0;">${dim(tagW)}</div>
           <div style="font-size:12px;font-weight:700;color:#1565C0;">${dim(tagH)}</div>`}
    </td>
    <td style="padding:8px 12px;">
      ${isRoller && o.boxHeight != null
        ? `<div style="font-size:10px;font-weight:700;color:#E65100;">Cass. ${o.boxHeight} mm</div>` : ''}
      ${o.textNote
        ? `<div style="font-size:9px;color:#555;background:#fffde7;padding:3px 6px;
                       border-left:2px solid #FFC107;border-radius:2px;">${o.textNote}</div>` : ''}
      ${o.photos.length > 0
        ? `<div style="font-size:9px;color:#aaa;margin-top:2px;">📷 ${o.photos.length}</div>` : ''}
      ${!isRoller && !o.textNote && o.photos.length === 0
        ? `<span style="color:#ccc;font-size:10px;">—</span>` : ''}
    </td>
  </tr>`;
}

// Group openings by category, like FST groups by Marca/Serie
type GroupDef = { label: string; color: string; filter: (o: Opening) => boolean };
const GROUPS: GroupDef[] = [
  { label: 'FINESTRE',    color: '#1565C0', filter: o => !!o.style?.startsWith('window') },
  { label: 'PORTE',       color: '#6A1B9A', filter: o => !!o.style?.startsWith('door') },
  { label: 'PERSIANE',    color: '#2E7D32', filter: o => !!o.style?.startsWith('shutter') },
  { label: 'MONOBLOCCHI', color: '#E65100', filter: o => o.style === 'roller_blind' },
  { label: 'CONTROTELAI', color: '#5D4037', filter: o => o.style === 'subframe_window' },
  { label: 'ALTRO',       color: '#455A64', filter: o => !o.style || o.style === 'custom' },
];

function groupTable(group: GroupDef, openings: Opening[], startIdx: number, toleranceW: number, toleranceH: number): string {
  if (openings.length === 0) return '';
  const rows = openings.map((o, i) => openingRow(o, startIdx + i, i, toleranceW, toleranceH)).join('');
  return `
  <div style="margin-bottom:20px; break-inside:avoid;">
    <!-- Group header (like Marca/Serie/Colore in FST) -->
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <tr style="background:${group.color};">
        <td colspan="2" style="padding:7px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">${group.label}</span>
        </td>
        <td style="padding:7px 14px; text-align:right;">
          <span style="color:rgba(255,255,255,0.7);font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Q.tà: </span>
          <span style="color:white;font-size:11px;font-weight:700;">${openings.length}</span>
        </td>
      </tr>
      <!-- Column headers (italic, like FST) -->
      <tr style="background:#f5f7fa;border-bottom:1px solid #dde4ec;">
        <th style="padding:6px 10px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;width:32px;border-right:1px solid #eee;">#</th>
        <th style="padding:6px 8px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;width:86px;border-right:1px solid #eee;">Disegno</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;border-right:1px solid #eee;">Descrizione</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;border-right:1px solid #eee;">Luce L / H (mm)</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;text-align:center;border-right:1px solid #eee;">Taglio L / H (mm)</th>
        <th style="padding:6px 12px;font-size:9px;font-style:italic;font-weight:600;color:#666;">Note</th>
      </tr>
      ${rows}
      <!-- Group subtotal (like FST subtotal row) -->
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
function materialsSection(result: MaterialsResult): string {
  const { profiles45, profiles90, totalBars45, totalBars90 } = result;
  if (profiles45.length === 0 && profiles90.length === 0) return '';

  const row = (label: string, bars: number, color: string) =>
    `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:7px 14px;font-size:11px;font-weight:600;color:#1a2a3a;">${label}</td>
      <td style="padding:7px 14px;text-align:right;font-size:12px;font-weight:800;color:${color};">
        ${bars} barr${bars !== 1 ? 'e' : 'a'}
      </td>
    </tr>`;

  const table45 = profiles45.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde4ec;overflow:hidden;">
      <tr style="background:#1565C0;">
        <td colspan="2" style="padding:8px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;letter-spacing:1.5px;">TAGLI A 45°</span>
        </td>
      </tr>
      ${profiles45.map(p => row(p.label, p.bars, '#1565C0')).join('')}
      <tr style="background:#f5f7fa;border-top:2px solid rgba(21,101,192,0.18);">
        <td style="padding:7px 14px;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;">Totale</td>
        <td style="padding:7px 14px;text-align:right;font-size:14px;font-weight:900;color:#1565C0;">${totalBars45}</td>
      </tr>
    </table>` : '';

  const table90 = profiles90.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde4ec;overflow:hidden;">
      <tr style="background:#E65100;">
        <td colspan="2" style="padding:8px 14px;">
          <span style="color:white;font-size:10px;font-weight:800;letter-spacing:1.5px;">TAGLI A 90°</span>
        </td>
      </tr>
      ${profiles90.map(p => row(p.label, p.bars, '#E65100')).join('')}
      <tr style="background:#f5f7fa;border-top:2px solid rgba(230,81,0,0.18);">
        <td style="padding:7px 14px;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;">Totale</td>
        <td style="padding:7px 14px;text-align:right;font-size:14px;font-weight:900;color:#E65100;">${totalBars90}</td>
      </tr>
    </table>` : '';

  const grand = totalBars45 + totalBars90;

  return `
  <div style="margin-top:28px;">
    <hr style="border:none;border-top:2px solid #E65100;margin-bottom:14px;"/>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
      <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;">SVILUPPO MATERIALE</span>
      <span style="font-size:9px;color:#888;">barre da 6400 mm</span>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="width:49%;vertical-align:top;">${table45}</td>
        <td style="width:2%;"></td>
        <td style="width:49%;vertical-align:top;">${table90}</td>
      </tr>
    </table>
    <div style="text-align:right;padding:10px 16px;background:#1a2a3a;border-radius:6px;">
      <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">TOTALE BARRE: </span>
      <span style="font-size:17px;font-weight:900;color:#ffffff;">${grand}</span>
    </div>
  </div>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function generateHTML(project: Project, toleranceW: number, toleranceH: number = toleranceW): string {
  const date = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const createdDate = new Date(project.createdAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Build grouped tables (like FST groups by Marca/Serie)
  let globalIdx = 0;
  const groupedContent = GROUPS.map(group => {
    const items = project.openings.filter(group.filter);
    const html = groupTable(group, items, globalIdx, toleranceW, toleranceH);
    globalIdx += items.length;
    return html;
  }).join('');

  const hasNotes = project.openings.some(o => o.textNote);
  const matResult = calculateMaterials(project.openings);
  const matHTML = materialsSection(matResult);

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

  <!-- ── HEADER (stile FST: logo + riga orizzontale) ── -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
    <div>
      <!-- Logo / nome app -->
      <div style="display:inline-flex; align-items:center; gap:10px;">
        <div style="width:36px;height:36px;background:#1565C0;border-radius:6px;
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:14px;font-weight:900;letter-spacing:-1px;">MM</span>
        </div>
        <div>
          <div style="font-size:15px;font-weight:900;color:#1565C0;letter-spacing:0.5px;">MeasureMate</div>
          <div style="font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Rilievo Infissi</div>
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;color:#aaa;">${date}</div>
      <div style="font-size:9px;color:#aaa;margin-top:2px;">Aperture totali: <strong style="color:#1a1a1a;">${project.openings.length}</strong></div>
    </div>
  </div>
  <hr style="border:none;border-top:2px solid #1565C0;margin-bottom:16px;"/>

  <!-- ── INFO ORDINE (stile FST: griglia label/valore) ── -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
    <tr>
      <td style="width:50%;padding-bottom:6px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:90px;padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Progetto</td>
            <td style="padding:3px 0;font-weight:700;font-size:12px;color:#1a1a1a;border-bottom:1px solid #ddd;">${project.name}</td>
          </tr>
          ${project.clientName ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Cliente</td>
            <td style="padding:3px 0;font-weight:600;border-bottom:1px solid #ddd;">${project.clientName}</td>
          </tr>` : ''}
          ${project.address ? `<tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Indirizzo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${project.address}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Data rilievo</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;">${createdDate}</td>
          </tr>
        </table>
      </td>
      <td style="width:50%;padding-left:28px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Tol. larghezza</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;font-weight:600;">${toleranceW} mm</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#888;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Tol. altezza</td>
            <td style="padding:3px 0;border-bottom:1px solid #ddd;font-weight:600;">${toleranceH} mm</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── TITOLO SEZIONE (stile FST) ── -->
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
    <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;">RIEPILOGO MISURE</span>
    <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1565C0;">INFISSI</span>
  </div>

  <!-- ── GRUPPI (uno per tipo, come FST per Marca/Serie) ── -->
  ${project.openings.length > 0 ? groupedContent : `
    <div style="text-align:center;padding:40px;color:#bbb;font-size:13px;">Nessuna apertura inserita</div>`}

  <!-- ── NOTE (stile FST) ── -->
  ${hasNotes ? `
  <div style="margin-top:8px;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:4px;">Note</div>
    <hr style="border:none;border-top:1px solid #ccc;margin-bottom:8px;"/>
    ${project.openings.filter(o => o.textNote).map(o =>
      `<div style="font-size:10px;color:#444;padding:3px 0;border-bottom:1px dashed #eee;">
        <strong>${o.name}:</strong> ${o.textNote}
      </div>`
    ).join('')}
  </div>` : ''}

  ${matHTML}

  <!-- ── FOOTER ── -->
  <hr style="border:none;border-top:1px solid #e0e0e0;margin-top:20px;"/>
  <div style="display:flex;justify-content:space-between;padding-top:8px;">
    <div style="font-size:8px;color:#bbb;">Generato con MeasureMate &mdash; ${new Date().toLocaleString('it-IT')}</div>
    <div style="font-size:8px;color:#bbb;">Tolleranze: L ${toleranceW} mm / H ${toleranceH} mm</div>
  </div>

</div>
</body>
</html>`;
}

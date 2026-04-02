import { Project, Opening, OpeningStyle } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
// ViewBox 160x180
const FX = 20, FY = 14, FW = 120, FH = 140, FT = 12;
const GX = FX + FT, GY = FY + FT;
const GW = FW - FT * 2, GH = FH - FT * 2;
const GX2 = GX + GW, GY2 = GY + GH;
const CX = GX + GW / 2, CY = GY + GH / 2;

// ─── Patterns ────────────────────────────────────────────────────────────────
const HATCH_PAT = `<defs>
  <pattern id="hp" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
    <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#1a3a5c" stroke-width="0.7"/>
  </pattern>
  <pattern id="wp" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#d4b483"/>
    <line x1="0" y1="2" x2="8" y2="2" stroke="#b8903c" stroke-width="0.6" opacity="0.5"/>
    <line x1="0" y1="5" x2="8" y2="5" stroke="#b8903c" stroke-width="0.4" opacity="0.35"/>
  </pattern>
  <pattern id="sp" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
    <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#5a7a3a" stroke-width="0.7"/>
  </pattern>
</defs>`;

// Frame cross-section: solid fill (no wall hatch)
const FRAME = `
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#dde4ec" stroke="#1a3a5c" stroke-width="2"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="white"/>
  <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="rgba(176,213,232,0.38)" stroke="#1a3a5c" stroke-width="0.8"/>
  <line x1="${GX+GW*0.25}" y1="${GY}" x2="${GX+GW*0.45}" y2="${GY2}" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>`;

// ─── Style-specific indicators ────────────────────────────────────────────────
function indicator(style: OpeningStyle, boxHeight: number | null): string {
  const col = '#1565C0';
  const da = 'stroke-dasharray="5,3"';

  switch (style) {
    case 'window_single':
      return `
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5"/>
        <path d="M ${GX+3} ${GY} Q ${GX2-3} ${GY} ${GX2-3} ${GY2}" fill="none" stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'window_double':
      return `
        <line x1="${CX}" y1="${GY}" x2="${CX}" y2="${GY2}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5"/>
        <path d="M ${GX+3} ${GY} Q ${CX-3} ${GY} ${CX-3} ${GY2}" fill="none" stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5"/>
        <path d="M ${GX2-3} ${GY} Q ${CX+3} ${GY} ${CX+3} ${GY2}" fill="none" stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'window_sliding':
      return `
        <line x1="${GX}" y1="${GY+8}" x2="${GX2}" y2="${GY+8}" stroke="${col}" stroke-width="1"/>
        <line x1="${GX}" y1="${GY2-8}" x2="${GX2}" y2="${GY2-8}" stroke="${col}" stroke-width="1"/>
        <rect x="${GX}" y="${GY+8}" width="${GW/2+6}" height="${GH-16}" fill="rgba(176,213,232,0.2)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY+8}" width="${GW/2+6}" height="${GH-16}" fill="rgba(255,255,255,0.1)" stroke="${col}" stroke-width="2"/>
        <line x1="${CX+6}" y1="${CY}" x2="${GX2-12}" y2="${CY}" stroke="${col}" stroke-width="1.5"/>`;

    case 'window_tilt_turn':
      return `
        <line x1="${GX}" y1="${GY}" x2="${GX2}" y2="${GY2}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX2}" y1="${GY}" x2="${GX}" y2="${GY2}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${GX+4}" y1="${CY-10}" x2="${GX+4}" y2="${CY+10}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${CX-10}" y1="${GY2-4}" x2="${CX+10}" y2="${GY2-4}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;

    case 'door_single':
      return `
        <line x1="${GX}" y1="${GY2}" x2="${GX2}" y2="${GY2}" stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX2-3}" y2="${GY}" stroke="${col}" stroke-width="2"/>
        <path d="M ${GX+3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 1 ${Math.min(GX2-3, GX+3+GH*0.82)} ${GY2}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>
        <rect x="${GX2-10}" y="${CY-6}" width="4" height="12" rx="2" fill="${col}"/>`;

    case 'door_double':
      return `
        <line x1="${GX}" y1="${GY2}" x2="${GX2}" y2="${GY2}" stroke="${col}" stroke-width="1.5" ${da}/>
        <rect x="${CX-1}" y="${FY}" width="${FT+2}" height="${FH}" fill="#dce9f5"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${GX+3}" y1="${GY}" x2="${CX}" y2="${GY}" stroke="${col}" stroke-width="2"/>
        <path d="M ${GX+3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 1 ${Math.min(CX, GX+3+GH*0.82)} ${GY2}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${CX}" y1="${GY}" x2="${GX2-3}" y2="${GY}" stroke="${col}" stroke-width="2"/>
        <path d="M ${GX2-3} ${GY2} A ${GH*0.82} ${GH*0.82} 0 0 0 ${Math.max(CX, GX2-3-GH*0.82)} ${GY2}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'door_sliding':
      return `
        <line x1="${GX}" y1="${GY+8}" x2="${GX2}" y2="${GY+8}" stroke="${col}" stroke-width="1"/>
        <rect x="${GX}" y="${GY+8}" width="${GW/2+6}" height="${GH-10}" fill="rgba(176,213,232,0.2)" stroke="${col}" stroke-width="1"/>
        <rect x="${CX-6}" y="${GY+8}" width="${GW/2+6}" height="${GH-10}" fill="rgba(255,255,255,0.1)" stroke="${col}" stroke-width="2"/>
        <rect x="${CX-2}" y="${CY-7}" width="3" height="14" rx="1.5" fill="${col}"/>`;

    case 'door_french':
      return `
        <line x1="${GX}" y1="${GY2}" x2="${GX2}" y2="${GY2}" stroke="${col}" stroke-width="1.5" ${da}/>
        <rect x="${CX-1}" y="${FY}" width="${FT+2}" height="${FH}" fill="#dce9f5"/>
        <line x1="${GX+3}" y1="${GY}" x2="${GX+3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX+3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 0 ${GX+3} ${GY2}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX2-3}" y1="${GY}" x2="${GX2-3}" y2="${GY2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M ${GX2-3} ${GY} A ${GW/2-6} ${GW/2-6} 0 0 1 ${GX2-3} ${GY2}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>`;

    case 'door_bifold': {
      const pL = GX + GW * 0.25, pR = GX + GW * 0.75, pY = GY + 12, arcR = GW / 2 - 6;
      return `
        <line x1="${GX}" y1="${GY2}" x2="${GX2}" y2="${GY2}" stroke="${col}" stroke-width="1.5" ${da}/>
        <line x1="${GX+4}" y1="${GY2-4}" x2="${pL}" y2="${pY}" stroke="${col}" stroke-width="2"/>
        <line x1="${pL}" y1="${pY}" x2="${CX-4}" y2="${GY2-4}" stroke="${col}" stroke-width="2"/>
        <line x1="${CX+4}" y1="${GY2-4}" x2="${pR}" y2="${pY}" stroke="${col}" stroke-width="2"/>
        <line x1="${pR}" y1="${pY}" x2="${GX2-4}" y2="${GY2-4}" stroke="${col}" stroke-width="2"/>
        <path d="M ${GX+4} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${CX} ${GY2-4}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>
        <path d="M ${CX} ${GY2-4} A ${arcR} ${arcR} 0 0 0 ${GX2-4} ${GY2-4}" fill="rgba(176,213,232,0.15)" stroke="${col}" stroke-width="1.5" ${da}/>`;
    }

    case 'shutter_single': {
      const slats = 6;
      const slH = GH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#5a7a3acc" stroke="#5a7a3a" stroke-width="2"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="rgba(90,122,58,0.12)" stroke="#5a7a3a" stroke-width="0.8"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${GX}" y1="${GY + i * slH}" x2="${GX2}" y2="${GY + i * slH}" stroke="#5a7a3a" stroke-width="0.8" opacity="0.6"/>`;
      }
      // Hinge dots
      [0.25, 0.5, 0.75].forEach(p => {
        s += `<circle cx="${GX+5}" cy="${GY + GH*p}" r="3" fill="#3a5a2a"/>`;
      });
      // Outward arc
      s += `<path d="M ${GX+3} ${GY} Q ${GX-GW*0.4} ${CY} ${GX+3} ${GY2}" fill="rgba(90,122,58,0.1)" stroke="#5a7a3a" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      return s;
    }

    case 'shutter_double': {
      const slats = 6;
      const slH = GH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="#5a7a3acc" stroke="#5a7a3a" stroke-width="2"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" fill="rgba(90,122,58,0.12)" stroke="#5a7a3a" stroke-width="0.8"/>`;
      for (let i = 1; i < slats; i++) {
        s += `<line x1="${GX}" y1="${GY + i * slH}" x2="${GX2}" y2="${GY + i * slH}" stroke="#5a7a3a" stroke-width="0.8" opacity="0.6"/>`;
      }
      s += `<line x1="${CX}" y1="${GY}" x2="${CX}" y2="${GY2}" stroke="#5a7a3a" stroke-width="1.5"/>`;
      [0.25, 0.5, 0.75].forEach(p => {
        s += `<circle cx="${GX+5}" cy="${GY + GH*p}" r="3" fill="#3a5a2a"/>`;
        s += `<circle cx="${GX2-5}" cy="${GY + GH*p}" r="3" fill="#3a5a2a"/>`;
      });
      s += `<path d="M ${GX+3} ${GY} Q ${GX-GW*0.25} ${CY} ${GX+3} ${GY2}" fill="rgba(90,122,58,0.1)" stroke="#5a7a3a" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      s += `<path d="M ${GX2-3} ${GY} Q ${GX2+GW*0.25} ${CY} ${GX2-3} ${GY2}" fill="rgba(90,122,58,0.1)" stroke="#5a7a3a" stroke-width="1.5" stroke-dasharray="5,3"/>`;
      return s;
    }

    case 'roller_blind': {
      const boxH = Math.round(FH * 0.22);
      const boxY2 = FY + boxH;
      const frameGY = boxY2 + 4;
      const frameH = FY + FH - FT - frameGY;
      const slats = 4;
      const slH = frameH / slats;
      let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="${boxH}" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="1.5"/>
        <text x="${CX}" y="${FY + boxH/2 + 3.5}" text-anchor="middle" font-size="7" fill="#aaa" font-weight="700" font-family="Arial">CASS.</text>
        <rect x="${FX}" y="${boxY2}" width="${FW}" height="${FY+FH-boxY2}" fill="url(#hp)" stroke="#1a3a5c" stroke-width="2"/>
        <rect x="${GX}" y="${frameGY}" width="${GW}" height="${frameH}" fill="white"/>`;
      for (let i = 0; i <= slats; i++) {
        s += `<line x1="${GX}" y1="${frameGY + i * slH}" x2="${GX2}" y2="${frameGY + i * slH}" stroke="#c8a06a" stroke-width="${i===0?1.5:0.8}"/>`;
      }
      // Guides
      s += `<rect x="${GX}" y="${frameGY}" width="5" height="${frameH}" fill="#888" opacity="0.5"/>`;
      s += `<rect x="${GX2-5}" y="${frameGY}" width="5" height="${frameH}" fill="#888" opacity="0.5"/>`;
      if (boxHeight != null) {
        s += `<text x="${FX + FW + 4}" y="${FY + boxH/2 + 3.5}" font-size="7" fill="#E65100" font-weight="700" font-family="Arial">${boxHeight}</text>`;
      }
      return s;
    }

    case 'subframe_window': {
      // U-shape controtelaio: top bar + left bar + right bar, no bottom
      return `
        <rect x="${FX}" y="${FY}" width="${FT}" height="${FH}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${FX+FW-FT}" y="${FY}" width="${FT}" height="${FH}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${FX}" y="${FY}" width="${FW}" height="${FT}" fill="url(#wp)" stroke="#7a5030" stroke-width="1.5"/>
        <rect x="${GX}" y="${GY}" width="${GW}" height="${GH+FT+4}" fill="white"/>
        <path d="M ${GX+4} ${FY+FH+2} L ${GX+4} ${GY+4} L ${GX2-4} ${GY+4} L ${GX2-4} ${FY+FH+2}"
              fill="none" stroke="#c8a06a" stroke-width="1" stroke-dasharray="4,2"/>
        <text x="${CX}" y="${GY+GH/2+5}" text-anchor="middle" font-size="8" fill="#7a5030" font-weight="700" font-family="Arial">CONTROTELAIO</text>`;
    }

    default:
      return `
        <line x1="${GX+10}" y1="${CY}" x2="${GX2-10}" y2="${CY}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4,3"/>
        <line x1="${CX}" y1="${GY+10}" x2="${CX}" y2="${GY2-10}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  }
}

function svgForStyle(style: OpeningStyle | null, boxHeight: number | null): string {
  if (!style) return `<svg width="160" height="180" viewBox="0 0 160 180"></svg>`;
  const isSubframe = style.startsWith('subframe');
  const isShutter  = style.startsWith('shutter');
  const isRoller   = style === 'roller_blind';
  const content = isSubframe || isShutter || isRoller
    ? indicator(style, boxHeight)
    : `${FRAME}${indicator(style, boxHeight)}`;
  return `<svg width="160" height="180" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
    ${HATCH_PAT}${content}
  </svg>`;
}

// ─── Labels ──────────────────────────────────────────────────────────────────
const STYLE_LABELS: Record<OpeningStyle, string> = {
  window_single:        'Finestra singola',
  window_double:        'Finestra doppia',
  window_sliding:       'Finestra scorrevole',
  window_tilt_turn:     'Finestra vasistas',
  door_single:          'Porta singola',
  door_double:          'Porta doppia',
  door_sliding:         'Porta scorrevole',
  door_french:          'Porta finestra',
  door_bifold:          'Porta a libro',
  shutter_single:       'Persiana singola',
  shutter_double:       'Persiana doppia',
  roller_blind:         'Monoblocco tapparella',
  subframe_window:      'Controtelaio',
  custom:               'Personalizzato',
};

function dim(v: number | null) { return v != null ? `${v}` : '—'; }

// ─── Card HTML ────────────────────────────────────────────────────────────────
function openingCard(o: Opening, idx: number, toleranceW: number, toleranceH: number): string {
  const tagW = o.width  != null ? o.width  - toleranceW : null;
  const tagH = o.height != null ? o.height - toleranceH : null;
  const styleLabel = o.style ? STYLE_LABELS[o.style] : '—';
  const isRoller = o.style === 'roller_blind';
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-num">${idx + 1}</span>
        <span class="card-name">${o.name}</span>
      </div>
      <div class="card-drawing">
        ${svgForStyle(o.style, o.boxHeight ?? null)}
      </div>
      <div class="card-dims">
        <div class="dim-row">
          <span class="dim-label">Larghezza</span>
          <div class="dim-vals">
            <span class="luce">L ${dim(o.width)} mm</span>
            <span class="taglio">T ${dim(tagW)} mm</span>
          </div>
        </div>
        <div class="dim-row">
          <span class="dim-label">Altezza</span>
          <div class="dim-vals">
            <span class="luce">L ${dim(o.height)} mm</span>
            <span class="taglio">T ${dim(tagH)} mm</span>
          </div>
        </div>
        ${isRoller ? `<div class="dim-row">
          <span class="dim-label">Cassonetto</span>
          <div class="dim-vals"><span class="luce">${dim(o.boxHeight ?? null)} mm</span></div>
        </div>` : ''}
      </div>
      <div class="card-style">${styleLabel}</div>
      ${o.textNote ? `<div class="card-note">${o.textNote}</div>` : ''}
      ${o.photos.length > 0 ? `<div class="card-photos">📷 ${o.photos.length} foto</div>` : ''}
    </div>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function generateHTML(project: Project, toleranceW: number, toleranceH: number = toleranceW): string {
  const date = new Date(project.createdAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const cards = project.openings.map((o, i) => openingCard(o, i, toleranceW, toleranceH)).join('');

  const nWindows  = project.openings.filter(o => o.style?.startsWith('window')).length;
  const nDoors    = project.openings.filter(o => o.style?.startsWith('door')).length;
  const nShutters = project.openings.filter(o => o.style?.startsWith('shutter')).length;
  const nRollers  = project.openings.filter(o => o.style === 'roller_blind').length;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; padding: 24px; }

  .header {
    background: #1565C0; color: white; border-radius: 12px;
    padding: 24px 28px; margin-bottom: 24px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .header-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
  .header-sub { font-size: 13px; opacity: 0.75; }
  .header-meta { text-align: right; font-size: 12px; opacity: 0.8; line-height: 1.8; }
  .header-badge {
    background: rgba(255,255,255,0.2); border-radius: 8px;
    padding: 4px 12px; font-size: 12px; margin-top: 8px;
    display: inline-block;
  }

  .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat-box {
    background: white; border-radius: 10px; padding: 14px 20px;
    flex: 1; border-left: 4px solid #1565C0;
  }
  .stat-num { font-size: 28px; font-weight: 800; color: #1565C0; }
  .stat-lbl { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }

  .tol-row {
    display: flex; gap: 12px; margin-bottom: 20px;
  }
  .tol-box {
    background: white; border-radius: 10px; padding: 10px 16px;
    flex: 1; border-left: 4px solid #E65100; display: flex; align-items: center; gap: 8px;
  }
  .tol-val { font-size: 20px; font-weight: 800; color: #E65100; }
  .tol-lbl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }

  .section-title {
    font-size: 11px; font-weight: 800; color: #1565C0;
    text-transform: uppercase; letter-spacing: 1.5px;
    margin-bottom: 14px; padding-bottom: 6px;
    border-bottom: 2px solid #1565C0;
  }

  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

  .card {
    background: white; border-radius: 12px;
    border: 1.5px solid #e0e8f0; overflow: hidden;
    break-inside: avoid;
  }
  .card-header {
    background: #f0f6ff; padding: 10px 12px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #e0e8f0;
  }
  .card-num {
    background: #1565C0; color: white;
    width: 24px; height: 24px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; flex-shrink: 0;
    text-align: center; line-height: 24px;
  }
  .card-name { font-size: 13px; font-weight: 700; color: #222; }
  .card-drawing {
    display: flex; justify-content: center; align-items: center;
    padding: 12px; background: #fafbfc;
    border-bottom: 1px solid #f0f0f0;
  }
  .card-dims { padding: 10px 12px; }
  .dim-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 6px;
  }
  .dim-label { font-size: 10px; color: #888; font-weight: 700; text-transform: uppercase; }
  .dim-vals { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
  .luce { font-size: 13px; font-weight: 800; color: #222; }
  .taglio { font-size: 11px; font-weight: 600; color: #1565C0; }
  .card-style {
    margin: 0 12px 8px; padding: 4px 8px;
    background: #e3f2fd; border-radius: 6px;
    font-size: 10px; color: #1565C0; font-weight: 700;
    text-align: center; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .card-note {
    margin: 0 12px 8px; font-size: 10px; color: #666;
    background: #fffde7; padding: 6px 8px; border-radius: 6px;
    border-left: 3px solid #FFC107;
  }
  .card-photos { margin: 0 12px 10px; font-size: 10px; color: #888; }

  .footer {
    margin-top: 28px; text-align: center;
    font-size: 10px; color: #bbb;
    border-top: 1px solid #e0e0e0; padding-top: 12px;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">RILIEVO MISURE</div>
    <div class="header-sub">${project.name}</div>
    ${project.clientName ? `<div style="margin-top:8px;font-size:14px;font-weight:700;">${project.clientName}</div>` : ''}
    ${project.address ? `<div style="font-size:12px;opacity:0.8;margin-top:2px;">📍 ${project.address}</div>` : ''}
  </div>
  <div class="header-meta">
    ${date}<br/>
    <div class="header-badge">${project.openings.length} apertur${project.openings.length === 1 ? 'a' : 'e'}</div>
  </div>
</div>

<div class="stats-row">
  <div class="stat-box"><div class="stat-num">${project.openings.length}</div><div class="stat-lbl">Totale</div></div>
  <div class="stat-box"><div class="stat-num">${nWindows}</div><div class="stat-lbl">Finestre</div></div>
  <div class="stat-box"><div class="stat-num">${nDoors}</div><div class="stat-lbl">Porte</div></div>
  <div class="stat-box"><div class="stat-num">${nShutters}</div><div class="stat-lbl">Persiane</div></div>
  <div class="stat-box"><div class="stat-num">${nRollers}</div><div class="stat-lbl">Monoblocchi</div></div>
</div>

<div class="tol-row">
  <div class="tol-box"><div class="tol-val">${toleranceW}</div><div class="tol-lbl">Tol. larghezza (mm)</div></div>
  <div class="tol-box"><div class="tol-val">${toleranceH}</div><div class="tol-lbl">Tol. altezza (mm)</div></div>
</div>

<div class="section-title">Dettaglio aperture</div>
<div class="grid">
  ${cards}
</div>

<div class="footer">
  Generato con Presa Misure · ${new Date().toLocaleString('it-IT')}
</div>

</body>
</html>`;
}

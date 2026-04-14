import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;

// ─── Colors ──────────────────────────────────────────────────────────────────
const AL = '#b8c4ce', ALS = '#556677';
const TB = '#e8a040', TBS = '#c07020';
const GL = 'rgba(176,213,232,0.65)', GLS = '#7aafc8';

// ─── SVG helpers ─────────────────────────────────────────────────────────────
function rc(x:number,y:number,w:number,h:number,fill:string,stroke:string,sw=1):string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0,w).toFixed(1)}" height="${Math.max(0,h).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

// ─── Profile specifications (SVG units, proportional to real mm) ──────────────
// fo=frame outer AL, ftb=frame thermal break, fi=frame inner AL
// so=sash outer AL, stb=sash thermal break, si=sash inner AL
// gl=glass width per leaf (base), hps=gold accent, sliding=rail type
interface Spec {
  fo:number; ftb:number; fi:number;
  so:number; stb:number; si:number;
  gl:number;
  label:string;
  hps?:boolean;
  sliding?:boolean;
}

const SPECS: Record<string,Spec> = {
  '40TINO':        { fo:12,ftb:0,fi:8,  so:8, stb:0,si:8,  gl:14, label:'40 mm — Senza taglio termico' },
  'EKU 53':        { fo:10,ftb:4,fi:8,  so:8, stb:3,si:8,  gl:12, label:'EKU 53 — TB Poliammide' },
  'EKU 66 TT':     { fo:12,ftb:5,fi:10, so:9, stb:4,si:9,  gl:14, label:'EKU 66 TT — Doppio TB' },
  'EKU 66 TT HPS': { fo:12,ftb:5,fi:10, so:9, stb:4,si:9,  gl:14, label:'EKU 66 TT HPS', hps:true },
  'EKOS 100':      { fo:14,ftb:6,fi:12, so:10,stb:5,si:10, gl:16, label:'EKOS 100 — 100 mm TB' },
  'EKOS 150':      { fo:18,ftb:8,fi:14, so:12,stb:6,si:12, gl:18, label:'EKOS 150 — 150 mm Alta Isolamento' },
  'GOLD 650 ST':   { fo:8, ftb:0,fi:6,  so:8, stb:4,si:8,  gl:32, label:'GOLD 650 ST — Alzante Scorrevole', sliding:true },
  'PE 60 SLIDE':   { fo:8, ftb:0,fi:6,  so:8, stb:3,si:8,  gl:28, label:'PE 60 SLIDE — Scorrevole', sliding:true },
  'Altro':         { fo:10,ftb:0,fi:6,  so:8, stb:0,si:8,  gl:14, label:'Profilo generico' },
};

// ─── SVG generator ───────────────────────────────────────────────────────────
function buildSVG(series:string, n:number, winW:number|null): { xml:string; vbW:number } | null {
  const spec = SPECS[series];
  if (!spec) return null;

  const { fo,ftb,fi,so,stb,si,gl:GL_W,label,hps,sliding } = spec;

  const PAD = 3;
  const VBH = 70;
  const FY = 9, FH = VBH - FY - 11; // frame area top+height
  const SY = FY + 3, SH = FH - 6;   // sash inset
  const GY = FY + 5, GH = FH - 10;  // glass inset

  const frameW = fo + ftb + fi;
  const leafW  = so + stb + si + GL_W + si + stb + so;
  const meetW  = so; // meeting rail: one extra sashOuter width between leaves

  // Total viewBox width
  let vbW: number;
  if (sliding) {
    // Two sashes overlapping on rail: front sash + overlap + back sash
    vbW = PAD + frameW + leafW + so + leafW + frameW + PAD;
  } else {
    vbW = PAD + frameW + n * leafW + Math.max(0, n-1) * meetW + frameW + PAD;
  }

  const pid = `pr_${series.replace(/[\s]/g,'_')}`;
  const cx = vbW / 2;

  let s = `<svg viewBox="0 0 ${vbW.toFixed(1)} ${VBH}" xmlns="http://www.w3.org/2000/svg">`;

  // AL hatch pattern
  s += `<defs>
    <pattern id="${pid}" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="${AL}"/>
      <line x1="0" y1="4" x2="4" y2="0" stroke="${ALS}" stroke-width="0.6"/>
    </pattern>
  </defs>`;

  // HPS gold accent lines
  if (hps) {
    s += `<line x1="0" y1="${FY}" x2="${vbW}" y2="${FY}" stroke="#c8a020" stroke-width="1.5"/>`;
    s += `<line x1="0" y1="${FY+FH}" x2="${vbW}" y2="${FY+FH}" stroke="#c8a020" stroke-width="1.5"/>`;
  }

  // Label top
  s += `<text x="${cx}" y="7.5" text-anchor="middle" font-size="5.5" fill="#778" font-family="sans-serif">${label}</text>`;

  let x = PAD;

  // ── Left outer frame ──────────────────────────────────────────────────────
  s += rc(x, FY, fo, FH, `url(#${pid})`, ALS); x += fo;
  if (ftb > 0) { s += rc(x, FY+3, ftb, FH-6, TB, TBS, 0.8); x += ftb; }
  s += rc(x, FY, fi, FH, `url(#${pid})`, ALS); x += fi;

  if (sliding) {
    // ── Sliding: back sash (fixed, set back slightly) ─────────────────────
    const bx = x + so; // offset back sash
    s += rc(bx,    SY+2, so, SH-4, `url(#${pid})`, ALS);
    if (stb>0) s += rc(bx+so, SY+4, stb, SH-8, TB, TBS, 0.8);
    s += rc(bx+so+stb, SY+2, si, SH-4, `url(#${pid})`, ALS);
    s += rc(bx+so+stb+si, GY+3, GL_W*2, GH-6, GL, GLS, 0.7);
    s += rc(bx+so+stb+si+GL_W*2, SY+2, si, SH-4, `url(#${pid})`, ALS);
    if (stb>0) s += rc(bx+so+stb+si*2+GL_W*2, SY+4, stb, SH-8, TB, TBS, 0.8);
    s += rc(bx+so+stb*2+si*2+GL_W*2, SY+2, so, SH-4, `url(#${pid})`, ALS);

    // Front sash (movable)
    s += rc(x, SY, so, SH, `url(#${pid})`, ALS, 1.5);
    if (stb>0) s += rc(x+so, SY+2, stb, SH-4, TB, TBS, 0.8);
    s += rc(x+so+stb, SY, si, SH, `url(#${pid})`, ALS);
    s += rc(x+so+stb+si, GY, GL_W*2, GH, GL, GLS, 0.8);
    s += rc(x+so+stb+si+GL_W*2, SY, si, SH, `url(#${pid})`, ALS);
    if (stb>0) s += rc(x+so+stb+si*2+GL_W*2, SY+2, stb, SH-4, TB, TBS, 0.8);
    s += rc(x+so+stb*2+si*2+GL_W*2, SY, so, SH, `url(#${pid})`, ALS, 1.5);

    // Rail bar bottom
    const railY = FY + FH - 3;
    s += rc(PAD+frameW, railY, vbW-frameW*2-PAD*2, 4, `url(#${pid})`, ALS, 0.7);

    // Slide arrow
    const arrowMid = x + so + stb + si + GL_W;
    s += `<line x1="${arrowMid}" y1="${railY+8}" x2="${arrowMid+GL_W}" y2="${railY+8}" stroke="#1565C0" stroke-width="1.2"/>`;
    s += `<polygon points="${arrowMid-4},${railY+8} ${arrowMid+2},${railY+5} ${arrowMid+2},${railY+11}" fill="#1565C0"/>`;

    x = vbW - PAD - frameW;
  } else {
    // ── Casement leaves ───────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      // Sash outer (hinge side or outer edge)
      s += rc(x, SY, so, SH, `url(#${pid})`, ALS, 1.5); x += so;
      // Thermal break
      if (stb > 0) { s += rc(x, SY+2, stb, SH-4, TB, TBS, 0.8); x += stb; }
      // Sash inner
      s += rc(x, SY, si, SH, `url(#${pid})`, ALS); x += si;
      // Glass
      s += rc(x, GY, GL_W, GH, GL, GLS, 0.8); x += GL_W;
      // Sash inner right
      s += rc(x, SY, si, SH, `url(#${pid})`, ALS); x += si;
      // Thermal break right
      if (stb > 0) { s += rc(x, SY+2, stb, SH-4, TB, TBS, 0.8); x += stb; }
      // Sash outer right (handle/meeting side)
      s += rc(x, SY, so, SH, `url(#${pid})`, ALS, 1.5); x += so;

      // Dashed divider between leaves
      if (i < n - 1) {
        s += `<line x1="${(x - 0.5).toFixed(1)}" y1="${SY}" x2="${(x - 0.5).toFixed(1)}" y2="${SY+SH}" stroke="${ALS}" stroke-width="0.5" stroke-dasharray="3,2"/>`;
      }
    }
  }

  // ── Right outer frame ─────────────────────────────────────────────────────
  s += rc(x, FY, fi, FH, `url(#${pid})`, ALS); x += fi;
  if (ftb > 0) { s += rc(x, FY+3, ftb, FH-6, TB, TBS, 0.8); x += ftb; }
  s += rc(x, FY, fo, FH, `url(#${pid})`, ALS);

  // ── Bottom annotation ─────────────────────────────────────────────────────
  const lblY = VBH - 2;
  if (winW) {
    s += `<line x1="${PAD}" y1="${lblY-5}" x2="${vbW-PAD}" y2="${lblY-5}" stroke="#E53935" stroke-width="0.7"/>`;
    s += `<text x="${cx}" y="${lblY}" text-anchor="middle" font-size="6.5" fill="#E53935" font-family="sans-serif" font-weight="700">${winW} mm</text>`;
  } else {
    const nLabel = n === 1 ? '1 anta' : `${n} ante`;
    s += `<text x="${cx}" y="${lblY}" text-anchor="middle" font-size="6" fill="#aaa" font-family="sans-serif">${nLabel}</text>`;
  }

  s += '</svg>';
  return { xml: s, vbW };
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  profileSeries: string | null;
  leafCount?: number | null;
  width?: number | null;
}

export default function ProfileSection({ profileSeries, leafCount, width }: Props) {
  if (!profileSeries) return null;
  const spec = SPECS[profileSeries];
  if (!spec) return null;

  const n = Math.max(1, leafCount ?? 1);
  const result = buildSVG(profileSeries, n, width ?? null);
  if (!result) return null;

  const { xml, vbW } = result;
  const maxW = SCREEN_W - 48;
  const displayH = 70;
  const displayW = Math.min(maxW, Math.round((vbW / 70) * displayH));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sezione trasversale</Text>
      <View style={styles.svgWrap}>
        <SvgXml xml={xml} width={displayW} height={displayH}/>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor:'#b8c4ce', borderColor:'#556677' }]}/>
          <Text style={styles.legendText}>Alluminio</Text>
        </View>
        {(spec.ftb > 0 || spec.stb > 0) && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor:'#e8a040', borderColor:'#c07020' }]}/>
            <Text style={styles.legendText}>Taglio termico</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor:'rgba(176,213,232,0.8)', borderColor:'#7aafc8' }]}/>
          <Text style={styles.legendText}>Vetro</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1, borderColor: '#DDE4EC',
    padding: 10, marginTop: 8,
  },
  title: {
    fontSize: 10, fontWeight: '700', color: '#556677',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  svgWrap: {
    alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 6, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E0E8F0',
  },
  legend: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 2, borderWidth: 1 },
  legendText: { fontSize: 9, color: '#778', fontWeight: '600' },
});

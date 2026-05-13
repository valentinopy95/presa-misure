import AsyncStorage from '@react-native-async-storage/async-storage';
import { OpeningStyle } from '../types';
import { supabase } from '../lib/supabase';
import { getCurrentIds } from './database';

// ─── Cloud sync impostazioni (debounced) ─────────────────────────────────────

const SETTINGS_MIGRATED_KEY = '@settings_migrated_v1';

// Chiavi AsyncStorage da sincronizzare con company_settings (literal per evitare TDZ)
const SYNC_KEYS = [
  '@measure_tolerance_by_type',
  '@measure_bar_length', '@measure_kerf_90', '@measure_safety_margin', '@measure_slat_pitch',
  '@measure_zoccolo_h', '@measure_fascia_h', '@measure_anta_reduction', '@measure_anta_top_rail',
  '@measure_riattestattura', '@measure_dim_mode',
  '@measure_price_interni', '@measure_price_persiane', '@measure_price_controtelai',
  '@measure_price_zanzariere', '@measure_price_monoblocchi',
  '@measure_detailed_prices', '@measure_presets', '@measure_default_series_id',
] as const;

let _flushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSettingsSync(): void {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(syncAllSettingsToCloud, 1500);
}

export async function syncAllSettingsToCloud(): Promise<void> {
  _flushTimer = null;
  const ids = await getCurrentIds();
  if (!ids) return;
  try {
    const pairs = await AsyncStorage.multiGet([...SYNC_KEYS]);
    const settings: Record<string, string> = {};
    for (const [k, v] of pairs) { if (v != null) settings[k] = v; }
    if (Object.keys(settings).length === 0) return;
    await supabase.from('company_settings').upsert({
      company_id: ids.companyId,
      settings,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

/** Carica le impostazioni dal cloud e le applica localmente (richiamata al login). */
export async function loadSettingsFromCloud(): Promise<void> {
  const ids = await getCurrentIds();
  if (!ids) return;
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('settings')
      .eq('company_id', ids.companyId)
      .single();
    if (error || !data?.settings) return;
    const settings = data.settings as Record<string, string>;
    const pairs = Object.entries(settings).filter(([, v]) => v != null) as [string, string][];
    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
  } catch {}
}

/** Migrazione locale → cloud (una tantum per dispositivo, solo se cloud è vuoto). */
export async function migrateSettingsToSupabase(): Promise<void> {
  const already = await AsyncStorage.getItem(SETTINGS_MIGRATED_KEY);
  if (already) return;
  const ids = await getCurrentIds();
  if (!ids) return;
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('settings')
      .eq('company_id', ids.companyId)
      .single();
    if (!data?.settings || Object.keys(data.settings).length === 0) {
      await syncAllSettingsToCloud();
    }
  } catch {}
  await AsyncStorage.setItem(SETTINGS_MIGRATED_KEY, '1');
}

export const KEYS = {
  ROLE:            '@measure_user_role',
  TOLERANCE_W:     '@measure_tolerance_w',
  TOLERANCE_H:     '@measure_tolerance_h',
  RIATTESTATTURA:  '@measure_riattestattura',
  DIM_MODE:        '@measure_dim_mode',
  BAR_LENGTH:      '@measure_bar_length',
  KERF_90:         '@measure_kerf_90',
  SAFETY_MARGIN:   '@measure_safety_margin',
  SLAT_PITCH:      '@measure_slat_pitch',
  ZOCCOLO_H:       '@measure_zoccolo_h',
  FASCIA_H:          '@measure_fascia_h',
  ANTA_REDUCTION:    '@measure_anta_reduction',
  ANTA_TOP_RAIL:     '@measure_anta_top_rail',
  TUTORIAL_SHOWN:    '@measure_tutorial_shown',
  PRICE_INTERNI:     '@measure_price_interni',
  PRICE_PERSIANE:    '@measure_price_persiane',
  PRICE_CONTROTELAI: '@measure_price_controtelai',
  PRICE_ZANZARIERE:  '@measure_price_zanzariere',
  PRICE_MONOBLOCCHI: '@measure_price_monoblocchi',
} as const;

export interface PriceConfig {
  interni:     number;
  persiane:    number;
  controtelai: number;
  zanzariere:  number;
  monoblocchi: number;
}

export const DEFAULT_TOLERANCE_W    = 10;
export const DEFAULT_TOLERANCE_H    = 10;

// ─── Tolleranze per tipo apertura ────────────────────────────────────────────

export type ToleranceType = 'finestre' | 'porte' | 'persiane' | 'zanzariere';

export interface TolerancePair { w: number; h: number; }

export interface ToleranceByType {
  finestre:   TolerancePair;
  porte:      TolerancePair;
  persiane:   TolerancePair;
  zanzariere: TolerancePair;
}

const TOL_KEY = '@measure_tolerance_by_type';

const DEFAULT_TOL_BY_TYPE: ToleranceByType = {
  finestre:   { w: 10, h: 10 },
  porte:      { w: 10, h: 10 },
  persiane:   { w: 10, h: 10 },
  zanzariere: { w: 10, h: 10 },
};

export async function getToleranceByType(): Promise<ToleranceByType> {
  try {
    const raw = await AsyncStorage.getItem(TOL_KEY);
    if (!raw) return { ...DEFAULT_TOL_BY_TYPE };
    const parsed = JSON.parse(raw) as Partial<ToleranceByType>;
    return {
      finestre:   { ...DEFAULT_TOL_BY_TYPE.finestre,   ...(parsed.finestre   ?? {}) },
      porte:      { ...DEFAULT_TOL_BY_TYPE.porte,      ...(parsed.porte      ?? {}) },
      persiane:   { ...DEFAULT_TOL_BY_TYPE.persiane,   ...(parsed.persiane   ?? {}) },
      zanzariere: { ...DEFAULT_TOL_BY_TYPE.zanzariere, ...(parsed.zanzariere ?? {}) },
    };
  } catch { return { ...DEFAULT_TOL_BY_TYPE }; }
}

export async function setToleranceByType(t: ToleranceByType): Promise<void> {
  await AsyncStorage.setItem(TOL_KEY, JSON.stringify(t));
  scheduleSettingsSync();
}

/** Ritorna la coppia W/H corretta per lo stile apertura dato */
export function toleranceForStyle(style: string | null, config: ToleranceByType): TolerancePair {
  if (!style) return config.finestre;
  if (style.startsWith('window') || style === 'window_fixed') return config.finestre;
  if (style.startsWith('door'))    return config.porte;
  if (style.startsWith('shutter')) return config.persiane;
  if (style.startsWith('mosquito')) return config.zanzariere;
  return config.finestre;
}
export const DEFAULT_RIATTESTATTURA = 25;
export const DEFAULT_BAR_LENGTH     = 6400;
export const DEFAULT_KERF_90        = 4;
export const DEFAULT_SAFETY_MARGIN  = 5;
export const DEFAULT_SLAT_PITCH     = 55;
export const DEFAULT_ZOCCOLO_H         = 110;  // fisso, non esposto in UI
export const DEFAULT_FASCIA_H          = 994;  // posizione centro fascia dal basso (mm)
export const DEFAULT_ANTA_TOP_RAIL     = 68;
export const DEFAULT_ANTA_REDUCTION    = 0;

export async function getToleranceW(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.TOLERANCE_W);
  if (!raw) return DEFAULT_TOLERANCE_W;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_TOLERANCE_W : n;
}
export async function setToleranceW(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOLERANCE_W, String(mm));
  scheduleSettingsSync();
}

export async function getToleranceH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.TOLERANCE_H);
  if (!raw) return DEFAULT_TOLERANCE_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_TOLERANCE_H : n;
}
export async function setToleranceH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOLERANCE_H, String(mm));
  scheduleSettingsSync();
}

export async function getRiattestattura(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.RIATTESTATTURA);
  if (!raw) return DEFAULT_RIATTESTATTURA;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_RIATTESTATTURA : n;
}
export async function setRiattestattura(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.RIATTESTATTURA, String(mm));
  scheduleSettingsSync();
}

export async function getBarLength(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.BAR_LENGTH);
  if (!raw) return DEFAULT_BAR_LENGTH;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_BAR_LENGTH : n;
}
export async function setBarLength(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.BAR_LENGTH, String(mm));
  scheduleSettingsSync();
}

export async function getKerf90(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.KERF_90);
  if (!raw) return DEFAULT_KERF_90;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_KERF_90 : n;
}
export async function setKerf90(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.KERF_90, String(mm));
  scheduleSettingsSync();
}

export async function getSafetyMargin(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.SAFETY_MARGIN);
  if (!raw) return DEFAULT_SAFETY_MARGIN;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_SAFETY_MARGIN : n;
}
export async function setSafetyMargin(pct: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SAFETY_MARGIN, String(pct));
  scheduleSettingsSync();
}

export async function getSlatPitch(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.SLAT_PITCH);
  if (!raw) return DEFAULT_SLAT_PITCH;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_SLAT_PITCH : n;
}
export async function setSlatPitch(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SLAT_PITCH, String(mm));
  scheduleSettingsSync();
}

export async function getZoccoloH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ZOCCOLO_H);
  if (!raw) return DEFAULT_ZOCCOLO_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_ZOCCOLO_H : n;
}
export async function setZoccoloH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ZOCCOLO_H, String(mm));
  scheduleSettingsSync();
}

export async function getFasciaH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.FASCIA_H);
  if (!raw) return DEFAULT_FASCIA_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_FASCIA_H : n;
}
export async function setFasciaH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.FASCIA_H, String(mm));
  scheduleSettingsSync();
}

export async function getDimMode(): Promise<'taglio' | 'luce'> {
  const raw = await AsyncStorage.getItem(KEYS.DIM_MODE);
  return raw === 'luce' ? 'luce' : 'taglio';
}
export async function setDimMode(mode: 'taglio' | 'luce'): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIM_MODE, mode);
  scheduleSettingsSync();
}

export async function getAntaReduction(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ANTA_REDUCTION);
  if (!raw) return DEFAULT_ANTA_REDUCTION;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_ANTA_REDUCTION : n;
}
export async function setAntaReduction(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ANTA_REDUCTION, String(mm));
  scheduleSettingsSync();
}

export async function getAntaTopRail(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ANTA_TOP_RAIL);
  if (!raw) return DEFAULT_ANTA_TOP_RAIL;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_ANTA_TOP_RAIL : n;
}
export async function setAntaTopRail(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ANTA_TOP_RAIL, String(mm));
  scheduleSettingsSync();
}

const parsePrice = (raw: string | null): number => {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) || n < 0 ? 0 : n;
};
const KEY_MAP: Record<keyof PriceConfig, string> = {
  interni:     KEYS.PRICE_INTERNI,
  persiane:    KEYS.PRICE_PERSIANE,
  controtelai: KEYS.PRICE_CONTROTELAI,
  zanzariere:  KEYS.PRICE_ZANZARIERE,
  monoblocchi: KEYS.PRICE_MONOBLOCCHI,
};
export async function getPrices(): Promise<PriceConfig> {
  const [a,b,c,d,e] = await Promise.all([
    AsyncStorage.getItem(KEYS.PRICE_INTERNI),
    AsyncStorage.getItem(KEYS.PRICE_PERSIANE),
    AsyncStorage.getItem(KEYS.PRICE_CONTROTELAI),
    AsyncStorage.getItem(KEYS.PRICE_ZANZARIERE),
    AsyncStorage.getItem(KEYS.PRICE_MONOBLOCCHI),
  ]);
  return { interni: parsePrice(a), persiane: parsePrice(b), controtelai: parsePrice(c), zanzariere: parsePrice(d), monoblocchi: parsePrice(e) };
}
export async function setPrice(key: keyof PriceConfig, value: number): Promise<void> {
  await AsyncStorage.setItem(KEY_MAP[key], String(value));
  scheduleSettingsSync();
}

export function priceForStyle(style: OpeningStyle | null, prices: PriceConfig): number {
  if (!style) return 0;
  if (style.startsWith('window') || style.startsWith('door')) return prices.interni;
  if (style.startsWith('shutter'))  return prices.persiane;
  if (style === 'roller_blind')     return prices.monoblocchi;
  if (style.startsWith('subframe')) return prices.controtelai;
  if (style.startsWith('mosquito')) return prices.zanzariere;
  return 0;
}

// ─── Prezzi dettagliati per tipologia + numero ante ──────────────────────────

export type DetailedPriceConfig = Record<string, number>;

const DETAILED_PRICES_KEY = '@measure_detailed_prices';

export async function getDetailedPrices(): Promise<DetailedPriceConfig> {
  try {
    const raw = await AsyncStorage.getItem(DETAILED_PRICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function setDetailedPrices(prices: DetailedPriceConfig): Promise<void> {
  await AsyncStorage.setItem(DETAILED_PRICES_KEY, JSON.stringify(prices));
  scheduleSettingsSync();
}

/** Ritorna il prezzo €/m² per lo stile e numero ante dato.
 *  Prova prima `style_leafCount`, poi `style` senza ante (per mosquito/roller/subframe). */
export function priceForStyleDetailed(
  style: string | null,
  leafCount: number | null,
  prices: DetailedPriceConfig,
): number {
  if (!style) return 0;
  const n = leafCount ?? 1;
  const withLeaf = `${style}_${n}`;
  if (prices[withLeaf] > 0) return prices[withLeaf];
  if (prices[style] > 0) return prices[style];
  return 0;
}

export const PRICE_SECTIONS: {
  label: string; color: string;
  items: { key: string; label: string }[];
}[] = [
  {
    label: '🪟 Finestre', color: '#1565C0',
    items: [
      { key: 'window_fixed',       label: 'Fissa' },
      { key: 'window_single_1',    label: 'Battente 1 anta' },
      { key: 'window_double_2',    label: 'Battente 2 ante' },
      { key: 'window_double_3',    label: 'Battente 3 ante' },
      { key: 'window_double_4',    label: 'Battente 4 ante' },
      { key: 'window_tilt_turn_1', label: 'Vasistas/Ribalta 1 anta' },
      { key: 'window_tilt_turn_2', label: 'Vasistas/Ribalta 2 ante' },
      { key: 'window_tilt_turn_3', label: 'Vasistas/Ribalta 3 ante' },
      { key: 'window_tilt_turn_4', label: 'Vasistas/Ribalta 4 ante' },
      { key: 'window_sliding_2',   label: 'Scorrevole 2 ante' },
      { key: 'window_sliding_3',   label: 'Scorrevole 3 ante' },
      { key: 'window_sliding_4',   label: 'Scorrevole 4 ante' },
    ],
  },
  {
    label: '🚪 Porte', color: '#4A148C',
    items: [
      { key: 'door_single_1',   label: 'Battente 1 anta' },
      { key: 'door_single_2',   label: 'Battente 2 ante' },
      { key: 'door_sliding_2',  label: 'Scorrevole 2 ante' },
      { key: 'door_sliding_3',  label: 'Scorrevole 3 ante' },
      { key: 'door_sliding_4',  label: 'Scorrevole 4 ante' },
      { key: 'door_entrance_1', label: 'Ingresso/Blindata 1 anta' },
      { key: 'door_entrance_2', label: 'Ingresso/Blindata 2 ante' },
    ],
  },
  {
    label: '🏠 Persiane', color: '#1B5E20',
    items: [
      { key: 'shutter_single_1', label: '1 anta' },
      { key: 'shutter_double_2', label: '2 ante' },
      { key: 'shutter_double_3', label: '3 ante' },
      { key: 'shutter_double_4', label: '4 ante' },
    ],
  },
  {
    label: '🦟 Zanzariere', color: '#E65100',
    items: [
      { key: 'mosquito_fixed',   label: 'Fissa' },
      { key: 'mosquito_rollup',  label: 'Avvolgibile' },
      { key: 'mosquito_lateral', label: 'Laterale' },
    ],
  },
  {
    label: '📦 Monoblocchi', color: '#37474F',
    items: [{ key: 'roller_blind', label: 'Monoblocco con tapparella' }],
  },
  {
    label: '🔲 Controtelai', color: '#546E7A',
    items: [{ key: 'subframe_window', label: 'Controtelaio' }],
  },
];

export async function getTutorialShown(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.TUTORIAL_SHOWN);
  return raw === 'true';
}
export async function setTutorialShown(): Promise<void> {
  await AsyncStorage.setItem(KEYS.TUTORIAL_SHOWN, 'true');
}

export async function getTourSeen(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`@tour_seen_${key}`);
  return raw === '1';
}
export async function setTourSeen(key: string): Promise<void> {
  await AsyncStorage.setItem(`@tour_seen_${key}`, '1');
}

// Kept for backward compat
export async function getTolerance(): Promise<number> {
  return getToleranceW();
}

// ─── Serie catalogo ───────────────────────────────────────────────────────────

export type PieceOp = '+' | '-' | '÷';

export interface CatalogPiece {
  id:         string;
  name:       string;      // es. "Montanti telaio fisso"
  quantity:   number;      // pezzi per questa configurazione
  baseVar:    'L' | 'H';  // punta corta L o H
  offset:     number;      // legacy – mantenuto per backward compat
  divisor:    number;      // legacy – mantenuto per backward compat
  cutAngle1:  45 | 90;    // angolo lato A
  cutAngle2:  45 | 90;    // angolo lato B
  condition?:     'always' | 'no_soglia' | 'with_soglia'; // default = 'always'
  pieceCategory?: 'telaio' | 'anta' | 'fermavetro' | 'riporto'; // default = 'anta'
  divideFirst?:   boolean; // legacy
  // Nuova formula flessibile: apply(apply(base, op1, val1), op2, val2)
  op1?:  PieceOp;  // primo operatore  (default: '+'/'-' da sign(offset))
  val1?: number;   // primo valore
  op2?:  PieceOp;  // secondo operatore (default: '÷')
  val2?: number;   // secondo valore
}

// Una variante = tabella pezzi per un numero specifico di ante
export interface CatalogVariant {
  id:           string;
  leafCount:    number;       // numero ante: 1, 2, 3, 4, 6, 8...
  pieces:       CatalogPiece[];
  telaiOffset:  number;       // aletta telaio in mm (aggiunta alla misura taglio per traversi e montanti)
  articleCodes?: Partial<Record<'telaio' | 'anta' | 'fermavetro' | 'riporto', string>>; // codice articolo per profilato
}

export interface CatalogSeries {
  id:       string;
  name:     string;
  variants: CatalogVariant[];
}

export const CATALOG_SERIES_KEY = '@measure_catalog_series';
export const DEFAULT_SERIES_KEY = '@measure_default_series_id';

export async function getDefaultCatalogSeriesId(): Promise<string | null> {
  return AsyncStorage.getItem(DEFAULT_SERIES_KEY);
}
export async function setDefaultCatalogSeriesId(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(DEFAULT_SERIES_KEY, id);
  else await AsyncStorage.removeItem(DEFAULT_SERIES_KEY);
  scheduleSettingsSync();
}

// ─── Cache in memoria per le serie ───────────────────────────────────────────

let _seriesCache: CatalogSeries[] | null = null;

export function clearSeriesCache(): void {
  _seriesCache = null;
}

const SERIES_MIGRATED_KEY = '@measure_series_migrated_v1';

// ─── Helpers AsyncStorage (fallback offline / migrazione) ─────────────────────

async function _localGet(): Promise<CatalogSeries[]> {
  const raw = await AsyncStorage.getItem(CATALOG_SERIES_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as any[];
    return list.map(s => {
      if (Array.isArray(s.variants)) return s as CatalogSeries;
      const pieces: CatalogPiece[] = Array.isArray(s.pieces) ? s.pieces.map((p: any) => ({
        ...p,
        cutAngle1: p.cutAngle1 ?? p.cutAngle ?? 45,
        cutAngle2: p.cutAngle2 ?? p.cutAngle ?? 45,
      })) : [];
      return {
        id: s.id,
        name: s.name,
        variants: pieces.length > 0
          ? [{ id: `${s.id}_v1`, leafCount: 1, pieces }]
          : [],
      } as CatalogSeries;
    });
  } catch { return []; }
}

async function _localSave(series: CatalogSeries[]): Promise<void> {
  await AsyncStorage.setItem(CATALOG_SERIES_KEY, JSON.stringify(series));
}

// ─── API pubblica ─────────────────────────────────────────────────────────────

export async function getCatalogSeries(): Promise<CatalogSeries[]> {
  if (_seriesCache !== null) return _seriesCache;

  const ids = await getCurrentIds();
  if (!ids) {
    _seriesCache = await _localGet();
    return _seriesCache;
  }

  const { data, error } = await supabase
    .from('catalog_series')
    .select('data')
    .eq('company_id', ids.companyId);

  if (error || !data) {
    _seriesCache = await _localGet();
    return _seriesCache;
  }

  _seriesCache = data.map(row => row.data as CatalogSeries);
  return _seriesCache;
}

export async function upsertCatalogSeries(s: CatalogSeries): Promise<void> {
  // Aggiorna cache ottimisticamente
  if (_seriesCache !== null) {
    const idx = _seriesCache.findIndex(x => x.id === s.id);
    if (idx >= 0) _seriesCache[idx] = s;
    else _seriesCache.push(s);
  }

  const ids = await getCurrentIds();
  if (!ids) {
    const local = await _localGet();
    const idx = local.findIndex(x => x.id === s.id);
    if (idx >= 0) local[idx] = s; else local.push(s);
    await _localSave(local);
    return;
  }

  await supabase.from('catalog_series').upsert({
    id:         s.id,
    company_id: ids.companyId,
    user_id:    ids.userId,
    data:       s,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteCatalogSeries(id: string): Promise<void> {
  if (_seriesCache !== null) _seriesCache = _seriesCache.filter(s => s.id !== id);

  const ids = await getCurrentIds();
  if (!ids) {
    await _localSave((await _localGet()).filter(s => s.id !== id));
    return;
  }

  await supabase.from('catalog_series').delete().eq('id', id);
}

export async function upsertCatalogVariant(seriesId: string, variant: CatalogVariant): Promise<void> {
  const series = await getCatalogSeries();
  const sIdx = series.findIndex(s => s.id === seriesId);
  if (sIdx < 0) return;
  const updated = { ...series[sIdx], variants: [...series[sIdx].variants] };
  const vIdx = updated.variants.findIndex(v => v.id === variant.id);
  if (vIdx >= 0) updated.variants[vIdx] = variant;
  else updated.variants.push(variant);
  await upsertCatalogSeries(updated);
}

export async function deleteCatalogVariant(seriesId: string, variantId: string): Promise<void> {
  const series = await getCatalogSeries();
  const sIdx = series.findIndex(s => s.id === seriesId);
  if (sIdx < 0) return;
  const updated = { ...series[sIdx], variants: series[sIdx].variants.filter(v => v.id !== variantId) };
  await upsertCatalogSeries(updated);
}

// Kept for backward compat — non usata internamente ma esposta
export async function saveCatalogSeries(series: CatalogSeries[]): Promise<void> {
  _seriesCache = [...series];
  const ids = await getCurrentIds();
  if (!ids) { await _localSave(series); return; }
  for (const s of series) {
    await supabase.from('catalog_series').upsert({
      id:         s.id,
      company_id: ids.companyId,
      user_id:    ids.userId,
      data:       s,
      updated_at: new Date().toISOString(),
    });
  }
}

// ─── Migrazione AsyncStorage → Supabase (una tantum) ─────────────────────────

export async function migrateSeriesToSupabase(): Promise<void> {
  const already = await AsyncStorage.getItem(SERIES_MIGRATED_KEY);
  if (already) return;

  const ids = await getCurrentIds();
  if (!ids) return;

  const local = await _localGet();
  if (local.length > 0) {
    const { data } = await supabase
      .from('catalog_series')
      .select('id')
      .eq('company_id', ids.companyId)
      .limit(1);

    if (!data || data.length === 0) {
      for (const s of local) {
        await supabase.from('catalog_series').upsert({
          id:         s.id,
          company_id: ids.companyId,
          user_id:    ids.userId,
          data:       s,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  _seriesCache = null; // forza rilettura da Supabase al prossimo accesso
  await AsyncStorage.setItem(SERIES_MIGRATED_KEY, '1');
}

// Trova la variante più adatta per un dato numero di ante
export function findBestVariant(series: CatalogSeries, leafCount: number | null): CatalogVariant | null {
  if (!series.variants.length) return null;
  if (!leafCount) return series.variants[0];
  const exact = series.variants.find(v => v.leafCount === leafCount);
  if (exact) return exact;
  // Usa la variante con leafCount più vicino
  return series.variants.reduce((best, v) =>
    Math.abs(v.leafCount - leafCount) < Math.abs(best.leafCount - leafCount) ? v : best
  );
}

// ─── Preset impostazioni ──────────────────────────────────────────────────────

export const PRESETS_KEY = '@measure_presets';

export interface SettingsPreset {
  id: string;
  name: string;
  toleranceW: number;
  toleranceH: number;
  riattestattura: number;
  barLength: number;
  kerf90: number;
  safetyMarginPct: number;
  slatPitch: number;
  zoccoloH: number;
  fasciaH: number;
  antaTopRail: number;
  antaReduction: number;
  // Prezzi al m² (opzionali per retrocompat con preset salvati precedentemente)
  priceInterni?:     number;
  pricePersiane?:    number;
  priceControtelai?: number;
  priceZanzariere?:  number;
  priceMonoblocchi?: number;
}

export async function getPresets(): Promise<SettingsPreset[]> {
  const raw = await AsyncStorage.getItem(PRESETS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as SettingsPreset[]; }
  catch { return []; }
}

export async function savePresets(presets: SettingsPreset[]): Promise<void> {
  await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  scheduleSettingsSync();
}

export async function addPreset(preset: SettingsPreset): Promise<void> {
  const existing = await getPresets();
  await savePresets([...existing, preset]);
}

export async function deletePreset(id: string): Promise<SettingsPreset[]> {
  const existing = await getPresets();
  const updated = existing.filter(p => p.id !== id);
  await savePresets(updated);
  return updated;
}

export async function renamePreset(id: string, newName: string): Promise<SettingsPreset[]> {
  const existing = await getPresets();
  const updated = existing.map(p => p.id === id ? { ...p, name: newName } : p);
  await savePresets(updated);
  return updated;
}

export async function applyPreset(preset: SettingsPreset): Promise<void> {
  await Promise.all([
    setToleranceW(preset.toleranceW),
    setToleranceH(preset.toleranceH),
    setRiattestattura(preset.riattestattura),
    setBarLength(preset.barLength),
    setKerf90(preset.kerf90),
    setSafetyMargin(preset.safetyMarginPct),
    setSlatPitch(preset.slatPitch),
    setZoccoloH(preset.zoccoloH),
    setFasciaH(preset.fasciaH),
    setAntaTopRail(preset.antaTopRail ?? DEFAULT_ANTA_TOP_RAIL),
    setAntaReduction(preset.antaReduction),
    setPrice('interni',     preset.priceInterni     ?? 0),
    setPrice('persiane',    preset.pricePersiane    ?? 0),
    setPrice('controtelai', preset.priceControtelai ?? 0),
    setPrice('zanzariere',  preset.priceZanzariere  ?? 0),
    setPrice('monoblocchi', preset.priceMonoblocchi ?? 0),
  ]);
}

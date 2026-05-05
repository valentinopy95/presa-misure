import AsyncStorage from '@react-native-async-storage/async-storage';
import { OpeningStyle } from '../types';

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
}

export async function getToleranceH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.TOLERANCE_H);
  if (!raw) return DEFAULT_TOLERANCE_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_TOLERANCE_H : n;
}
export async function setToleranceH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TOLERANCE_H, String(mm));
}

export async function getRiattestattura(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.RIATTESTATTURA);
  if (!raw) return DEFAULT_RIATTESTATTURA;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_RIATTESTATTURA : n;
}
export async function setRiattestattura(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.RIATTESTATTURA, String(mm));
}

export async function getBarLength(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.BAR_LENGTH);
  if (!raw) return DEFAULT_BAR_LENGTH;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_BAR_LENGTH : n;
}
export async function setBarLength(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.BAR_LENGTH, String(mm));
}

export async function getKerf90(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.KERF_90);
  if (!raw) return DEFAULT_KERF_90;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_KERF_90 : n;
}
export async function setKerf90(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.KERF_90, String(mm));
}

export async function getSafetyMargin(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.SAFETY_MARGIN);
  if (!raw) return DEFAULT_SAFETY_MARGIN;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_SAFETY_MARGIN : n;
}
export async function setSafetyMargin(pct: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SAFETY_MARGIN, String(pct));
}

export async function getSlatPitch(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.SLAT_PITCH);
  if (!raw) return DEFAULT_SLAT_PITCH;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_SLAT_PITCH : n;
}
export async function setSlatPitch(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SLAT_PITCH, String(mm));
}

export async function getZoccoloH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ZOCCOLO_H);
  if (!raw) return DEFAULT_ZOCCOLO_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_ZOCCOLO_H : n;
}
export async function setZoccoloH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ZOCCOLO_H, String(mm));
}

export async function getFasciaH(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.FASCIA_H);
  if (!raw) return DEFAULT_FASCIA_H;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? DEFAULT_FASCIA_H : n;
}
export async function setFasciaH(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.FASCIA_H, String(mm));
}

export async function getDimMode(): Promise<'taglio' | 'luce'> {
  const raw = await AsyncStorage.getItem(KEYS.DIM_MODE);
  return raw === 'luce' ? 'luce' : 'taglio';
}
export async function setDimMode(mode: 'taglio' | 'luce'): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIM_MODE, mode);
}

export async function getAntaReduction(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ANTA_REDUCTION);
  if (!raw) return DEFAULT_ANTA_REDUCTION;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_ANTA_REDUCTION : n;
}
export async function setAntaReduction(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ANTA_REDUCTION, String(mm));
}

export async function getAntaTopRail(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.ANTA_TOP_RAIL);
  if (!raw) return DEFAULT_ANTA_TOP_RAIL;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? DEFAULT_ANTA_TOP_RAIL : n;
}
export async function setAntaTopRail(mm: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ANTA_TOP_RAIL, String(mm));
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

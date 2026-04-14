import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  ROLE:            '@measure_user_role',
  TOLERANCE_W:     '@measure_tolerance_w',
  TOLERANCE_H:     '@measure_tolerance_h',
  RIATTESTATTURA:  '@measure_riattestattura',
  DIM_MODE:        '@measure_dim_mode',
} as const;

export const DEFAULT_TOLERANCE_W = 10;
export const DEFAULT_TOLERANCE_H = 10;
export const DEFAULT_RIATTESTATTURA = 25;

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

export async function getDimMode(): Promise<'taglio' | 'luce'> {
  const raw = await AsyncStorage.getItem(KEYS.DIM_MODE);
  return raw === 'luce' ? 'luce' : 'taglio';
}

export async function setDimMode(mode: 'taglio' | 'luce'): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIM_MODE, mode);
}

// Kept for backward compat — reads toleranceW
export async function getTolerance(): Promise<number> {
  return getToleranceW();
}

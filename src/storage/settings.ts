import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  ROLE:        '@measure_user_role',
  TOLERANCE_W: '@measure_tolerance_w',
  TOLERANCE_H: '@measure_tolerance_h',
} as const;

export const DEFAULT_TOLERANCE_W = 10;
export const DEFAULT_TOLERANCE_H = 10;

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

// Kept for backward compat — reads toleranceW
export async function getTolerance(): Promise<number> {
  return getToleranceW();
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@offcuts_stock';

export type OffcutsStock = Record<string, number[]>;

export async function getOffcutsStock(): Promise<OffcutsStock> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function saveOffcutsStock(stock: OffcutsStock): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(stock));
}

export async function clearOffcutsStock(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

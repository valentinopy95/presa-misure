import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { getCurrentIds } from './database';

const LOCAL_KEY    = '@magazzino_v1';
const MIGRATED_KEY = '@magazzino_migrated_v1';

export interface MagazzinoItem {
  id:          string;
  articleCode: string;   // codice articolo es. "EK100-T"
  label:       string;   // descrizione es. "Telaio EKOS 100"
  offcuts:     number[]; // avanzi in mm
}

export function emptyItem(): MagazzinoItem {
  return { id: uuidv4(), articleCode: '', label: '', offcuts: [] };
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function remoteGet(companyId: string): Promise<MagazzinoItem[] | null> {
  const { data, error } = await supabase
    .from('magazzino')
    .select('items')
    .eq('company_id', companyId)
    .single();
  if (error?.code === 'PGRST116') return [];  // nessuna riga ancora
  if (error || !data) return null;
  return data.items as MagazzinoItem[];
}

async function remoteSet(companyId: string, items: MagazzinoItem[]): Promise<void> {
  await supabase.from('magazzino').upsert({
    company_id: companyId,
    items,
    updated_at: new Date().toISOString(),
  });
}

// ─── Migrazione locale → Supabase (una tantum per dispositivo) ───────────────

export async function migrateMagazzinoToSupabase(): Promise<void> {
  const already = await AsyncStorage.getItem(MIGRATED_KEY);
  if (already) return;

  const ids = await getCurrentIds();
  if (!ids) return;

  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (raw) {
      const local = JSON.parse(raw) as MagazzinoItem[];
      if (local.length > 0) {
        const remote = await remoteGet(ids.companyId);
        // Carica solo se il cloud è ancora vuoto
        if (remote !== null && remote.length === 0) {
          await remoteSet(ids.companyId, local);
        }
      }
    }
  } catch {}

  await AsyncStorage.setItem(MIGRATED_KEY, '1');
}

// ─── API pubblica ─────────────────────────────────────────────────────────────

export async function getMagazzino(): Promise<MagazzinoItem[]> {
  const ids = await getCurrentIds();
  if (ids) {
    const remote = await remoteGet(ids.companyId);
    if (remote !== null) {
      // Aggiorna cache locale
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
      return remote;
    }
  }
  // Fallback locale (offline)
  const raw = await AsyncStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as MagazzinoItem[]; } catch { return []; }
}

export async function saveMagazzino(items: MagazzinoItem[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  const ids = await getCurrentIds();
  if (ids) await remoteSet(ids.companyId, items);
}

export async function upsertMagazzinoItem(item: MagazzinoItem): Promise<void> {
  const list = await getMagazzino();
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) list[idx] = item; else list.push(item);
  await saveMagazzino(list);
}

export async function deleteMagazzinoItem(id: string): Promise<void> {
  const list = await getMagazzino();
  await saveMagazzino(list.filter(x => x.id !== id));
}

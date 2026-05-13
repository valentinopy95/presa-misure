import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCurrentIds } from './database';

const ORDERED_KEY  = '@materials_ordered_v1';
const CUTTING_KEY  = '@cutting_complete_v1';
const MIGRATED_KEY = '@status_migrated_v1';

export interface OrderedStatus { date: string; }

// ─── Migrazione locale → Supabase (una tantum per dispositivo) ───────────────

export async function migrateStatusToSupabase(): Promise<void> {
  const already = await AsyncStorage.getItem(MIGRATED_KEY);
  if (already) return;

  const ids = await getCurrentIds();
  if (!ids) return;

  try {
    const orderedRaw = await AsyncStorage.getItem(ORDERED_KEY);
    const cuttingRaw = await AsyncStorage.getItem(CUTTING_KEY);

    const orderedMap: Record<string, OrderedStatus> = orderedRaw ? JSON.parse(orderedRaw) : {};
    const cuttingMap: Record<string, boolean>       = cuttingRaw ? JSON.parse(cuttingRaw) : {};

    const projectIds = new Set([...Object.keys(orderedMap), ...Object.keys(cuttingMap)]);

    for (const projectId of projectIds) {
      const ordered = orderedMap[projectId];
      const cutting = cuttingMap[projectId] ?? false;
      await supabase.from('project_status').upsert({
        company_id:      ids.companyId,
        project_id:      projectId,
        ordered_date:    ordered?.date ?? null,
        cutting_complete: cutting,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'company_id,project_id', ignoreDuplicates: true });
    }
  } catch {}

  await AsyncStorage.setItem(MIGRATED_KEY, '1');
}

// ─── Helpers Supabase ────────────────────────────────────────────────────────

async function upsertRow(
  companyId: string,
  projectId: string,
  update: { ordered_date?: string | null; cutting_complete?: boolean },
): Promise<void> {
  await supabase.from('project_status').upsert({
    company_id: companyId,
    project_id: projectId,
    ...update,
    updated_at: new Date().toISOString(),
  });
}

// ─── Materials "Ordinato" ─────────────────────────────────────────────────────

export async function getOrderedStatuses(): Promise<Record<string, OrderedStatus>> {
  const ids = await getCurrentIds();
  if (ids) {
    const { data, error } = await supabase
      .from('project_status')
      .select('project_id, ordered_date')
      .eq('company_id', ids.companyId)
      .not('ordered_date', 'is', null);

    if (!error && data) {
      const result: Record<string, OrderedStatus> = {};
      for (const row of data) {
        if (row.ordered_date) result[row.project_id] = { date: row.ordered_date };
      }
      return result;
    }
  }
  // Fallback locale
  const raw = await AsyncStorage.getItem(ORDERED_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function setOrdered(projectId: string, date: string): Promise<void> {
  // Aggiorna cache locale
  const raw = await AsyncStorage.getItem(ORDERED_KEY);
  const map: Record<string, OrderedStatus> = raw ? JSON.parse(raw) : {};
  map[projectId] = { date };
  await AsyncStorage.setItem(ORDERED_KEY, JSON.stringify(map));

  const ids = await getCurrentIds();
  if (ids) await upsertRow(ids.companyId, projectId, { ordered_date: date });
}

export async function clearOrdered(projectId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(ORDERED_KEY);
  const map: Record<string, OrderedStatus> = raw ? JSON.parse(raw) : {};
  delete map[projectId];
  await AsyncStorage.setItem(ORDERED_KEY, JSON.stringify(map));

  const ids = await getCurrentIds();
  if (ids) await upsertRow(ids.companyId, projectId, { ordered_date: null });
}

// ─── Cutting "Taglio completo" ─────────────────────────────────────────────────

export async function getCuttingCompleteStatuses(): Promise<Record<string, boolean>> {
  const ids = await getCurrentIds();
  if (ids) {
    const { data, error } = await supabase
      .from('project_status')
      .select('project_id, cutting_complete')
      .eq('company_id', ids.companyId)
      .eq('cutting_complete', true);

    if (!error && data) {
      const result: Record<string, boolean> = {};
      for (const row of data) result[row.project_id] = true;
      return result;
    }
  }
  // Fallback locale
  const raw = await AsyncStorage.getItem(CUTTING_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function saveCuttingComplete(projectId: string, complete: boolean): Promise<void> {
  // Aggiorna cache locale
  const raw = await AsyncStorage.getItem(CUTTING_KEY);
  const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
  if (complete) map[projectId] = true; else delete map[projectId];
  await AsyncStorage.setItem(CUTTING_KEY, JSON.stringify(map));

  const ids = await getCurrentIds();
  if (ids) await upsertRow(ids.companyId, projectId, { cutting_complete: complete });
}

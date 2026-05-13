import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCurrentIds } from './database';

const localKey = (projectId: string) => `@cutting_progress_${projectId}`;

// ─── API pubblica ─────────────────────────────────────────────────────────────

export async function getCuttingProgress(projectId: string): Promise<string[]> {
  const ids = await getCurrentIds();
  if (ids) {
    const { data, error } = await supabase
      .from('cutting_progress')
      .select('checked_keys')
      .eq('user_id', ids.userId)
      .eq('project_id', projectId)
      .single();
    if (!error && data) return data.checked_keys as string[];
  }
  // Fallback locale
  const raw = await AsyncStorage.getItem(localKey(projectId));
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export async function saveCuttingProgress(projectId: string, keys: string[]): Promise<void> {
  await AsyncStorage.setItem(localKey(projectId), JSON.stringify(keys));

  const ids = await getCurrentIds();
  if (!ids) return;
  await supabase.from('cutting_progress').upsert({
    user_id:      ids.userId,
    project_id:   projectId,
    checked_keys: keys,
    updated_at:   new Date().toISOString(),
  });
}

export async function clearCuttingProgress(projectId: string): Promise<void> {
  await AsyncStorage.removeItem(localKey(projectId));

  const ids = await getCurrentIds();
  if (!ids) return;
  await supabase.from('cutting_progress')
    .delete()
    .eq('user_id', ids.userId)
    .eq('project_id', projectId);
}

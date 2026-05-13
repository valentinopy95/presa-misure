/**
 * Chiama la Edge Function `calculate` su Supabase.
 * Tutti i calcoli girano sul server — nessun fallback locale.
 */
import { supabase } from '../lib/supabase';
import { Opening } from '../types';
import { CatalogSeries, ToleranceByType } from '../storage/settings';
import { MaterialsConfig, MaterialsResult, CuttingListResult } from './calculateMaterials';

export interface CalcPayload {
  openings:         Opening[];
  config:           MaterialsConfig;
  series?:          CatalogSeries | null;
  toleranceW?:      number;
  toleranceH?:      number;
  toleranceByType?: ToleranceByType;
}

export interface CalcResult {
  cuttingResult:          CuttingListResult;
  materialsResult:        MaterialsResult;
  catalogCuttingResult:   CuttingListResult | null;
  catalogMaterialsResult: MaterialsResult   | null;
}

export async function calculateRemote(payload: CalcPayload): Promise<CalcResult> {
  const { data, error } = await supabase.functions.invoke<CalcResult>('calculate', { body: payload });

  if (error || !data) {
    throw new Error('Connessione assente. Controlla la rete e riprova.');
  }

  return data;
}

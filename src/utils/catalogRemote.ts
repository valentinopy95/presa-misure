import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// ─── Configurazione Supabase ──────────────────────────────────────────────────
// Aggiorna BASE_URL se cambi progetto Supabase, bucket o cartella.
const BASE_URL =
  'https://vhsfdvkuzqqlmpuucfbt.supabase.co/storage/v1/object/public/cataloghi/';

/** Restituisce l'URL completo di un file nel bucket Supabase. */
export function remoteURL(filename: string): string {
  return BASE_URL + encodeURIComponent(filename);
}

/**
 * Apre un PDF direttamente dal bucket Supabase.
 * - Web: apre in una nuova tab del browser.
 * - Android / iOS: apre nell'in-app browser (Chrome Custom Tabs / Safari).
 *   Nessun download locale, nessuno share sheet con app social.
 */
export async function openRemotePDF(filename: string): Promise<void> {
  const url = remoteURL(filename);

  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const result = await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#1565C0',
      controlsColor: '#ffffff',
    });
    if (result.type === 'cancel') return;
  } catch (e: any) {
    Alert.alert('Errore', e?.message ?? 'Impossibile aprire il documento.');
  }
}

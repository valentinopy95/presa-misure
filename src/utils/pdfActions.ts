import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as AppAlert from '../components/AppAlert';
import { supabase, fetchProfile, fetchCompany } from '../lib/supabase';

/** Recupera il logo aziendale come base64 da Supabase Storage */
export async function getLogoBase64(): Promise<string | undefined> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;

    const profile = await fetchProfile(user.id);
    if (!profile?.company_id) return undefined;

    const company = await fetchCompany(profile.company_id);
    if (!company?.logo_url) return undefined;

    // Scarica l'immagine e convertila in base64
    const response = await fetch(company.logo_url);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Rimuovi il prefisso data:image/...;base64,
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function sharePdf(html: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (tab) setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const { uri: tmp } = await Print.printToFileAsync({ html, base64: false });
  const dest = `${FileSystem.documentDirectory}${filename}.pdf`;
  await FileSystem.copyAsync({ from: tmp, to: dest });
  await Sharing.shareAsync(dest, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
}

export async function shareCSV(csv: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const dest = `${FileSystem.documentDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(dest, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(dest, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: filename,
  });
}

export async function saveToDevice(html: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const { uri: tmp } = await Print.printToFileAsync({ html, base64: false });
  const src = `${FileSystem.documentDirectory}${filename}.pdf`;
  await FileSystem.copyAsync({ from: tmp, to: src });
  if (Platform.OS === 'android') {
    const { StorageAccessFramework } = FileSystem;
    const perms = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perms.granted) return;
    const dest = await StorageAccessFramework.createFileAsync(
      perms.directoryUri,
      `${filename}.pdf`,
      'application/pdf',
    );
    const content = await FileSystem.readAsStringAsync(src, {
      encoding: FileSystem.EncodingType.Base64 as any,
    });
    await FileSystem.writeAsStringAsync(dest, content, {
      encoding: FileSystem.EncodingType.Base64 as any,
    });
    AppAlert.show('Salvato!', `"${filename}.pdf" salvato nella cartella scelta.`);
  } else {
    await Sharing.shareAsync(src, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Salva - ${filename}`,
    });
  }
}

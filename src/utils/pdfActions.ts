import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as AppAlert from '../components/AppAlert';

export async function getLogoBase64(): Promise<string | undefined> {
  try {
    const asset = Asset.fromModule(require('../../assets/mascote.png'));
    await asset.downloadAsync();
    if (!asset.localUri) return undefined;
    return await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64 as any,
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

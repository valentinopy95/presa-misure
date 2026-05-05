// Web variant — no expo-print / expo-file-system / expo-sharing

export async function getLogoBase64(): Promise<string | undefined> {
  return undefined;
}

export async function sharePdf(html: string, _filename: string): Promise<void> {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export async function saveToDevice(html: string, filename: string): Promise<void> {
  // On web "save" opens the print dialog → user can save as PDF from browser
  await sharePdf(html, filename);
}

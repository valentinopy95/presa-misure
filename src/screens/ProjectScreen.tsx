import React, { useCallback, useState } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert, Text,
  Modal, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Project, RootStackParamList } from '../types';
import { getProject, deleteOpening } from '../storage/database';
import { getToleranceW, getToleranceH } from '../storage/settings';
import { generateHTML } from '../utils/pdfExport';
import OpeningCard from '../components/OpeningCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Project'>;
type Route = RouteProp<RootStackParamList, 'Project'>;

export default function ProjectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const reload = useCallback(() => {
    getProject(projectId).then(setProject);
  }, [projectId]);

  const buildPDF = async (): Promise<string> => {
    if (!project) throw new Error('no project');
    const tolW = await getToleranceW();
    const tolH = await getToleranceH();
    const html = generateHTML(project, tolW, tolH);
    const { uri: tmp } = await Print.printToFileAsync({ html, base64: false });
    const safe = project.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
    const dest = `${FileSystem.documentDirectory}${safe}.pdf`;
    await FileSystem.copyAsync({ from: tmp, to: dest });
    return dest;
  };

  const handleShare = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const tolW = await getToleranceW();
        const tolH = await getToleranceH();
        const html = generateHTML(project!, tolW, tolH);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, '_blank');
        if (tab) setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      const uri = await buildPDF();
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Rilievo - ${project?.name}` });
    } catch { Alert.alert('Errore', 'Impossibile generare il PDF.'); }
    finally { setExporting(false); }
  };

  const handleSaveToDevice = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const safe = project!.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim();
      if (Platform.OS === 'web') {
        const tolW = await getToleranceW();
        const tolH = await getToleranceH();
        const html = generateHTML(project!, tolW, tolH);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safe}_rilievo.html`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const src = await buildPDF();
      const fileName = `${safe}.pdf`;
      if (Platform.OS === 'android') {
        const { StorageAccessFramework } = FileSystem;
        const perms = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) { setExporting(false); return; }
        const dest = await StorageAccessFramework.createFileAsync(perms.directoryUri, fileName, 'application/pdf');
        const content = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(dest, content, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('Salvato!', `"${fileName}" salvato nella cartella scelta.`);
      } else {
        // iOS: share sheet → user can tap "Salva su File"
        await Sharing.shareAsync(src, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Salva - ${project?.name}` });
      }
    } catch { Alert.alert('Errore', 'Impossibile salvare il PDF.'); }
    finally { setExporting(false); }
  };

  useFocusEffect(reload);

  React.useLayoutEffect(() => {
    if (!project) return;
    navigation.setOptions({
      title: project.name,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Document', { projectId })}
          style={{ marginRight: 4 }}
        >
          <Text style={{ color: '#1565C0', fontSize: 15, fontWeight: '600' }}>PDF</Text>
        </TouchableOpacity>
      ),
    });
  }, [project, navigation, projectId]);

  const handleDelete = (openingId: string) => {
    Alert.alert('Elimina apertura', 'Vuoi eliminare questa voce?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteOpening(projectId, openingId);
          reload();
        },
      },
    ]);
  };

  if (!project) return null;

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.projectInfo}>
        <Text style={styles.client}>{project.clientName || 'Cliente non specificato'}</Text>
        <Text style={styles.address}>{project.address || 'Indirizzo non specificato'}</Text>
        <Text style={styles.count}>
          {project.openings.length} apertur{project.openings.length === 1 ? 'a' : 'e'}
        </Text>
      </View>

      <FlatList
        data={project.openings}
        keyExtractor={item => item.id}
        contentContainerStyle={project.openings.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nessuna apertura</Text>
            <Text style={styles.emptySubtitle}>Premi + per aggiungere una finestra o porta</Text>
          </View>
        }
        renderItem={({ item }) => (
          <OpeningCard
            opening={item}
            onPress={() => navigation.navigate('Measurement', { projectId, openingId: item.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

      {/* FAB + Export */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.exportFab, exporting && { opacity: 0.6 }]}
          onPress={() => !exporting && setShowExportModal(true)}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportFabText}>📄 PDF</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.materialFab}
          onPress={() => navigation.navigate('Materials', { projectId })}
        >
          <Text style={styles.exportFabText}>📐 Materiale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Measurement', { projectId })}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowExportModal(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Esporta PDF</Text>
            {project && (
              <Text style={styles.sheetFile}>
                {project.name.replace(/[^a-zA-Z0-9À-ÿ \-_]/g, '_').trim()}{Platform.OS === 'web' ? '_rilievo.html' : '.pdf'}
              </Text>
            )}

            <TouchableOpacity style={styles.optBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.optIcon}>📤</Text>
              <View>
                <Text style={styles.optTitle}>{Platform.OS === 'web' ? 'Apri nel browser' : 'Condividi'}</Text>
                <Text style={styles.optSub}>{Platform.OS === 'web' ? 'Stampa o salva come PDF dal browser' : 'Apri nelle app del dispositivo'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optBtn, styles.optBtnAlt]} onPress={handleSaveToDevice} activeOpacity={0.8}>
              <Text style={styles.optIcon}>💾</Text>
              <View>
                <Text style={[styles.optTitle, { color: '#1565C0' }]}>
                  {Platform.OS === 'web' ? 'Scarica HTML' : Platform.OS === 'ios' ? 'Salva su File' : 'Salva sul dispositivo'}
                </Text>
                <Text style={[styles.optSub, { color: '#7a9cc0' }]}>
                  {Platform.OS === 'web' ? 'Scarica e apri nel browser per stampare' : Platform.OS === 'ios' ? 'Salva in File tramite share sheet' : 'Scegli una cartella di destinazione'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancel} onPress={() => setShowExportModal(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  projectInfo: {
    backgroundColor: '#1565C0', padding: 16,
  },
  client: { color: '#fff', fontSize: 16, fontWeight: '600' },
  address: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  count: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#999', textAlign: 'center' },
  fabRow: {
    position: 'absolute', bottom: 28, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  fabIcon: { fontSize: 32, color: '#fff', lineHeight: 36 },
  exportFab: {
    height: 48, borderRadius: 24, paddingHorizontal: 18,
    backgroundColor: '#0d47a1', alignItems: 'center', justifyContent: 'center',
    elevation: 6, flexDirection: 'row',
  },
  materialFab: {
    height: 48, borderRadius: 24, paddingHorizontal: 18,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
    elevation: 6, flexDirection: 'row',
  },
  exportFabText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1a2a3a', marginBottom: 4 },
  sheetFile: { fontSize: 12, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  optBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1565C0', borderRadius: 14, padding: 16, marginBottom: 10 },
  optBtnAlt: { backgroundColor: '#EEF4FF', borderWidth: 1.5, borderColor: '#1565C0' },
  optIcon: { fontSize: 24 },
  optTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 1 },
  optSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: '#888', fontWeight: '600' },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Modal, Pressable, ActivityIndicator, PanResponder, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path as SvgPath } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as AppAlert from '../components/AppAlert';
import { getAllProjects } from '../storage/database';
import { Project, Opening, RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DeliveryNote'>;

const BOLLA_COUNTER_KEY  = '@bolla_counter';
const COMPANY_INFO_KEY   = '@local_company_info';

interface CompanyInfo {
  name: string; address: string; vat: string; phone: string; email: string;
}
const EMPTY_COMPANY: CompanyInfo = { name: '', address: '', vat: '', phone: '', email: '' };

async function loadCompanyInfo(): Promise<CompanyInfo> {
  const raw = await AsyncStorage.getItem(COMPANY_INFO_KEY);
  return raw ? { ...EMPTY_COMPANY, ...JSON.parse(raw) } : EMPTY_COMPANY;
}
async function saveCompanyInfo(info: CompanyInfo) {
  await AsyncStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(info));
}

async function nextBollaNumber(): Promise<number> {
  const raw = await AsyncStorage.getItem(BOLLA_COUNTER_KEY);
  const n = raw ? parseInt(raw) + 1 : 1;
  await AsyncStorage.setItem(BOLLA_COUNTER_KEY, String(n));
  return n;
}

function styleLabel(style: string | null): string {
  const map: Record<string, string> = {
    window_fixed: 'Fisso', window_single: 'Battente', window_double: 'Doppio battente',
    window_sliding: 'Scorrevole', window_tilt_turn: 'Vasistas',
    window_fixed_t: 'Fisso termico', window_single_t: 'Battente termico',
    window_double_t: 'Doppio battente termico', window_sliding_t: 'Scorrevole termico',
    window_tilt_turn_t: 'Vasistas termico',
    door_single: 'Porta battente', door_entrance: 'Portoncino', door_sliding: 'Porta scorrevole',
    door_single_t: 'Porta battente termica', door_entrance_t: 'Portoncino termico', door_sliding_t: 'Porta scorrevole termica',
    shutter_single: 'Persiana finestra', shutter_double: 'Persiana portafinestra',
    roller_blind: 'Monoblocco', subframe_window: 'Controtelaio',
    mosquito_fixed: 'Zanzariera fissa', mosquito_rollup: 'Zanzariera sali-scendi', mosquito_lateral: 'Zanzariera laterale',
    custom: 'Personalizzato',
  };
  return style ? (map[style] ?? style) : '—';
}

function dimStr(o: Opening): string {
  if (!o.width && !o.height) return '—';
  const w = o.width ?? '?';
  const h = o.height ?? '?';
  return `${w} × ${h} mm`;
}

function openingDesc(o: Opening): string {
  const parts: string[] = [];
  if (o.leafCount && o.leafCount > 1) parts.push(`${o.leafCount} ante`);
  if (o.color) parts.push(o.color);
  if (o.hasFascia) parts.push('fascia');
  if (o.hasSoglia) parts.push('soglia ribassata');
  if (o.hasBattente) parts.push('battente');
  if (o.sopraluce) parts.push('sopraluce');
  return parts.join(' · ') || '';
}

// Canvas firma a mano libera tramite Skia
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const [paths, setPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      currentPathRef.current = [pt];
      setCurrentPath([pt]);
    },
    onPanResponderMove: (e) => {
      const pt = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      currentPathRef.current = [...currentPathRef.current, pt];
      setCurrentPath(prev => [...prev, pt]);
    },
    onPanResponderRelease: () => {
      const completed = currentPathRef.current;
      if (completed.length > 1) setPaths(prev => [...prev, completed]);
      currentPathRef.current = [];
      setCurrentPath([]);
    },
  })).current;

  const ptsToPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const allPaths = [...paths, currentPath].filter(p => p.length > 1);

  const handleSave = () => {
    const all = [...paths, currentPathRef.current].filter(p => p.length > 1);
    if (all.length === 0) {
      AppAlert.show('Firma mancante', 'Disegna la firma prima di confermare.');
      return;
    }
    // Genera SVG stringa da incorporare nel PDF HTML
    const svgPaths = all.map(p => `<path d="${ptsToPath(p)}" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">${svgPaths}</svg>`;
    const b64 = `data:image/svg+xml;base64,${btoa(svg)}`;
    onSave(b64);
  };

  return (
    <View style={sig.wrap}>
      <Text style={sig.label}>Firma cliente</Text>
      <View style={sig.canvas} {...panResponder.panHandlers}>
        <Svg width="100%" height="150">
          {allPaths.map((pts, i) => (
            <SvgPath
              key={i}
              d={ptsToPath(pts)}
              stroke="#000"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </View>
      <View style={sig.row}>
        <TouchableOpacity style={sig.clear} onPress={() => { setPaths([]); setCurrentPath([]); currentPathRef.current = []; }}>
          <Text style={sig.clearTxt}>Cancella</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sig.confirm} onPress={handleSave}>
          <Text style={sig.confirmTxt}>Conferma firma</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sig = StyleSheet.create({
  wrap:       { marginTop: 20 },
  label:      { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  canvas:     { height: 150, backgroundColor: '#F7F9FC', borderRadius: 12, borderWidth: 1.5, borderColor: '#DDE3ED', overflow: 'hidden' },
  row:        { flexDirection: 'row', gap: 10, marginTop: 10 },
  clear:      { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDE3ED', alignItems: 'center' },
  clearTxt:   { fontSize: 13, fontWeight: '600', color: '#888' },
  confirm:    { flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center' },
  confirmTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

type FlatOpening = { opening: Opening; source: string };

export default function DeliveryNoteScreen() {
  const navigation = useNavigation<Nav>();
  const [allProjects,     setAllProjects]     = useState<Project[]>([]);
  const [projects,        setProjects]        = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [flatOpenings,    setFlatOpenings]    = useState<FlatOpening[]>([]);
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [company,         setCompany]         = useState<CompanyInfo>(EMPTY_COMPANY);
  const [editCompany,     setEditCompany]     = useState<CompanyInfo>(EMPTY_COMPANY);
  const [showCompanyEdit, setShowCompanyEdit] = useState(false);
  const [showSign,        setShowSign]        = useState(false);
  const [signatureB64,    setSignatureB64]    = useState<string | null>(null);
  const [generating,      setGenerating]      = useState(false);
  const [bollaNum,        setBollaNum]        = useState<number | null>(null);

  useEffect(() => {
    getAllProjects().then(list => {
      setAllProjects(list);
      const sorted = list
        .filter(p => !p.parentId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setProjects(sorted);
    });
    loadCompanyInfo().then(setCompany);
  }, []);

  const openCompanyEdit = () => { setEditCompany(company); setShowCompanyEdit(true); };
  const confirmCompanyEdit = async () => {
    await saveCompanyInfo(editCompany);
    setCompany(editCompany);
    setShowCompanyEdit(false);
  };

  const toggleOpening = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectProject = (p: Project) => {
    const children = allProjects.filter(c => c.parentId === p.id);
    const flat: FlatOpening[] = [
      ...p.openings.map(o => ({ opening: o, source: '' })),
      ...children.flatMap(c => c.openings.map(o => ({ opening: o, source: c.name }))),
    ];
    setFlatOpenings(flat);
    setSelectedIds(new Set(flat.map(f => f.opening.id)));
    setSelectedProject(p);
    setSignatureB64(null);
  };

  const generatePDF = async (sig: string | null) => {
    if (!selectedProject) return;
    setGenerating(true);
    try {
      const num = bollaNum ?? await nextBollaNumber();
      setBollaNum(num);
      const today = new Date().toLocaleDateString('it-IT');
      const selected = flatOpenings.filter(f => selectedIds.has(f.opening.id));

      const rows = selected.map(({ opening: o, source }, i) => `
        <tr style="background:${i % 2 === 0 ? '#F7F9FC' : '#fff'}">
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">
            ${o.name || '—'}
            ${source ? `<br/><span style="font-size:10px;color:#888;font-weight:400">${source}</span>` : ''}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${styleLabel(o.style)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${dimStr(o)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${openingDesc(o)}</td>
        </tr>
      `).join('');

      const sigHtml = sig
        ? `<div style="margin-top:32px">
            <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Firma cliente</p>
            <img src="${sig}" style="height:80px;border:1px solid #ddd;border-radius:8px;padding:4px"/>
           </div>`
        : `<div style="margin-top:32px;border-top:1px solid #ccc;width:200px;padding-top:8px">
            <p style="font-size:11px;color:#888">Firma cliente</p>
           </div>`;

      const html = `
        <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1a2a3a; }
          h1   { font-size: 22px; font-weight: 900; margin: 0 0 4px; }
          .sub { font-size: 12px; color: #888; margin-bottom: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
          .company { font-size: 12px; color: #444; line-height: 1.8; }
          .company strong { font-size: 15px; color: #1a2a3a; }
          .company .vat { font-size: 11px; color: #888; }
          .client  { background: #F0F4F8; border-radius: 10px; padding: 14px 18px; min-width: 200px; }
          .client-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px; }
          .client-name  { font-size: 15px; font-weight: 700; }
          .client-addr  { font-size: 12px; color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #1565C0; color: #fff; padding: 10px 12px; font-size: 11px; text-align: left; letter-spacing: 0.5px; }
          .badge { background: #1565C0; color: #fff; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; display: inline-block; }
          .footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
        </style>
        </head><body>
        <div class="header">
          <div>
            <h1>Bolla di consegna</h1>
            <p class="sub">N° ${String(num).padStart(4, '0')} · ${today}</p>
            <div class="company">
              <strong>${company.name || 'La tua azienda'}</strong><br/>
              ${company.address ? company.address + '<br/>' : ''}
              ${company.phone   ? 'Tel. ' + company.phone + '<br/>' : ''}
              ${company.email   ? company.email + '<br/>' : ''}
              ${company.vat     ? '<span class="vat">P.IVA ' + company.vat + '</span>' : ''}
            </div>
          </div>
          <div class="client">
            <div class="client-label">Consegnato a</div>
            <div class="client-name">${selectedProject.clientName || selectedProject.name}</div>
            ${selectedProject.clientPhone ? `<div class="client-addr">Tel. ${selectedProject.clientPhone}</div>` : ''}
            ${selectedProject.address ? `<div class="client-addr">${selectedProject.address}</div>` : ''}
          </div>
        </div>

        <p style="font-size:12px;color:#888;margin-bottom:6px">Progetto: <strong>${selectedProject.name}</strong> · ${selected.length} infissi</p>

        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Tipologia</th><th style="text-align:center">Dimensioni</th><th>Caratteristiche</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        ${sigHtml}

        <div class="footer">
          Documento generato da Misu · ${today}
        </div>
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Condividi bolla di consegna' });
    } catch (e) {
      AppAlert.show('Errore', 'Impossibile generare il PDF. Riprova.');
    } finally {
      setGenerating(false);
    }
  };

  if (!selectedProject) {
    // Step 1: scegli progetto
    return (
      <View style={s.root}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Bolla di consegna</Text>
              <Text style={s.headerSub}>Seleziona il progetto da consegnare</Text>
            </View>
            <TouchableOpacity style={s.editCompanyBtn} onPress={openCompanyEdit} activeOpacity={0.75}>
              <Text style={s.editCompanyTxt}>⚙ Azienda</Text>
            </TouchableOpacity>
          </View>
          {!!company.name && (
            <View style={s.companyPreview}>
              <Text style={s.companyPreviewName}>{company.name}</Text>
              {!!company.vat && <Text style={s.companyPreviewSub}>P.IVA {company.vat}</Text>}
            </View>
          )}
          {!company.name && (
            <TouchableOpacity style={s.companyEmpty} onPress={openCompanyEdit} activeOpacity={0.8}>
              <Text style={s.companyEmptyTxt}>⚠ Configura i dati azienda per la bolla</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={projects}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.projectCard} onPress={() => selectProject(item)} activeOpacity={0.75}>
              <View style={{ flex: 1 }}>
                {!!item.clientName && <Text style={s.projectSub}>{item.name}</Text>}
                <Text style={s.projectName}>{item.clientName || item.name}</Text>
                <Text style={s.projectMeta}>
                {item.openings.length + allProjects.filter(c => c.parentId === item.id).reduce((n, c) => n + c.openings.length, 0)} aperture · {new Date(item.updatedAt).toLocaleDateString('it-IT')}
              </Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />

        {/* Modal dati azienda */}
        <Modal visible={showCompanyEdit} transparent animationType="slide" onRequestClose={() => setShowCompanyEdit(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Pressable style={s.modalOverlay} onPress={() => setShowCompanyEdit(false)}>
              <Pressable style={s.modalSheet} onPress={() => {}}>
                <View style={s.modalHandle} />
                <Text style={s.modalTitle}>Dati azienda</Text>
                {([
                  { key: 'name',    label: 'Ragione sociale',  placeholder: 'Es. Serramenti Rossi Srl' },
                  { key: 'address', label: 'Indirizzo',        placeholder: 'Via Roma 1, 20100 Milano' },
                  { key: 'vat',     label: 'P.IVA / C.F.',    placeholder: 'IT12345678901' },
                  { key: 'phone',   label: 'Telefono',         placeholder: '+39 02 1234567' },
                  { key: 'email',   label: 'Email',            placeholder: 'info@azienda.it' },
                ] as { key: keyof CompanyInfo; label: string; placeholder: string }[]).map(f => (
                  <View key={f.key} style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{f.label}</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={editCompany[f.key]}
                      onChangeText={v => setEditCompany(prev => ({ ...prev, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#bbb"
                      autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                      keyboardType={f.key === 'email' ? 'email-address' : f.key === 'phone' ? 'phone-pad' : 'default'}
                    />
                  </View>
                ))}
                <TouchableOpacity style={s.modalSave} onPress={confirmCompanyEdit}>
                  <Text style={s.modalSaveTxt}>Salva</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // Step 2: selezione aperture + firma + genera
  const selected = flatOpenings.filter(f => selectedIds.has(f.opening.id));

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setSelectedProject(null)} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Cambia progetto</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{selectedProject.clientName || selectedProject.name}</Text>
        <Text style={s.headerSub}>{selectedProject.name} · Seleziona gli infissi da includere</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Lista aperture con checkbox (padre + sotto-progetti) */}
        {flatOpenings.map(({ opening: o, source }) => (
          <TouchableOpacity
            key={o.id}
            style={[s.openingRow, selectedIds.has(o.id) && s.openingRowActive]}
            onPress={() => toggleOpening(o.id)}
            activeOpacity={0.75}
          >
            <View style={[s.checkbox, selectedIds.has(o.id) && s.checkboxActive]}>
              {selectedIds.has(o.id) && <Text style={s.checkmark}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.openingName}>{o.name || '—'}</Text>
              <Text style={s.openingMeta}>{styleLabel(o.style)} · {dimStr(o)}</Text>
              {!!source && <Text style={s.openingSource}>{source}</Text>}
              {!!openingDesc(o) && <Text style={s.openingDesc}>{openingDesc(o)}</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* Firma */}
        {!signatureB64 ? (
          <TouchableOpacity style={s.signBtn} onPress={() => setShowSign(true)}>
            <Text style={s.signBtnIcon}>✍️</Text>
            <Text style={s.signBtnText}>Aggiungi firma cliente</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.signedRow}>
            <Text style={s.signedTxt}>✓ Firma acquisita</Text>
            <TouchableOpacity onPress={() => setSignatureB64(null)}>
              <Text style={s.signedRemove}>Rimuovi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Genera PDF */}
        <TouchableOpacity
          style={[s.generateBtn, (selected.length === 0 || generating) && { opacity: 0.5 }]}
          onPress={() => generatePDF(signatureB64)}
          disabled={selected.length === 0 || generating}
        >
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.generateBtnText}>📄 Genera e condividi bolla</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal firma */}
      <Modal visible={showSign} transparent animationType="slide" onRequestClose={() => setShowSign(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowSign(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <SignaturePad onSave={(b64) => { setSignatureB64(b64); setShowSign(false); }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },

  header: { backgroundColor: '#1565C0', paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  backBtn:     { marginBottom: 8 },
  backTxt:     { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },

  projectCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  projectSub:  { fontSize: 11, color: '#888', marginBottom: 2 },
  projectName: { fontSize: 16, fontWeight: '800', color: '#1a2a3a' },
  projectMeta: { fontSize: 12, color: '#aaa', marginTop: 3 },
  arrow:       { fontSize: 24, color: '#ccc', marginLeft: 8 },

  openingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  openingRowActive: { borderColor: '#1565C0', backgroundColor: '#EEF4FF' },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  checkmark:    { color: '#fff', fontSize: 13, fontWeight: '900' },
  openingName:  { fontSize: 14, fontWeight: '700', color: '#1a2a3a' },
  openingMeta:  { fontSize: 12, color: '#888', marginTop: 2 },
  openingSource: { fontSize: 11, color: '#6A1B9A', fontWeight: '600', marginTop: 2 },
  openingDesc:  { fontSize: 11, color: '#1565C0', marginTop: 3 },

  signBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 8,
    borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed',
  },
  signBtnIcon: { fontSize: 22 },
  signBtnText: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  signedRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginTop: 8 },
  signedTxt:   { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  signedRemove: { fontSize: 12, color: '#C62828', fontWeight: '600' },

  generateBtn: { backgroundColor: '#1565C0', borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 20 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: '#1a2a3a', marginBottom: 16 },
  fieldRow:     { marginBottom: 12 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  fieldInput:   { backgroundColor: '#F7F9FC', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDE3ED', padding: 11, fontSize: 14, color: '#1a2a3a' },
  modalSave:    { backgroundColor: '#1565C0', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 6 },
  modalSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  editCompanyBtn:  { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  editCompanyTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  companyPreview:  { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  companyPreviewName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  companyPreviewSub:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  companyEmpty:    { marginTop: 8, backgroundColor: 'rgba(255,200,0,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  companyEmptyTxt: { fontSize: 12, color: '#FFE082', fontWeight: '600' },
});

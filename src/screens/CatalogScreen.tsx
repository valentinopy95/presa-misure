import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, SafeAreaView, Platform, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ─── Supabase base URL ────────────────────────────────────────────────────────
const BASE = 'https://vhsfdvkuzqqlmpuucfbt.supabase.co/storage/v1/object/public/cataloghi/';
function pdfUrl(filename: string) { return BASE + encodeURIComponent(filename); }

// ─── Catalogo ─────────────────────────────────────────────────────────────────
const SERIES: { name: string; subtitle: string; color: string; file: string }[] = [
  { name: '40 TINO',       subtitle: 'Serie 40',                     color: '#5D4037', file: 'Catalogo 40tino INDINVEST.pdf' },
  { name: 'EKOS 100',      subtitle: 'Linea EKOS',                   color: '#1565C0', file: 'Catalogo Ekos 100 STH.pdf'     },
  { name: 'EKOS 150',      subtitle: 'Linea EKOS',                   color: '#0277BD', file: 'Catalogo Ekos 150 STH.pdf'     },
  { name: 'EKU 53',        subtitle: 'Linea EKU',                    color: '#558B2F', file: 'Eku 53 .pdf'                   },
  { name: 'EKU 66 TT',     subtitle: 'Linea EKU',                    color: '#2E7D32', file: 'EKU 66 TT.pdf'                 },
  { name: 'EKU 66 TT HPS', subtitle: 'Linea EKU — High Performance', color: '#1B5E20', file: 'EKU 66 TT HPS.pdf'            },
  { name: 'FOX SICURA',    subtitle: 'Sicurezza',                    color: '#B71C1C', file: 'Fox Sicura 2021.pdf'           },
  { name: 'GOLD 650 ST',   subtitle: 'Linea GOLD — Scorrevole',      color: '#E65100', file: 'GOLD 650ST CATALOGO.pdf'       },
  { name: 'PE 60 SLIDE',   subtitle: 'Scorrevole',                   color: '#6A1B9A', file: 'PE 60 SLIDE.pdf'               },
];

// ─── HTML con PDF.js per renderizzare il PDF in-app ──────────────────────────
function buildPdfHtml(url: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #404040; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
    #loading { position: fixed; inset: 0; background: #1a2a3a; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99; }
    #loading p { color: #ccc; font-family: sans-serif; font-size: 14px; margin-top: 12px; }
    .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.2); border-top-color: #4A90D9; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #error { position: fixed; inset: 0; background: #1a2a3a; display: none; flex-direction: column; align-items: center; justify-content: center; }
    #error p { color: #ccc; font-family: sans-serif; font-size: 14px; text-align: center; padding: 16px; }
    canvas { display: block; margin: 8px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div><p>Caricamento PDF…</p></div>
  <div id="error"><p>⚠️<br><br>Impossibile caricare il documento.<br>Verifica la connessione o il nome del file.</p></div>
  <div id="container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const url = ${JSON.stringify(url)};
    const container = document.getElementById('container');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    pdfjsLib.getDocument(url).promise.then(function(pdf) {
      loading.style.display = 'none';
      const total = pdf.numPages;
      const dpr = window.devicePixelRatio || 2;
      const cssWidth = window.innerWidth - 16;

      function renderPage(n) {
        pdf.getPage(n).then(function(page) {
          const baseScale = cssWidth / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: baseScale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = cssWidth + 'px';
          canvas.style.height = (viewport.height / dpr) + 'px';
          container.appendChild(canvas);
          page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(function() {
            if (n < total) renderPage(n + 1);
          });
        });
      }
      renderPage(1);
    }).catch(function() {
      loading.style.display = 'none';
      errorDiv.style.display = 'flex';
    });
  </script>
</body>
</html>`;
}

// ─── PDF Viewer ───────────────────────────────────────────────────────────────
function PDFViewer({
  url, title, onClose,
}: { url: string; title: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={v.root}>
        <StatusBar barStyle="light-content" backgroundColor="#1a2a3a"/>

        <View style={v.header}>
          <TouchableOpacity style={v.closeBtn} onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={v.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={v.title} numberOfLines={2}>{title}</Text>
          <View style={{ width: 36 }}/>
        </View>

        {loading && (
          <View style={v.overlay}>
            <ActivityIndicator size="large" color="#4A90D9"/>
            <Text style={v.overlayText}>Avvio visualizzatore…</Text>
          </View>
        )}

        <WebView
          source={{ html: buildPdfHtml(url) }}
          style={[v.web, loading && { opacity: 0 }]}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          originWhitelist={['*']}
        />
      </SafeAreaView>
    </Modal>
  );
}

const v = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#1a2a3a' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  closeBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18 },
  closeIcon:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  title:       { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 },
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a2a3a', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  overlayText: { color: '#ccc', fontSize: 14, marginTop: 10 },
  web:         { flex: 1, backgroundColor: '#404040' },
});

// ─── Schermata principale ─────────────────────────────────────────────────────
export default function CatalogScreen() {
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  const open = (name: string, file: string) => {
    const url = pdfUrl(file);
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setViewer({ url, title: name });
  };

  return (
    <>
      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        {SERIES.map(series => (
          <TouchableOpacity
            key={series.name}
            style={s.card}
            onPress={() => open(series.name, series.file)}
            activeOpacity={0.75}
          >
            <View style={[s.colorBar, { backgroundColor: series.color }]}/>
            <View style={s.cardBody}>
              <View>
                <Text style={s.seriesName}>{series.name}</Text>
                <Text style={s.subtitle}>{series.subtitle}</Text>
              </View>
              <Text style={[s.arrow, { color: series.color }]}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {viewer && (
        <PDFViewer url={viewer.url} title={viewer.title} onClose={() => setViewer(null)}/>
      )}
    </>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#F0F4F8' },
  content:  { padding: 14, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },

  colorBar:   { width: 6 },
  cardBody:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 16 },
  seriesName: { fontSize: 15, fontWeight: '800', color: '#1a2a3a', letterSpacing: 0.3 },
  subtitle:   { fontSize: 11, color: '#888', marginTop: 2 },
  arrow:      { fontSize: 24, fontWeight: '300' },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useSubscription, FREE_PROJECT_LIMIT } from '../contexts/SubscriptionContext';
import * as AppAlert from '../components/AppAlert';

type Period = 'monthly' | 'yearly';

const PLANS = [
  {
    key:         'base' as const,
    name:        'Base',
    monthly:     15,
    yearly:      180,
    yearlyPromo: false,
    users:       2,
    color:       '#1565C0',
    light:       '#E3F2FD',
  },
  {
    key:         'pro' as const,
    name:        'Pro',
    monthly:     20,
    yearly:      200,
    yearlyPromo: true,
    users:       5,
    color:       '#6A1B9A',
    light:       '#F3E5F5',
  },
];

const FEATURES = [
  'Progetti illimitati',
  'Tutte le funzionalità',
  'PDF rilievo, materiale e taglio',
  'Fuori squadra',
];

function openURL(url: string) {
  if (Platform.OS === 'web') {
    (window as any).open(url, '_blank');
  } else {
    Linking.openURL(url);
  }
}

export default function PaywallScreen() {
  const navigation   = useNavigation();
  const { plan, status, projectCount, refresh } = useSubscription();
  const [busy,       setBusy]   = useState<string | null>(null);
  const [period,     setPeriod] = useState<Period>('monthly');

  const isPaid = plan !== 'free' && status === 'active';

  const handleCheckout = async (planKey: 'base' | 'pro') => {
    const key = `${planKey}_${period}`;
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: planKey, period },
      });
      if (error || !data?.url) {
        AppAlert.show('Errore', 'Impossibile avviare il pagamento. Riprova tra poco.');
        return;
      }
      openURL(data.url);
      // Dopo il ritorno, aggiorna il piano (il webhook potrebbe aver già aggiornato)
      setTimeout(() => refresh(), 4000);
    } catch {
      AppAlert.show('Errore', 'Impossibile avviare il pagamento. Riprova tra poco.');
    } finally {
      setBusy(null);
    }
  };

  const handleManage = async () => {
    setBusy('portal');
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {});
      if (error || !data?.url) {
        AppAlert.show('Errore', 'Impossibile aprire il portale. Riprova tra poco.');
        return;
      }
      openURL(data.url);
    } catch {
      AppAlert.show('Errore', 'Impossibile aprire il portale. Riprova tra poco.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* ─── Piano attivo ─── */}
      {isPaid && (
        <View style={s.activeCard}>
          <Text style={s.activeIcon}>{plan === 'pro' ? '★' : '✓'}</Text>
          <Text style={s.activeTitle}>
            Piano {plan === 'base' ? 'Base' : 'Pro'} attivo
          </Text>
          <Text style={s.activeSub}>Hai accesso a tutte le funzionalità senza limiti.</Text>
          <TouchableOpacity
            style={s.manageBtn}
            onPress={handleManage}
            disabled={busy === 'portal'}
          >
            {busy === 'portal'
              ? <ActivityIndicator color="#1565C0" />
              : <Text style={s.manageBtnText}>Gestisci abbonamento</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Stato past_due ─── */}
      {status === 'past_due' && (
        <View style={s.warningCard}>
          <Text style={s.warningTitle}>Pagamento non andato a buon fine</Text>
          <Text style={s.warningSub}>Aggiorna il metodo di pagamento per continuare ad usare Misu senza interruzioni.</Text>
          <TouchableOpacity style={s.manageBtn} onPress={handleManage} disabled={busy === 'portal'}>
            {busy === 'portal'
              ? <ActivityIndicator color="#1565C0" />
              : <Text style={s.manageBtnText}>Aggiorna pagamento</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Piano free: usage + upgrade ─── */}
      {!isPaid && status !== 'past_due' && (
        <>
          {/* Utilizzo */}
          <View style={s.usageCard}>
            <View style={s.usageRow}>
              <Text style={s.usageLabel}>Progetti gratuiti usati</Text>
              <Text style={s.usageCount}>{projectCount}/{FREE_PROJECT_LIMIT}</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${Math.min((projectCount / FREE_PROJECT_LIMIT) * 100, 100)}%` as any }]} />
            </View>
            {projectCount >= FREE_PROJECT_LIMIT && (
              <Text style={s.limitNote}>Hai raggiunto il limite. Attiva un piano per continuare.</Text>
            )}
          </View>

          <Text style={s.headline}>Sblocca tutto, illimitato</Text>
          <Text style={s.sub}>Scegli il piano più adatto alla tua azienda</Text>

          {/* Toggle mensile / annuale */}
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, period === 'monthly' && s.toggleActive]}
              onPress={() => setPeriod('monthly')}
            >
              <Text style={[s.toggleText, period === 'monthly' && s.toggleTextActive]}>Mensile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, period === 'yearly' && s.toggleActive]}
              onPress={() => setPeriod('yearly')}
            >
              <Text style={[s.toggleText, period === 'yearly' && s.toggleTextActive]}>Annuale</Text>
            </TouchableOpacity>
          </View>

          {/* Schede piano */}
          {PLANS.map(p => {
            const isLoading = busy === `${p.key}_${period}`;
            return (
              <View key={p.key} style={[s.planCard, { borderColor: p.color }]}>
                <View style={[s.planHeader, { backgroundColor: p.light }]}>
                  <Text style={[s.planName, { color: p.color }]}>{p.name}</Text>
                  <View style={s.priceRow}>
                    <Text style={[s.price, { color: p.color }]}>
                      {period === 'monthly' ? `${p.monthly}€` : `${p.yearly}€`}
                    </Text>
                    <Text style={[s.priceUnit, { color: p.color }]}>
                      /{period === 'monthly' ? 'mese' : 'anno'}
                    </Text>
                    {period === 'yearly' && p.yearlyPromo && (
                      <View style={s.promoChip}>
                        <Text style={s.promoChipText}>2 mesi gratis</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.planUsers, { color: p.color }]}>fino a {p.users} utenti</Text>
                </View>
                <View style={s.planBody}>
                  {FEATURES.map(f => (
                    <View key={f} style={s.featureRow}>
                      <Text style={[s.featureCheck, { color: p.color }]}>✓</Text>
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[s.ctaBtn, { backgroundColor: p.color }]}
                  onPress={() => handleCheckout(p.key)}
                  disabled={busy !== null}
                >
                  {isLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.ctaBtnText}>Attiva {p.name}</Text>}
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={s.legal}>Pagamento sicuro via Stripe · Disdici in qualsiasi momento</Text>
        </>
      )}

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 20, paddingBottom: 48 },

  // Attivo
  activeCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  activeIcon:  { fontSize: 36, color: '#6A1B9A', marginBottom: 10 },
  activeTitle: { fontSize: 20, fontWeight: '900', color: '#1a2a3a', marginBottom: 6 },
  activeSub:   { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 19 },

  // Warning
  warningCard:  { backgroundColor: '#FFF3E0', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFCC80' },
  warningTitle: { fontSize: 15, fontWeight: '800', color: '#E65100', marginBottom: 6 },
  warningSub:   { fontSize: 13, color: '#BF360C', lineHeight: 18, marginBottom: 16 },

  // Gestisci
  manageBtn:     { borderWidth: 1.5, borderColor: '#1565C0', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, minWidth: 160, alignItems: 'center' },
  manageBtnText: { color: '#1565C0', fontWeight: '800', fontSize: 14 },

  // Usage
  usageCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  usageRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  usageLabel: { fontSize: 13, fontWeight: '700', color: '#666' },
  usageCount: { fontSize: 15, fontWeight: '900', color: '#0c2d75' },
  barBg:      { height: 6, backgroundColor: '#E8EDF4', borderRadius: 3, overflow: 'hidden' },
  barFill:    { height: 6, backgroundColor: '#DC2626', borderRadius: 3 },
  limitNote:  { marginTop: 10, fontSize: 12, color: '#DC2626', fontWeight: '700' },

  // Headline
  headline: { fontSize: 22, fontWeight: '900', color: '#1a2a3a', textAlign: 'center', marginBottom: 6 },
  sub:      { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },

  // Toggle
  toggle:          { flexDirection: 'row', backgroundColor: '#E8EDF4', borderRadius: 12, padding: 3, marginBottom: 20 },
  toggleBtn:       { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  toggleActive:    { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  toggleText:      { fontSize: 13, fontWeight: '700', color: '#888' },
  toggleTextActive:{ color: '#0c2d75' },

  // Piano card
  planCard:   { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 2, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  planHeader: { padding: 18 },
  planName:   { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  priceRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  price:      { fontSize: 32, fontWeight: '900' },
  priceUnit:  { fontSize: 14, fontWeight: '600', opacity: 0.75 },
  planUsers:  { fontSize: 12, fontWeight: '700', marginTop: 6, opacity: 0.75 },
  promoChip:  { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4 },
  promoChipText: { color: '#2E7D32', fontSize: 11, fontWeight: '800' },
  planBody:   { padding: 18, paddingTop: 12, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { fontSize: 14, fontWeight: '900', width: 18 },
  featureText:  { fontSize: 13, color: '#444', fontWeight: '600' },
  ctaBtn:     { margin: 14, marginTop: 4, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },

  legal: { textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 8, lineHeight: 16 },
});

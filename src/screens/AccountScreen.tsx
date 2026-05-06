import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as AppAlert from '../components/AppAlert';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  supabase, fetchProfile, fetchCompany, Company,
  inviteToCompany, listPendingInvites, revokeInvite, CompanyInvite,
  checkAndAcceptInvite, listInvitesForMe, MyInvite,
} from '../lib/supabase';
import { clearDbCache } from '../storage/database';
import { RootStackParamList } from '../types';
import { User } from '@supabase/supabase-js';
import { useSubscription, FREE_PROJECT_LIMIT } from '../contexts/SubscriptionContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation   = useNavigation<Nav>();
  const subscription = useSubscription();
  const [user,        setUser]        = useState<User | null>(null);
  const [company,     setCompany]     = useState<Company | null>(null);
  const [invites,     setInvites]     = useState<CompanyInvite[]>([]);
  const [myInvites,   setMyInvites]   = useState<MyInvite[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending,     setSending]     = useState(false);
  const [accepting,   setAccepting]   = useState<string | null>(null); // invite id being accepted

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const profile = await fetchProfile(user.id);
      if (profile?.company_id) {
        const c = await fetchCompany(profile.company_id);
        setCompany(c);
        if (c) {
          const list = await listPendingInvites(c.id);
          setInvites(list);
        }
      } else {
        // Nessuna azienda: carica inviti ricevuti
        const mine = await listInvitesForMe();
        setMyInvites(mine);
      }
    }
    setLoading(false);
  };

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    ?? user?.email?.[0]?.toUpperCase()
    ?? '?';

  const handleAcceptInvite = async (invite: MyInvite) => {
    setAccepting(invite.id);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const result = await checkAndAcceptInvite(u.id);
      if (result) {
        clearDbCache();
        // Aggiorna profilo in AppContent tramite refresh sessione
        await supabase.auth.refreshSession();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
      } else {
        AppAlert.show('Errore', 'Impossibile accettare l\'invito. Riprova.');
      }
    } finally {
      setAccepting(null);
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      AppAlert.show('Email non valida', 'Inserisci un indirizzo email corretto.');
      return;
    }
    if (!company || !user) return;
    setSending(true);
    try {
      const result = await inviteToCompany(company.id, user.id, email);
      if (result === 'ok') {
        setInviteEmail('');
        AppAlert.show('Invito inviato', `${email} vedrà l'invito nella sezione Account non appena aprirà l'app.`);
        const list = await listPendingInvites(company.id);
        setInvites(list);
      } else if (result === 'already_invited') {
        AppAlert.show('Già invitato', `${email} ha già un invito pendente.`);
      } else {
        AppAlert.show('Errore', 'Impossibile inviare l\'invito. Riprova.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = (invite: CompanyInvite) => {
    AppAlert.show(
      'Revoca invito',
      `Revocare l'invito per ${invite.invited_email}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Revoca', style: 'destructive',
          onPress: async () => {
            await revokeInvite(invite.id);
            setInvites(prev => prev.filter(i => i.id !== invite.id));
          },
        },
      ]
    );
  };

  const handleLeaveCompany = () => {
    AppAlert.show(
      'Lascia l\'azienda',
      'Perderai l\'accesso a tutti i rilievi dell\'azienda. Sei sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Lascia', style: 'destructive',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('profiles').update({ company_id: null }).eq('id', user.id);
              clearDbCache();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    AppAlert.show('Esci dall\'account', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => supabase.auth.signOut({ scope: 'local' }) },
    ]);
  };

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#0c2d75" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Avatar + info utente */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>
            {(user?.user_metadata?.full_name as string | undefined) ?? 'Utente'}
          </Text>
          <Text style={s.email}>{user?.email ?? ''}</Text>
        </View>

        {/* Piano abbonamento */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Piano</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>Piano attuale</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <View style={[s.planBadge, {
                    backgroundColor:
                      subscription.plan === 'pro'  ? '#F3E5F5' :
                      subscription.plan === 'base' ? '#E3F2FD' : '#F0F4F8',
                  }]}>
                    <Text style={[s.planBadgeText, {
                      color:
                        subscription.plan === 'pro'  ? '#6A1B9A' :
                        subscription.plan === 'base' ? '#1565C0' : '#666',
                    }]}>
                      {subscription.plan === 'free' ? 'Gratuito' :
                       subscription.plan === 'base' ? 'Base' : 'Pro'}
                    </Text>
                  </View>
                  {subscription.status === 'past_due' && (
                    <View style={s.pastDueBadge}>
                      <Text style={s.pastDueBadgeText}>Pagamento scaduto</Text>
                    </View>
                  )}
                </View>
                {subscription.plan === 'free' && (
                  <Text style={s.planSub}>
                    {subscription.projectCount}/{FREE_PROJECT_LIMIT} progetti usati
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={s.upgradePillBtn}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={s.upgradePillText}>
                  {subscription.plan === 'free' ? 'Upgrade' : 'Gestisci'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Azienda */}
        {company ? (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Azienda</Text>
              <View style={s.card}>
                <View style={s.row}>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel}>Nome</Text>
                    <Text style={s.rowValue}>{company.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Invita collaboratore */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Invita collaboratore</Text>
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.rowHint}>
                    Inserisci la email del collega. Riceverà l'invito nella sezione Account dell'app.
                  </Text>
                </View>
                <View style={[s.row, s.rowBorder, { gap: 10 }]}>
                  <TextInput
                    style={s.inviteInput}
                    placeholder="email@esempio.com"
                    placeholderTextColor="#aaa"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={s.inviteBtn} onPress={handleSendInvite} disabled={sending}>
                    {sending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.inviteBtnText}>Invita</Text>}
                  </TouchableOpacity>
                </View>

                {invites.length > 0 && (
                  <>
                    <View style={[s.row, s.rowBorder]}>
                      <Text style={[s.rowLabel, { flex: 1 }]}>Inviti pendenti</Text>
                    </View>
                    {invites.map(inv => (
                      <View key={inv.id} style={[s.row, s.rowBorder]}>
                        <Text style={[s.rowValue, { flex: 1, fontSize: 13 }]}>{inv.invited_email}</Text>
                        <TouchableOpacity onPress={() => handleRevokeInvite(inv)}>
                          <Text style={s.revokeText}>Revoca</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Inviti ricevuti */}
            {myInvites.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Inviti ricevuti</Text>
                <View style={s.card}>
                  {myInvites.map(inv => (
                    <View key={inv.id} style={s.inviteRow}>
                      <View style={s.inviteIcon}>
                        <Text style={{ fontSize: 20 }}>🏢</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inviteCompanyName}>{inv.company_name}</Text>
                        <Text style={s.inviteHint}>Sei stato invitato a unirti a questa azienda</Text>
                      </View>
                      <TouchableOpacity
                        style={s.acceptBtn}
                        onPress={() => handleAcceptInvite(inv)}
                        disabled={accepting === inv.id}
                      >
                        {accepting === inv.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.acceptBtnText}>Accetta</Text>}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Nessuna azienda */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Azienda</Text>
              <View style={s.card}>
                <Text style={[s.rowHint, { padding: 16 }]}>
                  {myInvites.length > 0
                    ? 'Accetta un invito oppure crea la tua azienda.'
                    : 'Non sei ancora associato a nessuna azienda.'}
                </Text>
                <View style={[s.row, s.rowBorder, { justifyContent: 'center' }]}>
                  <TouchableOpacity
                    style={s.createCompanyBtn}
                    onPress={() => navigation.navigate('CompanySetup')}
                  >
                    <Text style={s.createCompanyBtnText}>Crea azienda</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Azioni */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.card}>
            {company && (
              <TouchableOpacity style={s.actionRow} onPress={handleLeaveCompany}>
                <Text style={s.actionLabel}>Lascia l'azienda</Text>
                <Text style={s.actionArrow}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.actionRow, company ? s.rowBorder : null]}
              onPress={handleLogout}
            >
              <Text style={[s.actionLabel, s.actionDanger]}>Esci dall'account</Text>
              <Text style={[s.actionArrow, s.actionDanger]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 20, paddingBottom: 40 },
  loader:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0c2d75', alignItems: 'center', justifyContent: 'center', marginBottom: 14, elevation: 4, shadowColor: '#0c2d75', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  avatarText:  { color: '#fff', fontSize: 28, fontWeight: '900' },
  name:        { fontSize: 20, fontWeight: '900', color: '#1a2a3a', marginBottom: 4 },
  email:       { fontSize: 13, color: '#888' },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, paddingLeft: 4 },

  card:      { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F4F8' },
  rowInfo:   { flex: 1 },
  rowLabel:  { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  rowValue:  { fontSize: 15, fontWeight: '700', color: '#1a2a3a' },
  rowHint:   { fontSize: 12, color: '#aaa', lineHeight: 17 },

  inviteRow:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  inviteIcon:       { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  inviteCompanyName:{ fontSize: 15, fontWeight: '800', color: '#1a2a3a', marginBottom: 2 },
  inviteHint:       { fontSize: 11, color: '#aaa' },
  acceptBtn:        { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 78, alignItems: 'center' },
  acceptBtnText:    { color: '#fff', fontWeight: '800', fontSize: 13 },

  inviteInput: { flex: 1, borderWidth: 1.5, borderColor: '#DDE3ED', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1a2a3a', backgroundColor: '#F8FAFC' },
  inviteBtn:   { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  revokeText:  { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  createCompanyBtn:     { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11, alignItems: 'center' },
  createCompanyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  actionRow:    { flexDirection: 'row', alignItems: 'center', padding: 16 },
  actionLabel:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a2a3a' },
  actionArrow:  { fontSize: 20, color: '#ccc' },
  actionDanger: { color: '#DC2626' },

  planBadge:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText:  { fontSize: 13, fontWeight: '800' },
  planSub:        { fontSize: 11, color: '#aaa', marginTop: 4 },
  pastDueBadge:   { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pastDueBadgeText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  upgradePillBtn: { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  upgradePillText:{ color: '#fff', fontWeight: '800', fontSize: 13 },
});

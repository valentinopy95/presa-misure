import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  supabase, fetchProfile, fetchCompany, Company,
  inviteToCompany, listPendingInvites, revokeInvite, CompanyInvite,
} from '../lib/supabase';

import { User } from '@supabase/supabase-js';

export default function AccountScreen() {
  const [user,     setUser]     = useState<User | null>(null);
  const [company,  setCompany]  = useState<Company | null>(null);
  const [invites,  setInvites]  = useState<CompanyInvite[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending,  setSending]  = useState(false);

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
      }
    }
    setLoading(false);
  };

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    ?? user?.email?.[0]?.toUpperCase()
    ?? '?';

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Email non valida', 'Inserisci un indirizzo email corretto.');
      return;
    }
    if (!company || !user) return;
    setSending(true);
    try {
      const result = await inviteToCompany(company.id, user.id, email);
      if (result === 'ok') {
        setInviteEmail('');
        Alert.alert('Invito inviato', `${email} potrà accedere all'azienda non appena aprirà l'app con quella email.`);
        const list = await listPendingInvites(company.id);
        setInvites(list);
      } else if (result === 'already_invited') {
        Alert.alert('Già invitato', `${email} ha già un invito pendente.`);
      } else {
        Alert.alert('Errore', 'Impossibile inviare l\'invito. Riprova.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = (invite: CompanyInvite) => {
    Alert.alert(
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
    Alert.alert(
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
              await supabase.auth.signOut({ scope: 'local' });
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Esci dall\'account', 'Sei sicuro di voler uscire?', [
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
                  <View style={s.rowInfo}>
                    <Text style={s.rowHint}>
                      Inserisci la email del collega. Potrà accedere ai progetti dell'azienda non appena aprirà l'app con quell'email.
                    </Text>
                  </View>
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

                {/* Lista inviti pendenti */}
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
          <View style={s.section}>
            <Text style={s.sectionTitle}>Azienda</Text>
            <View style={s.card}>
              <Text style={s.rowHint}>Nessuna azienda associata.</Text>
            </View>
          </View>
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
  rowHint:   { flex: 1, fontSize: 12, color: '#aaa', lineHeight: 17 },

  inviteInput: { flex: 1, borderWidth: 1.5, borderColor: '#DDE3ED', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1a2a3a', backgroundColor: '#F8FAFC' },
  inviteBtn:   { backgroundColor: '#0c2d75', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  revokeText:  { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  actionRow:    { flexDirection: 'row', alignItems: 'center', padding: 16 },
  actionLabel:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a2a3a' },
  actionArrow:  { fontSize: 20, color: '#ccc' },
  actionDanger: { color: '#DC2626' },
});

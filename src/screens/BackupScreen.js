import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import PrimaryButton from '../components/PrimaryButton';
import BackupService from '../services/BackupService';

export default function BackupScreen({ navigation }) {
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(null); // 'export' | 'import' | null

  const onExport = async () => {
    if (pass.length < 4) {
      Alert.alert('Passphrase too short', 'Use at least 4 characters. You will need this passphrase to restore.');
      return;
    }
    setBusy('export');
    try {
      const { fname } = await BackupService.exportEncrypted(pass);
      Alert.alert('Backup ready', `Saved as ${fname}. Keep it somewhere safe — without the passphrase the file cannot be opened.`);
    } catch (e) {
      Alert.alert('Backup failed', e.message);
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    if (pass.length < 4) {
      Alert.alert('Enter passphrase first', 'Type the passphrase the backup was created with.');
      return;
    }
    Alert.alert(
      'Restore from backup?',
      'All current data on this device will be replaced with the backup contents.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setBusy('import');
            try {
              const res = await BackupService.importEncrypted(pass);
              if (res.canceled) { setBusy(null); return; }
              Alert.alert(
                'Restored',
                `Backup from ${new Date(res.createdAt).toLocaleString('en-IN')} has been restored. Restart the app to see all your data.`,
              );
            } catch (e) {
              Alert.alert('Restore failed', e.message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Backup & Restore</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.introTitle}>Your data, encrypted</Text>
            <Text style={styles.introText}>
              Backups are encrypted with your passphrase on this device before sharing.
              Nothing is uploaded by CalcMint. If you lose the passphrase, the file cannot be recovered.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Passphrase</Text>
          <TextInput
            style={styles.input}
            value={pass}
            onChangeText={setPass}
            placeholder="At least 4 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>You will need this exact passphrase to restore the backup later.</Text>

          <View style={{ marginTop: 18, gap: 10 }}>
            <PrimaryButton
              title={busy === 'export' ? 'Preparing…' : 'Export encrypted backup'}
              iconRight="cloud-upload-outline"
              onPress={onExport}
              disabled={!!busy}
              loading={busy === 'export'}
            />
            <TouchableOpacity
              style={[styles.secondaryBtn, !!busy && { opacity: 0.6 }]}
              onPress={onImport}
              disabled={!!busy}
              activeOpacity={0.85}
            >
              {busy === 'import' ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={COLORS.text} />
                  <Text style={styles.secondaryText}>Import backup file</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.notesCard}>
            <Note text="Backups include expenses, goals, subscriptions, split groups, calculator inputs, lock settings, and document metadata." />
            <Note text="Document images are not included in the encrypted JSON — they live in app storage. Use your phone's gallery export for those." />
            <Note text="Restoring overwrites everything currently on this device. Export first if you want to keep your current state." />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Note({ text }) {
  return (
    <View style={styles.noteRow}>
      <Ionicons name="information-circle-outline" size={14} color={COLORS.subtext} style={{ marginTop: 2 }} />
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  body: { padding: 18, paddingBottom: 40 },

  intro: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 18, alignItems: 'flex-start',
  },
  introIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  introTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  introText: { fontSize: 12, color: COLORS.subtext, marginTop: 6, lineHeight: 18 },

  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  hint: { fontSize: 11, color: COLORS.subtext, marginTop: 6 },

  secondaryBtn: {
    height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  notesCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 20, gap: 8,
  },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 11.5, color: COLORS.subtext, lineHeight: 17 },
});

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { VAULT_TYPES, VAULT_TYPE_LIST } from '../constants/vaultTypes';
import VaultService from '../services/VaultService';

const previewOf = (entry) => {
  const t = VAULT_TYPES[entry.type];
  if (!t) return '';
  return entry[t.titleField] || t.label;
};

export default function VaultScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState([]);
  const [picker, setPicker] = useState(false);

  const leaveVault = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent()?.navigate('Dashboard');
  }, [navigation]);

  const load = useCallback(async () => {
    const items = await VaultService.list();
    setEntries(items);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const focus = navigation.addListener('focus', load);
    return focus;
  }, [navigation, load]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const e of entries) {
      (groups[e.type] ||= []).push(e);
    }
    return groups;
  }, [entries]);

  const pick = (typeKey) => {
    setPicker(false);
    navigation.navigate('VaultEntryEdit', { type: typeKey });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leaveVault} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Vault</Text>
        <TouchableOpacity onPress={() => setPicker(true)} style={[styles.iconBtn, { backgroundColor: COLORS.text }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔐</Text>
            <Text style={styles.emptyTitle}>Your vault is empty</Text>
            <Text style={styles.emptyHint}>
              Store IDs, policies, FDs, and folios safely on this device.
              Encrypted with a key in your phone's keychain — nothing leaves your device.
            </Text>
            <TouchableOpacity style={styles.addCta} onPress={() => setPicker(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addCtaText}>Add your first entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          VAULT_TYPE_LIST.map((t) => {
            const list = grouped[t.key] || [];
            if (list.length === 0) return null;
            return (
              <View key={t.key} style={{ marginBottom: 18 }}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: t.soft }]}>
                    <Ionicons name={t.icon} size={14} color={t.color} />
                  </View>
                  <Text style={styles.sectionTitle}>{t.label}</Text>
                  <Text style={styles.sectionCount}>{list.length}</Text>
                </View>
                {list.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.row}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('VaultEntryEdit', { type: e.type, id: e.id })}
                  >
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {e._corrupt ? '⚠ Entry could not be decrypted' : previewOf(e)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.subtext} />
          <Text style={styles.noteText}>
            Vault data stays on this device. Nothing leaves your phone.
          </Text>
        </View>
      </ScrollView>

      {entries.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 28 + insets.bottom }]}
          onPress={() => setPicker(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setPicker(false)}>
          <View style={[styles.pickerSheet, { paddingBottom: 24 + insets.bottom }]}>
            <Text style={styles.pickerTitle}>What are you adding?</Text>
            <View style={styles.pickerGrid}>
              {VAULT_TYPE_LIST.map((t) => (
                <TouchableOpacity key={t.key} style={styles.pickerItem} onPress={() => pick(t.key)}>
                  <View style={[styles.pickerIcon, { backgroundColor: t.soft }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text style={styles.pickerLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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

  body: { padding: 18 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text, letterSpacing: 0.2, flex: 1 },
  sectionCount: { fontSize: 11, color: COLORS.subtext, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 6,
  },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },

  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  addCta: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.text, paddingHorizontal: 18, height: 46, borderRadius: 14,
  },
  addCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  noteCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 11.5, color: COLORS.subtext, lineHeight: 17 },

  fab: {
    position: 'absolute', right: 22,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.text,
    alignItems: 'center', justifyContent: 'center',
    ...COLORS.shadow,
  },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.background, padding: 18,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  pickerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickerItem: {
    width: '30%', alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 6, textAlign: 'center' },
});

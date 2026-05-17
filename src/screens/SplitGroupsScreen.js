import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { formatINRFull } from '../utils/formatters';
import { computeSettlements } from '../utils/splitter';
import PrimaryButton from '../components/PrimaryButton';

export default function SplitGroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    StorageService.getSplitGroups().then(setGroups);
  }, []);

  const persist = useCallback(async (next) => {
    setGroups(next);
    await StorageService.saveSplitGroups(next);
  }, []);

  const addGroup = () => {
    if (!newName.trim()) return;
    const g = {
      id: Date.now().toString(),
      name: newName.trim(),
      members: [],
      bills: [],
      createdAt: new Date().toISOString(),
    };
    persist([g, ...groups]);
    setNewName('');
    setShowAdd(false);
    navigation.navigate('SplitGroupDetail', { id: g.id });
  };

  const removeGroup = (id) => {
    Alert.alert('Delete group?', 'All members and bills will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(groups.filter((g) => g.id !== id)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Split Expenses</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.iconBtn, { backgroundColor: COLORS.text }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyHint}>Create a trip, flat, or dinner group to start splitting.</Text>
            <PrimaryButton title="Create your first group" onPress={() => setShowAdd(true)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
          </View>
        ) : (
          groups.map((g) => {
            const total = g.bills.reduce((s, b) => s + b.amount, 0);
            return (
              <TouchableOpacity
                key={g.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('SplitGroupDetail', { id: g.id })}
                onLongPress={() => removeGroup(g.id)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{g.name}</Text>
                  <Text style={styles.cardMeta}>
                    {g.members.length} member{g.members.length === 1 ? '' : 's'}  ·  {g.bills.length} bill{g.bills.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardAmount}>{formatINRFull(total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setNewName(''); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New group</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ padding: 18 }}>
            <Text style={styles.fieldLabel}>Group name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Goa trip, Flat 304, Sunday dinner"
              autoFocus
            />
            <PrimaryButton title="Create group" onPress={addGroup} style={{ marginTop: 14 }} disabled={!newName.trim()} />
          </View>
        </SafeAreaView>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  body: { padding: 18, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  cardAmount: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: COLORS.text },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4, textAlign: 'center' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalCancel: { fontSize: 14, color: COLORS.subtext, fontWeight: '600' },
  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
});

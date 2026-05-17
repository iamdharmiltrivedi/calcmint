import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import { formatINRFull } from '../utils/formatters';
import { computeSettlements } from '../utils/splitter';
import PrimaryButton from '../components/PrimaryButton';

export default function SplitGroupDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [group, setGroup] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [memberName, setMemberName] = useState('');

  useEffect(() => {
    StorageService.getSplitGroups().then((all) => {
      setGroup(all.find((g) => g.id === id) || null);
    });
  }, [id]);

  const persist = useCallback(async (next) => {
    setGroup(next);
    const all = await StorageService.getSplitGroups();
    const updated = all.map((g) => (g.id === id ? next : g));
    await StorageService.saveSplitGroups(updated);
  }, [id]);

  const settlement = useMemo(() => {
    if (!group) return { balances: {}, transfers: [] };
    return computeSettlements(group.members, group.bills);
  }, [group]);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24, color: COLORS.subtext }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = group.bills.reduce((s, b) => s + b.amount, 0);
  const memberById = (mid) => group.members.find((m) => m.id === mid)?.name || '?';

  const addMember = () => {
    const n = memberName.trim();
    if (!n) return;
    persist({ ...group, members: [...group.members, { id: Date.now().toString(), name: n }] });
    setMemberName('');
    setShowAddMember(false);
  };

  const removeMember = (mid) => {
    if (group.bills.some((b) => b.paidBy === mid || b.participants.includes(mid))) {
      Alert.alert('Cannot remove', 'This member is on existing bills.');
      return;
    }
    persist({ ...group, members: group.members.filter((m) => m.id !== mid) });
  };

  const addBill = (bill) => {
    persist({ ...group, bills: [{ ...bill, id: Date.now().toString() }, ...group.bills] });
    setShowAddBill(false);
  };

  const removeBill = (bid) => {
    persist({ ...group, bills: group.bills.filter((b) => b.id !== bid) });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
            <Text style={styles.summaryValue}>{formatINRFull(totalSpent)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>PER PERSON</Text>
            <Text style={styles.summaryValue}>
              {group.members.length ? formatINRFull(totalSpent / group.members.length) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
          <TouchableOpacity onPress={() => setShowAddMember(true)}>
            <Text style={styles.addLink}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {group.members.length === 0 ? (
          <Text style={styles.emptyMini}>Add members before logging bills.</Text>
        ) : (
          <View style={styles.memberRow}>
            {group.members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.memberChip}
                onLongPress={() => removeMember(m.id)}
              >
                <Text style={styles.memberChipText}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bills ({group.bills.length})</Text>
          {group.members.length > 0 && (
            <TouchableOpacity onPress={() => setShowAddBill(true)}>
              <Text style={styles.addLink}>+ Add bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {group.bills.length === 0 ? (
          <Text style={styles.emptyMini}>No bills logged yet.</Text>
        ) : (
          group.bills.map((b) => (
            <View key={b.id} style={styles.billRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.billTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.billMeta}>
                  Paid by {memberById(b.paidBy)} · split among {b.participants.length}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.billAmount}>{formatINRFull(b.amount)}</Text>
                <TouchableOpacity onPress={() => removeBill(b.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.delete}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {settlement.transfers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Settle up</Text>
            <View style={styles.settleCard}>
              {settlement.transfers.map((t, i) => (
                <View key={i} style={styles.settleRow}>
                  <Text style={styles.settleText}>
                    <Text style={{ fontWeight: '700' }}>{memberById(t.from)}</Text>
                    {'  →  '}
                    <Text style={{ fontWeight: '700' }}>{memberById(t.to)}</Text>
                  </Text>
                  <Text style={styles.settleAmount}>{formatINRFull(t.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <AddMemberModal
        visible={showAddMember}
        name={memberName}
        setName={setMemberName}
        onClose={() => { setShowAddMember(false); setMemberName(''); }}
        onAdd={addMember}
      />

      <AddBillModal
        visible={showAddBill}
        members={group.members}
        onClose={() => setShowAddBill(false)}
        onAdd={addBill}
      />
    </SafeAreaView>
  );
}

function AddMemberModal({ visible, name, setName, onClose, onAdd }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}><Text style={modalStyles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={modalStyles.title}>Add member</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ padding: 18 }}>
          <Text style={modalStyles.label}>Name</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Riya"
            autoFocus
          />
          <PrimaryButton title="Add" onPress={onAdd} disabled={!name.trim()} style={{ marginTop: 14 }} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function AddBillModal({ visible, members, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id);
  const [participants, setParticipants] = useState(members.map((m) => m.id));

  useEffect(() => {
    if (visible) {
      setTitle(''); setAmount('');
      setPaidBy(members[0]?.id);
      setParticipants(members.map((m) => m.id));
    }
  }, [visible, members]);

  const toggleParticipant = (mid) => {
    setParticipants((p) => p.includes(mid) ? p.filter((x) => x !== mid) : [...p, mid]);
  };

  const submit = () => {
    const amt = parseFloat(amount);
    if (!title.trim() || !amt || amt <= 0) { Alert.alert('Missing info', 'Enter a title and valid amount.'); return; }
    if (!paidBy) { Alert.alert('Pick who paid'); return; }
    if (participants.length === 0) { Alert.alert('Pick at least one participant'); return; }
    onAdd({
      title: title.trim(),
      amount: amt,
      paidBy,
      participants,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}><Text style={modalStyles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={modalStyles.title}>New bill</Text>
          <View style={{ width: 50 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <Text style={modalStyles.label}>Title</Text>
            <TextInput style={modalStyles.input} value={title} onChangeText={setTitle} placeholder="e.g. Dinner" />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Amount</Text>
            <TextInput
              style={modalStyles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 1800"
            />

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Paid by</Text>
            <View style={modalStyles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[modalStyles.chip, paidBy === m.id && modalStyles.chipActive]}
                  onPress={() => setPaidBy(m.id)}
                >
                  <Text style={[modalStyles.chipText, paidBy === m.id && { color: '#fff' }]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Split among</Text>
            <View style={modalStyles.chipRow}>
              {members.map((m) => {
                const on = participants.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[modalStyles.chip, on && modalStyles.chipActiveAlt]}
                    onPress={() => toggleParticipant(m.id)}
                  >
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={on ? '#fff' : COLORS.subtext} />
                    <Text style={[modalStyles.chipText, on && { color: '#fff' }]}>{m.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryButton title="Save bill" onPress={submit} style={{ marginTop: 18 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2, flex: 1, textAlign: 'center' },

  body: { padding: 18, paddingBottom: 40 },

  summary: {
    flexDirection: 'row', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
  },
  summaryLabel: { fontSize: 10, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.6 },
  summaryValue: { ...MONO_STYLE, fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: 16, marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  addLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    paddingHorizontal: 12, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  memberChipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },

  billRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  billTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  billMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  billAmount: { ...MONO_STYLE, fontSize: 14, fontWeight: '700', color: COLORS.text },
  delete: { fontSize: 11, color: COLORS.error, fontWeight: '700', marginTop: 4 },

  settleCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  settleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  settleText: { fontSize: 13, color: COLORS.text },
  settleAmount: { ...MONO_STYLE, fontSize: 13, fontWeight: '700', color: COLORS.primary },

  emptyMini: { fontSize: 12, color: COLORS.subtext, paddingVertical: 8 },
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cancel: { fontSize: 14, color: COLORS.subtext, fontWeight: '600' },
  label: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipActiveAlt: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
});

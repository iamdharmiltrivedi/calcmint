import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import PrimaryButton from '../../components/PrimaryButton';

const TYPES = [
  { key: 'Stock', label: 'Stock' },
  { key: 'MF',    label: 'Mutual Fund' },
];
const EXCHANGES = ['NSE', 'BSE'];

export default function AddEditStockScreen({ route, navigation }) {
  const { holdingId, prefillSymbol } = route.params || {};
  const editing = !!holdingId;

  const holdings = usePortfolioStore((s) => s.holdings);
  const add      = usePortfolioStore((s) => s.add);
  const edit     = usePortfolioStore((s) => s.edit);
  const addWatch = useMarketStore((s) => s.addWatch);

  const existing = holdings.find((h) => h.id === holdingId);

  const [name, setName]         = useState(existing?.name || '');
  const [symbol, setSymbol]     = useState(existing?.symbol || prefillSymbol || '');
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '');
  const [buyPrice, setBuyPrice] = useState(existing ? String(existing.buyPrice) : '');
  const [type, setType]         = useState(existing?.type || 'Stock');
  const [exchange, setExchange] = useState(existing?.exchange || 'NSE');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (editing && existing) {
      setName(existing.name);
      setSymbol(existing.symbol);
      setQuantity(String(existing.quantity));
      setBuyPrice(String(existing.buyPrice));
      setType(existing.type);
      setExchange(existing.exchange || 'NSE');
    }
  }, [editing, existing]);

  const onSave = async () => {
    if (!name.trim() || !symbol.trim()) return Alert.alert('Missing fields', 'Name and symbol are required.');
    const qty = parseFloat(quantity) || 0;
    const bp  = parseFloat(buyPrice) || 0;
    if (qty <= 0 || bp <= 0) return Alert.alert('Invalid numbers', 'Quantity and buy price must be positive.');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), symbol: symbol.trim().toUpperCase(),
        quantity: qty, buyPrice: bp, type,
        exchange: type === 'Stock' ? exchange : undefined,
      };
      if (editing) await edit({ ...existing, ...payload });
      else         await add(payload);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const onAddToWatchlist = async () => {
    if (!name.trim() || !symbol.trim()) return Alert.alert('Missing fields', 'Name and symbol are required.');
    await addWatch({
      name: name.trim(), symbol: symbol.trim().toUpperCase(),
      type, exchange: type === 'Stock' ? exchange : undefined,
    });
    Alert.alert('Added to watchlist', `${symbol.toUpperCase()} is on your watchlist.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit holding' : 'Add to portfolio'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <Text style={styles.label}>Asset type</Text>
        <View style={styles.segment}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.segItem, type === t.key && styles.segItemActive]}
              onPress={() => setType(t.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segText, type === t.key && styles.segTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exchange — only for stocks */}
        {type === 'Stock' && (
          <>
            <Text style={styles.label}>Exchange</Text>
            <View style={styles.segment}>
              {EXCHANGES.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.segItem, exchange === e && styles.segItemActive]}
                  onPress={() => setExchange(e)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segText, exchange === e && styles.segTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Field label="Name" value={name} onChangeText={setName} placeholder="HDFC Bank Ltd" />
        <Field
          label={type === 'MF' ? 'Scheme code (MFAPI)' : 'Symbol'}
          value={symbol}
          onChangeText={(t) => setSymbol(t.toUpperCase())}
          placeholder={type === 'MF' ? '120503' : 'HDFCBANK'}
          autoCapitalize="characters"
        />
        <Field label="Quantity / Units" value={quantity} onChangeText={setQuantity} placeholder="10" keyboardType="decimal-pad" />
        <Field label="Avg buy price (₹)" value={buyPrice} onChangeText={setBuyPrice} placeholder="1500" keyboardType="decimal-pad" />

        <PrimaryButton
          title={editing ? 'Save changes' : 'Add to portfolio'}
          onPress={onSave}
          loading={saving}
          variant="gradient"
          style={{ marginTop: 24 }}
        />

        {!editing && (
          <TouchableOpacity style={styles.watchBtn} onPress={onAddToWatchlist} activeOpacity={0.85}>
            <Ionicons name="star-outline" size={16} color={COLORS.primary} />
            <Text style={styles.watchText}>Just add to watchlist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...input }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.faint}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  label: { fontSize: 11.5, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.2, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontWeight: '600',
  },
  segment: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segItemActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 12, fontWeight: '800', color: COLORS.subtext },
  segTextActive: { color: '#fff' },

  watchBtn: {
    marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    padding: 14, borderRadius: 14, backgroundColor: COLORS.primarySoft,
  },
  watchText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
});

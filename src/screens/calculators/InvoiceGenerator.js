import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../../constants/colors';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { formatINR } from '../../utils/formatters';

// Minimal GST-style invoice generator. Computes line totals + GST + final.
// Share button copies a text invoice to the OS share sheet — PDF export
// is a future enhancement (would need react-native-print).
export default function InvoiceGenerator({ navigation }) {
  const [biz, setBiz]   = useState({ name: '', gstin: '', address: '' });
  const [cust, setCust] = useState({ name: '', address: '' });
  const [items, setItems] = useState([{ id: '1', desc: '', qty: '1', rate: '' }]);
  const [gstRate, setGstRate] = useState('18');

  const subtotal = useMemo(() =>
    items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0),
  [items]);
  const gst = subtotal * ((parseFloat(gstRate) || 0) / 100);
  const total = subtotal + gst;

  const addItem = () => setItems((arr) => [...arr, { id: String(Date.now()), desc: '', qty: '1', rate: '' }]);
  const removeItem = (id) => setItems((arr) => arr.filter((x) => x.id !== id));
  const updateItem = (id, key, val) => setItems((arr) => arr.map((x) => (x.id === id ? { ...x, [key]: val } : x)));

  const onShare = async () => {
    if (!biz.name || !cust.name) return Alert.alert('Missing details', 'Add a business name and customer name first.');
    if (items.filter((it) => it.desc && parseFloat(it.qty) > 0 && parseFloat(it.rate) > 0).length === 0) {
      return Alert.alert('No items', 'Add at least one line item.');
    }
    const lines = items
      .filter((it) => it.desc)
      .map((it) => `${it.desc}  ${it.qty} × ${formatINR(parseFloat(it.rate) || 0)} = ${formatINR((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}`)
      .join('\n');
    const text =
      `INVOICE\n\n` +
      `From: ${biz.name}\n${biz.gstin ? `GSTIN ${biz.gstin}\n` : ''}${biz.address ? biz.address + '\n' : ''}` +
      `\nTo: ${cust.name}\n${cust.address ? cust.address + '\n' : ''}\n` +
      `Items:\n${lines}\n\n` +
      `Subtotal: ${formatINR(subtotal)}\nGST (${gstRate}%): ${formatINR(gst)}\nTotal: ${formatINR(total)}\n`;
    await Share.share({ message: text });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        parent="Tools"
        title="Invoice Generator"
        onBack={() => navigation.goBack()}
        right={[{ icon: 'share-outline', onPress: onShare }]}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Section label="Your business">
            <Field placeholder="Business name"   value={biz.name}    onChange={(v) => setBiz({ ...biz, name: v })} />
            <Field placeholder="GSTIN (optional)" value={biz.gstin}   onChange={(v) => setBiz({ ...biz, gstin: v.toUpperCase() })} autoCapitalize="characters" />
            <Field placeholder="Address"          value={biz.address} onChange={(v) => setBiz({ ...biz, address: v })} multiline />
          </Section>

          <Section label="Bill to">
            <Field placeholder="Customer name" value={cust.name}    onChange={(v) => setCust({ ...cust, name: v })} />
            <Field placeholder="Address"        value={cust.address} onChange={(v) => setCust({ ...cust, address: v })} multiline />
          </Section>

          <Section label="Items">
            {items.map((it, idx) => (
              <View key={it.id} style={styles.itemRow}>
                <TextInput
                  style={[styles.itemInput, { flex: 2 }]}
                  value={it.desc}
                  onChangeText={(v) => updateItem(it.id, 'desc', v)}
                  placeholder="Description"
                  placeholderTextColor={COLORS.faint}
                />
                <TextInput
                  style={styles.itemInput}
                  value={it.qty}
                  onChangeText={(v) => updateItem(it.id, 'qty', v)}
                  placeholder="Qty"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.faint}
                />
                <TextInput
                  style={styles.itemInput}
                  value={it.rate}
                  onChangeText={(v) => updateItem(it.id, 'rate', v)}
                  placeholder="Rate"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.faint}
                />
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(it.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.faint} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={addItem} activeOpacity={0.85}>
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add line item</Text>
            </TouchableOpacity>
          </Section>

          <Section label="GST">
            <View style={styles.gstRow}>
              {['0', '5', '12', '18', '28'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.gstChip, gstRate === r && styles.gstChipActive]}
                  onPress={() => setGstRate(r)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.gstChipText, gstRate === r && { color: '#fff' }]}>{r}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <View style={styles.totalsCard}>
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label={`GST (${gstRate}%)`} value={formatINR(gst)} />
            <View style={styles.divider} />
            <Row label="Total" value={formatINR(total)} bold />
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.9}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.shareText}>Share invoice</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ label, children }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
function Field({ placeholder, value, onChange, ...rest }) {
  return (
    <TextInput
      style={[styles.field, rest.multiline && { height: undefined, minHeight: 50, textAlignVertical: 'top', paddingTop: 12 }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.faint}
      {...rest}
    />
  );
}
function Row({ label, value, bold }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && { color: COLORS.text, fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.totalsValue, bold && { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 60 },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.hairline, gap: 8 },

  field: {
    backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, height: 44,
    fontSize: 13.5, color: COLORS.text, fontWeight: '600',
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 10, height: 44,
    fontSize: 12.5, color: COLORS.text, fontWeight: '600',
    borderWidth: 0.5, borderColor: COLORS.hairline,
  },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  addBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

  gstRow: { flexDirection: 'row', gap: 6 },
  gstChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.background, borderWidth: 0.5, borderColor: COLORS.hairline },
  gstChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gstChipText: { fontSize: 12, fontWeight: '800', color: COLORS.subtext },

  totalsCard: { marginTop: 14, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: COLORS.hairline },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  totalsLabel: { fontSize: 12.5, color: COLORS.subtext, fontWeight: '700' },
  totalsValue: { ...MONO_STYLE, fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  divider: { height: 0.5, backgroundColor: COLORS.hairline, marginVertical: 6 },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  shareText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

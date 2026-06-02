import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import ReceiptService from '../services/ReceiptService';
import NotificationService from '../services/NotificationService';
import { DOC_KINDS, DOC_KIND_LIST, suggestKind } from '../constants/documentKinds';
import { formatINR, formatINRFull } from '../utils/formatters';
import PrimaryButton from '../components/PrimaryButton';

function parseDDMMYYYY(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt) ? null : dt;
}
const toDDMMYYYY = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function ReceiptDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [receipt, setReceipt] = useState(null);
  const [kind, setKind] = useState('receipt');
  const [kindManual, setKindManual] = useState(false);
  const [vendor, setVendor] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [warrantyMonthsStr, setWarrantyMonthsStr] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    StorageService.getReceipts().then((all) => {
      const r = all.find((x) => x.id === id);
      if (r) {
        setReceipt(r);
        setKind(r.kind || 'receipt');
        setKindManual(!!r.kindManual);
        setVendor(r.vendor || '');
        setAmountStr(r.amount ? String(r.amount) : '');
        setDateStr(toDDMMYYYY(r.date));
        setWarrantyMonthsStr(r.warrantyMonths ? String(r.warrantyMonths) : '');
      }
    });
  }, [id]);

  // Auto-suggest kind from vendor — only while user hasn't manually overridden.
  const onVendorChange = (txt) => {
    setVendor(txt);
    if (!kindManual) {
      const guess = suggestKind(txt);
      if (guess) setKind(guess);
    }
  };

  const onPickKind = (k) => {
    setKind(k);
    setKindManual(true);
  };

  const scheduleWarrantyReminder = useCallback(async (date, months, vendorName) => {
    if (!date || !months) return null;
    const exp = new Date(date);
    exp.setMonth(exp.getMonth() + Number(months));
    // 30 days before expiry, at 9 AM
    const remindAt = new Date(exp.getTime() - 30 * 24 * 60 * 60 * 1000);
    remindAt.setHours(9, 0, 0, 0);
    return NotificationService.scheduleAt(remindAt, {
      title: 'Warranty expiring in 30 days',
      body: `${vendorName || 'Receipt'} warranty ends on ${exp.toLocaleDateString('en-IN')}.`,
      data: { kind: 'receipt-warranty', id },
    });
  }, [id]);

  const save = async () => {
    if (!receipt) return;
    const amount = parseFloat(amountStr) || 0;
    const date = parseDDMMYYYY(dateStr) || (receipt.date ? new Date(receipt.date) : new Date());
    const warrantyMonths = parseInt(warrantyMonthsStr, 10) || 0;

    // Reschedule warranty reminder if relevant fields changed
    let warrantyReminderId = receipt.warrantyReminderId || null;
    if (warrantyReminderId) await NotificationService.cancel(warrantyReminderId);
    warrantyReminderId = warrantyMonths > 0
      ? await scheduleWarrantyReminder(date, warrantyMonths, vendor)
      : null;

    const updated = {
      ...receipt,
      kind,
      kindManual,
      vendor: vendor.trim(),
      amount,
      date: date.toISOString(),
      warrantyMonths,
      warrantyReminderId,
    };
    const all = await StorageService.getReceipts();
    const next = all.map((r) => (r.id === id ? updated : r));
    await StorageService.saveReceipts(next);
    setReceipt(updated);
    Alert.alert('Saved');
  };

  const onDelete = () => {
    Alert.alert('Delete receipt?', 'The photo and details are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (receipt?.warrantyReminderId) await NotificationService.cancel(receipt.warrantyReminderId);
          if (receipt?.imageUri) await ReceiptService.deleteImage(receipt.imageUri);
          const all = await StorageService.getReceipts();
          await StorageService.saveReceipts(all.filter((r) => r.id !== id));
          navigation.goBack();
        },
      },
    ]);
  };

  if (!receipt) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24, color: COLORS.subtext }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Document</Text>
        <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: '#FCE6EC' }]}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {(() => {
            const isImage = !receipt.mimeType || /^image\//i.test(receipt.mimeType);
            const isPdf = /pdf/i.test(receipt.mimeType || '') || /\.pdf$/i.test(receipt.imageUri || '');
            const openFile = async () => {
              try {
                await ReceiptService.openExternally(receipt.imageUri, receipt.mimeType);
              } catch (e) {
                Alert.alert('Could not open file', e.message);
              }
            };
            if (isImage) {
              return <Image source={{ uri: receipt.imageUri }} style={styles.image} resizeMode="cover" />;
            }
            return (
              <TouchableOpacity style={styles.fileCard} onPress={openFile} activeOpacity={0.85}>
                <Ionicons
                  name={isPdf ? 'document-text' : 'document-attach'}
                  size={56}
                  color={COLORS.primary}
                />
                <Text style={styles.fileCardName} numberOfLines={2}>
                  {receipt.fileName || (isPdf ? 'PDF document' : 'File')}
                </Text>
                <View style={styles.fileCardOpenBtn}>
                  <Ionicons name="open-outline" size={14} color="#fff" />
                  <Text style={styles.fileCardOpenText}>Open file</Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {receipt.ocrAt ? (
            <View style={styles.extractedBanner}>
              <Ionicons name="sparkles" size={14} color={COLORS.primary} />
              <Text style={styles.extractedText}>
                Fields below were extracted from the image. Review before saving.
              </Text>
            </View>
          ) : null}

          <View style={styles.kindRowHeader}>
            <Text style={styles.fieldLabel}>Category</Text>
            {!kindManual && receipt && suggestKind(vendor) === kind && vendor.trim().length > 0 && (
              <Text style={styles.autoTag}>AUTO</Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kindChipRow}
          >
            {DOC_KIND_LIST.map((k) => {
              const active = kind === k.key;
              return (
                <TouchableOpacity
                  key={k.key}
                  style={[
                    styles.kindChip,
                    active && { backgroundColor: k.color, borderColor: k.color },
                    !active && { backgroundColor: k.soft, borderColor: 'transparent' },
                  ]}
                  onPress={() => onPickKind(k.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={k.icon} size={13} color={active ? '#fff' : k.color} />
                  <Text style={[styles.kindChipText, { color: active ? '#fff' : k.color }]}>{k.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Vendor / item</Text>
          <TextInput
            style={styles.input}
            value={vendor}
            onChangeText={onVendorChange}
            placeholder="e.g. Adani Electricity / Croma — LG washing machine"
          />

          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="e.g. 28500"
            keyboardType="numeric"
          />
          {amountStr ? <Text style={styles.hint}>{formatINRFull(parseFloat(amountStr) || 0)}</Text> : null}

          <Text style={styles.fieldLabel}>Purchase date (DD/MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="e.g. 04/03/2026"
          />

          <Text style={styles.fieldLabel}>Warranty (months)</Text>
          <TextInput
            style={styles.input}
            value={warrantyMonthsStr}
            onChangeText={setWarrantyMonthsStr}
            placeholder="0 = no warranty"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            {warrantyMonthsStr && parseInt(warrantyMonthsStr, 10) > 0
              ? 'You will get a local reminder 30 days before expiry.'
              : 'Set months to enable a warranty reminder.'}
          </Text>

          {receipt.ocrText ? (
            <View style={styles.rawWrap}>
              <TouchableOpacity
                style={styles.rawToggle}
                onPress={() => setShowRawText((v) => !v)}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={14} color={COLORS.subtext} />
                <Text style={styles.rawToggleText}>
                  {showRawText ? 'Hide extracted text' : 'View extracted text'}
                </Text>
                <Ionicons name={showRawText ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.subtext} />
              </TouchableOpacity>
              {showRawText ? (
                <ScrollView style={styles.rawBox} nestedScrollEnabled>
                  <Text style={styles.rawText} selectable>
                    {receipt.ocrText}
                  </Text>
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          <PrimaryButton title="Save" onPress={save} style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  body: { padding: 18, paddingBottom: 40 },
  image: {
    width: '100%', aspectRatio: 1, borderRadius: 16,
    backgroundColor: '#E8EBE7', marginBottom: 18,
  },
  fileCard: {
    width: '100%', aspectRatio: 1.4, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 24, marginBottom: 18,
  },
  fileCardName: {
    fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  fileCardOpenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.text, paddingHorizontal: 14, height: 36, borderRadius: 10,
    marginTop: 4,
  },
  fileCardOpenText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  fieldLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  hint: { fontSize: 11, color: COLORS.subtext, marginTop: 6 },

  kindRowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  autoTag: {
    fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.8,
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    overflow: 'hidden',
  },
  kindChipRow: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  kindChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 34, borderRadius: 17,
    borderWidth: 1,
  },
  kindChipText: { fontSize: 12, fontWeight: '700' },

  extractedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primarySoft, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(11,93,59,0.18)',
    marginBottom: 4,
  },
  extractedText: { flex: 1, fontSize: 12, color: COLORS.primaryDeep, fontWeight: '600', lineHeight: 17 },

  rawWrap: { marginTop: 18 },
  rawToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, paddingHorizontal: 14, height: 42, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rawToggleText: { flex: 1, fontSize: 12, color: COLORS.subtext, fontWeight: '700' },
  rawBox: {
    maxHeight: 220, marginTop: 8,
    backgroundColor: COLORS.card, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rawText: { fontSize: 11, color: COLORS.subtext, lineHeight: 16 },
});

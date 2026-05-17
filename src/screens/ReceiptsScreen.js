import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert,
  ActionSheetIOS, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import ReceiptService from '../services/ReceiptService';
import NotificationService from '../services/NotificationService';
import OcrService from '../services/OcrService';
import { DOC_KINDS, DOC_KIND_LIST, suggestKind } from '../constants/documentKinds';
import { parseReceipt } from '../utils/receiptParser';
import { formatINR } from '../utils/formatters';

const daysUntil = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const t = new Date();
  t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

export default function ReceiptsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | kind key

  useEffect(() => { StorageService.getReceipts().then(setItems); }, []);

  // Refresh whenever this screen comes back into focus (covers edits in detail screen)
  useEffect(() => {
    const focus = navigation.addListener('focus', () => {
      StorageService.getReceipts().then(setItems);
    });
    return focus;
  }, [navigation]);

  const persist = useCallback(async (next) => {
    setItems(next);
    await StorageService.saveReceipts(next);
  }, []);

  const onAdd = async (source) => {
    setBusy(true);
    setBusyLabel('');
    try {
      let uri = null;
      if (source === 'scan')         uri = await ReceiptService.scanDocument();
      else if (source === 'camera')  uri = await ReceiptService.pickFromCamera();
      else                            uri = await ReceiptService.pickFromLibrary();
      if (!uri) return;

      const id = Date.now().toString();
      setBusyLabel('Saving image…');
      const stored = await ReceiptService.saveImage(uri, id);

      // Best-effort OCR + parse. Silent on failure.
      let extracted = null;
      let ocrText = '';
      if (OcrService.isAvailable()) {
        setBusyLabel('Reading text…');
        ocrText = await OcrService.recognize(stored);
        if (ocrText) extracted = parseReceipt(ocrText);
      }

      const today = new Date();
      const suggestedKind = ocrText
        ? suggestKind(((extracted?.vendor || '') + ' ' + ocrText).slice(0, 2000))
        : null;
      const draft = {
        id,
        imageUri: stored,
        kind: suggestedKind || (filter === 'all' ? 'receipt' : filter),
        kindManual: false,
        scanned: source === 'scan',
        vendor: extracted?.vendor || '',
        amount: extracted?.amount || 0,
        date: extracted?.date || today.toISOString(),
        warrantyMonths: 0,
        warrantyReminderId: null,
        ocrText: ocrText || undefined,
        ocrAt: ocrText ? today.toISOString() : undefined,
        createdAt: today.toISOString(),
      };
      const next = [draft, ...items];
      await persist(next);
      navigation.navigate('ReceiptDetail', { id });
    } catch (e) {
      Alert.alert('Could not add document', e.message);
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const showSource = () => {
    const scannerOn = ReceiptService.isScannerAvailable();
    if (Platform.OS === 'ios') {
      const options = scannerOn
        ? ['Cancel', 'Scan document', 'Take photo', 'Choose from library']
        : ['Cancel', 'Take photo', 'Choose from library'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (i) => {
          if (i === 0) return;
          if (scannerOn) {
            if (i === 1) onAdd('scan');
            else if (i === 2) onAdd('camera');
            else if (i === 3) onAdd('library');
          } else {
            if (i === 1) onAdd('camera');
            else if (i === 2) onAdd('library');
          }
        },
      );
    } else {
      const buttons = [{ text: 'Cancel', style: 'cancel' }];
      if (scannerOn) buttons.push({ text: 'Scan document', onPress: () => onAdd('scan') });
      buttons.push({ text: 'Take photo', onPress: () => onAdd('camera') });
      buttons.push({ text: 'Choose from library', onPress: () => onAdd('library') });
      Alert.alert('Add document', '', buttons);
    }
  };

  const totals = useMemo(() => ({
    count: items.length,
    expiringSoon: items.filter((r) => {
      if (!r.warrantyMonths || !r.date) return false;
      const exp = new Date(r.date);
      exp.setMonth(exp.getMonth() + Number(r.warrantyMonths));
      const d = daysUntil(exp.toISOString());
      return d !== null && d >= 0 && d <= 30;
    }).length,
  }), [items]);

  const kindCounts = useMemo(() => {
    const counts = { all: items.length };
    for (const k of Object.keys(DOC_KINDS)) counts[k] = 0;
    for (const r of items) {
      const k = r.kind || 'receipt';
      if (counts[k] != null) counts[k] += 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((r) => (r.kind || 'receipt') === filter);
  }, [items, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity onPress={showSource} disabled={busy} style={[styles.iconBtn, { backgroundColor: COLORS.text }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <FilterChip label="All" count={kindCounts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
        {DOC_KIND_LIST.map((k) => (
          <FilterChip
            key={k.key}
            label={k.label}
            count={kindCounts[k.key] || 0}
            icon={k.icon}
            color={k.color}
            soft={k.soft}
            active={filter === k.key}
            onPress={() => setFilter(k.key)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Stat label="STORED" value={totals.count} />
          <Stat label="EXPIRING <30D" value={totals.expiringSoon} accent={totals.expiringSoon > 0 ? COLORS.warning : undefined} />
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyHint}>Snap a photo of a bill, invoice, loan paper, or warranty card to keep it safe.</Text>
            <TouchableOpacity style={styles.addCta} onPress={showSource} disabled={busy}>
              <Ionicons name={ReceiptService.isScannerAvailable() ? 'scan' : 'camera'} size={18} color="#fff" />
              <Text style={styles.addCtaText}>Add your first document</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Nothing in this category</Text>
            <Text style={styles.emptyHint}>Tap All to see everything, or add a new document.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((r) => (
              <ReceiptTile
                key={r.id}
                receipt={r}
                onPress={() => navigation.navigate('ReceiptDetail', { id: r.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {busy && busyLabel ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <View style={styles.busyCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.busyText}>{busyLabel}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ReceiptTile({ receipt, onPress }) {
  let warrantyTag = null;
  if (receipt.warrantyMonths && receipt.date) {
    const exp = new Date(receipt.date);
    exp.setMonth(exp.getMonth() + Number(receipt.warrantyMonths));
    const d = daysUntil(exp.toISOString());
    if (d != null) {
      if (d < 0) warrantyTag = { label: 'Expired', color: COLORS.error };
      else if (d <= 30) warrantyTag = { label: `${d}d left`, color: COLORS.warning };
    }
  }
  const kindCfg = DOC_KINDS[receipt.kind] || DOC_KINDS.receipt;
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: receipt.imageUri }} style={styles.tileImage} resizeMode="cover" />
      <View style={[styles.kindBadge, { backgroundColor: kindCfg.soft }]}>
        <Ionicons name={kindCfg.icon} size={11} color={kindCfg.color} />
        <Text style={[styles.kindBadgeText, { color: kindCfg.color }]}>{kindCfg.label}</Text>
      </View>
      {receipt.scanned ? (
        <View style={styles.scannedBadge}>
          <Ionicons name="scan" size={10} color="#fff" />
        </View>
      ) : null}
      <View style={styles.tileMeta}>
        <Text style={styles.tileVendor} numberOfLines={1}>
          {receipt.vendor || `Unnamed ${kindCfg.label.toLowerCase()}`}
        </Text>
        <Text style={styles.tileAmount}>{receipt.amount ? formatINR(receipt.amount) : '—'}</Text>
      </View>
      {warrantyTag && (
        <View style={[styles.warrantyPill, { backgroundColor: warrantyTag.color }]}>
          <Text style={styles.warrantyText}>{warrantyTag.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FilterChip({ label, count, icon, color, soft, active, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && {
          backgroundColor: color || COLORS.text,
          borderColor: color || COLORS.text,
        },
        !active && soft && { backgroundColor: soft, borderColor: 'transparent' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={active ? '#fff' : color || COLORS.text}
        />
      ) : null}
      <Text style={[styles.chipText, active && { color: '#fff' }, !active && color && { color }]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <Text style={[styles.chipCountText, active && { color: '#fff' }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Stat({ label, value, accent }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
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

  summary: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 10, color: COLORS.subtext, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { ...MONO_STYLE, fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptyHint: { fontSize: 12, color: COLORS.subtext, marginTop: 4, textAlign: 'center', lineHeight: 18 },
  addCta: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.text, paddingHorizontal: 18, height: 46, borderRadius: 14,
  },
  addCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%', backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  tileImage: { width: '100%', aspectRatio: 1, backgroundColor: '#E8EBE7' },
  tileMeta: { padding: 10 },
  tileVendor: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  tileAmount: { ...MONO_STYLE, fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  warrantyPill: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  warrantyText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  chipRow: {
    paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8, gap: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 32, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  chipCount: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: 'rgba(14,26,20,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipCountText: { fontSize: 10, fontWeight: '800', color: COLORS.text },

  kindBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  kindBadgeText: { fontSize: 10, fontWeight: '700' },
  scannedBadge: {
    position: 'absolute', bottom: 56, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(14,26,20,0.78)',
    alignItems: 'center', justifyContent: 'center',
  },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(14,26,20,0.30)',
  },
  busyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, ...COLORS.shadow,
  },
  busyText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});

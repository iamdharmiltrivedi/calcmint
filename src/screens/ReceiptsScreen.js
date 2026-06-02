import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert,
  ActionSheetIOS, Platform, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MONO_STYLE } from '../constants/colors';
import StorageService from '../services/StorageService';
import ReceiptService from '../services/ReceiptService';
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

const ROOT = '__root__';     // top-level "All folders" view
const UNFILED = '__unfiled__'; // pseudo-folder for docs with no folderId

export default function ReceiptsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialFolderId = route?.params?.folderId || null;
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | kind key
  const [view, setView] = useState(initialFolderId || ROOT); // ROOT | folderId | UNFILED
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    Promise.all([StorageService.getReceipts(), StorageService.getDocFolders()])
      .then(([recs, fs]) => { setItems(recs); setFolders(fs); });
  }, []);

  // If the screen is re-entered with a folderId param, jump to it.
  useEffect(() => {
    if (initialFolderId) setView(initialFolderId);
  }, [initialFolderId]);

  useEffect(() => {
    const focus = navigation.addListener('focus', () => {
      Promise.all([StorageService.getReceipts(), StorageService.getDocFolders()])
        .then(([recs, fs]) => { setItems(recs); setFolders(fs); });
    });
    return focus;
  }, [navigation]);

  const persistItems = useCallback(async (next) => {
    setItems(next);
    await StorageService.saveReceipts(next);
  }, []);

  const persistFolders = useCallback(async (next) => {
    setFolders(next);
    await StorageService.saveDocFolders(next);
  }, []);

  const currentFolder = useMemo(
    () => (view === ROOT || view === UNFILED ? null : folders.find((f) => f.id === view)),
    [view, folders],
  );

  const onAdd = async (source) => {
    setBusy(true);
    setBusyLabel('');
    try {
      let uri = null;
      let pickedName = '';
      let pickedMime = '';
      if (source === 'scan') {
        uri = await ReceiptService.scanDocument();
      } else if (source === 'camera') {
        uri = await ReceiptService.pickFromCamera();
      } else if (source === 'file') {
        const picked = await ReceiptService.pickFromFiles();
        if (picked) {
          uri = picked.uri;
          pickedName = picked.name;
          pickedMime = picked.mimeType;
        }
      } else {
        uri = await ReceiptService.pickFromLibrary();
      }
      if (!uri) return;

      const id = Date.now().toString();
      // Treat camera/scan/library output and image MIME types as images.
      // Anything else (PDF, docx, etc.) is stored as-is, no OCR, no compression.
      const isImage = source !== 'file' || ReceiptService.isImageMime(pickedMime);

      let stored;
      if (isImage) {
        setBusyLabel('Saving image…');
        stored = await ReceiptService.saveImage(uri, id);
      } else {
        setBusyLabel('Saving file…');
        stored = await ReceiptService.saveFile(uri, id, pickedName);
      }

      let extracted = null;
      let ocrText = '';
      if (isImage && OcrService.isAvailable()) {
        // OCR is opt-in — ask before running it so users who just want to
        // archive an image aren't forced to wait for text extraction.
        const wantsOcr = await new Promise((resolve) => {
          Alert.alert(
            'Extract text from image?',
            'We can read the vendor, amount and date from this image and auto-fill the details.',
            [
              { text: 'Skip', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Extract', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        });
        if (wantsOcr) {
          setBusyLabel('Reading text…');
          ocrText = await OcrService.recognize(stored);
          if (ocrText) extracted = parseReceipt(ocrText);
        }
      }

      const today = new Date();
      const suggestedKind = ocrText
        ? suggestKind(((extracted?.vendor || '') + ' ' + ocrText).slice(0, 2000))
        : null;
      // New docs added from inside a folder get assigned to that folder.
      const folderId = view === ROOT || view === UNFILED ? null : view;
      const draft = {
        id,
        imageUri: stored,
        mimeType: isImage ? 'image/jpeg' : (pickedMime || ''),
        fileName: isImage ? undefined : pickedName,
        kind: suggestedKind || (filter === 'all' ? 'receipt' : filter),
        kindManual: false,
        scanned: source === 'scan',
        vendor: extracted?.vendor || (isImage ? '' : pickedName.replace(/\.[^.]+$/, '')),
        amount: extracted?.amount || 0,
        date: extracted?.date || today.toISOString(),
        warrantyMonths: 0,
        warrantyReminderId: null,
        folderId,
        ocrText: ocrText || undefined,
        ocrAt: ocrText ? today.toISOString() : undefined,
        createdAt: today.toISOString(),
      };
      const next = [draft, ...items];
      await persistItems(next);
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
        ? ['Cancel', 'Scan document', 'Take photo', 'Choose from library', 'Choose file (PDF, etc.)']
        : ['Cancel', 'Take photo', 'Choose from library', 'Choose file (PDF, etc.)'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (i) => {
          if (i === 0) return;
          if (scannerOn) {
            if (i === 1) onAdd('scan');
            else if (i === 2) onAdd('camera');
            else if (i === 3) onAdd('library');
            else if (i === 4) onAdd('file');
          } else {
            if (i === 1) onAdd('camera');
            else if (i === 2) onAdd('library');
            else if (i === 3) onAdd('file');
          }
        },
      );
    } else {
      const buttons = [{ text: 'Cancel', style: 'cancel' }];
      if (scannerOn) buttons.push({ text: 'Scan document', onPress: () => onAdd('scan') });
      buttons.push({ text: 'Take photo', onPress: () => onAdd('camera') });
      buttons.push({ text: 'Choose from library', onPress: () => onAdd('library') });
      buttons.push({ text: 'Choose file (PDF, etc.)', onPress: () => onAdd('file') });
      Alert.alert('Add document', '', buttons);
    }
  };

  // ── Folder ops ────────────────────────────────────────────────────────────
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const f = { id: Date.now().toString(), name, createdAt: new Date().toISOString() };
    await persistFolders([f, ...folders]);
    setNewFolderName('');
    setNewFolderOpen(false);
    setView(f.id);
  };

  const deleteFolder = (id) =>
    Alert.alert(
      'Delete folder?',
      'Documents inside this folder will move back to Uncategorized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await persistFolders(folders.filter((f) => f.id !== id));
            await persistItems(items.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)));
            if (view === id) setView(ROOT);
          },
        },
      ],
    );

  // ── Counts ────────────────────────────────────────────────────────────────
  const folderCount = useCallback(
    (fid) => items.filter((r) => r.folderId === fid).length,
    [items],
  );
  const unfiledCount = useMemo(
    () => items.filter((r) => !r.folderId).length,
    [items],
  );

  // ── Items visible in current scope (folder | unfiled) ────────────────────
  const scopedItems = useMemo(() => {
    if (view === ROOT) return items;
    if (view === UNFILED) return items.filter((r) => !r.folderId);
    return items.filter((r) => r.folderId === view);
  }, [items, view]);

  const totals = useMemo(() => ({
    count: scopedItems.length,
    expiringSoon: scopedItems.filter((r) => {
      if (!r.warrantyMonths || !r.date) return false;
      const exp = new Date(r.date);
      exp.setMonth(exp.getMonth() + Number(r.warrantyMonths));
      const d = daysUntil(exp.toISOString());
      return d !== null && d >= 0 && d <= 30;
    }).length,
  }), [scopedItems]);

  const kindCounts = useMemo(() => {
    const counts = { all: scopedItems.length };
    for (const k of Object.keys(DOC_KINDS)) counts[k] = 0;
    for (const r of scopedItems) {
      const k = r.kind || 'receipt';
      if (counts[k] != null) counts[k] += 1;
    }
    return counts;
  }, [scopedItems]);

  const filtered = useMemo(() => {
    if (filter === 'all') return scopedItems;
    return scopedItems.filter((r) => (r.kind || 'receipt') === filter);
  }, [scopedItems, filter]);

  const inFolderView = view !== ROOT;
  const headerTitle = view === ROOT
    ? 'Documents'
    : view === UNFILED
      ? 'Uncategorized'
      : currentFolder?.name || 'Folder';

  const onHeaderBack = () => {
    if (inFolderView) { setView(ROOT); setFilter('all'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onHeaderBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{headerTitle}</Text>
        <TouchableOpacity onPress={showSource} disabled={busy} style={[styles.iconBtn, { backgroundColor: COLORS.text }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Folder strip only on root view */}
      {!inFolderView && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stripWrap}
          contentContainerStyle={styles.folderStrip}
        >
          <TouchableOpacity
            style={styles.folderCard}
            activeOpacity={0.85}
            onPress={() => setNewFolderOpen(true)}
          >
            <View style={[styles.folderIcon, { backgroundColor: COLORS.primarySoft }]}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.folderName} numberOfLines={1}>New folder</Text>
            <Text style={styles.folderCount}>Create</Text>
          </TouchableOpacity>

          {folders.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={styles.folderCard}
              activeOpacity={0.85}
              onPress={() => { setView(f.id); setFilter('all'); }}
              onLongPress={() => deleteFolder(f.id)}
            >
              <View style={[styles.folderIcon, { backgroundColor: COLORS.card }]}>
                <Ionicons name={f.tripId ? 'airplane' : 'folder'} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.folderName} numberOfLines={1}>{f.name}</Text>
              <Text style={styles.folderCount}>{folderCount(f.id)} item{folderCount(f.id) === 1 ? '' : 's'}</Text>
              {f.tripId ? (
                <View style={styles.tripTag}>
                  <Text style={styles.tripTagText}>TRIP</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}

          {unfiledCount > 0 && (
            <TouchableOpacity
              style={styles.folderCard}
              activeOpacity={0.85}
              onPress={() => { setView(UNFILED); setFilter('all'); }}
            >
              <View style={[styles.folderIcon, { backgroundColor: COLORS.card }]}>
                <Ionicons name="albums-outline" size={20} color={COLORS.subtext} />
              </View>
              <Text style={styles.folderName} numberOfLines={1}>Uncategorized</Text>
              <Text style={styles.folderCount}>{unfiledCount} item{unfiledCount === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Tag chips — applied to whatever scope is active */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Stat label="STORED" value={totals.count} />
          <Stat label="EXPIRING <30D" value={totals.expiringSoon} accent={totals.expiringSoon > 0 ? COLORS.warning : undefined} />
        </View>

        {scopedItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>
              {inFolderView ? 'No documents in this folder yet' : 'No documents yet'}
            </Text>
            <Text style={styles.emptyHint}>
              Snap a photo of a bill, invoice, loan paper, or warranty card to keep it safe.
            </Text>
            <TouchableOpacity style={styles.addCta} onPress={showSource} disabled={busy}>
              <Ionicons name={ReceiptService.isScannerAvailable() ? 'scan' : 'camera'} size={18} color="#fff" />
              <Text style={styles.addCtaText}>Add document</Text>
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

      <Modal
        visible={newFolderOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewFolderOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNewFolderOpen(false)}
        >
          <View style={[styles.modalCard, { marginBottom: 24 + insets.bottom }]}>
            <Text style={styles.modalTitle}>New folder</Text>
            <TextInput
              style={styles.modalInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={COLORS.faint}
              autoFocus
              maxLength={40}
              onSubmitEditing={createFolder}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNewFolderOpen(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createFolder}
                style={[styles.modalBtn, { backgroundColor: COLORS.text }]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  const isImage = !receipt.mimeType || /^image\//i.test(receipt.mimeType);
  const isPdf = /pdf/i.test(receipt.mimeType || '') || /\.pdf$/i.test(receipt.imageUri || '');
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      {isImage ? (
        <Image source={{ uri: receipt.imageUri }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <View style={[styles.tileImage, styles.tileFile, { backgroundColor: kindCfg.soft }]}>
          <Ionicons
            name={isPdf ? 'document-text' : 'document-attach'}
            size={44}
            color={kindCfg.color}
          />
          <Text style={[styles.tileFileLabel, { color: kindCfg.color }]} numberOfLines={1}>
            {isPdf ? 'PDF' : (receipt.fileName || 'File')}
          </Text>
        </View>
      )}
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
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },

  body: { padding: 18, paddingTop: 4 },

  summary: { flexDirection: 'row', gap: 10, marginBottom: 14 },
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
  tileFile: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  tileFileLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tileMeta: { padding: 10 },
  tileVendor: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  tileAmount: { ...MONO_STYLE, fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  warrantyPill: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  warrantyText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  stripWrap: { flexGrow: 0, maxHeight: 110 },
  folderStrip: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 10 },
  folderCard: {
    width: 110, padding: 10, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  folderIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  folderName: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  folderCount: { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  tripTag: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: COLORS.primarySoft,
  },
  tripTagText: { fontSize: 8, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.6 },

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

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.background, marginHorizontal: 18, padding: 18,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, height: 48, backgroundColor: COLORS.card,
    color: COLORS.text, fontSize: 15, fontWeight: '600',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  modalBtn: {
    paddingHorizontal: 16, height: 40, borderRadius: 12, justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  modalBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
});

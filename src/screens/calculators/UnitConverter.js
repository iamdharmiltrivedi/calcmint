import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY, MONO_STYLE } from '../../constants/colors';
import { UNIT_CATEGORIES, findCategory, findUnit } from '../../constants/units';
import { convert, formatConverted } from '../../utils/unitConverter';
import CalcHeader from '../../components/CalcHeader';
import AdBanner from '../../components/AdBanner';
import StorageService from '../../services/StorageService';
import AdsService from '../../services/AdsService';

const CALC_ID = 'unit_converter';
const ACCENT = CATEGORY.teal.c;
const SOFT   = CATEGORY.teal.soft;

// Sensible default unit pairs per category
const DEFAULTS = {
  length:      { from: 'ft',   to: 'm',    val: '1' },
  area:        { from: 'sqft', to: 'sqm',  val: '1000' },
  weight:      { from: 'g',    to: 'tola', val: '100' },
  volume:      { from: 'L',    to: 'gal_us', val: '1' },
  temperature: { from: 'C',    to: 'F',    val: '37' },
  time:        { from: 'h',    to: 'min',  val: '1' },
  speed:       { from: 'kmph', to: 'mph',  val: '60' },
};

export default function UnitConverter({ navigation }) {
  const [catKey, setCatKey] = useState('length');
  const [fromKey, setFromKey] = useState(DEFAULTS.length.from);
  const [toKey,   setToKey]   = useState(DEFAULTS.length.to);
  const [valStr,  setValStr]  = useState(DEFAULTS.length.val);
  const [picker, setPicker]   = useState(null); // 'from' | 'to' | null

  const category = useMemo(() => findCategory(catKey), [catKey]);
  const fromUnit = useMemo(() => findUnit(category, fromKey), [category, fromKey]);
  const toUnit   = useMemo(() => findUnit(category, toKey),   [category, toKey]);

  // Restore persisted state once
  useEffect(() => {
    StorageService.getCalculatorInputs(CALC_ID).then((s) => {
      if (!s) return;
      if (s.catKey && findCategory(s.catKey)) {
        setCatKey(s.catKey);
        const cat = findCategory(s.catKey);
        if (s.fromKey && findUnit(cat, s.fromKey)) setFromKey(s.fromKey);
        if (s.toKey && findUnit(cat, s.toKey))     setToKey(s.toKey);
        if (s.valStr != null) setValStr(String(s.valStr));
      }
    });
  }, []);

  // Persist
  useEffect(() => {
    StorageService.saveCalculatorInputs(CALC_ID, { catKey, fromKey, toKey, valStr });
  }, [catKey, fromKey, toKey, valStr]);

  const onCategory = (key) => {
    if (key === catKey) return;
    setCatKey(key);
    const d = DEFAULTS[key];
    setFromKey(d.from);
    setToKey(d.to);
    setValStr(d.val);
  };

  const swap = () => {
    setFromKey(toKey);
    setToKey(fromKey);
  };

  const inputNum = parseFloat(valStr);
  const result = convert(inputNum, fromUnit, toUnit);
  const factorPreview = useMemo(() => {
    if (!fromUnit || !toUnit) return null;
    const v = convert(1, fromUnit, toUnit);
    if (v == null) return null;
    return `1 ${fromUnit.short} = ${formatConverted(v)} ${toUnit.short}`;
  }, [fromUnit, toUnit]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalcHeader
        title="Unit Converter"
        subtitle="Indian + standard units"
        icon="git-compare-outline"
        accent={ACCENT}
        accentSoft={SOFT}
        onBack={() => { AdsService.maybeShowInterstitial(); navigation.goBack(); }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {UNIT_CATEGORIES.map((c) => {
              const active = c.key === catKey;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.chip,
                    active && { backgroundColor: ACCENT, borderColor: ACCENT },
                  ]}
                  onPress={() => onCategory(c.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={c.icon} size={13} color={active ? '#fff' : COLORS.text} />
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* From */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>FROM</Text>
            <TouchableOpacity style={styles.unitRow} onPress={() => setPicker('from')} activeOpacity={0.7}>
              <Text style={styles.unitText}>{fromUnit?.label}</Text>
              <View style={styles.shortPill}>
                <Text style={styles.shortText}>{fromUnit?.short}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={valStr}
              onChangeText={setValStr}
              placeholder="0"
              keyboardType="numeric"
              selectTextOnFocus
            />
          </View>

          {/* Swap */}
          <View style={styles.swapWrap}>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.swapBtn} onPress={swap} activeOpacity={0.8}>
              <Ionicons name="swap-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* To */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TO</Text>
            <TouchableOpacity style={styles.unitRow} onPress={() => setPicker('to')} activeOpacity={0.7}>
              <Text style={styles.unitText}>{toUnit?.label}</Text>
              <View style={styles.shortPill}>
                <Text style={styles.shortText}>{toUnit?.short}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
            <Text style={styles.resultText} numberOfLines={1} adjustsFontSizeToFit>
              {formatConverted(result)}
            </Text>
          </View>

          {factorPreview ? (
            <Text style={styles.factor}>{factorPreview}</Text>
          ) : null}

          {category?.note ? (
            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.subtext} />
              <Text style={styles.noteText}>{category.note}</Text>
            </View>
          ) : null}

          <AdBanner style={{ marginTop: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <UnitPickerModal
        visible={!!picker}
        title={picker === 'from' ? 'Choose from unit' : 'Choose to unit'}
        category={category}
        selectedKey={picker === 'from' ? fromKey : toKey}
        onPick={(key) => {
          if (picker === 'from') setFromKey(key);
          else setToKey(key);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function UnitPickerModal({ visible, title, category, selectedKey, onPick, onClose }) {
  if (!category) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          {category.units.map((u) => {
            const active = u.key === selectedKey;
            return (
              <TouchableOpacity
                key={u.key}
                style={[styles.pickerRow, active && { backgroundColor: SOFT }]}
                activeOpacity={0.8}
                onPress={() => onPick(u.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, active && { color: ACCENT }]}>{u.label}</Text>
                  <Text style={styles.pickerShort}>{u.short}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={ACCENT} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  chipRow: { gap: 8, paddingBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardLabel: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  unitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4, marginBottom: 10,
  },
  unitText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  shortPill: {
    backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  shortText: { ...MONO_STYLE, fontSize: 11, fontWeight: '700', color: COLORS.subtext },

  input: {
    ...MONO_STYLE,
    fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5,
    paddingVertical: 6, minHeight: 44,
  },
  resultText: {
    ...MONO_STYLE,
    fontSize: 28, fontWeight: '700', color: ACCENT, letterSpacing: -0.5,
    paddingVertical: 6, minHeight: 44,
  },

  swapWrap: { alignItems: 'center', justifyContent: 'center', height: 40 },
  divider: {
    position: 'absolute', left: 0, right: 0, top: 19, height: 1,
    backgroundColor: COLORS.border,
  },
  swapBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.text,
    alignItems: 'center', justifyContent: 'center',
    ...COLORS.shadowSoft,
  },

  factor: {
    ...MONO_STYLE,
    fontSize: 12, color: COLORS.subtext, fontWeight: '600',
    textAlign: 'center', marginTop: 14,
  },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 14,
  },
  noteText: { flex: 1, fontSize: 11.5, color: COLORS.subtext, lineHeight: 17 },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    marginBottom: 4,
  },
  pickerLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pickerShort: { ...MONO_STYLE, fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});

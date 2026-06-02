import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import StorageService from '../services/StorageService';

const isoFromDDMMYYYY = (s) => {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt) ? null : dt.toISOString();
};

const toDDMMYYYY = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Modal screen. If `route.params.id` is set, we edit an existing trip;
// otherwise we create a new one and auto-create its linked doc folder.
export default function AddTripScreen({ navigation, route }) {
  const editingId = route?.params?.id || null;
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editingId) return;
    StorageService.getTrips().then((trips) => {
      const t = trips.find((x) => x.id === editingId);
      if (!t) return;
      setName(t.name || '');
      setDestination(t.destination || '');
      setStartStr(toDDMMYYYY(t.startDate));
      setEndStr(toDDMMYYYY(t.endDate));
      setBudgetStr(t.budget ? String(t.budget) : '');
      setNotes(t.notes || '');
    });
  }, [editingId]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return Alert.alert('Enter a trip name', 'e.g. Singapore trip');

    const startDate = isoFromDDMMYYYY(startStr);
    const endDate = isoFromDDMMYYYY(endStr);
    if (startStr && !startDate) return Alert.alert('Invalid start date', 'Use DD/MM/YYYY.');
    if (endStr && !endDate) return Alert.alert('Invalid end date', 'Use DD/MM/YYYY.');

    const budget = parseFloat(budgetStr) || 0;
    const trips = await StorageService.getTrips();
    const folders = await StorageService.getDocFolders();

    if (editingId) {
      const next = trips.map((t) =>
        t.id === editingId
          ? {
              ...t,
              name: n,
              destination: destination.trim(),
              startDate,
              endDate,
              budget,
              notes: notes.trim(),
            }
          : t,
      );
      await StorageService.saveTrips(next);

      // Rename the linked folder if the trip name changed.
      const trip = trips.find((t) => t.id === editingId);
      if (trip?.folderId) {
        await StorageService.saveDocFolders(
          folders.map((f) =>
            f.id === trip.folderId ? { ...f, name: n, tripId: editingId } : f,
          ),
        );
      }
      navigation.goBack();
      return;
    }

    // New trip — auto-create its doc folder so it shows up in Documents.
    const id = Date.now().toString();
    const folderId = `${id}_f`;
    const newFolder = {
      id: folderId,
      name: n,
      tripId: id,
      createdAt: new Date().toISOString(),
    };
    const trip = {
      id,
      name: n,
      destination: destination.trim(),
      startDate,
      endDate,
      budget,
      notes: notes.trim(),
      folderId,
      createdAt: new Date().toISOString(),
    };
    await Promise.all([
      StorageService.saveTrips([trip, ...trips]),
      StorageService.saveDocFolders([newFolder, ...folders]),
    ]);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{editingId ? 'Edit trip' : 'New trip'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Trip name</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Singapore trip"
              placeholderTextColor={COLORS.faint}
              autoFocus
              maxLength={60}
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Destination</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Singapore"
              placeholderTextColor={COLORS.faint}
              maxLength={60}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginTop: 14 }]}>Start (DD/MM/YYYY)</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  value={startStr}
                  onChangeText={setStartStr}
                  placeholder="04/06/2026"
                  placeholderTextColor={COLORS.faint}
                  maxLength={10}
                />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginTop: 14 }]}>End (DD/MM/YYYY)</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  value={endStr}
                  onChangeText={setEndStr}
                  placeholder="10/06/2026"
                  placeholderTextColor={COLORS.faint}
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Budget (₹, optional)</Text>
          <View style={styles.field}>
            <Text style={styles.prefix}>₹</Text>
            <TextInput
              style={styles.input}
              value={budgetStr}
              onChangeText={setBudgetStr}
              placeholder="0"
              placeholderTextColor={COLORS.faint}
              keyboardType="numeric"
            />
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Notes</Text>
          <View style={[styles.field, { height: 90, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.input, { height: '100%' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Flights, hotel reference, packing list…"
              placeholderTextColor={COLORS.faint}
              multiline
              maxLength={400}
            />
          </View>

          <TouchableOpacity style={styles.cta} onPress={submit} activeOpacity={0.9}>
            <Text style={styles.ctaText}>{editingId ? 'Save changes' : 'Create trip'}</Text>
          </TouchableOpacity>

          {!editingId ? (
            <Text style={styles.hint}>
              A folder named "{name.trim() || 'Trip'}" will be created in Documents so your tickets, bookings and
              receipts for this trip stay together.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.hairline,
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  body: { padding: 18, paddingBottom: 40 },

  label: {
    fontSize: 11, fontWeight: '800', color: '#888888',
    letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 6,
  },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14,
    height: 50, borderWidth: 0.5, borderColor: COLORS.hairline,
  },
  prefix: { fontSize: 15, color: COLORS.subtext, marginRight: 6, fontWeight: '700' },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '700' },

  row: { flexDirection: 'row' },

  cta: {
    marginTop: 22, backgroundColor: COLORS.primary, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  hint: { fontSize: 11, color: COLORS.subtext, marginTop: 12, lineHeight: 16 },
});

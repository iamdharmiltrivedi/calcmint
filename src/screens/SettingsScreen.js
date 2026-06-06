import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import StorageService from '../services/StorageService';

export default function SettingsScreen({ navigation }) {
  const onResetAll = () => {
    Alert.alert(
      'Reset all app data?',
      'This permanently deletes expenses, goals, subscriptions, split groups, calculator inputs, and lock settings. There is no undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: async () => { await StorageService.clearAll(); Alert.alert('Done', 'Restart the app to see a fresh state.'); },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
        <Text style={styles.title}>More</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Security" />
        <Row
          icon="key-outline"
          title="Personal vault"
          subtitle="Encrypted IDs, policies, FDs, SIPs"
          onPress={() => navigation.navigate('Vault')}
        />

        <SectionLabel text="Tools" />
        <Row
          icon="grid-outline"
          title="All calculators"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Tools' })}
        />
        <Row
          icon="trending-up-outline"
          title="Markets"
          subtitle="Stocks, MFs, IPOs, AI analysis"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Markets' })}
        />
        <Row icon="card-outline" title="Subscriptions" onPress={() => navigation.navigate('Subscriptions')} />
        <Row icon="cash-outline" title="Loans & EMI reminders" onPress={() => navigation.navigate('Loans')} />
        <Row icon="people-outline" title="Split expenses" onPress={() => navigation.navigate('SplitGroups')} />
        <Row icon="document-text-outline" title="Documents" onPress={() => navigation.navigate('Receipts')} />

        <SectionLabel text="Data" />
        <Row
          icon="cloud-upload-outline"
          title="Backup & restore"
          subtitle="Encrypted backup of all your data"
          onPress={() => navigation.navigate('Backup')}
        />
        <Row
          icon="trash-outline"
          title="Reset all data"
          subtitle="Wipes everything on this device"
          destructive
          onPress={onResetAll}
        />

        <SectionLabel text="About" />
        <Row icon="information-circle-outline" title="CalcMint v1.0.0" subtitle="Offline-first · privacy-first" />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>;
}

function Row({ icon, title, subtitle, onPress, destructive }) {
  const color = destructive ? COLORS.error : COLORS.text;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, destructive && { backgroundColor: '#FCE6EC' }]}>
        <Ionicons name={icon} size={18} color={destructive ? COLORS.error : COLORS.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={COLORS.faint} /> : null}
    </TouchableOpacity>
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

  sectionLabel: {
    fontSize: 10.5, color: COLORS.subtext, fontWeight: '700',
    letterSpacing: 0.8, marginTop: 14, marginBottom: 6, marginLeft: 4,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSubtitle: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});

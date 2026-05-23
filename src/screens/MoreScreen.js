import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLock } from '../context/LockContext';
import BrandHeader from '../components/BrandHeader';

const ITEMS = [
  // Security
  { section: 'Security',  icon: 'lock-closed-outline', title: 'App lock',          subtitle: null, route: 'LockSetup' },
  { section: 'Security',  icon: 'key-outline',         title: 'Personal vault',    subtitle: 'Encrypted IDs, policies, FDs', route: 'Vault' },

  // Smart
  { section: 'Smart',     icon: 'sparkles-outline',    title: 'AI Assistant',      subtitle: 'Ask anything about your finances', route: 'AIAssistant' },
  { section: 'Smart',     icon: 'notifications-outline', title: 'Notifications',   subtitle: 'Alerts & reminders',          route: 'Notifications' },

  // Learn
  { section: 'Learn',     icon: 'school-outline',      title: 'Courses',           subtitle: 'Bite-sized finance lessons',  route: 'Courses' },
  { section: 'Learn',     icon: 'library-outline',     title: 'Guides',            subtitle: 'PPF, ELSS, NPS, term plans',  route: 'Guides' },
  { section: 'Learn',     icon: 'gift-outline',        title: 'Govt schemes',      subtitle: 'SSY, PMVVY, PMJDY & more',    route: 'GovtSchemes' },
  { section: 'Learn',     icon: 'reader-outline',      title: 'Blog',              subtitle: 'Indian market commentary',    route: 'Blog' },
  { section: 'Learn',     icon: 'trophy-outline',      title: 'Savings challenges',subtitle: 'Stack small wins',            route: 'SavingsChallenges' },

  // Tools
  { section: 'Tools',     icon: 'document-text-outline', title: 'Receipts & docs', subtitle: 'OCR scans + vault',          route: 'Receipts' },

  // Account
  { section: 'Account',   icon: 'cloud-upload-outline', title: 'Backup & restore', subtitle: 'Encrypted backups',           route: 'BackupRestore' },
  { section: 'Account',   icon: 'person-outline',      title: 'Account',           subtitle: 'Profile & sign out',          route: 'Account' },
  { section: 'Account',   icon: 'settings-outline',    title: 'Settings',          subtitle: 'Theme, currency, more',       route: 'Settings' },
];

export default function MoreScreen({ navigation }) {
  const { lockEnabled, autoLockSec } = useLock();
  const sections = Array.from(new Set(ITEMS.map((i) => i.section)));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader
        rightActions={[
          { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
        ]}
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {sections.map((sec) => (
          <View key={sec} style={{ marginBottom: 6 }}>
            <Text style={styles.sectionLabel}>{sec.toUpperCase()}</Text>
            {ITEMS.filter((i) => i.section === sec).map((item) => (
              <Row
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.title === 'App lock'
                  ? (lockEnabled ? `On · re-lock ${autoLockSec === 0 ? 'always' : `after ${autoLockSec}s`}` : 'Off')
                  : item.subtitle}
                onPress={() => navigation.navigate(item.route)}
              />
            ))}
          </View>
        ))}

        <Text style={styles.about}>CalcMint v1.0.0 · Offline-first · Privacy-first</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  rowSub:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },

  about: { textAlign: 'center', fontSize: 11, color: COLORS.faint, fontWeight: '600', marginTop: 20 },
});

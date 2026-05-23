import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const GUIDES = [
  { id: 'g1', title: 'PPF vs ELSS vs NPS',          icon: 'git-compare-outline',  q: 'PPF vs ELSS vs NPS comparison India' },
  { id: 'g2', title: 'How to read an MF fact sheet',icon: 'document-text-outline',q: 'how to read mutual fund factsheet' },
  { id: 'g3', title: 'Picking the right term plan', icon: 'umbrella-outline',     q: 'best term insurance India guide' },
  { id: 'g4', title: 'Filing ITR with capital gains',icon: 'receipt-outline',     q: 'ITR filing capital gains stocks mutual funds' },
  { id: 'g5', title: 'NRI tax basics',              icon: 'globe-outline',        q: 'NRI taxation India basics' },
  { id: 'g6', title: 'Govt schemes for women',      icon: 'gift-outline',         q: 'government schemes for women India 2025' },
  { id: 'g7', title: 'Sukanya Samriddhi Yojana',    icon: 'school-outline',       q: 'Sukanya Samriddhi Yojana SSY guide' },
  { id: 'g8', title: 'Senior Citizens Savings Scheme',icon: 'people-outline',     q: 'SCSS Senior Citizens Savings Scheme' },
];

export default function GuidesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guides & schemes</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {GUIDES.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(g.q)}`)}
          >
            <View style={styles.iconBox}>
              <Ionicons name={g.icon} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{g.title}</Text>
            <Ionicons name="open-outline" size={14} color={COLORS.faint} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  title:   { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
});

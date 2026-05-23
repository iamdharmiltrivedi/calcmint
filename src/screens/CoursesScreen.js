import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';

const COURSES = [
  { id: 'c1', title: 'Personal finance basics',  desc: 'Budgeting, saving, and emergency funds.', icon: 'wallet-outline',     color: '#2E5BFF' },
  { id: 'c2', title: 'Mutual funds 101',          desc: 'SIPs, NAV, expense ratio, exit loads.',    icon: 'trending-up',        color: COLORS.primary },
  { id: 'c3', title: 'Stock market beginners',    desc: 'Demat, brokers, types of orders.',         icon: 'stats-chart-outline',color: '#6F4FE0' },
  { id: 'c4', title: 'Tax-saving instruments',    desc: '80C, 80D, NPS, ELSS — what fits you.',     icon: 'shield-checkmark-outline', color: '#218A52' },
  { id: 'c5', title: 'Retirement planning',       desc: 'PPF, EPF, NPS and corpus targets.',        icon: 'rose-outline',       color: '#C44A6A' },
  { id: 'c6', title: 'Goal-based investing',      desc: 'How to map money to life milestones.',     icon: 'flag-outline',       color: '#B8881A' },
];

export default function CoursesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="More" title="Courses" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Bite-sized lessons curated for Indian investors. New chapters added regularly.</Text>
        {COURSES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CourseDetail', { id: c.id })}
          >
            <View style={[styles.iconBox, { backgroundColor: c.color + '18' }]}>
              <Ionicons name={c.icon} size={20} color={c.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{c.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
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

  lead: { fontSize: 12.5, color: COLORS.subtext, marginBottom: 14, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  iconBox: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  desc:  { fontSize: 11.5, color: COLORS.subtext, marginTop: 2 },
});

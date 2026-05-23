import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';

const POSTS = [
  { id: 'p1', title: 'Why a high SIP isn’t enough without an emergency fund', source: 'CalcMint Editorial', minutes: 4 },
  { id: 'p2', title: 'New regime vs old regime — a 2025 decision tree',       source: 'CalcMint Editorial', minutes: 6 },
  { id: 'p3', title: 'How to read a Nifty index fund expense ratio',          source: 'CalcMint Editorial', minutes: 5 },
  { id: 'p4', title: 'EMI traps to avoid when refinancing a home loan',       source: 'CalcMint Editorial', minutes: 7 },
  { id: 'p5', title: '5 IPO red flags retail investors miss',                  source: 'CalcMint Editorial', minutes: 6 },
];

export default function BlogScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="More" title="Blog" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {POSTS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(p.title)}`)}
          >
            <View style={styles.bullet}>
              <Ionicons name="reader-outline" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>{p.title}</Text>
              <Text style={styles.meta}>{p.source} · {p.minutes} min</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  bullet: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 13.5, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  meta:  { fontSize: 11, color: COLORS.subtext, marginTop: 3 },
});

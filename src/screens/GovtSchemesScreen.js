import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';

const SCHEMES = [
  { id: 's1', name: 'Sukanya Samriddhi Yojana',  audience: 'Girl child',  rate: '8.2% p.a.', tenure: '21 yrs', url: 'https://www.nsiindia.gov.in/(S(53cebpfilbweaf45vk2c1n55))/InternalPage.aspx?Id_Pk=89' },
  { id: 's2', name: 'PPF',                       audience: 'All adults',  rate: '7.1% p.a.', tenure: '15 yrs', url: 'https://www.indiapost.gov.in/Financial/Pages/Content/PPF.aspx' },
  { id: 's3', name: 'PMVVY',                     audience: 'Seniors 60+', rate: '7.4% p.a.', tenure: '10 yrs', url: 'https://licindia.in/Products/Pension-Plans/PMVVY' },
  { id: 's4', name: 'SCSS',                      audience: 'Seniors 60+', rate: '8.2% p.a.', tenure: '5 yrs',  url: 'https://www.indiapost.gov.in/Financial/Pages/Content/SCSS.aspx' },
  { id: 's5', name: 'NPS',                       audience: 'All adults',  rate: 'Market',    tenure: 'Till 60', url: 'https://www.npscra.nsdl.co.in/' },
  { id: 's6', name: 'PMJDY',                     audience: 'Underbanked', rate: '—',         tenure: 'Lifetime', url: 'https://pmjdy.gov.in/' },
  { id: 's7', name: 'Atal Pension Yojana',       audience: 'Unorganised', rate: 'Govt-backed', tenure: 'Till 60', url: 'https://www.npscra.nsdl.co.in/scheme-details.php' },
];

export default function GovtSchemesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="More" title="Govt schemes" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Government-backed savings + welfare schemes for Indian residents.</Text>
        {SCHEMES.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(s.url)}
          >
            <View style={styles.iconBox}>
              <Ionicons name="ribbon-outline" size={18} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>{s.audience} · {s.rate} · {s.tenure}</Text>
            </View>
            <Ionicons name="open-outline" size={15} color={COLORS.faint} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },
  lead: { fontSize: 12.5, color: COLORS.subtext, marginBottom: 14, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  iconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.goldSoft, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 13.5, fontWeight: '800', color: COLORS.text },
  meta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});

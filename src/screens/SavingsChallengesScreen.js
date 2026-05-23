import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, MONO_STYLE } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';
import { formatINR } from '../utils/formatters';

const STORAGE_KEY = '@fc_savings_challenges';

const CHALLENGES = [
  { id: 'ch_52w',  title: '52-week ramp',        desc: 'Save ₹n × week number every week for 52 weeks.', target: 68900 },
  { id: 'ch_no_spend', title: 'No-spend weekend', desc: 'Cap discretionary spend at ₹0 for the next weekend.', target: 0 },
  { id: 'ch_eat_home', title: 'Eat-at-home week', desc: 'Cook every meal for 7 days. Track savings.', target: 4000 },
  { id: 'ch_10k_mo', title: '₹10k extra this month', desc: 'Sweep ₹10,000 to investments above your regular SIP.', target: 10000 },
  { id: 'ch_round_up', title: 'Round-up jar',     desc: 'Round every txn to the nearest ₹100 — bank the change.', target: 1500 },
];

export default function SavingsChallengesScreen({ navigation }) {
  const [progress, setProgress] = useState({}); // id → { joined, saved }

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) try { setProgress(JSON.parse(raw)); } catch {}
    });
  }, []);

  const persist = async (next) => {
    setProgress(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const join = (id) => persist({ ...progress, [id]: { joined: true, saved: progress[id]?.saved || 0 } });
  const log  = (id, amount) => {
    const cur = progress[id] || { joined: true, saved: 0 };
    persist({ ...progress, [id]: { ...cur, saved: (cur.saved || 0) + amount } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="More" title="Savings challenges" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Tiny habit nudges that compound over time.</Text>
        {CHALLENGES.map((ch) => {
          const p = progress[ch.id] || { joined: false, saved: 0 };
          const pct = ch.target > 0 ? Math.min(100, (p.saved / ch.target) * 100) : (p.saved > 0 ? 100 : 0);
          return (
            <View key={ch.id} style={styles.card}>
              <View style={styles.head}>
                <View style={styles.iconBox}>
                  <Ionicons name="trophy" size={16} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title}>{ch.title}</Text>
                  <Text style={styles.desc} numberOfLines={2}>{ch.desc}</Text>
                </View>
              </View>

              {p.joined ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(3, pct)}%` }]} />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                      {formatINR(p.saved)} {ch.target > 0 ? ` / ${formatINR(ch.target)}` : ''} saved
                    </Text>
                    <TouchableOpacity
                      style={styles.logBtn}
                      onPress={() => Alert.prompt
                        ? Alert.prompt('Log savings', 'How much did you save?', (txt) => {
                            const n = parseFloat(txt); if (n > 0) log(ch.id, n);
                          }, 'plain-text', '', 'number-pad')
                        : log(ch.id, 100)
                      }
                    >
                      <Ionicons name="add" size={13} color="#fff" />
                      <Text style={styles.logBtnText}>Log</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.joinBtn} onPress={() => join(ch.id)} activeOpacity={0.85}>
                  <Text style={styles.joinText}>Start challenge</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },
  lead: { fontSize: 12.5, color: COLORS.subtext, marginBottom: 14, lineHeight: 18 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 10 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.goldSoft, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  desc:  { fontSize: 11.5, color: COLORS.subtext, marginTop: 3 },

  track: { height: 8, backgroundColor: '#F0F2EF', borderRadius: 999, overflow: 'hidden' },
  fill:  { height: 8, borderRadius: 999, backgroundColor: COLORS.gold },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressText: { ...MONO_STYLE, fontSize: 12, fontWeight: '700', color: COLORS.text },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },

  joinBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  joinText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

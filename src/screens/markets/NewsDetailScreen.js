import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useMarketStore } from '../../store/marketStore';
import { SentimentBadge } from '../../components/markets/Badge';

const friendlyDate = (ms) => new Date(ms).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function NewsDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const news = useMarketStore((s) => s.news);
  const item = useMemo(() => news.find((n) => n.id === id), [news, id]);

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.empty}><Text style={styles.emptyText}>Article unavailable.</Text></View>
      </SafeAreaView>
    );
  }

  const openSource = async () => {
    if (item.url) {
      try { await Linking.openURL(item.url); } catch {}
    }
  };

  const share = () => Share.share({ message: `${item.title}\n\n${item.summary}\n${item.url || ''}` });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => navigation.goBack()} onShare={share} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.source}>{item.source}</Text>
          <Text style={styles.time}>{friendlyDate(item.publishedAt)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 6 }}>
          <SentimentBadge sentiment={item.sentiment} />
          {item.relatedSymbols.map((s) => (
            <View key={s} style={styles.symPill}><Text style={styles.symText}>{s}</Text></View>
          ))}
        </View>
        <Text style={styles.summary}>{item.summary}</Text>

        {item.url ? (
          <TouchableOpacity style={styles.openBtn} onPress={openSource} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={styles.openText}>Read full story</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.subtext} />
            <Text style={styles.noteText}>This is an AI-generated summary. Verify with primary sources.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, onShare }) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity style={styles.headerIcon} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>News</Text>
      {onShare ? (
        <TouchableOpacity style={styles.headerIcon} onPress={onShare}>
          <Ionicons name="share-outline" size={17} color={COLORS.text} />
        </TouchableOpacity>
      ) : <View style={{ width: 38 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },

  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  source:    { fontSize: 12, color: COLORS.primary, fontWeight: '800', letterSpacing: 0.2 },
  time:      { fontSize: 11, color: COLORS.faint, fontWeight: '600' },
  title:     { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 10, lineHeight: 28, letterSpacing: -0.3 },
  symPill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: COLORS.primarySoft },
  symText:   { fontSize: 10.5, color: COLORS.primary, fontWeight: '800' },
  summary:   { fontSize: 14, color: COLORS.text2, marginTop: 16, lineHeight: 22 },
  openBtn:   { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openText:  { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  note:      { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface, flexDirection: 'row', gap: 8, alignItems: 'center' },
  noteText:  { flex: 1, fontSize: 11.5, color: COLORS.subtext, fontWeight: '600' },

  empty: { padding: 18, alignItems: 'center' },
  emptyText: { fontSize: 12, color: COLORS.subtext },
});

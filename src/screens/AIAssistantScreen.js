import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';
import TypingDots from '../components/ui/TypingDots';
import AIService, { DAILY_LIMIT_FREE } from '../services/AIService';

const SUGGESTIONS = [
  'Can I afford a ₹50L home loan?',
  'How is my spending this month?',
  'Should I invest in this IPO?',
  'What SIP amount do I need for ₹1Cr in 15 years?',
];

// Session-scoped chat. Conversation lives in component state only —
// the moment the user leaves the screen, history clears. The unified
// AIService handles context, rate limiting, and the backend proxy.
export default function AIAssistantScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi — I’m your finance copilot. Ask anything about your spend, portfolio, or Indian instruments.' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [usage, setUsage] = useState({ count: 0, limit: DAILY_LIMIT_FREE, pro: false, remaining: DAILY_LIMIT_FREE });
  const [upgradeShown, setUpgradeShown] = useState(false);
  const scrollRef = useRef(null);

  const refreshUsage = useCallback(async () => {
    const info = await AIService.getUsageInfo();
    setUsage(info);
  }, []);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const promptUpgrade = useCallback(() => {
    if (upgradeShown) return;
    setUpgradeShown(true);
    Alert.alert(
      'Daily AI limit reached',
      `You’ve used your ${DAILY_LIMIT_FREE} free AI queries for today. Upgrade to Pro for unlimited insights, deeper portfolio analysis, and saved chats.`,
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'See Pro plans', onPress: () => navigation.navigate('Account') },
      ],
    );
  }, [navigation, upgradeShown]);

  const ask = async (q) => {
    const text = (q || input).trim();
    if (!text || thinking) return;

    // Pre-check: bounce on limit BEFORE adding the user msg to UI so
    // the conversation doesn't visually advance into a dead end.
    if (!usage.pro && usage.remaining <= 0) {
      promptUpgrade();
      return;
    }

    const history = [...messages, { role: 'user', text }];
    setMessages(history);
    setInput('');
    setThinking(true);

    try {
      const reply = await AIService.chatMessage(
        text,
        history.map((m) => ({ role: m.role, content: m.text })),
      );
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      await refreshUsage();
      if (!usage.pro && usage.remaining <= 1) {
        // gentle warning one query before exhaustion
        setTimeout(() => {
          if (!upgradeShown) {
            const info = AIService.getUsageInfo().then((i) => {
              if (!i.pro && i.remaining === 0) promptUpgrade();
            });
            return info;
          }
        }, 250);
      }
    } catch (err) {
      // AIService is meant to always resolve, but guard anyway.
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Sorry — something went wrong. Try again in a moment.' },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const usageLabel = usage.pro
    ? 'Pro · unlimited'
    : `AI queries used: ${usage.count}/${usage.limit} today`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        parent="More"
        title="AI Assistant"
        onBack={() => navigation.goBack()}
        right={[{ icon: 'refresh-outline', onPress: refreshUsage }]}
      />

      {/* Usage badge */}
      <View style={styles.usageRow}>
        <View style={[styles.usagePill, usage.pro && styles.usagePillPro]}>
          <Ionicons
            name={usage.pro ? 'sparkles' : 'flash-outline'}
            size={12}
            color={usage.pro ? COLORS.gold : COLORS.primary}
          />
          <Text style={[styles.usageText, usage.pro && { color: COLORS.gold }]}>{usageLabel}</Text>
        </View>
        {!usage.pro && (
          <TouchableOpacity onPress={() => navigation.navigate('Account')}>
            <Text style={styles.upgradeLink}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <View key={i} style={[styles.msg, m.role === 'user' ? styles.userMsg : styles.botMsg]}>
              <Text style={[styles.msgText, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          ))}
          {thinking && (
            <View style={[styles.msg, styles.botMsg, { paddingVertical: 14 }]}>
              <TypingDots />
            </View>
          )}
        </ScrollView>

        {/* Empty-state suggestion pills — only on the welcome screen */}
        {messages.length <= 1 && !thinking && (
          <View style={styles.suggestWrap}>
            <Text style={styles.suggestLabel}>Try one of these</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestRow}
            >
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.chip} onPress={() => ask(s)} activeOpacity={0.85}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={usage.pro || usage.remaining > 0 ? 'Ask anything…' : 'Upgrade to keep chatting…'}
            placeholderTextColor={COLORS.faint}
            returnKeyType="send"
            onSubmitEditing={() => ask()}
            editable={!thinking}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
            onPress={() => ask()}
            disabled={thinking || !input.trim()}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, gap: 10, paddingBottom: 16 },

  usageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 6,
  },
  usagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  usagePillPro: { backgroundColor: COLORS.goldSoft },
  usageText:    { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.2 },
  upgradeLink:  { fontSize: 11.5, fontWeight: '800', color: COLORS.primary },

  msg: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  botMsg:  { alignSelf: 'flex-start',  backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.hairline },
  userMsg: { alignSelf: 'flex-end',    backgroundColor: COLORS.primary },
  msgText: { fontSize: 13.5, color: COLORS.text, lineHeight: 19 },

  suggestWrap: { borderTopWidth: 0.5, borderTopColor: COLORS.hairline, paddingTop: 12, paddingBottom: 6, backgroundColor: COLORS.background },
  suggestLabel: { fontSize: 10.5, fontWeight: '800', color: '#888888', letterSpacing: 0.66, textTransform: 'uppercase', paddingHorizontal: 18, marginBottom: 6 },
  suggestRow:  { paddingHorizontal: 18, gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.hairline },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, paddingBottom: 16,
    borderTopWidth: 0.5, borderTopColor: COLORS.hairline, backgroundColor: COLORS.background,
  },
  input: {
    flex: 1, height: 44, paddingHorizontal: 14,
    borderRadius: 22, backgroundColor: COLORS.card,
    borderWidth: 0.5, borderColor: COLORS.hairline,
    fontSize: 13.5, color: COLORS.text, fontWeight: '600',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});

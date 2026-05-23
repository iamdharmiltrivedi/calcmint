import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';

// Lesson content is intentionally short — we ship a working scaffold
// so the navigation works end-to-end. Replace `body` with curriculum
// data later (or move to a CMS).
const PLACEHOLDER = `This lesson is a placeholder for the merged build.

We've wired the navigation route, the back behaviour, the per-screen header, and the typography. Drop the real content into a courses CMS and pull from there, or expand the in-file map for an offline-first read.

Key things this surface must support:
• Long-form, scrollable copy
• Inline references back to in-app calculators
• Bookmark + complete actions (to be added)

For now, treat this as the visual + nav harness only.`;

export default function LessonScreen({ route, navigation }) {
  const { title = 'Lesson' } = route.params || {};
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="Course" title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{PLACEHOLDER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  copy:  { fontSize: 14, color: COLORS.text2, lineHeight: 22, marginTop: 14 },
});

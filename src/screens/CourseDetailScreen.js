import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';

// Static lesson plans per course id. Course metadata is duplicated
// from CoursesScreen so this file is self-contained. Migrate to a
// shared courses-data module if we expand the curriculum.
const COURSE_DATA = {
  c1: { title: 'Personal finance basics', lessons: [
    { id: 'l1', title: 'What is a budget?',         minutes: 4 },
    { id: 'l2', title: 'Building an emergency fund', minutes: 6 },
    { id: 'l3', title: 'Pay yourself first',         minutes: 4 },
    { id: 'l4', title: 'Tracking expenses ruthlessly', minutes: 5 },
  ]},
  c2: { title: 'Mutual funds 101', lessons: [
    { id: 'l1', title: 'What is a mutual fund?',     minutes: 5 },
    { id: 'l2', title: 'SIP vs lumpsum',             minutes: 6 },
    { id: 'l3', title: 'Equity vs debt vs hybrid',   minutes: 7 },
    { id: 'l4', title: 'Reading a factsheet',         minutes: 6 },
    { id: 'l5', title: 'Tax on mutual fund returns', minutes: 5 },
  ]},
  c3: { title: 'Stock market beginners', lessons: [
    { id: 'l1', title: 'Demat & broker basics',      minutes: 5 },
    { id: 'l2', title: 'Order types',                minutes: 6 },
    { id: 'l3', title: 'Reading a stock quote',      minutes: 4 },
  ]},
  c4: { title: 'Tax-saving instruments', lessons: [
    { id: 'l1', title: '80C in 4 minutes',           minutes: 4 },
    { id: 'l2', title: '80D & health insurance',     minutes: 5 },
    { id: 'l3', title: 'NPS for tax + retirement',   minutes: 6 },
    { id: 'l4', title: 'ELSS deep dive',              minutes: 5 },
  ]},
  c5: { title: 'Retirement planning', lessons: [
    { id: 'l1', title: 'Set the corpus target',      minutes: 5 },
    { id: 'l2', title: 'PPF, EPF, NPS — pick yours', minutes: 6 },
  ]},
  c6: { title: 'Goal-based investing', lessons: [
    { id: 'l1', title: 'Map money to milestones',    minutes: 5 },
    { id: 'l2', title: 'Asset allocation by goal',   minutes: 6 },
  ]},
};

export default function CourseDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const course = COURSE_DATA[id] || { title: 'Course', lessons: [] };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader parent="Courses" title={course.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>{course.lessons.length} lessons · ~{course.lessons.reduce((s, l) => s + l.minutes, 0)} min</Text>
        {course.lessons.map((l, idx) => (
          <TouchableOpacity
            key={l.id}
            style={styles.lesson}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Lesson', { courseId: id, lessonId: l.id, title: l.title })}
          >
            <View style={styles.lessonIdx}>
              <Text style={styles.lessonIdxText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.lessonMeta}>{l.minutes} min read</Text>
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
  lead: { fontSize: 12, color: COLORS.subtext, fontWeight: '700', marginBottom: 14 },
  lesson: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.hairline, marginBottom: 8,
  },
  lessonIdx: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  lessonIdxText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  lessonTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  lessonMeta:  { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});

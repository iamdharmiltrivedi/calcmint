import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Collapsible card section. Collapsed by default so the StockDetail
// screen can stay scannable; tap header to expand. Uses LayoutAnimation
// to avoid the cost of pulling in reanimated.
export default function CollapsibleSection({ title, icon, initiallyOpen = false, children, style }) {
  const [open, setOpen] = useState(initiallyOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.85}>
        {icon ? <Ionicons name={icon} size={15} color={COLORS.primary} style={{ marginRight: 8 }} /> : null}
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.subtext}
        />
      </TouchableOpacity>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: COLORS.hairline,
    marginBottom: 10, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.text },
  body:  { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
});

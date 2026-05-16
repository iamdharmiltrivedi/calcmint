import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, MONO_STYLE } from '../constants/colors';

const InputField = ({
  label, value, onChangeText, placeholder, prefix, suffix, error,
  keyboardType = 'numeric', maxLength = 15, editable = true, mono = true,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.row,
          focused && styles.rowFocused,
          !!error && styles.rowError,
          !editable && styles.rowDisabled,
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, mono && MONO_STYLE]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || '0'}
          placeholderTextColor={COLORS.faint}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="done"
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: {
    fontSize: 10.5, fontWeight: '700', color: COLORS.subtext,
    marginBottom: 6, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 14,
    backgroundColor: COLORS.card, paddingHorizontal: 14, height: 50,
  },
  rowFocused: { borderColor: COLORS.primary },
  rowError:   { borderColor: COLORS.error },
  rowDisabled: { backgroundColor: COLORS.background, opacity: 0.7 },
  affix: { fontSize: 15, color: COLORS.subtext, fontWeight: '600', marginHorizontal: 4 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600', padding: 0 },
  errorText: { fontSize: 11, color: COLORS.error, marginTop: 4, marginLeft: 2 },
});

export default InputField;

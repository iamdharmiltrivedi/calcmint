import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLock } from '../context/LockContext';
import { useVaultUnlock } from '../context/VaultUnlockContext';
import PrimaryButton from '../components/PrimaryButton';

const PIN_LENGTH = 4;

export default function LockSetupScreen({ navigation, route }) {
  const { lockEnabled, autoLockSec, setPin, removeLock } = useLock();
  const { unlock: unlockVault } = useVaultUnlock();
  const fromVault = !!route?.params?.fromVault;
  const [step, setStep] = useState('enter'); // enter | confirm
  const [first, setFirst] = useState('');
  const [pin, setPinValue] = useState('');
  const [autoSec, setAutoSec] = useState(autoLockSec || 0);

  const press = (d) => { if (pin.length < PIN_LENGTH) setPinValue((p) => p + d); };
  const backspace = () => setPinValue((p) => p.slice(0, -1));

  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'Dashboard' });
  };

  const onContinue = () => {
    if (step === 'enter') {
      setFirst(pin);
      setPinValue('');
      setStep('confirm');
    } else {
      if (pin !== first) {
        Alert.alert('PINs do not match', 'Please try again.');
        setStep('enter');
        setFirst('');
        setPinValue('');
        return;
      }
      setPin(pin, autoSec).then(() => {
        if (fromVault) {
          // User just set a PIN from the Vault entry flow — drop them
          // straight into the vault without making them re-enter it.
          unlockVault();
          navigation.reset({ index: 0, routes: [{ name: 'Vault' }] });
        } else {
          leave();
        }
      });
    }
  };

  const onDisable = () => {
    Alert.alert(
      'Disable app lock?',
      'You will not need a PIN to open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => removeLock().then(leave) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leave} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Lock</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconBadge}>
          <Ionicons name={step === 'enter' ? 'lock-closed' : 'checkmark-circle'} size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>
          {step === 'enter' ? 'Set a 4-digit PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'enter'
            ? 'You will be asked for this PIN every time you open CalcMint.'
            : 'Re-enter the same PIN to confirm.'}
        </Text>

        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </View>

        <View style={styles.pad}>
          {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']].map((row, ri) => (
            <View style={styles.row} key={ri}>
              {row.map((d, ci) => {
                if (d === '') return <View key={ci} style={styles.key} />;
                if (d === 'del') {
                  return (
                    <TouchableOpacity key={ci} style={styles.key} onPress={backspace} activeOpacity={0.7}>
                      <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity key={ci} style={styles.key} onPress={() => press(d)} activeOpacity={0.7}>
                    <Text style={styles.keyText}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {step === 'enter' && (
          <View style={styles.autoLockRow}>
            <Text style={styles.autoLockLabel}>Re-lock after background:</Text>
            <View style={styles.segRow}>
              {[
                { label: 'Always', value: 0 },
                { label: '30s', value: 30 },
                { label: '5m', value: 300 },
              ].map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.seg, autoSec === o.value && styles.segActive]}
                  onPress={() => setAutoSec(o.value)}
                >
                  <Text style={[styles.segText, autoSec === o.value && { color: '#fff' }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <PrimaryButton
          title={step === 'enter' ? 'Continue' : 'Set PIN'}
          onPress={onContinue}
          disabled={pin.length !== PIN_LENGTH}
          style={{ marginTop: 14, width: '100%' }}
        />

        {lockEnabled && step === 'enter' && (
          <TouchableOpacity onPress={onDisable} style={{ marginTop: 14 }}>
            <Text style={styles.disableText}>Disable app lock</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 24 },
  iconBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginTop: 14 },
  subtitle: { fontSize: 13, color: COLORS.subtext, marginTop: 6, textAlign: 'center', lineHeight: 19 },

  dots: { flexDirection: 'row', gap: 14, marginVertical: 22 },
  dot: {
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  pad: { width: '85%', maxWidth: 320 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  key: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  keyText: { color: COLORS.text, fontSize: 24, fontWeight: '600' },

  autoLockRow: { width: '100%', marginTop: 16 },
  autoLockLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600', marginBottom: 8 },
  segRow: { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  segActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segText: { color: COLORS.subtext, fontSize: 13, fontWeight: '600' },

  disableText: { color: COLORS.error, fontSize: 13, fontWeight: '700' },
});

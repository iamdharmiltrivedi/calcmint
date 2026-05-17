import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLock } from '../context/LockContext';
import { useVaultUnlock } from '../context/VaultUnlockContext';
import BiometricService from '../services/BiometricService';

const PIN_LENGTH = 4;

export default function VaultUnlockScreen({ navigation }) {
  const { lockEnabled, tryUnlock } = useLock();
  const { unlock } = useVaultUnlock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bio, setBio] = useState({ available: false, label: 'Biometric' });
  const [showingBio, setShowingBio] = useState(false);

  // If app lock isn't configured, vault still needs a PIN. Send user to setup.
  useEffect(() => {
    if (!lockEnabled) {
      Alert.alert(
        'Vault needs a PIN',
        'Set up app lock first to protect your vault. You can also enable biometric there.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Set up', onPress: () => navigation.replace('LockSetup') },
        ],
      );
    }
  }, [lockEnabled, navigation]);

  // Probe biometric capability and offer it
  useEffect(() => {
    let cancelled = false;
    BiometricService.capability().then((cap) => {
      if (cancelled) return;
      setBio(cap);
    });
    return () => { cancelled = true; };
  }, []);

  const tryBiometric = useCallback(async () => {
    if (showingBio || !bio.available) return;
    setShowingBio(true);
    const res = await BiometricService.authenticate('Unlock CalcMint Vault');
    setShowingBio(false);
    if (res.success) {
      unlock();
      navigation.replace('Vault');
    }
  }, [bio, unlock, navigation, showingBio]);

  // Auto-prompt biometric on first mount (don't loop on dismiss)
  useEffect(() => {
    if (!lockEnabled || !bio.available) return;
    tryBiometric();
  }, [bio.available, lockEnabled, tryBiometric]);

  // PIN flow uses the same PIN as the app lock.
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      const ok = tryUnlock(pin);
      if (ok) {
        unlock();
        navigation.replace('Vault');
      } else {
        setError(true);
        Vibration.vibrate(150);
        setTimeout(() => { setPin(''); setError(false); }, 600);
      }
    }
  }, [pin, tryUnlock, unlock, navigation]);

  const press = (d) => { if (pin.length < PIN_LENGTH) setPin((p) => p + d); };
  const backspace = () => setPin((p) => p.slice(0, -1));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={COLORS.gradient} style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={10}>
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.head}>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={26} color="#fff" />
        </View>
        <Text style={styles.title}>Vault is locked</Text>
        <Text style={styles.subtitle}>
          {bio.available ? `Use ${bio.label} or enter your PIN` : 'Enter your app PIN to continue'}
        </Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length && styles.dotFilled, error && styles.dotError]}
          />
        ))}
      </View>

      <View style={styles.pad}>
        {[['1','2','3'],['4','5','6'],['7','8','9'],['bio','0','del']].map((row, ri) => (
          <View style={styles.row} key={ri}>
            {row.map((d, ci) => {
              if (d === 'bio') {
                if (!bio.available) return <View key={ci} style={styles.key} />;
                return (
                  <TouchableOpacity key={ci} style={styles.key} onPress={tryBiometric} activeOpacity={0.7}>
                    <Ionicons
                      name={bio.label === 'Fingerprint' ? 'finger-print' : 'scan'}
                      size={26}
                      color="#fff"
                    />
                  </TouchableOpacity>
                );
              }
              if (d === 'del') {
                return (
                  <TouchableOpacity key={ci} style={styles.key} onPress={backspace} activeOpacity={0.7}>
                    <Ionicons name="backspace-outline" size={26} color="#fff" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 },
  closeBtn: { position: 'absolute', top: 50, right: 18, padding: 8 },
  head: { alignItems: 'center', marginTop: 30 },
  lockBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16 },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 6 },

  dots: { flexDirection: 'row', gap: 16, marginVertical: 24 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  dotError:  { backgroundColor: COLORS.error, borderColor: COLORS.error },

  pad: { width: '80%', maxWidth: 320 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  key: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  keyText: { color: '#fff', fontSize: 26, fontWeight: '600' },
});

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import { AppState } from 'react-native';
import StorageService from '../services/StorageService';

const LockContext = createContext(null);

// Lightweight hash. NOT cryptographically strong — for offline-only
// "stop a roommate from peeking" use case. Treat the PIN as a soft gate.
const hashPin = (pin, salt) => {
  let h = 5381;
  const s = salt + ':' + pin + ':' + salt;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h = h | 0;
  }
  return String(h);
};

const randomSalt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const LockProvider = ({ children }) => {
  const [lock, setLock] = useState(null); // { enabled, salt, pinHash, autoLockSec }
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const backgroundedAt = useRef(0);

  useEffect(() => {
    (async () => {
      const stored = await StorageService.getLock();
      setLock(stored);
      // Require unlock on app start if enabled
      if (stored?.enabled) setIsUnlocked(false);
      setHydrated(true);
    })();
  }, []);

  // Lock again when app goes to background and stays there past auto-lock window
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && lock?.enabled) {
        const elapsed = Date.now() - backgroundedAt.current;
        const window = (lock.autoLockSec ?? 0) * 1000;
        if (window === 0 || elapsed >= window) {
          setIsUnlocked(false);
        }
      }
    });
    return () => sub.remove();
  }, [lock]);

  const setPin = useCallback(async (pin, autoLockSec = 0) => {
    const salt = randomSalt();
    const next = { enabled: true, salt, pinHash: hashPin(pin, salt), autoLockSec };
    setLock(next);
    await StorageService.saveLock(next);
    setIsUnlocked(true);
  }, []);

  const removeLock = useCallback(async () => {
    setLock(null);
    await StorageService.saveLock(null);
    setIsUnlocked(true);
  }, []);

  const tryUnlock = useCallback((pin) => {
    if (!lock?.enabled) return true;
    const ok = hashPin(pin, lock.salt) === lock.pinHash;
    if (ok) setIsUnlocked(true);
    return ok;
  }, [lock]);

  const lockNow = useCallback(() => {
    if (lock?.enabled) setIsUnlocked(false);
  }, [lock]);

  return (
    <LockContext.Provider
      value={{
        lockEnabled: !!lock?.enabled,
        autoLockSec: lock?.autoLockSec ?? 0,
        isUnlocked,
        hydrated,
        setPin,
        removeLock,
        tryUnlock,
        lockNow,
      }}
    >
      {children}
    </LockContext.Provider>
  );
};

export const useLock = () => {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside <LockProvider>');
  return ctx;
};

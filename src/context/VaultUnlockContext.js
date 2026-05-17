import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { AppState } from 'react-native';

const VaultUnlockContext = createContext(null);

// Vault stays unlocked for this many ms after last touch.
const IDLE_RELOCK_MS  = 5 * 60 * 1000;
// And re-locks when app is backgrounded for this many ms.
const BG_RELOCK_MS    = 60 * 1000;

export const VaultUnlockProvider = ({ children }) => {
  const [unlocked, setUnlocked] = useState(false);
  const lastTouchRef = useRef(0);
  const backgroundedAtRef = useRef(0);
  const idleTimer = useRef(null);

  const lock = useCallback(() => setUnlocked(false), []);

  const unlock = useCallback(() => {
    setUnlocked(true);
    lastTouchRef.current = Date.now();
  }, []);

  const touch = useCallback(() => {
    lastTouchRef.current = Date.now();
  }, []);

  // Idle re-lock check
  useEffect(() => {
    if (!unlocked) {
      if (idleTimer.current) { clearInterval(idleTimer.current); idleTimer.current = null; }
      return;
    }
    idleTimer.current = setInterval(() => {
      if (Date.now() - lastTouchRef.current >= IDLE_RELOCK_MS) lock();
    }, 30 * 1000);
    return () => { if (idleTimer.current) clearInterval(idleTimer.current); };
  }, [unlocked, lock]);

  // Background re-lock
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAtRef.current = Date.now();
      } else if (state === 'active' && unlocked) {
        const elapsed = Date.now() - backgroundedAtRef.current;
        if (elapsed >= BG_RELOCK_MS) lock();
      }
    });
    return () => sub.remove();
  }, [unlocked, lock]);

  return (
    <VaultUnlockContext.Provider value={{ unlocked, unlock, lock, touch }}>
      {children}
    </VaultUnlockContext.Provider>
  );
};

export const useVaultUnlock = () => {
  const ctx = useContext(VaultUnlockContext);
  if (!ctx) throw new Error('useVaultUnlock must be used inside <VaultUnlockProvider>');
  return ctx;
};

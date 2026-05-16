import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CALC_INPUT_PREFIX: '@fc_calc_',
  LAST_CALC: '@fc_last_calc',
  EXPENSES: '@fc_expenses',
  GOALS: '@fc_goals',
};

const StorageService = {
  // ── Calculator Inputs ────────────────────────────────────────────────────
  saveCalculatorInputs: async (calculatorId, data) => {
    try {
      await AsyncStorage.multiSet([
        [KEYS.CALC_INPUT_PREFIX + calculatorId, JSON.stringify(data)],
        [KEYS.LAST_CALC, JSON.stringify({ id: calculatorId, at: Date.now() })],
      ]);
    } catch (e) {
      console.warn('[Storage] saveCalculatorInputs:', e);
    }
  },

  getLastCalculator: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.LAST_CALC);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getCalculatorInputs: async (calculatorId) => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.CALC_INPUT_PREFIX + calculatorId);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // ── Expenses ─────────────────────────────────────────────────────────────
  saveExpenses: async (expenses) => {
    try {
      await AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.warn('[Storage] saveExpenses:', e);
    }
  },

  getExpenses: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.EXPENSES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ── Goals ────────────────────────────────────────────────────────────────
  saveGoals: async (goals) => {
    try {
      await AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
    } catch (e) {
      console.warn('[Storage] saveGoals:', e);
    }
  },

  getGoals: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.GOALS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ── Utility ──────────────────────────────────────────────────────────────
  clearAll: async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[Storage] clearAll:', e);
    }
  },
};

export default StorageService;

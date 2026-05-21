import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CALC_INPUT_PREFIX: '@fc_calc_',
  LAST_CALC: '@fc_last_calc',
  EXPENSES: '@fc_expenses',
  GOALS: '@fc_goals',
  SUBSCRIPTIONS: '@fc_subscriptions',
  SPLIT_GROUPS: '@fc_split_groups',
  RECEIPTS: '@fc_receipts',
  DOC_FOLDERS: '@fc_doc_folders',
  LOANS: '@fc_loans',
  LOCK: '@fc_lock',
  SETTINGS: '@fc_settings',
};

const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage]', key, e);
  }
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
  getLastCalculator: () => readJSON(KEYS.LAST_CALC, null),
  getCalculatorInputs: (calculatorId) => readJSON(KEYS.CALC_INPUT_PREFIX + calculatorId, null),

  // ── Expenses ─────────────────────────────────────────────────────────────
  saveExpenses: (expenses) => writeJSON(KEYS.EXPENSES, expenses),
  getExpenses:  () => readJSON(KEYS.EXPENSES, []),

  // ── Goals ────────────────────────────────────────────────────────────────
  saveGoals: (goals) => writeJSON(KEYS.GOALS, goals),
  getGoals:  () => readJSON(KEYS.GOALS, []),

  // ── Subscriptions ────────────────────────────────────────────────────────
  saveSubscriptions: (subs) => writeJSON(KEYS.SUBSCRIPTIONS, subs),
  getSubscriptions:  () => readJSON(KEYS.SUBSCRIPTIONS, []),

  // ── Split Groups ─────────────────────────────────────────────────────────
  saveSplitGroups: (groups) => writeJSON(KEYS.SPLIT_GROUPS, groups),
  getSplitGroups:  () => readJSON(KEYS.SPLIT_GROUPS, []),

  // ── Receipts ─────────────────────────────────────────────────────────────
  saveReceipts: (receipts) => writeJSON(KEYS.RECEIPTS, receipts),
  getReceipts:  () => readJSON(KEYS.RECEIPTS, []),

  // ── Document folders ─────────────────────────────────────────────────────
  saveDocFolders: (folders) => writeJSON(KEYS.DOC_FOLDERS, folders),
  getDocFolders:  () => readJSON(KEYS.DOC_FOLDERS, []),

  // ── Loans ────────────────────────────────────────────────────────────────
  saveLoans: (loans) => writeJSON(KEYS.LOANS, loans),
  getLoans:  () => readJSON(KEYS.LOANS, []),

  // ── Lock / Settings ──────────────────────────────────────────────────────
  saveLock: (lock) => writeJSON(KEYS.LOCK, lock),
  getLock:  () => readJSON(KEYS.LOCK, null),

  saveSettings: (settings) => writeJSON(KEYS.SETTINGS, settings),
  getSettings:  () => readJSON(KEYS.SETTINGS, { autoLockSec: 0 }),

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

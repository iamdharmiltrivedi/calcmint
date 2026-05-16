import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import StorageService from '../services/StorageService';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lastInputs, setLastInputs] = useState({});
  const [ready, setReady] = useState(false);

  // Hydrate from storage on first mount
  useEffect(() => {
    const hydrate = async () => {
      const [exp, gls] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getGoals(),
      ]);
      setExpenses(exp || []);
      setGoals(gls || []);
      setReady(true);
    };
    hydrate();
  }, []);

  // ── Expenses ────────────────────────────────────────────────────────────
  const addExpense = useCallback(
    async (expense) => {
      const updated = [
        { ...expense, id: Date.now().toString(), createdAt: new Date().toISOString() },
        ...expenses,
      ];
      setExpenses(updated);
      await StorageService.saveExpenses(updated);
    },
    [expenses],
  );

  const removeExpense = useCallback(
    async (id) => {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      await StorageService.saveExpenses(updated);
    },
    [expenses],
  );

  // ── Goals ───────────────────────────────────────────────────────────────
  const addGoal = useCallback(
    async (goal) => {
      const updated = [
        ...goals,
        { ...goal, id: Date.now().toString(), createdAt: new Date().toISOString() },
      ];
      setGoals(updated);
      await StorageService.saveGoals(updated);
    },
    [goals],
  );

  const removeGoal = useCallback(
    async (id) => {
      const updated = goals.filter((g) => g.id !== id);
      setGoals(updated);
      await StorageService.saveGoals(updated);
    },
    [goals],
  );

  // ── Calculator last-used inputs ─────────────────────────────────────────
  const saveLastInput = useCallback(
    async (calcId, data) => {
      const updated = { ...lastInputs, [calcId]: data };
      setLastInputs(updated);
      await StorageService.saveCalculatorInputs(calcId, data);
    },
    [lastInputs],
  );

  return (
    <AppContext.Provider
      value={{
        expenses,
        goals,
        lastInputs,
        ready,
        addExpense,
        removeExpense,
        addGoal,
        removeGoal,
        saveLastInput,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

export default AppContext;

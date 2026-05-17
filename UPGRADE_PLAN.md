# CalcMint — Production-Grade Upgrade Plan

> Offline-first, privacy-first, India-focused personal finance app.
> No backend. No login. No cloud. No tracking beyond AdMob requests.

This plan turns the current 10-calculator app into a complete offline personal-finance toolkit. It is opinionated and phased. Read it top-to-bottom once; then use the **Feature Priority Roadmap** as your delivery plan.

---

## 0. Honest Scope Reality Check

| Concern | Reality |
|---|---|
| 27 new features | This is 6–9 months of full-time engineering. Plan it in phases. |
| Offline OCR | Not solved cleanly on RN. See "Replacement" below. |
| Offline voice | Same problem. Apple/Google on-device works only on specific OS versions. |
| APK size | Each native module adds 0.5–3 MB. Be ruthless with adds. |
| State sprawl | Without discipline, 27 features = unmaintainable. State layer must come first. |

**Replacement strategies** (proposed in plan, can be revisited):
- **OCR** → ship as "tap to photograph + manual amount entry". OCR is a future Phase 4 stretch goal, gated on `ml-kit` evaluation.
- **Voice** → ship as smart text parser ("dinner 1200" typed into a quick-add) first. Real ASR is Phase 4 stretch, using `@react-native-voice/voice` with explicit "requires internet on Android < 11" caveat in UI.

---

## 1. Architecture Direction

### Current state (good bones)
- Single Expo project, React Navigation, AsyncStorage, no global store.
- Inputs and "last calculator used" are persisted via `StorageService` per-screen.
- UI is one cohesive design system (`constants/colors.js`, custom components).

### Target architecture: **Feature-based modular monolith**

```
src/
├── app/                       # App-level shell: navigation, providers, lock-gate
│   ├── App.tsx (later)
│   ├── providers/             # ThemeProvider, StoreProvider, LockProvider
│   └── navigation/
│       ├── RootNavigator.js   # decides Lock vs MainTabs
│       ├── MainTabs.js
│       └── stacks/            # one stack per tab
├── features/                  # FEATURE-FIRST, NOT TYPE-FIRST
│   ├── calculators/           # existing 10 calculators move here
│   │   ├── screens/
│   │   ├── components/
│   │   ├── logic/             # pure math (was utils/calculations.js)
│   │   └── index.js           # public exports
│   ├── expenses/
│   ├── goals/
│   ├── budget/
│   ├── vault/                 # NEW — secure storage
│   ├── loans/                 # NEW — EMI calendar
│   ├── subscriptions/         # NEW
│   ├── receipts/              # NEW
│   ├── dashboard/             # NEW
│   ├── timeline/              # NEW
│   ├── tools/                 # currency-notes, age, percentage, tip, units, life-cost
│   └── settings/              # theme, lock, backup, privacy mode
├── shared/                    # cross-feature primitives
│   ├── ui/                    # Button, Card, Input, Slider, EmptyState, etc.
│   ├── charts/                # Donut, Bar, Line, Sparkline (existing + new)
│   ├── hooks/                 # useTheme, useLock, useDebounce, useHaptic, etc.
│   ├── animations/            # shared transitions, easing
│   ├── theme/                 # tokens, light/dark palettes
│   ├── utils/                 # formatters, dates, INR math
│   └── icons/
├── store/                     # Zustand stores (one per feature domain)
│   ├── expensesStore.js
│   ├── goalsStore.js
│   ├── vaultStore.js
│   ├── loansStore.js
│   ├── subscriptionsStore.js
│   ├── settingsStore.js
│   └── createPersistedStore.js   # MMKV middleware factory
├── services/                  # cross-cutting infrastructure
│   ├── storage/               # MMKV + SecureStore wrappers
│   ├── notifications/         # expo-notifications
│   ├── backup/                # JSON export/import + encryption
│   ├── lock/                  # biometric + PIN
│   ├── ads/                   # existing AdsService
│   └── analytics/             # local-only event aggregator
└── constants/                 # routes, categories, denominations
```

**Why feature-first, not screens/components/services-first?**
The current `screens/`, `components/`, `services/` split works for 10 screens. At 40+ screens it becomes a junk drawer. A feature folder owns its screens, its UI, its math, its store slice — and can be deleted as one unit without leaving orphans. Shared primitives are the only exception.

**Migration approach:** do it incrementally. Move one feature folder per PR. Don't do a big-bang refactor. The 10 existing calculators can stay where they are until Phase 1 finishes — feature folders coexist with the old `screens/` path during transition.

---

## 2. State Management — **Recommended: Zustand**

| Option | Verdict |
|---|---|
| **Context API only** | Fine for theme/lock. Not for 10+ feature stores — causes re-render fan-out. |
| **Redux Toolkit** | Overkill. Boilerplate cost is high for an offline app with no async server state. |
| **Jotai / Recoil** | Atomic model is nice for forms, but mental-model overhead vs. Zustand isn't worth it here. |
| **Zustand** | ✅ Tiny (1 KB), no provider hell, selectors prevent re-renders, perfect MMKV persistence story. |
| **MobX** | Powerful but proxy-based reactivity surprises team members. Skip. |

**Pattern:** one slice per feature domain. Pure functions for derived data. Persist selectively (don't persist `isLoading` etc.).

```js
// store/expensesStore.js
import { create } from 'zustand';
import { persistMMKV } from './createPersistedStore';

export const useExpenses = create(
  persistMMKV('expenses', (set, get) => ({
    items: [],
    add: (e) => set({ items: [...get().items, e] }),
    remove: (id) => set({ items: get().items.filter(x => x.id !== id) }),
    monthlyTotal: () => /* derived */,
  }))
);
```

---

## 3. Storage Strategy

### Three tiers, picked by data sensitivity

| Tier | Library | What goes here |
|---|---|---|
| **Hot / frequent** | `react-native-mmkv` | Expenses, goals, calculator inputs, subscriptions, receipts metadata, app settings. 30× faster than AsyncStorage, synchronous reads. |
| **Sensitive** | `react-native-mmkv` with `encryptionKey` from `expo-secure-store` | Vault entries (PAN, Aadhaar tail, FD/SIP folios, insurance details), PIN hash. |
| **Files** | `expo-file-system` | Receipt photos, scanned docs, exported backups. Stored under `documentDirectory/receipts/<uuid>.jpg`. |

### Migration from AsyncStorage
- Day 1: read from AsyncStorage if MMKV is empty, write to MMKV. Delete from AsyncStorage on next launch after verified write.
- Wrap both behind a `storage/` service so feature code never imports either directly.

```js
// services/storage/kv.js
import { MMKV } from 'react-native-mmkv';
export const kv = new MMKV();
export const secureKv = new MMKV({ id: 'secure', encryptionKey: getOrCreateKey() });
```

### Repository pattern (per feature)
```js
// features/expenses/repository.js
export const expensesRepo = {
  all: () => useExpenses.getState().items,
  byMonth: (m) => /* ... */,
  add, remove, update,
};
```
Screens call the repo, the repo calls the store. Lets us swap persistence later without touching screens.

---

## 4. Security & Privacy Strategy

### Threat model (what we're protecting against)
- Stolen/lost phone with no device PIN
- Shoulder surfing on a public commute
- Someone borrowing the phone
- *Not* nation-state attackers; this is a calculator app, not a wallet.

### Controls
| Control | Library | Notes |
|---|---|---|
| **App lock (biometric)** | `expo-local-authentication` | Face ID / Touch ID / fingerprint. Fallback to PIN. |
| **PIN fallback** | Custom screen + `expo-crypto` SHA-256 hash stored in SecureStore | Never store raw PIN. Use 100k-iteration PBKDF2 if `expo-crypto` permits, else SHA-256 with random salt. |
| **Encrypted vault** | MMKV `encryptionKey` from SecureStore (per first launch, random 32 bytes) | Key never touches JS in plaintext after launch. |
| **Privacy mode** | App state listener → blur overlay when `state !== 'active'` | Hides amounts in app switcher. |
| **Hide balances** | Settings toggle → store-level selector returns `••••` | One source of truth via `useBalancePrivacy()` hook. |
| **Auto-lock** | Timer + AppState listener | Lock after configurable inactivity (default 60s) and on background. |
| **No telemetry** | Already true. AdMob requests use `requestNonPersonalizedAdsOnly: true`. | Keep it that way. |
| **Backups** | AES-256 encrypted JSON (passphrase chosen at export) | User keeps backup file in their cloud of choice. We never see it. |

### Privacy-mode UX
- Settings toggle: "Hide amounts when app is in background" (default ON)
- Settings toggle: "Hide all amounts" (manual ••••) — global
- Long-press any amount card to peek

---

## 5. Navigation Structure (target)

```
RootNavigator
├── LockGate (modal stack — biometric/PIN, blocks until passed)
└── MainTabs (5 tabs, not 3)
    ├── DashboardStack       (Dashboard, Timeline, Net-worth)
    ├── CalculatorsStack     (current 10 + new tools)
    ├── ExpensesStack        (Expenses, Quick-add, Categories, Splits)
    ├── GoalsStack           (Goals, Loans calendar, Subscriptions)
    └── MoreStack            (Vault, Receipts, Tools, Settings, Backup)
```

Why 5 tabs:
- 3 is too few for 27 features.
- 5 is the iOS HIG / Material recommended max; 6+ collapses into "More" on iOS automatically and looks bad.
- Calculators stay tab-1 visibility because that's the existing brand.

Floating action button (FAB) on Dashboard, Expenses, and Receipts tabs for quick-add.

---

## 6. UI/UX Direction

### Theme tokens (single source)
```js
// shared/theme/tokens.js
export const tokens = {
  light: { bg: '#F7F8F6', card: '#FFFFFF', text: '#0A0A0A', subtext: '#6E6E73', border: '#E8E8E5', primary: '#0B5D3B', gold: '#C9A24A', ... },
  dark:  { bg: '#0B0F0D', card: '#141A17', text: '#F4F4F0', subtext: '#9CA3AF', border: '#1F2A22', primary: '#3DA774', gold: '#D4B45F', ... },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
  space:  { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  font:   { body: 13, h1: 28, h2: 22, h3: 17, mono: '...' },
};
```
- `useTheme()` hook returns the active palette + tokens.
- All current `COLORS.x` usages migrate to `t.x` via the hook. Codemod with a single sed pass.
- Animated theme transitions via `react-native-reanimated` shared values when switching.

### Premium-fintech UI principles to apply
- **Card hierarchy:** 3 elevation levels max (flat, soft shadow, prominent). No drop-shadow Olympics.
- **Mono numerals everywhere money is shown** (already done — extend to new screens).
- **Skeleton loaders, not spinners** — even though data is local, brief skeletons hide MMKV reads on slow Androids.
- **Haptics on every commit** — `expo-haptics` `notificationAsync('success')` when saving an expense, goal, etc. Light tick on slider changes.
- **Reanimated 3** for transitions (already in Expo SDK 54). Layout animations for list inserts/removes.
- **Dark mode is not just inverted colors** — adjust accent saturation, use elevation surfaces instead of borders.

---

## 7. Feature Priority Roadmap (PHASED)

### Phase 0 — Foundation (2–3 weeks, BLOCKING — do not skip)
> Without this, every later feature ships slower and the codebase rots.
1. Folder migration to feature-based structure (existing features only).
2. Zustand stores for expenses, goals, settings (consume existing AsyncStorage data).
3. Theme tokens + dark mode plumbing (no UI changes yet).
4. MMKV migration with AsyncStorage backfill.
5. `LockProvider` + biometric/PIN (default OFF, opt-in in settings).
6. Privacy mode (blur on background).
7. Settings tab + screen.

### Phase 1 — Killer offline utilities (4–5 weeks)
> Stuff users will actually open the app for.
8. **Dashboard** (net worth widget pulling from goals + expenses + manual assets/liabilities entry).
9. **EMI Calendar / Loans** feature (add loans, see upcoming EMIs, notifications).
10. **Subscription tracker** (renewal reminders).
11. **Split expense calculator**.
12. **Emergency fund planner** (depends on existing expense data — natural follow-on).
13. **Loan comparison** (re-uses EMI math).

### Phase 2 — Quick tools, low engineering cost (2–3 weeks)
> Calculator-style features. Cheap to build, broaden the app's daily-utility surface.
14. Currency notes counter.
15. Age calculator.
16. Percentage calculator.
17. Tip calculator.
18. Unit converter.
19. Electricity bill estimator.
20. Gold investment calculator.
21. Rent vs buy calculator.
22. Marriage budget planner.
23. Life cost calculator.

### Phase 3 — Tracking & data features (4–5 weeks)
> Bigger UX, more state.
24. **Personal Finance Vault** (encrypted, biometric-gated already in Phase 0).
25. **Receipt manager + warranty reminders**.
26. **Vehicle cost tracker**.
27. **Financial timeline** (aggregates EMI dates, SIP dates, goal milestones, renewals).
28. **Savings challenge tracker** (52-week, no-spend, streak system).
29. **Offline financial journal**.
30. **Backup & restore** (encrypted JSON export/import).

### Phase 4 — Stretch goals, evaluate before committing (TBD)
31. Document scanner (just camera + manual amount; full OCR is a research spike).
32. Voice expense entry (text parser first; ASR if it tests well).
33. PDF reports.

---

## 8. Suggested Libraries (and why each is in)

| Need | Library | Size impact | Notes |
|---|---|---|---|
| State | **zustand** | ~1 KB | Already justified. |
| Hot storage | **react-native-mmkv** | ~600 KB native | 30× faster than AsyncStorage. Worth it. |
| Secure key | **expo-secure-store** | already in Expo | Holds MMKV encryption key. |
| Biometric | **expo-local-authentication** | already in Expo | Face/Touch ID, fingerprint. |
| Notifications | **expo-notifications** | already in Expo | EMI reminders, renewals, warranty. |
| Crypto | **expo-crypto** | already in Expo | PIN hashing, backup AES key derivation. |
| Camera | **expo-camera** | already in Expo | Receipts. |
| Image manipulation | **expo-image-manipulator** | already in Expo | Receipt compression. |
| Files | **expo-file-system** | already in Expo | Receipts, backups. |
| Haptics | **expo-haptics** | already in Expo | Premium feel. |
| Charts | keep **react-native-svg** custom charts; consider **victory-native** only if a feature needs it | varies | Don't pull in a chart lib until a screen actually requires it. |
| Animations | **react-native-reanimated** | already in Expo | Worklets for slider feedback, layout transitions. |
| Voice (Phase 4 only) | **@react-native-voice/voice** | ~1 MB | Has caveats. Evaluate first. |
| OCR (Phase 4 only) | research spike | TBD | `vision-camera` + `vision-camera-text-recognition` if VisionCamera adoption is acceptable. |
| Document picker / sharing | **expo-document-picker**, **expo-sharing** | already in Expo | Backup import/export. |
| PDF | **expo-print** | already in Expo | Optional reports. |

**Libraries I am NOT recommending:** Redux, redux-toolkit, react-query, immer, lodash, moment, date-fns (use `Intl.DateTimeFormat` + small helpers), firebase, sentry (telemetry violates privacy posture).

---

## 9. Reusable Hooks (extract early in Phase 0)

```
shared/hooks/
  useTheme.js              -> tokens + light/dark switch
  useBalancePrivacy.js     -> ••••• masking
  useLock.js               -> isLocked, requestUnlock, lockNow
  useHaptic.js             -> tick(), success(), warning(), error()
  useDebounce.js           -> standard
  useDebouncedValue.js     -> for slider-driven recalc throttling
  useMonthCursor.js        -> "prev month / next month" navigation state
  useINRFormatter.js       -> respects privacy mode + numbering preference
  useReminder.js           -> schedules a notification for a given Date
  usePersistedState.js     -> useState that syncs to MMKV key
  useAppStateChange.js     -> wraps AppState for privacy blur trigger
  useKeyboardHeight.js     -> for input-heavy screens
```

---

## 10. Reusable UI Components (build / formalize early)

```
shared/ui/
  Screen.js              -> SafeAreaView + status bar + scroll wrapper
  Card.js                -> elevation variants
  AmountText.js          -> mono + privacy-aware + sign coloring
  AmountInput.js          -> existing InputField, formalized
  Slider.js              -> existing SliderField
  Button.js              -> primary/secondary/ghost/destructive
  IconButton.js
  SegmentedControl.js
  ListRow.js             -> icon, title, subtitle, right element
  EmptyState.js
  Section.js             -> header + actions
  Pill.js                -> badges, status chips
  Modal.js               -> bottom-sheet variant (use @gorhom/bottom-sheet only if needed)
  FloatingActionButton.js
  Skeleton.js            -> shimmer placeholder
  ConfirmDialog.js
shared/charts/
  DonutChart.js (exists)
  BarChart.js   (exists)
  LineChart.js (NEW)
  Sparkline.js (NEW)
  CalendarHeatmap.js (NEW — for streaks)
```

---

## 11. Database Schema (logical, MMKV stores JSON blobs per key)

```ts
// KV namespaces
'kv:expenses:items'      -> Expense[]
'kv:goals:items'         -> Goal[]
'kv:loans:items'         -> Loan[]
'kv:subs:items'          -> Subscription[]
'kv:receipts:items'      -> Receipt[]
'kv:vehicles:items'      -> Vehicle[]
'kv:journal:entries'     -> JournalEntry[]
'kv:challenges:items'    -> Challenge[]
'kv:calc:inputs:<id>'    -> per-calculator inputs (existing)
'kv:settings'            -> Settings
'kv:lock:meta'           -> { enabled, method, pinHash, salt, lastUnlockAt }

// secure (encrypted MMKV)
'sec:vault:items'        -> VaultEntry[]
```

### Core types (TypeScript-ready even if codebase stays JS)
```ts
type Expense = { id: string; amount: number; category: string; note?: string; date: ISO; tags?: string[]; receiptId?: string };
type Goal = { id: string; name: string; target: number; saved: number; deadline?: ISO; icon: string; color: string; monthlyContribution?: number; createdAt: ISO };
type Loan = { id: string; name: string; principal: number; rate: number; startDate: ISO; tenureMonths: number; emi: number; dayOfMonth: number; prepayments: Prepayment[] };
type Subscription = { id: string; name: string; amount: number; cycle: 'monthly'|'yearly'|'weekly'; nextRenewal: ISO; category: string; reminderHoursBefore: number };
type Receipt = { id: string; vendor: string; amount: number; date: ISO; warrantyMonths?: number; tags: string[]; imageUri: string; ocrText?: string };
type Vehicle = { id: string; name: string; type: 'car'|'bike'|'ev'; fuelLogs: FuelLog[]; serviceLogs: ServiceLog[]; insurance: InsuranceRef };
type VaultEntry = { id: string; type: 'pan'|'aadhaar'|'insurance'|'fd'|'sip'|'note'; title: string; fields: Record<string, string>; updatedAt: ISO };
type Settings = { theme: 'system'|'light'|'dark'; lock: { enabled: boolean; autoLockSec: number }; privacy: { blurOnBackground: boolean; hideBalances: boolean }; currency: 'INR'; numberFormat: 'lakh'|'international' };
```

---

## 12. Screen-by-Screen UX Notes (highlights only)

**Dashboard (NEW, Phase 1)**
- Hero: net worth (assets – liabilities), tap to see breakdown.
- Next 7 days: upcoming EMI + subscription renewals + goal milestones.
- Monthly summary card: income vs expense bar, savings rate.
- "Quick actions" row: Add expense, Add goal, Run calculator.
- Tabbable widgets: "This month", "Last month", "YTD".

**Quick-add Expense (FAB → bottom sheet, Phase 1)**
- Big amount input (numpad styled, no keyboard).
- Category chips (recent first, then full grid).
- Optional one-line note.
- Date defaults today, tap to change.
- Save → haptic success → sheet dismisses.

**Vault (Phase 3)**
- Locked by default even if app lock is off — requires biometric on entry.
- Card-per-entry, type icon, masked fields by default, tap-and-hold to reveal.
- Categories tabs: Identity / Insurance / Investments / Notes.

**EMI Calendar (Phase 1)**
- Month-grid view with dots on EMI days.
- List view below: each EMI as a row with countdown ("in 4 days").
- Detail screen: full amortization table, "what if I pre-pay ₹X" simulator.

**Receipt Manager (Phase 3)**
- Grid of receipt thumbnails.
- Tap → full image + amount/vendor/date/warranty form.
- Warranty banner turns amber when <30 days remain, red when expired.

**Timeline (Phase 3)**
- Unified feed: every financial event (EMI paid, goal milestone, expense added, renewal coming).
- Filter chips: All / EMIs / Goals / Subscriptions / Renewals.
- Tap event → jump to source screen.

**Settings (Phase 0)**
- Theme: System / Light / Dark
- Lock: Off / Biometric / PIN — with auto-lock seconds slider
- Privacy: Blur on background, Hide balances
- Notifications: master toggle + per-feature
- Backup: Export encrypted backup, Import backup
- About: version, privacy policy (offline content), licenses

---

## 13. Performance Strategy

| Concern | Mitigation |
|---|---|
| Re-renders on every store change | Zustand selectors, `shallow` equality. Forbid `useStore()` without a selector via lint rule. |
| Slider re-rendering parent on every drag | Debounce derived calc with `useDebouncedValue` (already a pattern in existing screens). |
| Big lists (1000+ expenses) | `FlashList` from Shopify; falls back to `FlatList`. Only adopt when a list crosses ~200 items. |
| Initial JS load on low-end Android | Lazy-load feature stacks via `React.lazy` + `Suspense` (Phase 1+). |
| Chart redraws | Memoize chart `data` arrays; never pass new object references. |
| Modal open jank | Use `@gorhom/bottom-sheet` only for the FAB sheets where native gesture matters; otherwise React Native Modal is fine. |
| Theme-change flash | Reanimated shared values for color interpolation, not state-driven rerenders. |
| MMKV read hot path | Read once into Zustand on app launch. Don't re-read MMKV inside selectors. |

---

## 14. Local Analytics (offline only)

A small in-app analytics module (no exfiltration) that aggregates:
- Spend by category, month over month
- Average expense per day
- Savings rate (income tracked manually or inferred)
- Recurring spend (subscriptions + EMIs)
- "Compared to last month: ↑12%" callouts
- Streak counters for challenges

All powered by Zustand selectors over the expense store. No new infra needed.

---

## 15. Notifications (offline-scheduled)

`expo-notifications` schedules local notifications at:
- 09:00 the day **before** EMI due
- 09:00 on EMI day
- 24 hours before subscription renewal
- 30 days before warranty expiry, 7 days before, day-of
- Optional daily journal nudge at 21:00

All scheduling is local — no FCM/APNs server. Re-scheduled on app launch from canonical store data, in case of OS clear.

Permission ask is deferred: only prompt when the user opts in to "remind me" on a specific item.

---

## 16. Backup & Restore

**Export:**
1. User taps "Export backup" → enters passphrase (warned: irreversible if lost).
2. App snapshots all MMKV namespaces into a single JSON.
3. JSON is encrypted with AES-256-GCM using key = PBKDF2(passphrase, salt, 100k).
4. File written to cache; `expo-sharing` opens system share sheet.

**Import:**
1. User picks `.calcmint.bak` via `expo-document-picker`.
2. App reads file, prompts for passphrase, decrypts, validates schema version.
3. Confirm destructive overwrite → restore all stores → restart navigator.

Schema version is mandatory so future upgrades can migrate.

---

## 17. AdMob — what changes in this plan

Banners and the existing interstitial cadence are fine. Two additions:
- **Hide ads in Vault, Lock screen, and Backup flows.** Trust signal matters more there.
- **Add a settings toggle: "Support development — show ads"** (default ON). If you ever add a one-time-purchase IAP tier later, this becomes the off-ramp without re-architecting.

---

## 18. Implementation Roadmap (calendar view)

| Week | Output |
|---|---|
| 1 | Folder migration of existing features; tokens; dark mode plumbing (no visible change yet). |
| 2 | MMKV migration; Zustand stores for existing features; AsyncStorage backfill verified. |
| 3 | Lock system, Privacy mode, Settings screen, dark mode visible. **Phase 0 ships.** |
| 4–5 | Dashboard + EMI calendar (Loans feature). |
| 6 | Subscriptions feature. |
| 7 | Split expense calc + Loan comparison. |
| 8 | Emergency fund planner + polish. **Phase 1 ships.** |
| 9–10 | All 10 small calculators in Phase 2. |
| 11 | Notifications wiring, polish, app-wide haptics audit. **Phase 2 ships.** |
| 12–13 | Vault. |
| 14–15 | Receipt manager + warranty reminders. |
| 16 | Vehicle tracker. |
| 17 | Timeline + Journal + Challenges. |
| 18 | Backup/restore + polish. **Phase 3 ships.** |
| 19+ | Phase 4 stretch: scanner/voice spike. |

Adjust by 30% if part-time.

---

## 19. Engineering Hygiene (non-negotiable)

- **Adopt TypeScript** as a one-time migration before Phase 1 ramps. The data model above is far easier to keep correct in TS. Expo + RN + Reanimated all have first-class TS. Migration: rename `.js` → `.ts/.tsx`, add types feature-by-feature; `// @ts-nocheck` to start, peel back.
- **Add ESLint + Prettier** with a rules pack tuned for RN. One config in repo root.
- **Add a `lint:fix` and `typecheck` script** that runs in CI (EAS Build hook or GitHub Action). No CI today; even a precommit hook (`husky` + `lint-staged`) is enough at this scale.
- **Add an `__tests__` folder per feature** with at least pure-math unit tests (`jest`). The calculator math files are the highest-ROI tests — verify EMI, SIP, PPF, tax formulas against known values.

---

## 20. What I Recommend Doing Right Now

If you only have 1 week, do this in order:
1. **Confirm the phasing.** Tell me which features in Phase 1–3 you want re-prioritized.
2. **Decide TypeScript yes/no.** Strongly recommend yes; cost is one weekend.
3. **Phase 0, week 1 only:** I can start the folder migration + theme tokens + Zustand+MMKV plumbing today. No user-visible changes. This unblocks every later phase.

Tell me which of those three to start with and I'll execute.

---

*End of plan.*

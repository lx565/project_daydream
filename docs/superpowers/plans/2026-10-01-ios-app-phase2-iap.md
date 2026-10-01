# mingli-app Phase 2 IAP Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the app's AI reading content behind a $6.99 Apple consumable in-app purchase, unlocked per saved profile, with no accounts and no backend changes.

**Architecture:** RevenueCat (`react-native-purchases`) handles the Apple purchase flow and receipt verification for one consumable product (`unlock_reading`, $6.99). A successful purchase sets a local `unlocked: true` flag on the `SavedProfile` record already persisted in AsyncStorage. Every AI-reading screen checks this flag and renders a paywall card instead of generating/showing AI content when it's false — critically, the flag gate wraps the *generation trigger* itself, not just the rendered output, so a locked profile never causes a billable AI call.

**Tech Stack:** `react-native-purchases` (RevenueCat SDK), existing `AsyncStorage`-backed `profileStorage.ts`, existing `useReading`/`useChart` hooks (unmodified).

**Spec:** `docs/superpowers/specs/2026-10-01-ios-app-phase2-iap-design.md`

## Global Constraints

- Price: $6.99 USD, one Apple **Consumable** IAP product, id `unlock_reading`.
- Purchase unlocks ALL reading content for exactly one `SavedProfile` (bundled, not per-screen).
- The Ziwei chart's 12-palace grid and 命格偵測 (mingge) detection in `ChartScreen.tsx` stay free unconditionally, on every profile, locked or not — this is a hard product decision repeated throughout this project's history, never gate it.
- No accounts, no backend changes, no cross-device sync — `unlocked` is a plain local boolean in the same AsyncStorage-backed `SavedProfile` record profiles already use.
- This repo has no test runner (`tsc --noEmit` is the existing verification bar for the whole project, confirmed via `package.json` — no Jest/RTL). Every task's "test" step is a `tsc --noEmit` check plus a concrete manual verification where behavior can't be typechecked.
- RevenueCat requires a real API key that only Niki can generate (a RevenueCat account + Apple Developer Portal product configuration) — the code must work correctly with that key *absent* during development (graceful no-crash degradation), since this plan ships before that manual setup happens.
- `react-native-purchases` is a native module — it will not run inside Expo Go. Testing the actual purchase flow requires an EAS development/preview build (already the project's direction per the in-progress EAS Build setup), not `npx expo start` + Expo Go.

## Review Focus

- **AI generation must be gated at the trigger, not just the display.** Every screen's `useEffect` that calls `reading.start(...)` automatically on chart-ready must also require `unlocked === true`. If only the *rendered output* is hidden behind the paywall while the `useEffect` still fires unconditionally, the backend generates (and the project pays for) a full AI reading for every locked profile a user merely opens — the exact cost exposure this whole paywall exists to prevent. Task 4's tests pin this for all 6 affected screens.
- **A cancelled purchase must not show an error.** Apple's purchase sheet being dismissed by the user is normal, expected interaction — RevenueCat surfaces this as a specific cancellation state, not a generic failure. Showing a scary red error message here would look broken and hurt trust. Task 3 pins this.
- **A missing/invalid RevenueCat API key must not crash the app.** The key depends on manual account setup that happens after this plan ships. A hard crash on launch (or on first paywall render) would be a total app-breaking regression discovered only in testing, not in `tsc --noEmit`. Task 2 pins this.
- **An already-unlocked profile must never re-show the paywall on a later visit.** Since `unlocked` is read from the profile that each screen receives via navigation params, a screen that caches a stale copy of `profile` from before a purchase completed (e.g., in state initialized once from route params and never refreshed) would keep demanding payment from someone who already paid — a trust-destroying bug for a payment feature. Task 3's `onUnlocked` contract and Task 4/5's usage pattern pin this.
- **`ChartScreen`'s free grid and mingge detection must stay visible and interactive when the profile is locked.** Because this screen's paywall gate wraps only its bottom AI-palace-reading section (not the whole screen, unlike every other reading screen), a careless implementation could accidentally wrap too much and hide content that this project has repeatedly, explicitly decided must always be free. Task 4 pins this.

---

### Task 1: Add `unlocked` field and `unlockProfile()` to profile storage

**Files:**
- Modify: `app/lib/profileStorage.ts`

**Interfaces:**
- Produces: `SavedProfile.unlocked?: boolean` (new optional field; absent/undefined means locked, same as a brand-new profile). `unlockProfile(id: string): Promise<void>` — sets `unlocked: true` on the matching profile and persists it.

- [ ] **Step 1: Add the field to the interface**

In `app/lib/profileStorage.ts`, add `unlocked?: boolean;` to the `SavedProfile` interface, directly below the existing `relationship?: string;` line:

```typescript
export interface SavedProfile {
  id: string;
  name?: string;
  relationship?: string;
  unlocked?: boolean;
  date: string; // "YYYY-MM-DD"
  hour: number; // 0-23 real clock hour (representative start-of-時辰 value) — matches fortune-app's WheelPicker.tsx SHICHEN_SHORT convention
  gender: "male" | "female";
  createdAt: number;
}
```

- [ ] **Step 2: Add `unlockProfile`, following the existing `deleteProfile` read-modify-write pattern**

Add this function at the end of `app/lib/profileStorage.ts`, after the existing `deleteProfile`:

```typescript
export async function unlockProfile(id: string): Promise<void> {
  return enqueue(async () => {
    const existing = await listProfilesStrict();
    const updated = existing.map((p) => (p.id === id ? { ...p, unlocked: true } : p));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  });
}
```

This reuses the same `enqueue()`/`listProfilesStrict()` helpers `addProfile`/`deleteProfile` already use, so it's serialized against concurrent profile writes the same way.

- [ ] **Step 3: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors. (No test runner exists in this repo — a reviewer should read `unlockProfile` against `deleteProfile` immediately above it in the same file and confirm the read-modify-write shape matches exactly, since there's no executable test to catch a divergence.)

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/mingli-app
git add app/lib/profileStorage.ts
git commit -m "feat: add unlocked field and unlockProfile() to profile storage"
```

---

### Task 2: RevenueCat SDK wrapper

**Files:**
- Create: `app/lib/purchases.ts`
- Modify: `App.tsx`
- Modify: `app.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `configurePurchases(): void` — call once at app startup. `purchaseUnlock(): Promise<PurchaseResult>` where `PurchaseResult = { success: true } | { success: false; cancelled: boolean; error: string }` — Task 3 consumes this exact shape.

- [ ] **Step 1: Install the SDK via Expo's version-resolving installer**

```bash
cd ~/Projects/mingli-app
npx expo install react-native-purchases expo-constants
```

`expo install` (not plain `npm install`) picks the exact version known to work with this project's Expo SDK (`~57.0.26`), which is the convention this project already follows for every native dependency.

- [ ] **Step 2: Add the API key slot to `app.json`**

Add a `revenueCatApiKey` field to the existing `extra` block in `app.json` (leave it as an empty string for now — Niki fills in the real key after creating a RevenueCat project and Apple IAP product):

```json
    "extra": {
      "eas": {
        "projectId": "6d5ec59c-c427-445e-87e9-0c9a995b7cd6"
      },
      "revenueCatApiKey": ""
    },
```

- [ ] **Step 3: Write `app/lib/purchases.ts`**

```typescript
import Constants from "expo-constants";
import Purchases from "react-native-purchases";

const REVENUECAT_API_KEY: string = Constants.expoConfig?.extra?.revenueCatApiKey ?? "";
const UNLOCK_PRODUCT_ID = "unlock_reading";

let configured = false;

/** Call once at app startup. No-ops (with a console warning) if the API key
 *  hasn't been set yet in app.json's extra.revenueCatApiKey — this lets the
 *  rest of the app build and run correctly before Niki finishes RevenueCat
 *  account setup, instead of crashing on launch. */
export function configurePurchases(): void {
  if (!REVENUECAT_API_KEY) {
    console.warn("purchases: revenueCatApiKey is empty in app.json extra — IAP is disabled until it's set.");
    return;
  }
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  configured = true;
}

export type PurchaseResult = { success: true } | { success: false; cancelled: boolean; error: string };

/** Buys one `unlock_reading` consumable. Never throws — every failure path,
 *  including "SDK not configured" and "user cancelled", resolves to a
 *  PurchaseResult the caller can branch on directly. */
export async function purchaseUnlock(): Promise<PurchaseResult> {
  if (!configured) {
    return { success: false, cancelled: false, error: "購買功能尚未啟用，請稍後再試" };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === UNLOCK_PRODUCT_ID
    );
    if (!pkg) {
      return { success: false, cancelled: false, error: "找不到購買項目，請稍後再試" };
    }
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      return { success: false, cancelled: true, error: "" };
    }
    return { success: false, cancelled: false, error: err.message ?? "購買失敗，請稍後再試" };
  }
}
```

- [ ] **Step 4: Call `configurePurchases()` once at app startup**

In `App.tsx`, import and call it before the component returns its tree (module-level import, called inside the component body once per mount is fine — it's idempotent-guarded via the `configured` flag for the purchase path, and `Purchases.configure` itself is safe to call once here since `App` only mounts once):

```typescript
import { NavigationContainer } from "@react-navigation/native";
import { useFonts, NotoSerifTC_400Regular, NotoSerifTC_700Bold } from "@expo-google-fonts/noto-serif-tc";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootTabs from "./app/navigation/RootTabs";
import { COLORS } from "./app/theme";
import { configurePurchases } from "./app/lib/purchases";

configurePurchases();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ NotoSerifTC_400Regular, NotoSerifTC_700Bold });
```

Calling it at module scope (not inside the component function) guarantees it runs exactly once per app process, before any screen mounts — simpler than wiring a `useEffect` for something that must happen exactly once globally.

- [ ] **Step 5: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

Manual check (API key absent, as it will be until Niki sets it up): run `npx expo start -c`, open the app in Expo Go. Confirm the app launches normally and the console shows the `revenueCatApiKey is empty` warning, with no crash. (This is the one behavior in this task that `tsc` can't verify — the whole point of Task 2's design is this exact no-crash-when-unconfigured path, so don't skip this manual check.)

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/mingli-app
git add app/lib/purchases.ts App.tsx app.json package.json package-lock.json
git commit -m "feat: add RevenueCat SDK wrapper for the unlock_reading consumable purchase"
```

---

### Task 3: `PaywallGate` component

**Files:**
- Create: `app/components/PaywallGate.tsx`

**Interfaces:**
- Consumes: `purchaseUnlock()` and `PurchaseResult` from `app/lib/purchases.ts` (Task 2); `unlockProfile(id)` from `app/lib/profileStorage.ts` (Task 1); `SavedProfile` type from `app/lib/profileStorage.ts`.
- Produces: `<PaywallGate profile={profile} onUnlocked={() => void}>` — a React component. Tasks 4 and 5 render this in place of gated AI content.

- [ ] **Step 1: Write the component**

```typescript
import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { purchaseUnlock } from "../lib/purchases";
import { unlockProfile, type SavedProfile } from "../lib/profileStorage";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../theme";

const PRICE_LABEL = "$6.99";

const INCLUDED = [
  "命盤總覽 · 命理版 + 白話版解讀",
  "十二宮位 · 逐宮精解",
  "大運流年 · 運勢時機",
  "八字命理 · 雙重印證",
  "眾說紛紜 · 三派各自論斷",
  "特別注意 · 風險與化解",
  "問命追問 · 可向模型深度追問命盤細節",
];

interface Props {
  profile: SavedProfile;
  onUnlocked: () => void;
}

export default function PaywallGate({ profile, onUnlocked }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await purchaseUnlock();
    if (result.success) {
      await unlockProfile(profile.id);
      onUnlocked();
      return;
    }
    setLoading(false);
    if (!result.cancelled) {
      setError(result.error);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
        <Text style={styles.title}>解鎖完整命書</Text>
        <Text style={styles.subtitle}>以下深度解讀一次解鎖，全部開啟</Text>
      </View>

      <View style={styles.includedList}>
        {INCLUDED.map((item) => (
          <View key={item} style={styles.includedRow}>
            <Text style={styles.includedBullet}>✦</Text>
            <Text style={styles.includedText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.priceBlock}>
        <Text style={styles.priceHint}>人工命理諮詢動輒數千元起跳</Text>
        <Text style={styles.price}>{PRICE_LABEL}</Text>
        <Text style={styles.priceSub}>USD · 一次付費 · 永久解鎖</Text>
      </View>

      <Pressable style={styles.button} onPress={handlePress} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={COLORS.paper} />
        ) : (
          <Text style={styles.buttonText}>立即解鎖</Text>
        )}
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.paper,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 18,
    padding: 20,
  },
  header: { alignItems: "center", marginBottom: 14 },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lockIcon: { fontSize: 18 },
  title: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.ink },
  subtitle: { fontFamily: FONT_SERIF_TC, fontSize: 12, color: COLORS.ink3, marginTop: 4, textAlign: "center" },
  includedList: { gap: 6, marginBottom: 16 },
  includedRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  includedBullet: { color: COLORS.gold, fontSize: 12 },
  includedText: { fontFamily: FONT_SERIF_TC, fontSize: 12.5, color: COLORS.ink2, flex: 1 },
  priceBlock: { alignItems: "center", marginBottom: 14 },
  priceHint: { fontFamily: FONT_SERIF_TC, fontSize: 10.5, color: COLORS.ink4, marginBottom: 2 },
  price: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 24, color: COLORS.ink },
  priceSub: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink4 },
  button: {
    backgroundColor: COLORS.vermillion,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 14.5, color: COLORS.paper },
  errorText: {
    fontFamily: FONT_SERIF_TC,
    fontSize: 12,
    color: COLORS.vermillion,
    textAlign: "center",
    marginTop: 8,
  },
});
```

Note the cancellation handling in `handlePress`: when `result.cancelled` is true, `error` is deliberately left unset (empty string, which the `{!!error && ...}` check hides) — only a genuine failure shows the red error text. This is the Review Focus item about not treating a user's deliberate cancel as an error.

- [ ] **Step 2: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/mingli-app
git add app/components/PaywallGate.tsx
git commit -m "feat: add PaywallGate component for per-profile unlock purchase UI"
```

---

### Task 4: Gate the 6 auto-generating reading screens

**Files:**
- Modify: `app/screens/reading/OverviewScreen.tsx`
- Modify: `app/screens/reading/DecadesScreen.tsx`
- Modify: `app/screens/reading/BaziScreen.tsx`
- Modify: `app/screens/reading/SchoolsScreen.tsx`
- Modify: `app/screens/reading/CautionsScreen.tsx`
- Modify: `app/screens/reading/ChartScreen.tsx`

**Interfaces:**
- Consumes: `<PaywallGate profile={profile} onUnlocked={...}>` (Task 3). `SavedProfile.unlocked` (Task 1).
- Produces: nothing further downstream — this is the last task touching these 6 files.

All 6 screens share one shape: they read `profile` from route params, auto-start an AI reading via a `useEffect` once chart data is ready, and render the reading's `loading`/`error`/`done` states in one section. The fix for each is the same three-part change:

1. Add local state tracking unlock status, seeded from the profile (not from a prop that could go stale): `const [unlocked, setUnlocked] = useState(profile.unlocked === true);`
2. Add `unlocked` to the auto-start `useEffect`'s condition, so a locked profile's AI reading is never generated — only requested once the user has actually paid.
3. Replace the reading-status-rendering block with a ternary: unlocked renders the existing loading/error/done UI unchanged, locked renders `<PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />`.

- [ ] **Step 1: `OverviewScreen.tsx`**

```typescript
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useChart } from "../../lib/useChart";
import { useReading } from "../../lib/useReading";
import ReadingText from "../../components/ReadingText";
import PaywallGate from "../../components/PaywallGate";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ReadingTabParamList } from "../../navigation/types";

const API_BASE = "https://www.mingli.study";

type Props = BottomTabScreenProps<ReadingTabParamList, "Overview">;

export default function OverviewScreen({ route }: Props) {
  const profile = route.params.profile;
  const [unlocked, setUnlocked] = useState(profile.unlocked === true);
  const { bazi, ziwei, loading: chartLoading, baziError, ziweiError } = useChart(profile);
  const cacheKey = `${profile.id}_overview`;
  const reading = useReading(`${API_BASE}/api/reading/synthesis`, cacheKey, { validate: true });

  useEffect(() => {
    if (ziwei && bazi && unlocked && reading.status === "idle") {
      reading.start({ ziwei, bazi, gender: profile.gender, name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziwei, bazi, unlocked]);

  if (chartLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.vermillion} />
      </View>
    );
  }
  if (baziError || ziweiError || !ziwei || !bazi) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{baziError ?? ziweiError ?? "排盤失敗"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>命盤基礎</Text>
        <Text style={styles.cardMain}>{ziwei.summary}</Text>
        <Text style={styles.cardSub}>
          {ziwei.fiveElementsClass} · 命主：{ziwei.mainStar} · 身主：{ziwei.bodyStar}
        </Text>
      </View>

      <View>
        <Text style={styles.sectionLabel}>│ 命盤解讀</Text>
        {unlocked ? (
          <View style={styles.card}>
            {reading.status === "loading" && <ActivityIndicator color={COLORS.vermillion} />}
            {reading.status === "error" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.errorText}>{reading.errorMsg}</Text>
                <Pressable onPress={() => reading.start({ ziwei, bazi, gender: profile.gender, name: profile.name })}>
                  <Text style={styles.retryText}>重試</Text>
                </Pressable>
              </View>
            )}
            {reading.status === "done" && <ReadingText text={reading.text} />}
          </View>
        ) : (
          <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  center: { flex: 1, backgroundColor: COLORS.parchment, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 18, padding: 18 },
  cardLabel: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, textAlign: "center" },
  cardMain: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 19, color: COLORS.vermillion, textAlign: "center" },
  cardSub: { fontFamily: FONT_SERIF_TC, fontSize: 12.5, color: COLORS.ink2, textAlign: "center", marginTop: 6 },
  sectionLabel: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.vermillion, marginBottom: 8 },
  errorText: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.vermillion },
  retryText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.gold, textDecorationLine: "underline" },
});
```

- [ ] **Step 2: `DecadesScreen.tsx`** — identical pattern. Current content (read it first — it was simplified earlier today back to a single current-decade card, no list):

```typescript
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useChart } from "../../lib/useChart";
import { useReading } from "../../lib/useReading";
import ReadingText from "../../components/ReadingText";
import PaywallGate from "../../components/PaywallGate";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ReadingTabParamList } from "../../navigation/types";

const API_BASE = "https://www.mingli.study";

type Props = BottomTabScreenProps<ReadingTabParamList, "Decades">;

export default function DecadesScreen({ route }: Props) {
  const profile = route.params.profile;
  const [unlocked, setUnlocked] = useState(profile.unlocked === true);
  const { ziwei, loading: chartLoading, ziweiError } = useChart(profile);
  const cacheKey = `${profile.id}_decades`;
  const reading = useReading(`${API_BASE}/api/reading/decades`, cacheKey, { validate: true });
  const birthYear = parseInt(profile.date.slice(0, 4), 10);

  useEffect(() => {
    if (ziwei && !ziweiError && unlocked && reading.status === "idle") {
      reading.start({ ziwei, birthYear, name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziwei, ziweiError, unlocked]);

  if (chartLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.vermillion} />
      </View>
    );
  }
  if (ziweiError || !ziwei) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{ziweiError ?? "排盤失敗"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View>
        <Text style={styles.sectionLabel}>│ 大運解讀</Text>
        {unlocked ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>大限流年詳解</Text>
            {reading.status === "loading" && <ActivityIndicator color={COLORS.vermillion} />}
            {reading.status === "error" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.errorText}>{reading.errorMsg}</Text>
                <Pressable onPress={() => reading.start({ ziwei, birthYear, name: profile.name })}>
                  <Text style={styles.retryText}>重試</Text>
                </Pressable>
              </View>
            )}
            {reading.status === "done" && <ReadingText text={reading.text} />}
          </View>
        ) : (
          <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  center: { flex: 1, backgroundColor: COLORS.parchment, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 18, padding: 18 },
  cardLabel: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, textAlign: "center" },
  sectionLabel: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.vermillion, marginBottom: 8 },
  errorText: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.vermillion },
  retryText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.gold, textDecorationLine: "underline" },
});
```

- [ ] **Step 3: `BaziScreen.tsx`** — same pattern; the static 四柱 pillars table stays unconditionally visible (it's derived chart data, not AI content), only the "八字解讀" AI card is gated:

```typescript
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useChart } from "../../lib/useChart";
import { useReading } from "../../lib/useReading";
import ReadingText from "../../components/ReadingText";
import PaywallGate from "../../components/PaywallGate";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ReadingTabParamList } from "../../navigation/types";

const API_BASE = "https://www.mingli.study";

const PILLARS = [
  { key: "year", label: "年柱" },
  { key: "month", label: "月柱" },
  { key: "day", label: "日柱" },
  { key: "hour", label: "時柱" },
] as const;

type Props = BottomTabScreenProps<ReadingTabParamList, "Bazi">;

export default function BaziScreen({ route }: Props) {
  const profile = route.params.profile;
  const [unlocked, setUnlocked] = useState(profile.unlocked === true);
  const { bazi, loading: chartLoading, baziError } = useChart(profile);
  const cacheKey = `${profile.id}_bazi`;
  const reading = useReading(`${API_BASE}/api/reading/bazi`, cacheKey);

  useEffect(() => {
    if (bazi && !baziError && unlocked && reading.status === "idle") {
      reading.start({ bazi, gender: profile.gender });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bazi, baziError, unlocked]);

  if (chartLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.vermillion} />
      </View>
    );
  }
  if (baziError || !bazi) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{baziError ?? "排盤失敗"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View>
        <Text style={styles.sectionLabel}>│ 四柱八字</Text>
        <View style={styles.card}>
          <View style={styles.pillarRow}>
            {PILLARS.map(({ key, label }) => {
              const p = bazi[key];
              const isDay = key === "day";
              return (
                <View key={key} style={[styles.pillarCol, isDay && styles.dayCol]}>
                  <Text style={[styles.pillarLabel, isDay && styles.dayLabel]}>{label}</Text>
                  <Text style={[styles.pillarChar, isDay && styles.dayChar]}>{p.stem}</Text>
                  <Text style={styles.pillarElement}>{p.stemElement}</Text>
                  <Text style={styles.pillarChar}>{p.branch}</Text>
                  <Text style={styles.pillarElement}>{p.branchElement}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.dayMasterBox}>
            <Text style={styles.dayMasterText}>
              日主　<Text style={styles.dayMasterValue}>{bazi.dayMaster}{bazi.dayMasterElement}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>│ 八字解讀</Text>
        {unlocked ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>八字格局速讀</Text>
            {reading.status === "loading" && <ActivityIndicator color={COLORS.vermillion} />}
            {reading.status === "error" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.errorText}>{reading.errorMsg}</Text>
                <Pressable onPress={() => reading.start({ bazi, gender: profile.gender })}>
                  <Text style={styles.retryText}>重試</Text>
                </Pressable>
              </View>
            )}
            {reading.status === "done" && <ReadingText text={reading.text} />}
          </View>
        ) : (
          <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  center: { flex: 1, backgroundColor: COLORS.parchment, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 18, padding: 18 },
  cardLabel: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, textAlign: "center" },
  sectionLabel: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.vermillion, marginBottom: 8 },
  errorText: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.vermillion },
  retryText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.gold, textDecorationLine: "underline" },
  pillarRow: { flexDirection: "row", gap: 6 },
  pillarCol: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight },
  dayCol: { backgroundColor: COLORS.vermillionL, borderColor: COLORS.vermillion },
  pillarLabel: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink3, letterSpacing: 1, marginBottom: 6 },
  dayLabel: { color: COLORS.vermillion },
  pillarChar: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 28, lineHeight: 36, color: COLORS.ink },
  dayChar: { color: COLORS.vermillion },
  pillarElement: { fontFamily: FONT_SERIF_TC, fontSize: 11, color: COLORS.ink3, marginBottom: 4 },
  dayMasterBox: { marginTop: 12, alignItems: "center" },
  dayMasterText: { fontFamily: FONT_SERIF_TC, fontSize: 13, color: COLORS.ink3 },
  dayMasterValue: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 15, color: COLORS.vermillion },
});
```

- [ ] **Step 4: `SchoolsScreen.tsx`** — read the file first to copy its exact current JSX/styles (it renders `眾說紛紜`-style content fetched from `/api/reading/overview`, cached as `_schools`). Apply the same three-part change as above: add `const [unlocked, setUnlocked] = useState(profile.unlocked === true);`, add `unlocked` to the auto-start `useEffect`'s condition and dependency array, and wrap the existing loading/error/done rendering block in `unlocked ? (...) : <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />`. Do not change the API endpoint, cache key, or any other existing logic in this file.

- [ ] **Step 5: `CautionsScreen.tsx`** — read the file first. Same three-part change as Step 4, applied to this file's existing `注意` reading block. Do not change the API endpoint, cache key, or any other existing logic in this file.

- [ ] **Step 6: `ChartScreen.tsx`** — same three-part change, but applied **only** to the bottom "│ 宮位詳解" section (the `palacesReading` block). The palace grid (`styles.grid` / `BRANCH_POSITION` map) and the "│ 命格偵測" mingge section above it are NOT touched — they must render exactly as they do today regardless of `unlocked`, per this task's Global Constraint and Review Focus item about Chart's free content.

Add `const [unlocked, setUnlocked] = useState(profile.unlocked === true);` near the top of the component (alongside the existing `selectedBranch` state). Change:

```typescript
  useEffect(() => {
    if (ziwei && !ziweiError && palacesReading.status === "idle") {
      palacesReading.start({ ziwei, name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziwei, ziweiError]);
```

to:

```typescript
  useEffect(() => {
    if (ziwei && !ziweiError && unlocked && palacesReading.status === "idle") {
      palacesReading.start({ ziwei, name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziwei, ziweiError, unlocked]);
```

And change the final section's rendering from:

```typescript
      <View style={{ paddingHorizontal: 8 }}>
        <Text style={styles.sectionLabel}>│ 宮位詳解</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>十二宮位詳解</Text>
          {palacesReading.status === "loading" && <ActivityIndicator color={COLORS.vermillion} />}
          {palacesReading.status === "error" && (
            <View style={{ gap: 8 }}>
              <Text style={styles.errorText}>{palacesReading.errorMsg}</Text>
              <Pressable onPress={() => palacesReading.start({ ziwei, name: profile.name })}>
                <Text style={styles.retryText}>重試</Text>
              </Pressable>
            </View>
          )}
          {palacesReading.status === "done" && <ReadingText text={palacesReading.text} />}
        </View>
      </View>
```

to:

```typescript
      <View style={{ paddingHorizontal: 8 }}>
        <Text style={styles.sectionLabel}>│ 宮位詳解</Text>
        {unlocked ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>十二宮位詳解</Text>
            {palacesReading.status === "loading" && <ActivityIndicator color={COLORS.vermillion} />}
            {palacesReading.status === "error" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.errorText}>{palacesReading.errorMsg}</Text>
                <Pressable onPress={() => palacesReading.start({ ziwei, name: profile.name })}>
                  <Text style={styles.retryText}>重試</Text>
                </Pressable>
              </View>
            )}
            {palacesReading.status === "done" && <ReadingText text={palacesReading.text} />}
          </View>
        ) : (
          <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />
        )}
      </View>
```

Add the import: `import PaywallGate from "../../components/PaywallGate";`

- [ ] **Step 7: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

Manual check (requires an EAS dev/preview build per this task's Global Constraint — `react-native-purchases` doesn't run in Expo Go, so this can be deferred until that build exists, but must happen before this feature is considered done): open a profile with `unlocked` false (any existing or new profile, since the field defaults to falsy) on each of the 6 screens. Confirm the PaywallGate card renders instead of AI content, and — open each screen's dev console / add a temporary log if needed — confirm `reading.start(...)` is never called while locked (no network request to the reading endpoint fires). Then manually set `unlocked: true` on that profile's AsyncStorage record (or complete a sandbox purchase once Task 2's API key is configured) and confirm all 6 screens now generate/show their AI content normally, and ChartScreen's grid + mingge section looks unchanged from before this task on both a locked and unlocked profile.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/mingli-app
git add app/screens/reading/OverviewScreen.tsx app/screens/reading/DecadesScreen.tsx app/screens/reading/BaziScreen.tsx app/screens/reading/SchoolsScreen.tsx app/screens/reading/CautionsScreen.tsx app/screens/reading/ChartScreen.tsx
git commit -m "feat: gate the 6 auto-generating reading screens behind profile unlock"
```

---

### Task 5: Gate `AskScreen` (chat)

**Files:**
- Modify: `app/screens/reading/AskScreen.tsx`

**Interfaces:**
- Consumes: `<PaywallGate profile={profile} onUnlocked={...}>` (Task 3). `SavedProfile.unlocked` (Task 1).

Unlike the 6 screens in Task 4, `AskScreen` never auto-generates anything — it only calls the backend when the user manually taps 送出 (send). So there's no `useEffect`-triggered generation to gate; instead, the whole screen's chat UI is replaced by `PaywallGate` when locked, which naturally makes `handleSend` unreachable (it's defined but never rendered/wired to any visible control) without needing a separate guard inside it.

- [ ] **Step 1: Add the unlock check and gate the screen body**

Add `const [unlocked, setUnlocked] = useState(profile.unlocked === true);` near the top of the component, alongside the existing `messages`/`input`/etc. state declarations. Import `useState` is already present (`AskScreen.tsx` already imports `useState` from `react` for its other state — add to that existing import rather than adding a new one). Import `PaywallGate`:

```typescript
import PaywallGate from "../../components/PaywallGate";
```

After the existing `ziweiError || !ziwei` early-return block (which returns the "排盤失敗" error view) and before the `limitReached` / main return, add:

```typescript
  if (!unlocked) {
    return (
      <View style={styles.center}>
        <PaywallGate profile={profile} onUnlocked={() => setUnlocked(true)} />
      </View>
    );
  }
```

This reuses the existing `styles.center` style (already defined in this file with `padding: 20`, appropriate for centering a single card) rather than introducing a new style.

- [ ] **Step 2: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

Manual check (same EAS dev/preview build requirement as Task 4): open 問命 (Ask) for a locked profile — confirm the paywall card shows instead of the chat UI, with no chat input/history visible. Unlock the profile (same method as Task 4's manual check) and confirm the normal chat UI appears and a message can be sent.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/mingli-app
git add app/screens/reading/AskScreen.tsx
git commit -m "feat: gate AskScreen chat behind profile unlock"
```

---

## Post-plan manual steps (Niki, not part of this implementation)

These aren't tasks in this plan because they're Apple/RevenueCat account configuration, not code:

1. Create a RevenueCat account + project, add the iOS app.
2. In App Store Connect, create the `unlock_reading` Consumable IAP product at $6.99.
3. Link that product in the RevenueCat dashboard, create an Offering containing it.
4. Copy the RevenueCat **public** API key into `app.json`'s `extra.revenueCatApiKey`.
5. Build with EAS (`eas build --platform ios --profile preview` or `development`) and test a real sandbox purchase on-device — this is the point where Task 4/5's manual checks above become fully exercisable end-to-end, including the actual Apple payment sheet.

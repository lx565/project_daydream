# 命裡 iOS App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working iOS app (via Expo, runnable in the iOS Simulator / Expo Go) covering solo-reading only: saved birth profiles stored on-device, the 7 reading tabs (總覽/宮位/大運/八字/眾說/注意/問命) hitting the existing production API, and a library-browsing section — all free tier, no accounts, no IAP.

**Architecture:** A brand-new Expo (React Native) project in its own repo (`~/Projects/mingli-app`), talking to the **existing, unmodified** `https://www.mingli.study/api/reading/*` endpoints over plain `fetch` (no CORS restriction outside a browser). Two new thin JSON API routes get added to the **existing** `fortune-app` repo to serve the already-structured `content/seo/*` library articles as JSON. Chart math (`lib/bazi.ts`/`lib/ziwei.ts`) is copied verbatim into the new app, since both are pure TypeScript with no Next.js-specific dependencies. Navigation is two-level: a root Bottom Tab Navigator (命盤/知識庫) wrapping a nested per-reading Bottom Tab Navigator (總覽/宮位/大運/八字/更多).

**Tech Stack:** Expo (managed workflow, latest SDK via `create-expo-app`), TypeScript, React Navigation (bottom-tabs + native-stack), `@react-native-async-storage/async-storage`, `@expo/vector-icons`, `react-native-markdown-display`, `iztro` + `lunar-javascript` (ported as-is from `fortune-app`).

**Spec:** `docs/superpowers/specs/2026-09-30-ios-app-phase1-design.md`

## Global Constraints

- **Two repositories are involved.** Tasks 1–10 and 12–13 work in a **new** repo at `~/Projects/mingli-app` (created in Task 1). Task 11 works in the **existing** `~/Projects/fortune-app` repo. Every task states which repo it's in — never assume the previous task's working directory carries over.
- Do not modify any existing file in `fortune-app` except what Task 11 explicitly adds (three new route files) — the production web app and the hepan-deep-tier work merged earlier must be completely unaffected.
- No accounts, no Apple IAP, no push notifications in this phase — any UI that would normally require them (e.g. a paywall) is simply omitted; all content built in this phase is the free tier.
- All user-facing copy is Traditional Chinese (zh-TW/zh-Hant), matching `fortune-app`'s convention.
- Brand colors/fonts, copied from `fortune-app/tailwind.config.ts`, must be used as-is (no new palette): `parchment #F5F0E6`, `paper #FDFCF8`, `paper-2 #F0EBE0`, `ink #2C1A10`, `ink-2 #4A3828`, `ink-3 #7A6858`, `ink-4 #B0A090`, `border-warm #DDD4C0`, `border-light #EDE8DC`, `vermillion #8B1A1A`, `vermillion-h #A02020`, `vermillion-l #F5E8E8`, `gold #7B5C00`, `gold-l #F5EFD8`. Font: `Noto Serif TC` (Google Fonts, loaded via `expo-font` + `@expo-google-fonts/noto-serif-tc`) for all Chinese text — do not substitute a system sans font.
- No test framework exists in either repo — verification at every task is `npx tsc --noEmit` plus running the app in the iOS Simulator (`npx expo start`, press `i`) and manually checking the screen, matching the project's established convention (see e.g. the hepan-deep-tier plan's verification approach).
- Design reference for every screen in this plan: the "命裡 App — Solo Reading Screens" Design canvas (https://claude.ai/artifact/XALTfs5hhK7v3WcuGDxEzo) — specifically the **Version 1** artboards (bottom tab bar) and the 知識庫 row. Match their layout, copy, and visual density; the HTML/CSS there is a direct translation guide for the React Native JSX.
- The reading-fetch hook (Task 5) is **non-streaming by design** for this phase: it `await`s the complete SSE response body as text and parses it in one pass, rather than reading it incrementally. This sidesteps React Native's inconsistent support for streaming `fetch` response bodies. The UX cost is a loading spinner for the full generation time instead of a live token-by-token reveal — an accepted tradeoff for phase 1, not a bug to fix later in this plan.

## Review Focus

- **The iztro/lunar-javascript Hermes-compatibility spike (Task 1) is a hard gate.** If either library throws or produces wrong output under React Native's JS engine, every downstream task that depends on real chart data is blocked — the task's own step 4 names the exact escalation path (stop and report, do not improvise a workaround).
- A user with **zero saved profiles** opening the app for the first time must see a working empty state (Task 3), not a crash or blank screen — this is the very first thing every real user sees.
- **Re-opening the app after it was fully closed** must restore saved profiles and any already-generated readings from `AsyncStorage` — a user should never have to regenerate (and re-wait for) a reading they already paid for in API calls once, even though there's no backend account (Task 3's storage layer and Task 5's cache are both load-bearing for this).
- A **slow or failed network request** (the device is offline, or the production API times out) must show a retry affordance on every reading screen (Tasks 6–10), not a silent blank tab or an uncaught exception that crashes the app.
- The **更多 (More) sheet's three sub-screens** (眾說/注意/問命) must be reachable and usable on a real iPhone-sized simulator — this is the part of the design most likely to feel cramped (5 items doesn't literally fit "7 tabs", the whole reason 更多 exists), so Task 10's manual check must specifically confirm it doesn't feel broken, not just that it compiles.

---

### Task 1: Scaffold the Expo project + validate chart-math compatibility (hard gate)

**Files:**
- Create: `~/Projects/mingli-app/` (new Expo project, entire initial scaffold)
- Create: `~/Projects/mingli-app/lib/bazi.ts`, `~/Projects/mingli-app/lib/ziwei.ts`, `~/Projects/mingli-app/lib/starBrightness.ts` (copied from `~/Projects/fortune-app/lib/`)
- Create: `~/Projects/mingli-app/scripts/_spike-chart.ts` (temporary, deleted at the end of this task)

**Interfaces:**
- Produces: a running Expo project at `~/Projects/mingli-app` with `iztro`, `lunar-javascript` installed and confirmed working; `lib/bazi.ts`'s `calculateBazi(year, month, day, hour, gender): BaziResult` and `lib/ziwei.ts`'s `calculateZiwei(year, month, day, hour, gender): Promise<ZiweiResult>` available for Task 4 to build a hook around. (Exact exported type shapes are whatever `fortune-app`'s current `lib/bazi.ts`/`lib/ziwei.ts` already declare — copy them unchanged, don't redesign the interface.)

- [ ] **Step 1: Scaffold the project**

```bash
cd ~/Projects
npx create-expo-app@latest mingli-app --template blank-typescript
cd mingli-app
npx expo install @react-native-async-storage/async-storage @expo/vector-icons
npm install iztro lunar-javascript
```

- [ ] **Step 2: Copy the chart-math modules unchanged**

```bash
mkdir -p ~/Projects/mingli-app/lib
cp ~/Projects/fortune-app/lib/bazi.ts ~/Projects/mingli-app/lib/bazi.ts
cp ~/Projects/fortune-app/lib/ziwei.ts ~/Projects/mingli-app/lib/ziwei.ts
cp ~/Projects/fortune-app/lib/starBrightness.ts ~/Projects/mingli-app/lib/starBrightness.ts
```

Open each copied file and check its `import` lines: if any import references something outside these three files (e.g. a Next.js-specific module, or another `fortune-app` lib file not copied here), either copy that additional file too (if it's plain TypeScript with no Next.js/browser dependency) or report back — do not silently stub it out.

- [ ] **Step 3: Write and run the compatibility spike**

Create `~/Projects/mingli-app/scripts/_spike-chart.ts`:

```ts
// Throwaway verification script — confirms iztro + lunar-javascript produce
// correct output when bundled through Expo/Hermes, not just Node. Deleted
// at the end of this task regardless of outcome.
import { calculateBazi } from "../lib/bazi";
import { calculateZiwei } from "../lib/ziwei";

async function main() {
  const bazi = calculateBazi(1990, 5, 15, 5, "male");
  console.log("BAZI:", JSON.stringify(bazi, null, 2));

  const ziwei = await calculateZiwei(1990, 5, 15, 5, "male");
  console.log("ZIWEI summary:", ziwei.summary);
  console.log("ZIWEI soul palace:", ziwei.soulPalace, "main star:", ziwei.mainStar);
  console.log("ZIWEI palace count:", ziwei.palaces.length);
}

main().catch((e) => {
  console.error("SPIKE FAILED:", e);
  process.exitCode = 1;
});
```

Run it two ways:

1. **Plain Node** (sanity baseline — confirms the copied files and their logic are intact before testing the RN runtime specifically):
   ```bash
   cd ~/Projects/mingli-app
   npx tsx scripts/_spike-chart.ts
   ```
   Expected: prints a `BaziResult` object and `ziwei.palaces.length === 12`, no thrown error.

2. **Inside the actual Expo app**, to catch Hermes-specific issues (Node's V8 is not a substitute for this check): temporarily replace the contents of `App.tsx` with a component that calls the same two functions in a `useEffect`, logs the results via `console.log`, and renders `<Text>{JSON.stringify(result)}</Text>` on screen. Run:
   ```bash
   npx expo start
   ```
   Press `i` to launch the iOS Simulator. Confirm on-screen that the same `summary`/`soulPalace`/`mainStar`/12-palace-count values appear as in the Node run — no red error screen, no blank view.

- [ ] **Step 4: Decision gate**

- **Both runs produce matching, correct output** → proceed to Step 5.
- **The Node run fails** → the copied files have a missing dependency or a bug introduced by copying; fix it (most likely an uncopied import) and retry before touching the Expo run.
- **The Node run passes but the Expo/Hermes run fails or produces different output** → this is the exact risk this task exists to catch. **STOP. Do not attempt a workaround (e.g. silently swapping libraries, polyfilling globals) on your own judgment.** Report BLOCKED with the full error/diff, naming this as a Hermes-compatibility failure in `iztro` or `lunar-javascript`. The controller will decide between a Hermes polyfill, a different chart library, or moving chart calculation server-side (a new `fortune-app` API route) before any later task proceeds.

- [ ] **Step 5: Revert the spike, clean up**

Restore `App.tsx` to Expo's default starter content (or a minimal placeholder `<View><Text>命裡</Text></View>` — Task 2 replaces it properly anyway), and delete the spike script:

```bash
rm ~/Projects/mingli-app/scripts/_spike-chart.ts
```

- [ ] **Step 6: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors.

```bash
git init
git add -A
git commit -m "Scaffold Expo project; port and verify bazi/ziwei chart math under Hermes"
```

---

### Task 2: Navigation shell — root tabs + nested reading tabs (placeholder screens)

**Files:**
- Create: `app/navigation/RootTabs.tsx`, `app/navigation/types.ts` (`app/navigation/ReadingTabs.tsx` is Task 4's responsibility, not this task's — listed separately there)
- Create: `app/screens/charts/SavedProfilesScreen.tsx` (placeholder), `app/screens/library/LibraryHomeScreen.tsx` (placeholder)
- Create: `app/theme.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `theme.ts` exports `COLORS` (the Global Constraints palette, as a plain object: `{ parchment, paper, paper2, ink, ink2, ink3, ink4, borderWarm, borderLight, vermillion, vermillionH, vermillionL, gold, goldL }`) and `FONT_SERIF_TC` (the font-family string to use in every `<Text style={{fontFamily: FONT_SERIF_TC}}>`), consumed by every screen in this plan. `navigation/types.ts` exports the `RootTabParamList` and `ReadingTabParamList` types consumed by every screen's navigation props in Tasks 3–12.

- [ ] **Step 1: Install navigation dependencies**

```bash
cd ~/Projects/mingli-app
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context
npx expo install expo-font @expo-google-fonts/noto-serif-tc
```

- [ ] **Step 2: Write the theme module**

Create `app/theme.ts`:

```ts
export const COLORS = {
  parchment: "#F5F0E6",
  paper: "#FDFCF8",
  paper2: "#F0EBE0",
  ink: "#2C1A10",
  ink2: "#4A3828",
  ink3: "#7A6858",
  ink4: "#B0A090",
  borderWarm: "#DDD4C0",
  borderLight: "#EDE8DC",
  vermillion: "#8B1A1A",
  vermillionH: "#A02020",
  vermillionL: "#F5E8E8",
  gold: "#7B5C00",
  goldL: "#F5EFD8",
} as const;

export const FONT_SERIF_TC = "NotoSerifTC_400Regular";
export const FONT_SERIF_TC_BOLD = "NotoSerifTC_700Bold";
```

- [ ] **Step 3: Write the navigation param types**

Create `app/navigation/types.ts`:

```ts
import type { SavedProfile } from "../lib/profileStorage"; // Task 3 creates this module

export type RootTabParamList = {
  Charts: undefined;
  Library: undefined;
};

export type ChartsStackParamList = {
  SavedProfiles: undefined;
  AddProfile: undefined;
  Reading: { profile: SavedProfile };
};

export type ReadingTabParamList = {
  Overview: { profile: SavedProfile };
  Palaces: { profile: SavedProfile };
  Decades: { profile: SavedProfile };
  Bazi: { profile: SavedProfile };
  More: { profile: SavedProfile };
};

export type MoreStackParamList = {
  MoreMenu: { profile: SavedProfile };
  Schools: { profile: SavedProfile };
  Cautions: { profile: SavedProfile };
  Ask: { profile: SavedProfile };
};
```

Note: this file imports `SavedProfile` from `../lib/profileStorage`, which Task 3 creates. Until Task 3 lands, this import will fail `tsc` — that's expected; Task 2's own verification step (below) only checks the files Task 2 itself is responsible for compile cleanly in isolation is not possible here, so Task 2's tsc check is run **after** a one-line temporary stub (see Step 6) and the real check happens once Task 3 lands. Do not skip writing this file correctly now — later tasks depend on its exact shape.

- [ ] **Step 4: Write placeholder screens**

Create `app/screens/charts/SavedProfilesScreen.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SERIF_TC_BOLD } from "../../theme";

export default function SavedProfilesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>已儲存命盤（Task 3 接上真實資料）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.ink },
});
```

Create `app/screens/library/LibraryHomeScreen.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SERIF_TC_BOLD } from "../../theme";

export default function LibraryHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>知識庫（Task 12 接上真實資料）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.ink },
});
```

- [ ] **Step 5: Write the root tab navigator**

Create `app/navigation/RootTabs.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SavedProfilesScreen from "../screens/charts/SavedProfilesScreen";
import LibraryHomeScreen from "../screens/library/LibraryHomeScreen";
import { COLORS, FONT_SERIF_TC } from "../theme";
import type { ChartsStackParamList, RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const ChartsStack = createNativeStackNavigator<ChartsStackParamList>();

function ChartsStackNavigator() {
  return (
    <ChartsStack.Navigator screenOptions={{ headerShown: false }}>
      <ChartsStack.Screen name="SavedProfiles" component={SavedProfilesScreen} />
      {/* AddProfile (Task 3) and Reading (Task 4) screens are added to this stack in later tasks */}
    </ChartsStack.Navigator>
  );
}

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.vermillion,
        tabBarInactiveTintColor: COLORS.ink4,
        tabBarStyle: { backgroundColor: COLORS.paper, borderTopColor: COLORS.borderWarm },
        tabBarLabelStyle: { fontFamily: FONT_SERIF_TC, fontSize: 10 },
        tabBarIcon: ({ color, size }) => {
          const iconName = route.name === "Charts" ? "book-outline" : "library-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Charts" component={ChartsStackNavigator} options={{ tabBarLabel: "命盤" }} />
      <Tab.Screen name="Library" component={LibraryHomeScreen} options={{ tabBarLabel: "知識庫" }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 6: Wire up `App.tsx`**

Replace the full contents of `App.tsx`:

```tsx
import { NavigationContainer } from "@react-navigation/native";
import { useFonts, NotoSerifTC_400Regular, NotoSerifTC_700Bold } from "@expo-google-fonts/noto-serif-tc";
import { View } from "react-native";
import RootTabs from "./app/navigation/RootTabs";
import { COLORS } from "./app/theme";

export default function App() {
  const [fontsLoaded] = useFonts({ NotoSerifTC_400Regular, NotoSerifTC_700Bold });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.parchment }} />;
  }

  return (
    <NavigationContainer>
      <RootTabs />
    </NavigationContainer>
  );
}
```

- [ ] **Step 7: Temporary stub so this task's own tsc check is meaningful**

Create a minimal `app/lib/profileStorage.ts` stub (Task 3 overwrites it with the real implementation):

```ts
export interface SavedProfile {
  id: string;
  name?: string;
  date: string;
  hour: number;
  gender: "male" | "female";
  createdAt: number;
}
```

Adjust the import path in `app/navigation/types.ts` from `../lib/profileStorage` to `../lib/profileStorage` (same — just confirm the file exists at `app/lib/profileStorage.ts`, matching the relative path from `app/navigation/types.ts`).

- [ ] **Step 8: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors.

```bash
npx expo start
```
Press `i`. Expected: app launches showing the bottom tab bar with 命盤 (active) and 知識庫 tabs; tapping 知識庫 shows its placeholder text; tapping back to 命盤 shows its placeholder text. No red error screen.

```bash
git add -A
git commit -m "Add root tab navigation shell (命盤/知識庫) with placeholder screens"
```

---

### Task 3: Local profile storage + Add-Profile screen + Saved-Profiles list screen

**Files:**
- Create: `app/lib/profileStorage.ts` (replaces Task 2's stub)
- Create: `app/screens/charts/AddProfileScreen.tsx`
- Modify: `app/screens/charts/SavedProfilesScreen.tsx` (replaces Task 2's placeholder)
- Modify: `app/navigation/RootTabs.tsx` (add `AddProfile` to `ChartsStack.Navigator`)

**Interfaces:**
- Consumes: `SavedProfile` type (this task redefines it in its real location); `ChartsStackParamList` from `../navigation/types` (Task 2).
- Produces: `listProfiles(): Promise<SavedProfile[]>`, `addProfile(input: { name?: string; date: string; hour: number; gender: "male" | "female" }): Promise<SavedProfile>`, `deleteProfile(id: string): Promise<void>` — consumed by `SavedProfilesScreen`, `AddProfileScreen`, and every reading screen in Tasks 6–12 (via the `profile` param already threaded through navigation).

- [ ] **Step 1: Write the storage module**

Create `app/lib/profileStorage.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedProfile {
  id: string;
  name?: string;
  date: string; // "YYYY-MM-DD"
  hour: number; // 0-11, iztro 時辰索引
  gender: "male" | "female";
  createdAt: number;
}

const STORAGE_KEY = "mingli:profiles";

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listProfiles(): Promise<SavedProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addProfile(input: {
  name?: string;
  date: string;
  hour: number;
  gender: "male" | "female";
}): Promise<SavedProfile> {
  const profile: SavedProfile = { ...input, id: randomId(), createdAt: Date.now() };
  const existing = await listProfiles();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, profile]));
  return profile;
}

export async function deleteProfile(id: string): Promise<void> {
  const existing = await listProfiles();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((p) => p.id !== id)));
}
```

- [ ] **Step 2: Write the Add-Profile screen**

Create `app/screens/charts/AddProfileScreen.tsx` — a minimal but real date/hour/gender entry form (an iOS-native `DateTimePicker` + a 12-option 時辰 picker + two gender buttons), matching the design canvas's `02-BirthInput` artboard's copy and layout:

```tsx
import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { addProfile } from "../../lib/profileStorage";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ChartsStackParamList } from "../../navigation/types";

const SHICHEN_LABELS = [
  "早子時（00:00–00:59）", "丑時（01:00–02:59）", "寅時（03:00–04:59）", "卯時（05:00–06:59）",
  "辰時（07:00–08:59）", "巳時（09:00–10:59）", "午時（11:00–12:59）", "未時（13:00–14:59）",
  "申時（15:00–16:59）", "酉時（17:00–18:59）", "戌時（19:00–20:59）", "亥時（21:00–22:59）",
];

type Props = NativeStackScreenProps<ChartsStackParamList, "AddProfile">;

export default function AddProfileScreen({ navigation }: Props) {
  const [date, setDate] = useState(new Date(1990, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [hour, setHour] = useState(0);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      await addProfile({ date: `${yyyy}-${mm}-${dd}`, hour, gender });
      navigation.navigate("SavedProfiles");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>新增命盤</Text>

      <Text style={styles.label}>出生日期</Text>
      <Pressable style={styles.row} onPress={() => setShowPicker(true)}>
        <Text style={styles.rowValue}>
          {date.getFullYear()} 年 {date.getMonth() + 1} 月 {date.getDate()} 日
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selected) => {
            setShowPicker(Platform.OS === "ios");
            if (selected) setDate(selected);
          }}
        />
      )}

      <Text style={styles.label}>出生時辰</Text>
      <View style={styles.hourGrid}>
        {SHICHEN_LABELS.map((label, i) => (
          <Pressable
            key={label}
            onPress={() => setHour(i)}
            style={[styles.hourChip, hour === i && styles.hourChipActive]}
          >
            <Text style={[styles.hourChipText, hour === i && styles.hourChipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>性別</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => setGender("male")}
          style={[styles.genderBtn, gender === "male" && styles.genderBtnActive]}
        >
          <Text style={[styles.genderText, gender === "male" && styles.genderTextActive]}>男命</Text>
        </Pressable>
        <Pressable
          onPress={() => setGender("female")}
          style={[styles.genderBtn, gender === "female" && styles.genderBtnActive]}
        >
          <Text style={[styles.genderText, gender === "female" && styles.genderTextActive]}>女命</Text>
        </Pressable>
      </View>

      <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitText}>{saving ? "排盤中…" : "開始排盤 →"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, padding: 20, gap: 14 },
  heading: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 20, color: COLORS.ink, textAlign: "center", marginBottom: 6 },
  label: { fontFamily: FONT_SERIF_TC, fontSize: 12, color: COLORS.ink3, letterSpacing: 2, textTransform: "uppercase" },
  row: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 14, padding: 15 },
  rowValue: { fontFamily: FONT_SERIF_TC, fontSize: 16, color: COLORS.ink },
  hourGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hourChip: { borderWidth: 1, borderColor: COLORS.borderWarm, backgroundColor: COLORS.paper, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  hourChipActive: { backgroundColor: COLORS.vermillion, borderColor: COLORS.vermillion },
  hourChipText: { fontFamily: FONT_SERIF_TC, fontSize: 12, color: COLORS.ink2 },
  hourChipTextActive: { color: COLORS.paper, fontWeight: "700" },
  genderBtn: { flex: 1, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  genderBtnActive: { backgroundColor: COLORS.vermillion, borderColor: COLORS.vermillion },
  genderText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 15, color: COLORS.ink2 },
  genderTextActive: { color: COLORS.paper },
  submitBtn: { backgroundColor: COLORS.vermillion, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 10 },
  submitText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.paper, letterSpacing: 1 },
});
```

Install the date picker dependency:
```bash
cd ~/Projects/mingli-app
npx expo install @react-native-community/datetimepicker
```

- [ ] **Step 3: Write the real Saved-Profiles screen**

Replace `app/screens/charts/SavedProfilesScreen.tsx`:

```tsx
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listProfiles, type SavedProfile } from "../../lib/profileStorage";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ChartsStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ChartsStackParamList, "SavedProfiles">;

const SHICHEN_SHORT = ["早子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

export default function SavedProfilesScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProfiles().then(setProfiles);
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>命裡</Text>
      <Text style={styles.sectionLabel}>已儲存命盤 · {profiles.length} 筆</Text>

      <FlatList
        data={profiles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>還沒有命盤，點下方「新增命盤」開始</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate("Reading", { profile: item })}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name ?? "命")[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name || "命主"}</Text>
              <Text style={styles.cardMeta}>
                {item.date} · {SHICHEN_SHORT[item.hour]}時 · {item.gender === "male" ? "男命" : "女命"}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />

      <Pressable style={styles.addBtn} onPress={() => navigation.navigate("AddProfile")}>
        <Text style={styles.addBtnText}>＋ 新增命盤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, paddingHorizontal: 20, paddingTop: 8 },
  heading: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 26, color: COLORS.ink, textAlign: "center", marginBottom: 10 },
  sectionLabel: { fontFamily: FONT_SERIF_TC, fontSize: 12, color: COLORS.ink3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  emptyBox: { backgroundColor: COLORS.paper2, borderWidth: 1, borderColor: COLORS.borderWarm, borderStyle: "dashed", borderRadius: 16, padding: 24, alignItems: "center" },
  emptyText: { fontFamily: FONT_SERIF_TC, fontSize: 13, color: COLORS.ink3, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 16, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.vermillionL, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 17, color: COLORS.vermillion },
  cardName: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.ink },
  cardMeta: { fontFamily: FONT_SERIF_TC, fontSize: 12.5, color: COLORS.ink3, marginTop: 2 },
  chevron: { color: COLORS.ink4, fontSize: 18 },
  addBtn: { backgroundColor: COLORS.vermillion, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginVertical: 10 },
  addBtnText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.paper },
});
```

- [ ] **Step 4: Register `AddProfile` in the stack navigator**

In `app/navigation/RootTabs.tsx`, add the import and screen registration:

```tsx
import AddProfileScreen from "../screens/charts/AddProfileScreen";
// ...
<ChartsStack.Screen name="AddProfile" component={AddProfileScreen} options={{ headerShown: true, title: "新增命盤" }} />
```

(`Reading` is registered in Task 4 once it exists — leave it out for now; `navigation.navigate("Reading", ...)` in Step 3 will be a type error until Task 4 adds it, which is expected and resolved next task.)

- [ ] **Step 5: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: the only error is the `"Reading"` route not yet existing in `ChartsStackParamList`'s navigator registration (from Step 3/4) — confirm no *other* errors.

```bash
npx expo start
```
Press `i`. Manually test: empty state shows on first launch; tap "新增命盤", fill in a date/hour/gender, submit; confirm you land back on Saved Profiles and the new card appears with correct date/hour/gender text; force-quit the Simulator's Expo Go/dev client and relaunch — confirm the saved profile is still there (AsyncStorage persistence).

```bash
git add -A
git commit -m "Add local profile storage, Add-Profile form, and Saved-Profiles list screen"
```

---

### Task 4: Chart calculation hook + Reading screen shell (nested tab navigator)

**Files:**
- Create: `app/lib/useChart.ts`
- Create: `app/screens/reading/ReadingScreen.tsx` (hosts the nested `ReadingTabs` navigator)
- Create: `app/navigation/ReadingTabs.tsx`
- Create: `app/screens/reading/OverviewScreen.tsx`, `PalacesScreen.tsx`, `DecadesScreen.tsx`, `BaziScreen.tsx` (all placeholders — Tasks 6–9 fill them in)
- Create: `app/screens/reading/MoreStack.tsx` (hosts the `更多` nested stack), `MoreMenuScreen.tsx` (placeholder — Task 10 fills in)
- Modify: `app/navigation/RootTabs.tsx` (register `Reading` in `ChartsStackParamList`)

**Interfaces:**
- Consumes: `calculateBazi`/`calculateZiwei` from `../../lib/bazi`/`../../lib/ziwei` (Task 1); `SavedProfile` from `../../lib/profileStorage` (Task 3).
- Produces: `useChart(profile: SavedProfile): { bazi: BaziResult | null; ziwei: ZiweiResult | null; loading: boolean; error: string | null }` — consumed by every screen in Tasks 6–10 (each reading screen calls this hook itself with the `profile` passed through navigation params, rather than threading computed chart data through route params, to keep each screen self-sufficient).

- [ ] **Step 1: Write the chart hook**

Create `app/lib/useChart.ts`:

```ts
import { useEffect, useState } from "react";
import { calculateBazi, type BaziResult } from "./bazi";
import { calculateZiwei, type ZiweiResult } from "./ziwei";
import type { SavedProfile } from "./profileStorage";

export function useChart(profile: SavedProfile) {
  const [bazi, setBazi] = useState<BaziResult | null>(null);
  const [ziwei, setZiwei] = useState<ZiweiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const [y, m, d] = profile.date.split("-").map(Number);
    try {
      const baziResult = calculateBazi(y, m, d, profile.hour, profile.gender);
      if (!cancelled) setBazi(baziResult);
    } catch (e) {
      if (!cancelled) setError((e as Error).message ?? "八字排算失敗");
    }

    calculateZiwei(y, m, d, profile.hour, profile.gender)
      .then((ziweiResult) => {
        if (!cancelled) setZiwei(ziweiResult);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message ?? "紫微排盤失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile.date, profile.hour, profile.gender]);

  return { bazi, ziwei, loading, error };
}
```

- [ ] **Step 2: Write placeholder tab screens**

Create each of the following with the same minimal shape (shown once; repeat for the other three, substituting the Chinese label):

`app/screens/reading/OverviewScreen.tsx`:
```tsx
import { View, Text, StyleSheet } from "react-native";
import { useChart } from "../../lib/useChart";
import { COLORS, FONT_SERIF_TC } from "../../theme";
import type { ReadingTabParamList } from "../../navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

type Props = BottomTabScreenProps<ReadingTabParamList, "Overview">;

export default function OverviewScreen({ route }: Props) {
  const { ziwei, loading, error } = useChart(route.params.profile);
  return (
    <View style={styles.container}>
      {loading && <Text style={styles.text}>排盤中…</Text>}
      {error && <Text style={styles.text}>{error}</Text>}
      {ziwei && <Text style={styles.text}>總覽（Task 6 接上真實解讀）{"\n"}{ziwei.summary}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, padding: 20 },
  text: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.ink },
});
```

Create `PalacesScreen.tsx`, `DecadesScreen.tsx`, `BaziScreen.tsx` identically, swapping `"Overview"` for `"Palaces"`/`"Decades"`/`"Bazi"` in the `Props` type and the placeholder label text to `宮位（Task 7 接上真實解讀）` / `大運（Task 8 接上真實解讀）` / `八字（Task 9 接上真實解讀）` respectively.

Create `app/screens/reading/MoreMenuScreen.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { COLORS, FONT_SERIF_TC_BOLD } from "../../theme";

export default function MoreMenuScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>更多</Text>
      <Pressable style={styles.row}><Text style={styles.rowText}>眾說（Task 10 接上）</Text></Pressable>
      <Pressable style={styles.row}><Text style={styles.rowText}>注意（Task 10 接上）</Text></Pressable>
      <Pressable style={styles.row}><Text style={styles.rowText}>問命（Task 10 接上）</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, padding: 20, gap: 10 },
  heading: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 20, color: COLORS.ink, marginBottom: 10 },
  row: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 14, padding: 16 },
  rowText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 15, color: COLORS.ink },
});
```

Create `app/screens/reading/MoreStack.tsx`:
```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreMenuScreen from "./MoreMenuScreen";
import type { MoreStackParamList } from "../../navigation/types";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      {/* Schools, Cautions, Ask screens are added here in Task 10 */}
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Write the nested reading tab navigator**

Create `app/navigation/ReadingTabs.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import OverviewScreen from "../screens/reading/OverviewScreen";
import PalacesScreen from "../screens/reading/PalacesScreen";
import DecadesScreen from "../screens/reading/DecadesScreen";
import BaziScreen from "../screens/reading/BaziScreen";
import MoreStack from "../screens/reading/MoreStack";
import { COLORS, FONT_SERIF_TC } from "../theme";
import type { ReadingTabParamList } from "./types";
import type { SavedProfile } from "../lib/profileStorage";

const Tab = createBottomTabNavigator<ReadingTabParamList>();

const ICONS: Record<keyof ReadingTabParamList, keyof typeof Ionicons.glyphMap> = {
  Overview: "radio-button-on-outline",
  Palaces: "grid-outline",
  Decades: "bar-chart-outline",
  Bazi: "reader-outline",
  More: "ellipsis-horizontal-circle-outline",
};

const LABELS: Record<keyof ReadingTabParamList, string> = {
  Overview: "總覽",
  Palaces: "宮位",
  Decades: "大運",
  Bazi: "八字",
  More: "更多",
};

export default function ReadingTabs({ profile }: { profile: SavedProfile }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.vermillion,
        tabBarInactiveTintColor: COLORS.ink4,
        tabBarStyle: { backgroundColor: COLORS.paper, borderTopColor: COLORS.borderWarm },
        tabBarLabelStyle: { fontFamily: FONT_SERIF_TC, fontSize: 10 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof ReadingTabParamList]} size={size} color={color} />
        ),
        tabBarLabel: LABELS[route.name as keyof ReadingTabParamList],
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} initialParams={{ profile }} />
      <Tab.Screen name="Palaces" component={PalacesScreen} initialParams={{ profile }} />
      <Tab.Screen name="Decades" component={DecadesScreen} initialParams={{ profile }} />
      <Tab.Screen name="Bazi" component={BaziScreen} initialParams={{ profile }} />
      <Tab.Screen name="More" component={MoreStack} initialParams={{ profile }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 4: Write the Reading screen that hosts it**

Create `app/screens/reading/ReadingScreen.tsx`:

```tsx
import ReadingTabs from "../../navigation/ReadingTabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ChartsStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ChartsStackParamList, "Reading">;

export default function ReadingScreen({ route }: Props) {
  return <ReadingTabs profile={route.params.profile} />;
}
```

- [ ] **Step 5: Register `Reading` in the Charts stack**

In `app/navigation/RootTabs.tsx`, add:

```tsx
import ReadingScreen from "../screens/reading/ReadingScreen";
// ...
<ChartsStack.Screen name="Reading" component={ReadingScreen} options={{ headerShown: true, title: "" }} />
```

- [ ] **Step 6: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors (this resolves the `"Reading"` route error left over from Task 3).

```bash
npx expo start
```
Press `i`. Tap into a saved profile from the list — confirm the nested tab bar (總覽/宮位/大運/八字/更多) appears, each placeholder tab shows its label plus (once chart math resolves) the real `ziwei.summary` string on the Overview tab, and 更多 shows its own three-row placeholder menu.

```bash
git add -A
git commit -m "Add chart calculation hook and nested reading-tab navigator shell"
```

---

### Task 5: Reading-fetch hook (non-streaming) + local reading cache

**Files:**
- Create: `app/lib/useReading.ts`

**Interfaces:**
- Produces: `useReading(url: string, cacheKey: string): { status: "idle"|"loading"|"done"|"error"; text: string; errorMsg: string; start: (body: object) => Promise<void> }` — consumed by every reading screen in Tasks 6–10. This is the React Native equivalent of `fortune-app`'s `lib/useSSEStream.ts`, but **non-streaming**: it awaits the full SSE-formatted response body as text, then parses every `data: {...}` line in one pass (same line format the server already sends, just consumed all at once instead of incrementally). Caches completed text in `AsyncStorage` keyed by `cacheKey`, mirroring the web version's localStorage cache so revisiting an already-generated reading doesn't re-call the AI.

- [ ] **Step 1: Write the hook**

Create `app/lib/useReading.ts`:

```ts
import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "mingli:reading:v1:";

export type ReadingStatus = "idle" | "loading" | "done" | "error";

interface CacheShape {
  text: string;
}

async function loadCache(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    return parsed.text && parsed.text.length > 0 ? parsed.text : null;
  } catch {
    return null;
  }
}

async function saveCache(key: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ text }));
  } catch {
    // best-effort cache; a write failure shouldn't break the reading that's already on screen
  }
}

/** Parses the complete SSE-formatted response body (every "data: {...}" line
 *  already received, not streamed) into the concatenated `text` field the
 *  server sent across however many chunks it used. */
function parseFullSSE(raw: string): string {
  let acc = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]" || payload === "") continue;
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed.text === "string") acc += parsed.text;
    } catch {
      // a malformed/partial line — skip it rather than throw away everything parsed so far
    }
  }
  return acc;
}

export function useReading(url: string, cacheKey: string) {
  const [status, setStatus] = useState<ReadingStatus>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  const start = useCallback(
    async (body: object) => {
      if (startedRef.current) return;
      startedRef.current = true;

      const cached = await loadCache(cacheKey);
      if (cached) {
        setText(cached);
        setStatus("done");
        return;
      }

      setStatus("loading");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
        }
        const raw = await res.text();
        const full = parseFullSSE(raw);
        if (!full) throw new Error("AI 未返回內容，請重試");
        setText(full);
        setStatus("done");
        await saveCache(cacheKey, full);
      } catch (e) {
        setErrorMsg((e as Error).message ?? "網路錯誤，請重試");
        setStatus("error");
        startedRef.current = false; // allow retry
      }
    },
    [url, cacheKey]
  );

  return { status, text, errorMsg, start };
}
```

- [ ] **Step 2: Verify**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors. (This hook has no UI to manually check yet — Task 6 is the first real consumer.)

```bash
git add -A
git commit -m "Add non-streaming reading-fetch hook with AsyncStorage cache"
```

---

### Task 6: 總覽 (Overview) screen — real content

**Files:**
- Modify: `app/screens/reading/OverviewScreen.tsx`

**Interfaces:**
- Consumes: `useReading` (Task 5); `useChart` (Task 4). Calls `POST https://www.mingli.study/api/reading/synthesis` with body `{ ziwei, bazi, gender, name }` (same shape `fortune-app`'s `WizardFlow.tsx` already sends to this route — do not alter the route or its expected body).

- [ ] **Step 1: Write the real screen**

Replace `app/screens/reading/OverviewScreen.tsx`:

```tsx
import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useChart } from "../../lib/useChart";
import { useReading } from "../../lib/useReading";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { ReadingTabParamList } from "../../navigation/types";

const API_BASE = "https://www.mingli.study";

type Props = BottomTabScreenProps<ReadingTabParamList, "Overview">;

export default function OverviewScreen({ route }: Props) {
  const profile = route.params.profile;
  const { bazi, ziwei, loading: chartLoading, error: chartError } = useChart(profile);
  const cacheKey = `${profile.id}_overview`;
  const reading = useReading(`${API_BASE}/api/reading/synthesis`, cacheKey);

  useEffect(() => {
    if (ziwei && bazi && reading.status === "idle") {
      reading.start({ ziwei, bazi, gender: profile.gender, name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziwei, bazi]);

  if (chartLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.vermillion} />
      </View>
    );
  }
  if (chartError || !ziwei || !bazi) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{chartError ?? "排盤失敗"}</Text>
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
          {reading.status === "done" && <Text style={styles.bodyText}>{reading.text}</Text>}
        </View>
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
  bodyText: { fontFamily: FONT_SERIF_TC, fontSize: 14.5, lineHeight: 24, color: COLORS.ink2 },
  errorText: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.vermillion },
  retryText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 13, color: COLORS.gold, textDecorationLine: "underline" },
});
```

- [ ] **Step 2: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors.

```bash
npx expo start
```
Press `i`. Open a saved profile, confirm the Overview tab shows a loading spinner, then the real AI-generated reading text from production (same content you'd see on mingli.study's 總覽 tab for the same birth data). Turn on Airplane Mode and force a fresh profile through this tab to confirm the error+retry path renders instead of a crash.

```bash
git add -A
git commit -m "Wire Overview tab to real synthesis API with loading/error states"
```

---

### Task 7: 宮位 (Palaces) screen — real content

**Files:**
- Modify: `app/screens/reading/PalacesScreen.tsx`

**Interfaces:**
- Same pattern as Task 6. Calls `POST /api/reading/palaces` with body `{ ziwei, name }` (matching `fortune-app`'s `app/api/reading/palaces/route.ts` expected body).

- [ ] **Step 1: Write the real screen**

Replace `app/screens/reading/PalacesScreen.tsx` following the exact structure of Task 6's `OverviewScreen.tsx`, with these differences: `cacheKey` is `${profile.id}_palaces`; the fetch URL is `${API_BASE}/api/reading/palaces`; the `start()` body is `{ ziwei, name: profile.name }` (no `bazi` — this route doesn't need it); the card label reads "十二宮位詳解" instead of "命盤基礎"; drop the first summary card entirely (palaces has no equivalent of the overview score card) and go straight to the single reading-text card under a "│ 宮位詳解" section label.

- [ ] **Step 2: Verify and commit**

Same verification as Task 6, confirming the 宮位 tab specifically. Commit: `"Wire Palaces tab to real palaces API with loading/error states"`.

---

### Task 8: 大運 (Decades) screen — real content

**Files:**
- Modify: `app/screens/reading/DecadesScreen.tsx`

**Interfaces:**
- Same pattern as Task 6. Calls `POST /api/reading/decades` with body `{ ziwei, birthYear, name }` where `birthYear` is `parseInt(profile.date.slice(0, 4), 10)` (matching `fortune-app`'s `app/api/reading/decades/route.ts`).

- [ ] **Step 1: Write the real screen**

Same structure as Task 6, with `cacheKey = ${profile.id}_decades`, URL `${API_BASE}/api/reading/decades`, body `{ ziwei, birthYear: parseInt(profile.date.slice(0,4),10), name: profile.name }`, section label "│ 大運解讀", no summary card.

- [ ] **Step 2: Verify and commit**

Same verification pattern. Commit: `"Wire Decades tab to real decades API with loading/error states"`.

---

### Task 9: 八字 (Bazi) screen — real content

**Files:**
- Modify: `app/screens/reading/BaziScreen.tsx`

**Interfaces:**
- Same pattern as Task 6. Calls `POST /api/reading/bazi` with body `{ bazi, gender }` (matching `fortune-app`'s `app/api/reading/bazi/route.ts` — the free/summary bazi route, not `bazi-deep` which is the paid one and out of scope for phase 1).

- [ ] **Step 1: Write the real screen**

Same structure as Task 6, with `cacheKey = ${profile.id}_bazi`, URL `${API_BASE}/api/reading/bazi`, body `{ bazi, gender: profile.gender }`, section label "│ 八字解讀", no summary card.

- [ ] **Step 2: Verify and commit**

Same verification pattern. Commit: `"Wire Bazi tab to real bazi API with loading/error states"`.

---

### Task 10: 更多 — 眾說／注意／問命 screens

**Files:**
- Create: `app/screens/reading/SchoolsScreen.tsx`, `CautionsScreen.tsx`, `AskScreen.tsx`
- Modify: `app/screens/reading/MoreMenuScreen.tsx` (wire its three rows to real navigation)
- Modify: `app/screens/reading/MoreStack.tsx` (register the three new screens)

**Interfaces:**
- `SchoolsScreen`/`CautionsScreen` follow the exact Task 6 pattern: `SchoolsScreen` calls `POST /api/reading/overview` with body `{ ziwei, gender, name }` (the five-school 眾說 content lives in the existing `overview` route, not a separately-named one — see `fortune-app`'s `app/api/reading/overview/route.ts`); `CautionsScreen` calls `POST /api/reading/cautions` with body `{ ziwei, birthYear, name }`.
- `AskScreen` is a simple chat UI (not a reading-tab pattern): calls `POST /api/reading/chat` per message (check `fortune-app`'s `app/api/reading/chat/route.ts` for its exact expected body shape — likely `{ ziwei, bazi, question, history }` or similar; read that file before writing this screen, since this plan was written without re-confirming its exact contract).

- [ ] **Step 1: Write `SchoolsScreen.tsx` and `CautionsScreen.tsx`**

Both follow Task 6's `OverviewScreen.tsx` structure exactly (loading/error/done states, same card styling), with:
- `SchoolsScreen`: `cacheKey = ${profile.id}_schools`, URL `${API_BASE}/api/reading/overview`, body `{ ziwei, gender: profile.gender, name: profile.name }`, section label "│ 眾說".
- `CautionsScreen`: `cacheKey = ${profile.id}_cautions`, URL `${API_BASE}/api/reading/cautions`, body `{ ziwei, birthYear: parseInt(profile.date.slice(0,4),10), name: profile.name }`, section label "│ 注意".

- [ ] **Step 2: Read the chat route's actual contract before writing `AskScreen.tsx`**

```bash
cat ~/Projects/fortune-app/app/api/reading/chat/route.ts
```
(If no file exists at that exact path, search `~/Projects/fortune-app/app/api/reading/` for the chat/ask route `fortune-app`'s `ChatInterface.tsx` component calls, and read that instead — the component is at `~/Projects/fortune-app/components/ChatInterface.tsx`.) Note its exact request body shape and response format (SSE like the others, or a plain JSON response) before writing the screen below — if it differs from the SSE pattern this plan assumes, adapt `AskScreen.tsx`'s fetch call accordingly rather than forcing it through `useReading`.

- [ ] **Step 3: Write `AskScreen.tsx`**

A minimal chat UI: a `FlatList` of `{ role: "user" | "assistant"; text: string }` messages (vermillion bubble right-aligned for user, paper bubble left-aligned for assistant — matching the design canvas's `V1-Ask` artboard), a `TextInput` + send button pinned to the bottom via `KeyboardAvoidingView`. On send: append the user message to local state immediately, POST to the chat route using the contract confirmed in Step 2, append the assistant's reply once it resolves. No AsyncStorage caching for chat (each conversation is live, not a cacheable one-shot reading like the other tabs).

- [ ] **Step 4: Wire the More menu**

Replace `app/screens/reading/MoreMenuScreen.tsx`'s three `<Pressable>` rows with real navigation calls (`navigation.navigate("Schools", { profile })`, etc.), using the `profile` from `route.params` (add a `Props` type the same way `OverviewScreen` does, via `NativeStackScreenProps<MoreStackParamList, "MoreMenu">`).

Update `app/screens/reading/MoreStack.tsx` to register all three:
```tsx
<Stack.Screen name="Schools" component={SchoolsScreen} options={{ headerShown: true, title: "眾說" }} />
<Stack.Screen name="Cautions" component={CautionsScreen} options={{ headerShown: true, title: "注意" }} />
<Stack.Screen name="Ask" component={AskScreen} options={{ headerShown: true, title: "問命" }} />
```

- [ ] **Step 5: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors.

```bash
npx expo start
```
Press `i`. From a profile's reading, tap 更多, then each of 眾說/注意/問命 — confirm each pushes correctly, shows real content (or a working chat exchange for 問命), and the back button returns to the 更多 menu, not out of the reading entirely. This is the Review Focus item flagged in the header — check it doesn't feel cramped or broken on the simulator's actual screen size.

```bash
git add -A
git commit -m "Add 眾說/注意/問命 screens under the More menu"
```

---

### Task 11: Backend — library content JSON API routes (fortune-app repo)

**Files:**
- Create: `~/Projects/fortune-app/app/api/library/categories/route.ts`
- Create: `~/Projects/fortune-app/app/api/library/[category]/route.ts`
- Create: `~/Projects/fortune-app/app/api/library/[category]/[slug]/route.ts`

**Interfaces:**
- Produces: `GET /api/library/categories` → `{ categories: { slug: string; label: string; count: number }[] }`; `GET /api/library/[category]` → `{ articles: { slug: string; label: string }[] }`; `GET /api/library/[category]/[slug]` → `{ label: string; markdown: string }` (the exact shape already stored in `content/seo/<category>/<slug>.json`) — consumed by Task 12's library screens in the `mingli-app` repo.

**This task works in `~/Projects/fortune-app`, not `~/Projects/mingli-app`.**

- [ ] **Step 1: Confirm the category list and human-readable labels**

```bash
cd ~/Projects/fortune-app
ls content/seo/
```
For Phase 1, expose exactly these six categories (matching the design canvas's library mockup), mapping each to its real `content/seo/` folder name:

```ts
const CATEGORIES: { slug: string; label: string; folder: string }[] = [
  { slug: "star", label: "主星解析", folder: "star" },
  { slug: "palace", label: "宮位組合", folder: "palace" },
  { slug: "mingge", label: "格局解析", folder: "mingge" },
  { slug: "shensha", label: "凶格解析", folder: "shensha" },
  { slug: "book", label: "典籍出處", folder: "book" },
];
```
(Verify each `folder` value is an actual subdirectory under `content/seo/` via the `ls` output above — adjust names if any don't match; this plan's list is a best guess based on what Task 11's author observed during spec-writing, not a verified final mapping.)

- [ ] **Step 2: Write the categories route**

Create `app/api/library/categories/route.ts`:

```ts
import fs from "fs";
import path from "path";

const CATEGORIES: { slug: string; label: string; folder: string }[] = [
  { slug: "star", label: "主星解析", folder: "star" },
  { slug: "palace", label: "宮位組合", folder: "palace" },
  { slug: "mingge", label: "格局解析", folder: "mingge" },
  { slug: "shensha", label: "凶格解析", folder: "shensha" },
  { slug: "book", label: "典籍出處", folder: "book" },
];

export async function GET() {
  const base = path.join(process.cwd(), "content", "seo");
  const categories = CATEGORIES.map((c) => {
    let count = 0;
    try {
      count = fs.readdirSync(path.join(base, c.folder)).filter((f) => f.endsWith(".json")).length;
    } catch {
      count = 0;
    }
    return { slug: c.slug, label: c.label, count };
  });
  return Response.json({ categories });
}
```

- [ ] **Step 3: Write the per-category article list route**

Create `app/api/library/[category]/route.ts`:

```ts
import fs from "fs";
import path from "path";

const FOLDER_BY_SLUG: Record<string, string> = {
  star: "star",
  palace: "palace",
  mingge: "mingge",
  shensha: "shensha",
  book: "book",
};

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const folder = FOLDER_BY_SLUG[category];
  if (!folder) return Response.json({ error: "unknown_category" }, { status: 404 });

  const dir = path.join(process.cwd(), "content", "seo", folder);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return Response.json({ articles: [] });
  }

  const articles = files.map((filename) => {
    const slug = filename.replace(/\.json$/, "");
    let label = slug;
    try {
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.label === "string") label = parsed.label;
    } catch {
      // fall back to the filename-derived slug as the label
    }
    return { slug, label };
  });

  return Response.json({ articles });
}
```

- [ ] **Step 4: Write the single-article route**

Create `app/api/library/[category]/[slug]/route.ts`:

```ts
import fs from "fs";
import path from "path";

const FOLDER_BY_SLUG: Record<string, string> = {
  star: "star",
  palace: "palace",
  mingge: "mingge",
  shensha: "shensha",
  book: "book",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string; slug: string }> }
) {
  const { category, slug } = await params;
  const folder = FOLDER_BY_SLUG[category];
  if (!folder) return Response.json({ error: "unknown_category" }, { status: 404 });

  // slug comes straight from the URL — never interpolate it into a path without
  // stripping traversal characters first, even though it's only ever read, not written.
  const safeSlug = slug.replace(/[/\\]/g, "");
  const filePath = path.join(process.cwd(), "content", "seo", folder, `${safeSlug}.json`);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Response.json({ label: parsed.label, markdown: parsed.markdown });
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
}
```

- [ ] **Step 5: Verify locally, then verify and commit**

```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing the three new files.

Start the dev server (stop it afterward) and hit each route with `curl` to confirm real content comes back:
```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/api/library/categories | head -c 400
curl -s http://localhost:3000/api/library/star | head -c 400
curl -s "http://localhost:3000/api/library/star/$(ls content/seo/star | head -1 | sed 's/\.json$//')" | head -c 400
kill %1
```
Expected: each returns real JSON matching the shapes in this task's Interfaces section, not an error.

```bash
git add app/api/library
git commit -m "Add library content JSON API routes (categories, article list, single article)"
```

Do **not** push this commit to `origin/main` as part of this task — ask the controller/Niki before deploying a backend change to production, per this repo's standing norm for anything that goes live.

---

### Task 12: Library screens (mingli-app) — category home, article list, article detail

**Files:**
- Create: `app/lib/libraryApi.ts`
- Modify: `app/screens/library/LibraryHomeScreen.tsx` (replaces Task 2's placeholder)
- Create: `app/screens/library/CategoryListScreen.tsx`, `app/screens/library/ArticleScreen.tsx`
- Create: `app/navigation/LibraryStack.tsx`
- Modify: `app/navigation/RootTabs.tsx` (replace the bare `LibraryHomeScreen` tab with `LibraryStack`)
- Modify: `app/navigation/types.ts` (add `LibraryStackParamList`)

**Interfaces:**
- Consumes: Task 11's three routes, at `https://www.mingli.study/api/library/*` (same production domain as every other API call in this app — this task assumes Task 11 has already been **deployed**, not just committed locally; confirm with the controller that Task 11's routes are live in production before starting this task's manual verification step).

**This task works in `~/Projects/mingli-app`.**

- [ ] **Step 1: Add the Library navigation types**

In `app/navigation/types.ts`, add:
```ts
export type LibraryStackParamList = {
  LibraryHome: undefined;
  CategoryList: { categorySlug: string; categoryLabel: string };
  Article: { categorySlug: string; slug: string };
};
```

- [ ] **Step 2: Write the API client**

Create `app/lib/libraryApi.ts`:

```ts
const API_BASE = "https://www.mingli.study";

export interface LibraryCategory { slug: string; label: string; count: number }
export interface LibraryArticleRef { slug: string; label: string }
export interface LibraryArticle { label: string; markdown: string }

export async function fetchCategories(): Promise<LibraryCategory[]> {
  const res = await fetch(`${API_BASE}/api/library/categories`);
  if (!res.ok) throw new Error("無法取得分類");
  const data = await res.json();
  return data.categories;
}

export async function fetchArticleList(categorySlug: string): Promise<LibraryArticleRef[]> {
  const res = await fetch(`${API_BASE}/api/library/${categorySlug}`);
  if (!res.ok) throw new Error("無法取得文章列表");
  const data = await res.json();
  return data.articles;
}

export async function fetchArticle(categorySlug: string, slug: string): Promise<LibraryArticle> {
  const res = await fetch(`${API_BASE}/api/library/${categorySlug}/${slug}`);
  if (!res.ok) throw new Error("無法取得文章內容");
  return res.json();
}
```

- [ ] **Step 3: Write the Library Home screen**

Replace `app/screens/library/LibraryHomeScreen.tsx`:

```tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchCategories, type LibraryCategory } from "../../lib/libraryApi";
import { COLORS, FONT_SERIF_TC, FONT_SERIF_TC_BOLD } from "../../theme";
import type { LibraryStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LibraryStackParamList, "LibraryHome">;

export default function LibraryHomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<LibraryCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>知識庫</Text>
      {!categories && !error && <ActivityIndicator color={COLORS.vermillion} style={{ marginTop: 20 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {categories && (
        <FlatList
          data={categories}
          keyExtractor={(c) => c.slug}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingTop: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("CategoryList", { categorySlug: item.slug, categoryLabel: item.label })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardCount}>{item.count} 篇</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment, paddingTop: 10 },
  heading: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 22, color: COLORS.ink, textAlign: "center" },
  errorText: { fontFamily: FONT_SERIF_TC, fontSize: 14, color: COLORS.vermillion, textAlign: "center", marginTop: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.borderWarm, borderRadius: 16, padding: 16 },
  cardLabel: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 16, color: COLORS.ink },
  cardCount: { fontFamily: FONT_SERIF_TC, fontSize: 12.5, color: COLORS.ink3, marginTop: 2 },
  chevron: { color: COLORS.ink4, fontSize: 18 },
});
```

- [ ] **Step 4: Write the Category List screen**

Create `app/screens/library/CategoryListScreen.tsx` following the same data-fetching pattern as `LibraryHomeScreen` (loading/error/list states), calling `fetchArticleList(route.params.categorySlug)`, rendering each `{slug, label}` as a card that navigates to `Article` with `{ categorySlug: route.params.categorySlug, slug: item.slug }`, with the screen title set to `route.params.categoryLabel` via `navigation.setOptions({ title: route.params.categoryLabel })` in a `useEffect`.

- [ ] **Step 5: Write the Article screen**

Create `app/screens/library/ArticleScreen.tsx` — fetches via `fetchArticle(route.params.categorySlug, route.params.slug)`, renders `label` as a heading and `markdown` via `react-native-markdown-display` (install it: `npx expo install react-native-markdown-display`) inside a `ScrollView`, same card/typography treatment as the reading screens.

- [ ] **Step 6: Wire the Library stack navigator**

Create `app/navigation/LibraryStack.tsx`:
```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LibraryHomeScreen from "../screens/library/LibraryHomeScreen";
import CategoryListScreen from "../screens/library/CategoryListScreen";
import ArticleScreen from "../screens/library/ArticleScreen";
import type { LibraryStackParamList } from "./types";

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="LibraryHome" component={LibraryHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} />
      <Stack.Screen name="Article" component={ArticleScreen} options={{ title: "" }} />
    </Stack.Navigator>
  );
}
```

In `app/navigation/RootTabs.tsx`, replace the direct `<Tab.Screen name="Library" component={LibraryHomeScreen} .../>` with `<Tab.Screen name="Library" component={LibraryStack} options={{ tabBarLabel: "知識庫" }} />` (remove the now-unused `LibraryHomeScreen` import from this file).

- [ ] **Step 7: Verify and commit**

```bash
cd ~/Projects/mingli-app
npx tsc --noEmit
```
Expected: no errors.

```bash
npx expo start
```
Press `i`. Tap 知識庫 → confirm real categories load with real counts → tap one → confirm a real article list loads → tap an article → confirm real markdown content renders. If Task 11 hasn't been deployed to production yet, this will show the error state instead — confirm with the controller before treating that as a bug in this task's own code.

```bash
git add -A
git commit -m "Add library browsing screens (categories, article list, article detail)"
```

---

### Task 13: End-to-end manual verification

**Files:** none (verification only, in `~/Projects/mingli-app`).

**Interfaces:** none — this task exercises Tasks 1–12 together on a real iOS Simulator run.

- [ ] **Step 1: Full clean build check**

```bash
cd ~/Projects/mingli-app
rm -rf node_modules
npm install
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Cold-start walkthrough**

```bash
npx expo start -c
```
Press `i`. With AsyncStorage empty (first run, or manually clear app data in the Simulator via long-press → delete app → reinstall):
1. Confirm the empty-state Saved Profiles screen appears, not a crash.
2. Add a profile, confirm it appears in the list with correct date/hour/gender.
3. Open it, click through all 5 primary tabs (總覽/宮位/大運/八字/更多) and all 3 更多 sub-screens (眾說/注意/問命) — confirm each shows real AI content (or, for 問命, a working chat exchange) and no screen is blank or crashes.
4. Force-quit the app completely and relaunch — confirm the saved profile and every already-generated reading reappear instantly (from `AsyncStorage` cache) without re-hitting the API.
5. Switch to 知識庫, browse into a category and an article, confirm real content renders.

- [ ] **Step 3: Offline/error-path check**

Enable Airplane Mode on the Simulator (Settings app). Add a **second** profile (so its readings have never been cached) and open it — confirm every reading tab shows the error+retry UI, not a crash or infinite spinner. Disable Airplane Mode, tap retry on one tab, confirm it recovers.

- [ ] **Step 4: Report findings**

If any step surfaces a bug, fix it, re-run the relevant step, then commit:
```bash
cd ~/Projects/mingli-app
git add -A
git commit -m "fix: <describe the specific fix>"
```
If everything passes clean, this task ends with no commit — Task 12's commit is already the final state for the `mingli-app` repo, and Task 11's commit (not pushed) is the final state for the `fortune-app` side.

import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import {
  DefaultVisibility,
  ModelAttributeTypes,
  PlanTier,
  type ModelUserProfileConditionInput,
} from "../API";
import Papa from "papaparse";
import { budgeteerApi } from "../api/budgeteerApi";
import { analyzeImport } from "../ingest/analyzeImport";
import { useBudgetStore } from "../store/budgetStore";
import type { Transaction } from "../types/domain";
import { isDemoIdentityUsername } from "./userDisplay";
import { errorToMessage } from "../utils/appUtils";
import { getOrCreateDeviceId } from "./deviceIdentity";

export const CURRENT_SEED_VERSION = 1 as const;

type ApiPlanTier = (typeof PlanTier)[keyof typeof PlanTier];

type BootstrapUserResult = {
  profileId: string;
  didSeedDemo: boolean;
};

function isConditionalFailure(err: unknown): boolean {
  const msg = errorToMessage(err).toLowerCase();
  return (
    msg.includes("conditional") ||
    msg.includes("condition") ||
    msg.includes("conditionalcheckfailed") ||
    msg.includes("condition check")
  );
}

async function selfHealUserProfileEmail(profileId: string, email: string) {
  // If legacy records exist without the now-required email, patch it opportunistically
  // when that user logs in. This is safe because the conditional prevents overwriting.
  const condition: ModelUserProfileConditionInput = {
    or: [
      { email: { attributeExists: false } },
      { email: { attributeType: ModelAttributeTypes._null } },
      { email: { eq: "" } },
    ],
  };

  try {
    await budgeteerApi.updateUserProfile({ id: profileId, email }, condition);
    if (import.meta.env.DEV) {
      console.info(`[user bootstrap] healed missing email for profileId=${profileId}`);
    }
  } catch (err) {
    // If condition fails, email was already set (or another tab fixed it).
    if (isConditionalFailure(err)) return;
    // Other failure should surface, but don't hard-break the app.
    if (import.meta.env.DEV) {
      console.warn("[user bootstrap] email self-heal failed", err);
    }
  }
}

function pickDisplayName(opts: {
  username?: string | null;
  preferredUsername?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const fromUsername = typeof opts.username === "string" ? opts.username.trim() : "";
  if (fromUsername) return fromUsername;

  const fromPreferred = typeof opts.preferredUsername === "string" ? opts.preferredUsername.trim() : "";
  if (fromPreferred) return fromPreferred;

  const fromName = typeof opts.name === "string" ? opts.name.trim() : "";
  if (fromName) return fromName;

  const email = typeof opts.email === "string" ? opts.email.trim() : "";
  if (email && email.includes("@")) return email.split("@")[0];

  return "";
}

async function selfHealUserProfileDisplayName(profileId: string, displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return;

  const condition: ModelUserProfileConditionInput = {
    or: [
      { displayName: { attributeExists: false } },
      { displayName: { attributeType: ModelAttributeTypes._null } },
      { displayName: { eq: "" } },
    ],
  };

  try {
    await budgeteerApi.updateUserProfile({ id: profileId, displayName: trimmed }, condition);
    if (import.meta.env.DEV) {
      console.info(`[user bootstrap] healed missing displayName for profileId=${profileId}`);
    }
  } catch (err) {
    if (isConditionalFailure(err)) return;
    if (import.meta.env.DEV) {
      console.warn("[user bootstrap] displayName self-heal failed", err);
    }
  }
}

/* Not used until we build seed data for Budgeteer, but keeping around as a reference for how
// to build deterministic due dates for demo tasks.
function buildIsoAtMidnightUtcFromNow(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}*/

function payloadToGroups(payload?: Record<string, unknown>): string[] {
  const raw = payload?.["cognito:groups"];
  if (!Array.isArray(raw)) return [];
  return raw.map(String);
}

function payloadToRole(payload?: Record<string, unknown>): string {
  const raw = payload?.["custom:role"];
  return typeof raw === "string" ? raw : "";
}

async function resolveDesiredPlanTier(username?: string | null): Promise<ApiPlanTier> {
  // Fast-path: demo identities are created with the demo+<uuid>@... username shape.
  if (username && isDemoIdentityUsername(username)) return PlanTier.DEMO;

  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload as Record<string, unknown> | undefined;
    const groups = payloadToGroups(payload);
    const role = payloadToRole(payload);
    if (groups.includes("Demo") || role === "Demo") return PlanTier.DEMO;
  } catch {
    // ignore
  }

  return PlanTier.FREE;
}

async function ensureUserProfile(profileId: string, seedDemo: boolean) {
  const current = await getCurrentUser();
  const owner = current.userId;
  const deviceId = getOrCreateDeviceId();

  if (import.meta.env.DEV) {
    console.debug(`[user bootstrap] ensure profile owner(sub)=${owner} profileId=${profileId} seedDemo=${String(seedDemo)}`);
  }

  const attrs = await fetchUserAttributes();
  const email = attrs.email;
  const emailString = typeof email === "string" ? email : "";

  const displayName = pickDisplayName({
    username: current.username,
    preferredUsername: typeof attrs.preferred_username === "string" ? attrs.preferred_username : null,
    name: typeof attrs.name === "string" ? attrs.name : null,
    email: emailString || null,
  });

  const existing = await budgeteerApi.getUserProfile(profileId);
  if (existing) {
    // Self-heal plan tier to match identity.
    // Seeding sample data is *not* the same as being a demo account.
    const desired = await resolveDesiredPlanTier(current.username);
    const existingTier = (existing as { planTier?: unknown } | null | undefined)?.planTier;

    // Future-proof: avoid auto-downgrading PRO.
    if (existingTier !== PlanTier.PRO && existingTier !== desired) {
      try {
        await budgeteerApi.updateUserProfile({ id: profileId, planTier: desired });
      } catch {
        // Best-effort only.
      }
    }

    // If the profile already exists, opportunistically fix legacy missing/null email.
    if (emailString) {
      await selfHealUserProfileEmail(profileId, emailString);
    } else if (import.meta.env.DEV) {
      console.warn("[user bootstrap] Cognito email missing; cannot self-heal UserProfile.email");
    }

    // Also self-heal legacy missing/null displayName.
    if (displayName) {
      await selfHealUserProfileDisplayName(profileId, displayName);
    }

    // Track last-seen device for presence/sync ownership.
    if (deviceId && existing.lastDeviceId !== deviceId) {
      try {
        await budgeteerApi.updateUserProfile({ id: profileId, lastDeviceId: deviceId });
      } catch {
        // Best-effort only.
      }
    }
    return existing;
  }

  if (!emailString) {
    throw new Error("UserProfile requires an email, but none was found in user attributes.");
  }

  const base = {
    id: profileId,
    owner,
    planTier: await resolveDesiredPlanTier(current.username),
    defaultVisibility: DefaultVisibility.PRIVATE,
    seedVersion: 0,
    seededAt: null,
    onboardingVersion: 0,
    onboarding: null,
    onboardingUpdatedAt: null,
    settingsVersion: 0,
    settings: null,
    settingsUpdatedAt: null,
    displayName: displayName || null,
    email: emailString,
    avatarUrl: null,
    lastSeenAt: null,
    preferredName: null,
    bio: null,
    timezone: null,
    locale: null,
    lastDeviceId: deviceId,
    acceptedTermsAt: null,
  } as const;

  try {
    return await budgeteerApi.createUserProfile(base);
  } catch (err) {
    // Multi-tab race: if it already exists, re-fetch.
    const again = await budgeteerApi.getUserProfile(profileId);
    if (again) return again;
    throw err;
  }
}

async function tryClaimDemoSeed(profileId: string) {
  const condition: ModelUserProfileConditionInput = {
    seedVersion: {
      lt: CURRENT_SEED_VERSION,
      ne: -1,
    },
  };

  return await budgeteerApi.updateUserProfile(
    {
      id: profileId,
      seedVersion: -1,
    },
    condition
  );
}

async function finalizeDemoSeed(profileId: string) {
  const now = new Date().toISOString();

  const condition: ModelUserProfileConditionInput = {
    seedVersion: { eq: -1 },
  };

  return await budgeteerApi.updateUserProfile(
    {
      id: profileId,
      seedVersion: CURRENT_SEED_VERSION,
      seededAt: now,
    },
    condition
  );
}

async function rollbackClaim(profileId: string) {
  const condition: ModelUserProfileConditionInput = {
    seedVersion: { eq: -1 },
  };

  try {
    await budgeteerApi.updateUserProfile(
      {
        id: profileId,
        seedVersion: 0,
      },
      condition
    );
  } catch {
    // Best-effort only.
  }
}

async function seedDemoData() {
  const current = await getCurrentUser();
  const owner = current.userId;

  // Guard: avoid double-seeding into a non-empty local store.
  // (The seed gate is server-side, but local persisted state might already exist.)
  const state = useBudgetStore.getState();
  const hasAnyAccounts = Object.keys(state.accounts || {}).length > 0;
  const hasAnyHistory = Array.isArray(state.importHistory) && state.importHistory.length > 0;
  if (hasAnyAccounts || hasAnyHistory) {
    if (import.meta.env.DEV) {
      console.info("[demo seed] skipped (local state not empty)", {
        owner,
        accounts: Object.keys(state.accounts || {}).length,
        history: state.importHistory?.length ?? 0,
      });
    }
    return;
  }

  // Use a real CSV asset so this exercises the normal parsing + ingestion pipeline.
  // Default to the tiny dataset because it stays close to the current date and loads fast.
  const res = await fetch("/demo/demo-tiny.csv", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch demo CSV (status ${res.status})`);
  }
  const csvText = await res.text();

  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  if (!rows.length) {
    throw new Error("Demo CSV parsed with 0 rows.");
  }

  const pickValue = (row: Record<string, unknown>, keys: string[]): string => {
    for (const k of keys) {
      const v = row?.[k];
      if (typeof v === "string") {
        const s = v.trim();
        if (s) return s;
      }
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
    }
    return "";
  };

  // Figure out a good initial month to land the user on (latest month in dataset).
  let newestMonthKey = "";
  for (const r of rows) {
    const raw = pickValue(r, ["Posted Date", "Date", "date"]);
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) continue;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    if (!newestMonthKey || key.localeCompare(newestMonthKey) > 0) newestMonthKey = key;
  }

  // Group by AccountNumber (canonical History-export format).
  const groups = rows.reduce<Record<string, Record<string, unknown>[]>>((acc, row) => {
    const v = row?.AccountNumber ?? row?.accountNumber;
    const acct = (typeof v === "string" ? v : String(v ?? "")).trim();
    if (!acct) return acc;
    if (!acc[acct]) acc[acct] = [];
    acc[acct].push(row);
    return acc;
  }, {});

  const txStrongKeyOverridesByKey: Record<
    string,
    | {
        name?: string | null;
        note?: string | null;
      }
    | undefined
  > = {};

  for (const accountNumber of Object.keys(groups)) {
    const accountRows = groups[accountNumber] || [];
    const adaptedRows = accountRows.map((r, idx) => {
      const note = pickValue(r, ["Note", "note", "Notes", "notes", "Memo", "memo"]);

      return {
        date: pickValue(r, ["Posted Date", "Date", "date"]),
        Description: pickValue(r, ["Description", "description", "Memo", "memo"]),
        Amount: pickValue(r, ["Amount", "amount", "Amt", "amt"]),
        Category: pickValue(r, ["Category", "category", "CATEGORY"]),
        Note: note,
        Memo: note,
        __line: idx + 1,
      };
    });

    const existingTxns = (useBudgetStore.getState().accounts?.[accountNumber]?.transactions ?? []) as Transaction[];
    const plan = await analyzeImport({
      parsedRows: { rows: adaptedRows, errors: [] },
      accountNumber,
      existingTxns,
      txStrongKeyOverridesByKey,
      autoApplyExplicitDirectives: true,
    });

    useBudgetStore.getState().commitImportPlan(plan);
  }

  if (newestMonthKey) {
    useBudgetStore.getState().setSelectedMonth(newestMonthKey);
  }

  if (import.meta.env.DEV) {
    console.info("[demo seed] seeded via demo CSV", {
      owner,
      accounts: Object.keys(groups).length,
      newestMonthKey: newestMonthKey || null,
    });
  }
}

export async function bootstrapUser(opts?: { seedDemo?: boolean }): Promise<BootstrapUserResult> {
  const seedDemo = opts?.seedDemo ?? true;

  const current = await getCurrentUser();
  const profileId = current.userId;

  const profile = await ensureUserProfile(profileId, seedDemo);

  if (!seedDemo) return { profileId, didSeedDemo: false };

  const seedVersion = Number((profile as { seedVersion?: unknown })?.seedVersion ?? 0);
  if (Number.isFinite(seedVersion) && seedVersion >= CURRENT_SEED_VERSION) {
    return { profileId, didSeedDemo: false };
  }

  try {
    await tryClaimDemoSeed(profileId);
  } catch (err) {
    // Another tab/user flow likely claimed it.
    if (isConditionalFailure(err)) {
      if (import.meta.env.DEV) {
        console.info("[demo seed] claim skipped (already in progress / done)");
      }
      return { profileId, didSeedDemo: false };
    }
    throw err;
  }

  if (import.meta.env.DEV) {
    console.info("[demo seed] claimed; seeding demo data...");
  }

  try {
    await seedDemoData();
    await finalizeDemoSeed(profileId);

    if (import.meta.env.DEV) {
      console.info("[demo seed] completed");
    }

    return { profileId, didSeedDemo: true };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[demo seed] failed", err);
    }
    await rollbackClaim(profileId);
    throw err;
  }
}

import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import {
  DefaultVisibility,
  ModelAttributeTypes,
  PlanTier,
  type ModelUserProfileConditionInput,
} from "../API";
import { budgeteerApi } from "../api/budgeteerApi";
import { isDemoIdentityUsername } from "./userDisplay";

export const CURRENT_SEED_VERSION = 1 as const;



type BootstrapUserResult = {
  profileId: string;
  didSeedDemo: boolean;
};

function errorToMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    // Amplify often throws `{ data, errors }` for GraphQL failures.
    if ("errors" in err && Array.isArray((err as { errors?: unknown }).errors)) {
      const errors = (err as { errors: Array<{ message?: unknown; errorType?: unknown }> }).errors;
      const messages = errors
        .map((e) => {
          const msg = typeof e?.message === "string" ? e.message : "Unknown GraphQL error";
          const type = typeof e?.errorType === "string" ? e.errorType : "";
          return type ? `${msg} (${type})` : msg;
        })
        .filter(Boolean);
      if (messages.length) return messages.join("; ");
    }

    if ("message" in err) return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}

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
    // Any other failure should surface, but don't hard-break the app.
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

/* TODO(P5): Refactor once demo-mode is re-built. The current implementation is a no-op, but the intended flow is to use `seedVersion` as a simple state machine for demo seeding:
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

async function resolveDesiredPlanTier(username?: string | null): Promise<typeof PlanTier[keyof typeof PlanTier]> {
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
    lastDeviceId: null,
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

/* TODO(P5): refactor once demo-mode is re-built. The current implementation is a no-op, but the intended flow is:
async function tryClaimDemoSeed(profileId: string) {
  const condition: ModelUserProfileConditionInput = {
    seedVersion: {
      lt: CURRENT_SEED_VERSION,
      ne: -1,
    },
  };

  return await taskmasterApi.updateUserProfile(
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

  return await taskmasterApi.updateUserProfile(
    {
      id: profileId,
      seedVersion: CURRENT_SEED_VERSION,
      seededAt: now,
    },
    condition
  );
}*/

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

/* TODO(P5): Add real seeded data here. For now, the value prop of demo mode is just the presence of the flag and the associated UI messaging, without actual seeded tasks.
async function seedDemoData() {
  const current = await getCurrentUser();
  const owner = current.userId;

  if (import.meta.env.DEV) {
    console.debug(`[demo seed] using owner(sub)=${owner} for demo creates`);
  }




  const parentId = String((parent as { id?: unknown })?.id ?? "");
  if (!parentId) throw new Error("Demo seed failed: missing parent task id.");

  await Promise.all([
    taskmasterApi.createTask({
      owner,
      listId: homeListId,
      sortOrder: 1,
      parentTaskId: parentId,
      title: "Review calendar",
      description: null,
      status: TaskStatus.Open,
      priority: TaskPriority.Low,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: homeListId,
      sortOrder: 2,
      parentTaskId: parentId,
      title: "Choose top 3 priorities",
      description: null,
      status: TaskStatus.Open,
      priority: TaskPriority.Medium,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: homeListId,
      sortOrder: 3,
      parentTaskId: parentId,
      title: "Block focus time",
      description: null,
      status: TaskStatus.Open,
      priority: TaskPriority.High,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
  ]);

  await Promise.all([
    taskmasterApi.createTask({
      owner,
      listId: workListId,
      sortOrder: 0,
      parentTaskId: null,
      title: "Draft project kickoff doc",
      description: "One pager: goals, scope, milestones, owners.",
      status: TaskStatus.Open,
      priority: TaskPriority.High,
      dueAt: buildIsoAtMidnightUtcFromNow(3),
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: workListId,
      sortOrder: 1,
      parentTaskId: null,
      title: "Schedule stakeholder sync",
      description: null,
      status: TaskStatus.Open,
      priority: TaskPriority.Medium,
      dueAt: buildIsoAtMidnightUtcFromNow(2),
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: workListId,
      sortOrder: 2,
      parentTaskId: null,
      title: "Triage inbox",
      description: "Process messages into tasks.",
      status: TaskStatus.Done,
      priority: TaskPriority.Low,
      dueAt: null,
      completedAt: new Date().toISOString(),
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
  ]);

  await Promise.all([
    taskmasterApi.createTask({
      owner,
      listId: hobbyListId,
      sortOrder: 0,
      parentTaskId: null,
      title: "Ship demo mode",
      description: "Seed data and polish onboarding.",
      status: TaskStatus.Open,
      priority: TaskPriority.High,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: hobbyListId,
      sortOrder: 1,
      parentTaskId: null,
      title: "Add keyboard shortcuts",
      description: "Quick add, complete, navigate.",
      status: TaskStatus.Open,
      priority: TaskPriority.Medium,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
    taskmasterApi.createTask({
      owner,
      listId: hobbyListId,
      sortOrder: 2,
      parentTaskId: null,
      title: "Design pass",
      description: "Consistency + spacing + states.",
      status: TaskStatus.Open,
      priority: TaskPriority.Low,
      dueAt: null,
      completedAt: null,
      assigneeId: null,
      tagIds: [],
      isDemo: true,
    }),
  ]);
}*/

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
/*
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

  */

  try {
    //await seedDemoData();
    //await finalizeDemoSeed(profileId);

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

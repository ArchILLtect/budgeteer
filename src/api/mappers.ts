import type { DefaultVisibility, PlanTier } from "../types/userProfile";
import type { UserProfileUI } from "../types/userProfile";


type ApiUserProfileLike = {
  id: string;
  owner: string;

  planTier: PlanTier;
  defaultVisibility: DefaultVisibility;

  seedVersion: number;
  seededAt?: string | null;

  onboardingVersion: number;
  onboarding?: unknown | null;
  onboardingUpdatedAt?: string | null;

  settingsVersion: number;
  settings?: unknown | null;
  settingsUpdatedAt?: string | null;

  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  preferredName?: string | null;
  bio?: string | null;
  timezone?: string | null;
  locale?: string | null;

  lastDeviceId?: string | null;
  acceptedTermsAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export function toUserProfileUI(api: ApiUserProfileLike): UserProfileUI {
  const email = typeof api.email === "string" ? api.email : "";
  if (import.meta.env.DEV && !email) {
    console.warn(
      `[mappers] UserProfile missing email (id=${api.id}, owner=${api.owner}). ` +
        "This should not happen once the schema requirement is fully enforced/backfilled."
    );
  }

  return {
    id: api.id,
    owner: api.owner,

    planTier: api.planTier,
    defaultVisibility: api.defaultVisibility,

    seedVersion: api.seedVersion,
    seededAt: api.seededAt ?? null,

    onboardingVersion: api.onboardingVersion,
    onboarding: api.onboarding ?? null,
    onboardingUpdatedAt: api.onboardingUpdatedAt ?? null,

    settingsVersion: api.settingsVersion,
    settings: api.settings ?? null,
    settingsUpdatedAt: api.settingsUpdatedAt ?? null,

    displayName: api.displayName ?? null,
    email,
    avatarUrl: api.avatarUrl ?? null,
    lastSeenAt: api.lastSeenAt ?? null,
    preferredName: api.preferredName ?? null,
    bio: api.bio ?? null,
    timezone: api.timezone ?? null,
    locale: api.locale ?? null,

    lastDeviceId: api.lastDeviceId ?? null,
    acceptedTermsAt: api.acceptedTermsAt ?? null,

    createdAt: api.createdAt ?? null,
    updatedAt: api.updatedAt ?? null,
  };
}

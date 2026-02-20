export const PlanTier = {
  FREE: "FREE",
  DEMO: "DEMO",
  PRO: "PRO",
} as const;

export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const DefaultVisibility = {
  PRIVATE: "PRIVATE",
  TEAM: "TEAM",
  PUBLIC: "PUBLIC",
} as const;

export type DefaultVisibility = (typeof DefaultVisibility)[keyof typeof DefaultVisibility];

// Stable UI-level profile/settings type (do not depend on generated API model types)
export type UserProfileUI = {
  // Cognito sub (primary key)
  id: string;
  owner: string;

  planTier: PlanTier;
  defaultVisibility: DefaultVisibility;

  // demo seeding + upgrades
  seedVersion: number;
  seededAt?: string | null;

  // onboarding seeding + upgrades
  onboardingVersion: number;
  onboarding?: unknown | null;
  onboardingUpdatedAt?: string | null;

  // settings blob + upgrades
  settingsVersion: number;
  settings?: unknown | null;
  settingsUpdatedAt?: string | null;

  // optional profile fields
  displayName?: string | null;
  email: string;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  preferredName?: string | null;
  bio?: string | null;
  timezone?: string | null;
  locale?: string | null;

  // app lifecycle + analytics
  lastDeviceId?: string | null;
  acceptedTermsAt?: string | null;

  // timestamps (present on @model types)
  createdAt?: string | null;
  updatedAt?: string | null;
};

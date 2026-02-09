import * as APITypes from "../API";

// NOTE: This file is intentionally NOT under src/graphql/**.
// That folder is treated as codegen-owned and may be deleted/regenerated.

type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

// -----------------------------
// UserProfile (bootstrap + demo seed gate)
// -----------------------------

export const getUserProfileMinimal = /* GraphQL */ `
  query GetUserProfile($id: ID!) {
    getUserProfile(id: $id) {
      id
      owner
      planTier
      defaultVisibility
      seedVersion
      seededAt
      onboardingVersion
      onboarding
      onboardingUpdatedAt
      settingsVersion
      settings
      settingsUpdatedAt
      displayName
      avatarUrl
      lastSeenAt
      preferredName
      bio
      timezone
      locale
      lastDeviceId
      acceptedTermsAt
      createdAt
      updatedAt
    }
  }
` as GeneratedQuery<
  APITypes.GetUserProfileQueryVariables,
  APITypes.GetUserProfileQuery
>;

// Probe variant: includes `email` so legacy records missing it will error.
// Useful for admin diagnostics and migrations.
export const getUserProfileEmailProbeMinimal = /* GraphQL */ `
  query GetUserProfile($id: ID!) {
    getUserProfile(id: $id) {
      id
      owner
      email
      seedVersion
      createdAt
      updatedAt
    }
  }
` as GeneratedQuery<
  APITypes.GetUserProfileQueryVariables,
  APITypes.GetUserProfileQuery
>;

export const createUserProfileMinimal = /* GraphQL */ `
  mutation CreateUserProfile($input: CreateUserProfileInput!) {
    createUserProfile(input: $input) {
      id
      owner
      planTier
      defaultVisibility
      seedVersion
      seededAt
      onboardingVersion
      onboarding
      onboardingUpdatedAt
      settingsVersion
      settings
      settingsUpdatedAt
      displayName
      email
      avatarUrl
      lastSeenAt
      preferredName
      bio
      timezone
      locale
      lastDeviceId
      acceptedTermsAt
      createdAt
      updatedAt
    }
  }
` as GeneratedMutation<
  APITypes.CreateUserProfileMutationVariables,
  APITypes.CreateUserProfileMutation
>;

export const listUserProfilesMinimal = /* GraphQL */ `
  query ListUserProfiles($id: ID, $filter: ModelUserProfileFilterInput, $limit: Int, $nextToken: String, $sortDirection: ModelSortDirection) {
    listUserProfiles(id: $id, filter: $filter, limit: $limit, nextToken: $nextToken, sortDirection: $sortDirection) {
      items {
        id
        owner
        planTier
        defaultVisibility
        seedVersion
        seededAt
        onboardingVersion
        onboarding
        onboardingUpdatedAt
        settingsVersion
        settings
        settingsUpdatedAt
        displayName
        email
        avatarUrl
        lastSeenAt
        preferredName
        bio
        timezone
        locale
        lastDeviceId
        acceptedTermsAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
` as GeneratedQuery<
  APITypes.ListUserProfilesQueryVariables,
  APITypes.ListUserProfilesQuery
>;

// Safe variant for legacy/backfill situations: omits `email` so GraphQL won't error on
// records missing the now-required field.
export const listUserProfilesSafeMinimal = /* GraphQL */ `
  query ListUserProfiles($id: ID, $filter: ModelUserProfileFilterInput, $limit: Int, $nextToken: String, $sortDirection: ModelSortDirection) {
    listUserProfiles(id: $id, filter: $filter, limit: $limit, nextToken: $nextToken, sortDirection: $sortDirection) {
      items {
        id
        owner
        planTier
        defaultVisibility
        seedVersion
        seededAt
        onboardingVersion
        onboarding
        onboardingUpdatedAt
        settingsVersion
        settings
        settingsUpdatedAt
        displayName
        avatarUrl
        lastSeenAt
        preferredName
        bio
        timezone
        locale
        lastDeviceId
        acceptedTermsAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
` as GeneratedQuery<
  APITypes.ListUserProfilesQueryVariables,
  APITypes.ListUserProfilesQuery
>;

export const updateUserProfileMinimal = /* GraphQL */ `
  mutation UpdateUserProfile($input: UpdateUserProfileInput!, $condition: ModelUserProfileConditionInput) {
    updateUserProfile(input: $input, condition: $condition) {
      id
      owner
      planTier
      defaultVisibility
      seedVersion
      seededAt
      onboardingVersion
      onboarding
      onboardingUpdatedAt
      settingsVersion
      settings
      settingsUpdatedAt
      displayName
      email
      avatarUrl
      lastSeenAt
      preferredName
      bio
      timezone
      locale
      lastDeviceId
      acceptedTermsAt
      createdAt
      updatedAt
    }
  }
` as GeneratedMutation<
  APITypes.UpdateUserProfileMutationVariables,
  APITypes.UpdateUserProfileMutation
>;

/**
 * Optional (not currently used):
 * requires schema queryField: "tasksByParent"
 */
export const tasksByParentMinimal = /* GraphQL */ `
  query TasksByParent(
    $parentTaskId: ID!
    $sortOrder: ModelIntKeyConditionInput
    $limit: Int
    $nextToken: String
  ) {
    tasksByParent(
      parentTaskId: $parentTaskId
      sortOrder: $sortOrder
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        listId
        sortOrder
        parentTaskId
        title
        description
        status
        priority
        dueAt
        completedAt
        assigneeId
        tagIds
        owner
        createdAt
        updatedAt
      }
      nextToken
    }
  }
` as GeneratedQuery<
  APITypes.TasksByParentQueryVariables,
  APITypes.TasksByParentQuery
>;

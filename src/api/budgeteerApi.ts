import { getClient } from "../amplifyClient";
import type {
  CreateUserProfileInput,
  UpdateUserProfileInput,
  ModelUserProfileConditionInput,
} from "../API";

import {
  getUserProfileMinimal,
  getUserProfileEmailProbeMinimal,
  createUserProfileMinimal,
  updateUserProfileMinimal,
  listUserProfilesMinimal,
  listUserProfilesSafeMinimal,
} from "./operationsMinimal";
import type { ListUserProfilesQuery } from "../API";

/*
function errorToMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
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

function shouldFallbackMissingIsDemo(err: unknown): boolean {
  const msg = errorToMessage(err);
  return msg.includes("Cannot return null for non-nullable type") && msg.includes("isDemo");
}*/

type UserProfileItem = NonNullable<NonNullable<ListUserProfilesQuery["listUserProfiles"]>["items"]>[number];

function stripOwnerField<T extends Record<string, unknown>>(input: T): Omit<T, "owner"> {
  // Defense-in-depth: never allow client code to send `owner` in *update* mutation inputs.
  // Ownership should not be transferable via client payloads.
  const rest = { ...(input as T & { owner?: unknown }) } as T & { owner?: unknown };
  delete rest.owner;
  return rest;
}

// The operation documents in `operationsMinimal.ts` are typed as branded strings.
// Use those brands to infer variable + result types without any casts.
type GenQuery<I, O> = string & { __generatedQueryInput: I; __generatedQueryOutput: O };
type GenMutation<I, O> = string & { __generatedMutationInput: I; __generatedMutationOutput: O };

async function runQuery<I, O>(query: GenQuery<I, O>, variables: I): Promise<O> {
  const client = getClient();
  const res = await client.graphql<O, I>({ query, variables });
  return res.data as O;
}

async function runMutation<I, O>(query: GenMutation<I, O>, variables: I): Promise<O> {
  const client = getClient();
  const res = await client.graphql<O, I>({ query, variables });
  return res.data as O;
}

/**
 * Small helper for pagination if/when you need it.
 */
export type Page<T> = { items: T[]; nextToken?: string | null };

function toPage<T>(conn: { items?: (T | null)[] | null; nextToken?: string | null } | null | undefined): Page<T> {
  return {
    items: (conn?.items ?? []).filter(Boolean) as T[],
    nextToken: conn?.nextToken ?? null,
  };
}

/**
 * API surface: keep it boring and predictable.
 * Pages should call these methods instead of client.graphql directly.
 */
export const budgeteerApi = {
  // -----------------------------
  // UserProfile
  // -----------------------------
  async getUserProfile(id: string) {
    const data = await runQuery(getUserProfileMinimal, { id });
    return data.getUserProfile ?? null;
  },

  async getUserProfileEmailProbe(id: string) {
    const data = await runQuery(getUserProfileEmailProbeMinimal, { id });
    return data.getUserProfile ?? null;
  },

  async createUserProfile(input: CreateUserProfileInput) {
    const data = await runMutation(createUserProfileMinimal, { input });
    return data.createUserProfile;
  },

  async updateUserProfile(input: UpdateUserProfileInput, condition?: ModelUserProfileConditionInput | null) {
    const data = await runMutation(updateUserProfileMinimal, {
      input: stripOwnerField(input),
      condition: condition ?? null,
    });
    return data.updateUserProfile;
  },

  async listUserProfiles(opts?: {
    id?: string | null;
    filter?: import("../API").ModelUserProfileFilterInput | null;
    limit?: number;
    nextToken?: string | null;
    sortDirection?: import("../API").ModelSortDirection | null;
  }): Promise<Page<UserProfileItem>> {
    const data = await runQuery(listUserProfilesMinimal, {
      id: opts?.id ?? null,
      filter: opts?.filter ?? null,
      sortDirection: opts?.sortDirection ?? null,
      limit: opts?.limit ?? 50,
      nextToken: opts?.nextToken ?? null,
    });

    const conn = data.listUserProfiles;
    return toPage<UserProfileItem>(conn);
  },

  async listUserProfilesSafe(opts?: {
    id?: string | null;
    filter?: import("../API").ModelUserProfileFilterInput | null;
    limit?: number;
    nextToken?: string | null;
    sortDirection?: import("../API").ModelSortDirection | null;
  }): Promise<Page<UserProfileItem>> {
    const data = await runQuery(listUserProfilesSafeMinimal, {
      id: opts?.id ?? null,
      filter: opts?.filter ?? null,
      sortDirection: opts?.sortDirection ?? null,
      limit: opts?.limit ?? 50,
      nextToken: opts?.nextToken ?? null,
    });

    const conn = data.listUserProfiles;
    return toPage<UserProfileItem>(conn);
  },

  // -----------------------------
  // Helpers
  // -----------------------------

};

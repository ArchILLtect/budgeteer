import { Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { GraphQLSmokeTest } from "../dev/GraphQLSmokeTest";
//import { BasicSpinner } from "../components/ui/BasicSpinner";
import { fireToast } from "../hooks/useFireToast";
import { clearCurrentUserPersistedCaches } from "../store/clearUserCaches";
import { getUserUIResult } from "../services/authService";
import { Tip } from "../components/ui/Tip";

export function DevPage() {



  //if (loading) return <BasicSpinner />;

  return (
    <VStack align="start" gap={2} minH="100%" p={4} bg="white" rounded="md" boxShadow="sm">
      <Heading size="2xl">Dev</Heading>
      <Text>This page is for development and testing purposes.</Text>

      <Tip storageKey="tip:dev-cache" title="Tip">
        “Clear user caches” clears persisted per-user caches for the current signed-in user.
      </Tip>

      <VStack align="start" gap={2} w="100%" p={3} bg="gray.50" rounded="md" borderWidth="1px">
        <Heading size="sm">Budgeteer caches</Heading>
        <HStack gap={2} flexWrap="wrap">
          <Button
            size="sm"
            colorPalette="red"
            variant="outline"
            onClick={async () => {
              await clearCurrentUserPersistedCaches();

              // Repopulate current session state so the UI updates immediately.
              // (Otherwise you often need a manual browser reload to see user metadata refresh.)
              await Promise.all([ getUserUIResult()]);

              fireToast(
                "success",
                "Cleared user caches",
                "Cleared persisted per-user caches for the current signed-in user and re-fetched user metadata."
              );
            }}
          >
            Clear all user caches
          </Button>

          {import.meta.env.DEV ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const key = "budgeteer:budgetStore";
                const raw = localStorage.getItem(key);

                if (!raw) {
                  console.info(`[dev] ${key} not found in localStorage.`);
                  fireToast("info", "No persisted cache", `${key} is not present in localStorage.`);
                  return;
                }

                try {
                  const parsed = JSON.parse(raw) as unknown;
                  const envelope = parsed as { state?: unknown; version?: unknown };
                  const state = envelope?.state as Record<string, unknown> | undefined;

                  const stateKeys = state && typeof state === "object" ? Object.keys(state) : [];
                  const allowedKeys: string[] = [];
                  const extraKeys = stateKeys.filter((k) => !allowedKeys.includes(k));

                  console.log(`[dev] ${key} persist envelope`, {
                    version: envelope?.version,
                    stateKeys,
                    extraKeys,
                    lastLoadedAtMs: state?.lastLoadedAtMs ?? null,
                    rawBytes: raw.length,
                  });

                  fireToast(
                    "success",
                    "Logged persisted cache",
                    `state keys: ${stateKeys.join(", ") || "(none)"}${extraKeys.length ? ` (extra: ${extraKeys.join(", ")})` : ""}`
                  );
                } catch (err) {
                  console.error(`[dev] Failed to parse ${key} from localStorage`, err);
                  fireToast("error", "Parse failed", `Failed to parse ${key} persisted JSON. See console.`);
                }
              }}
            >
              Log persisted keys
            </Button>
          ) : null}
        </HStack>
      </VStack>

      {import.meta.env.DEV ? <GraphQLSmokeTest /> : null}
    </VStack>
  );
}
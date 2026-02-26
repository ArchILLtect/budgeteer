import { Badge, Box, Button, Heading, HStack, Separator, Text, VStack } from "@chakra-ui/react";
import { GraphQLSmokeTest } from "../dev/GraphQLSmokeTest";
//import { BasicSpinner } from "../components/ui/BasicSpinner";
import { fireToast } from "../hooks/useFireToast";
import { clearCurrentUserPersistedCaches } from "../store/clearUserCaches";
import { getUserUIResult } from "../services/authService";
import { Tip } from "../components/ui/Tip";
import { getUserStorageScopeKey, makeUserScopedKey } from "../services/userScopedStorage";
import { AppSwitch } from "../components/Switch";
import { useBudgetStore } from "../store/budgetStore";
import { useLocalSettingsStore } from "../store/localSettingsStore";
import { useUpdatesStore } from "../store/updatesStore";
import { usePerfLogStore } from "../store/perfLogStore";
import { useTxStrongKeyOverridesStore } from "../store/txStrongKeyOverridesStore";
import { useAccountMappingsStore } from "../store/accountMappingsStore";
import { useUserUICacheStore } from "../services/userUICacheStore";
import { useDemoTourStore } from "../store/demoTourStore";

type StoreWithPersist = {
  getInitialState: () => any;
  setState: (...args: any[]) => any;
  persist?: {
    clearStorage?: () => void | Promise<void>;
  };
};

async function clearPersistedStore(label: string, store: StoreWithPersist): Promise<void> {
  try {
    await store.persist?.clearStorage?.();
  } catch {
    // ignore
  }

  try {
    store.setState(store.getInitialState(), true);
  } catch {
    // ignore
  }

  fireToast("success", `${label} cleared`, "Local persisted data was removed and in-memory state was reset.");
}

export function DevPage() {

  const showIngestionBenchmark = useBudgetStore((s) => s.showIngestionBenchmark);
  const setShowIngestionBenchmark = useBudgetStore((s) => s.setShowIngestionBenchmark);
  const clearImportManifests = useBudgetStore((s) => s.clearImportManifests);

  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return (
      <VStack align="stretch" gap={2} minH="100%" p={4} bg="bg.subtle" rounded="md" boxShadow="sm">
        <Heading size="2xl">Dev</Heading>
        <Text color="fg.muted">This page is for development and testing purposes.</Text>
        <Text color="fg.emphasized">If you see this page in production, something went wrong with
          the environment configuration.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={2} minH="100%" p={4} bg="bg.subtle" rounded="md" boxShadow="sm">
      <Heading size="2xl">Dev</Heading>
      <Text color="fg.muted">This page is for development and testing purposes.</Text>

      <Tip storageKey="tip:dev-cache" title="Tip">
        “Clear user caches” clears persisted per-user caches for the current signed-in user.
      </Tip>

      <VStack align="stretch" gap={2} w="100%" p={3} bg="bg" rounded="md" borderWidth="1px">
        
        <Heading size="md">Clear Persisted Data/Caches</Heading>
        <Text fontSize="sm" color="fg.muted">
          Clears cached data persisted in localStorage for the current signed-in user.
          Useful for testing first-run experiences and cache-related edge cases without
          needing to switch users or clear all browser storage.
        </Text>
        
        <VStack align="stretch" bg="bg.panel" p={3} borderWidth={1} borderRadius="md">
          <Heading size="md">Clear Caches</Heading>
          <Text fontSize="sm" color="fg.muted">
            Clears persisted per-user caches for the current signed-in user.
            This does not clear imported transactions or budget state stored in the backend,
            but it does reset local caches that track imported transactions and budget state,
            so it can be useful for testing import/directive behavior and first-run experiences
            without needing to switch users or clear all browser storage.
          </Text>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontSize="sm">Clear all user caches</Text>
            <Button
              size="xs"
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
              Clear
            </Button>
          </HStack>
          <Separator />
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <Text fontSize="sm">Log persisted keys</Text>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  const baseKey = "zustand:budgeteer:budgetStore";
                  const key = makeUserScopedKey(baseKey);
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
                      scope: getUserStorageScopeKey() ?? null,
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
                Log
              </Button>
          </HStack>
        </VStack>

        <VStack align="stretch" bg="bg.emphasized" p={3} borderWidth={1} borderRadius="md">
          <Heading size="md">Clear Stores</Heading>
          <Text fontSize="sm" color="fg.muted">
            Clears the full persisted store (user-scoped localStorage) and resets in-memory
            state for individual stores.
          </Text>
          <Box p={3} borderWidth={1} borderRadius="md" bg="bg.panel">
            <Heading size="sm" mb={2}>
              Clear local scoped data
            </Heading>
            <Text fontSize="xs" color="fg.muted" mb={3}>
              Clears scoped persisted data within stores (user-scoped localStorage) and resets in-memory state. Useful
              for debugging import/directive behavior.
            </Text>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <Text fontSize="sm">Import Manifests (Previously Imported warnings)</Text>
              <Button
                size="xs"
                colorPalette="red"
                variant="outline"
                onClick={() => {
                  try {
                    clearImportManifests?.();
                    fireToast("success", "Import manifests cleared", "Previously imported warnings were reset.");
                  } catch {
                    fireToast("error", "Clear failed", "Unable to clear import manifests.");
                  }
                }}
              >
                Clear
              </Button>
            </HStack>
          </Box>

          <VStack align="stretch" p={3} borderWidth={1} borderRadius="md" bg="bg.panel">
            <Heading size="sm" mb={2}>
              Clear local stores
            </Heading>
            <Text fontSize="xs" color="fg.muted" mb={3}>
              Clears the full persisted store (user-scoped localStorage) and resets in-memory state.
            </Text>

            <VStack align="stretch" gap={2}>
              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Tx Strong Key Overrides</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Tx Strong Key Overrides", useTxStrongKeyOverridesStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Account Mappings</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Account Mappings", useAccountMappingsStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Budget Store</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Budget Store", useBudgetStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Local Settings Store</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Local Settings", useLocalSettingsStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Updates Store</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Updates Store", useUpdatesStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Perf Log Store</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("Perf Log", usePerfLogStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">User UI Cache Store</Text>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => void clearPersistedStore("User UI Cache", useUserUICacheStore)}
                >
                  Clear
                </Button>
              </HStack>
              <Separator />

              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <Text fontSize="sm">Demo Tour Store</Text>
                <HStack gap={2}>
                  <Badge size="sm" colorPalette="orange" variant="subtle">
                    tour
                  </Badge>
                  <Button
                    size="xs"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => {
                      try {
                        useDemoTourStore.getState().resetDisabled();
                        useDemoTourStore.setState({ open: false, disabled: false });
                        fireToast("success", "Demo Tour Store cleared", "Demo tour state was reset.");
                      } catch {
                        fireToast("error", "Clear failed", "Unable to clear demo tour state.");
                      }
                    }}
                  >
                    Clear
                  </Button>
                </HStack>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </VStack>

      <VStack align="stretch" gap={3} w="100%" p={3} bg="bg.subtle" rounded="md" borderWidth="1px">
        <Heading size="sm">Developer / Debug</Heading>

        <Box p={3} borderWidth={1} borderRadius="md" bg="bg">
          <HStack justify="space-between" align="center">
            <Text fontSize="sm">Show Ingestion Benchmark Panel</Text>
            <AppSwitch show={showIngestionBenchmark} setShow={setShowIngestionBenchmark} />
          </HStack>
          <Text fontSize="xs" mt={2} color="fg.muted">
            Dev-only synthetic ingestion performance harness. Not persisted.
          </Text>
        </Box>

      </VStack>

      <GraphQLSmokeTest />
    </VStack>
  );
}
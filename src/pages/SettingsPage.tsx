import { Box, Button, Heading, HStack, VStack, Text, Checkbox, NumberInput, Badge, Flex, Field, Separator, Input, IconButton } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useSettingsPageData } from "./useSettingsPageData";
import { BasicSpinner } from "../components/ui/BasicSpinner";
import { useBudgetStore } from '../store/budgetStore';
import { AppSwitch } from '../components/Switch';
import {
  useApplyAlwaysExtractVendorName,
  useExpenseNameOverrides,
  useDefaultLandingRoute,
  useIncomeNameOverrides,
  useSetApplyAlwaysExtractVendorName,
  useSetDefaultLandingRoute,
  useSetExpenseNameOverrides,
  useSetIncomeNameOverrides,
  useSetSidebarWidthPreset,
  useSidebarWidthPreset,
  type DefaultLandingRoute,
  type NameOverrideRule,
  type SidebarWidthPreset,
} from "../store/localSettingsStore";
import { clearUserScopedKeysByPrefix } from "../services/userScopedStorage";
import { Tip } from "../components/ui/Tip";
import { FormSelect } from "../components/forms/FormSelect";
import { fireToast } from "../hooks/useFireToast";
import { DialogModal } from "../components/ui/DialogModal";
import { useDemoMode } from "../hooks/useDemoMode";
import { useDemoTourStore } from "../store/demoTourStore";
import { isSeedDemoDisabled, setSeedDemoDisabled } from "../services/seedDemoPreference";
import { setDemoModeOptIn } from "../services/demoModeOptIn";
import { clearWelcomeModalSeenVersion, requestOpenWelcomeModal } from "../services/welcomeModalPreference";
import { clearDemoSessionActive } from "../services/demoSession";
import { InlineErrorBanner } from "../components/ui/InlineErrorBanner";
import {
  clearDemoDataOnly,
  // resetDemoDataPreservingNonDemo, // TODO(P4): keep this for now to use for demo data counts in the success message after we surface those counts from the API; remove it when we no longer need it for that
} from "../services/demoDataService";
import { AppCollapsible } from "../components/ui/AppCollapsible";
import { MdAdd, MdDelete } from "react-icons/md";

type ImportSettingsLocal = {
  importUndoWindowMinutes: number;
  importHistoryMaxEntries: number;
  importHistoryMaxAgeDays: number;
  stagedAutoExpireDays: number;
  streamingAutoLineThreshold: number;
  streamingAutoByteThreshold: number;
};

export default function SettingsPage() {

  // Subscribe to primitives individually to avoid new object identity every render
  const importUndoWindowMinutes = useBudgetStore(s => s.importUndoWindowMinutes);
  const importHistoryMaxEntries = useBudgetStore(s => s.importHistoryMaxEntries);
  const importHistoryMaxAgeDays = useBudgetStore(s => s.importHistoryMaxAgeDays);
  const stagedAutoExpireDays = useBudgetStore(s => s.stagedAutoExpireDays);
  const streamingAutoLineThreshold = useBudgetStore(s => s.streamingAutoLineThreshold);
  const streamingAutoByteThreshold = useBudgetStore(s => s.streamingAutoByteThreshold);
  const showIngestionBenchmark = useBudgetStore(s => s.showIngestionBenchmark);
  const setShowIngestionBenchmark = useBudgetStore(s => s.setShowIngestionBenchmark);
  const updateImportSettings = useBudgetStore(s => s.updateImportSettings);
  const pruneImportHistory = useBudgetStore(s => s.pruneImportHistory);
  const expireOldStagedTransactions = useBudgetStore(s => s.expireOldStagedTransactions);
  const [local, setLocal] = useState<ImportSettingsLocal>({
    importUndoWindowMinutes: importUndoWindowMinutes ?? 30,
    importHistoryMaxEntries: importHistoryMaxEntries ?? 30,
    importHistoryMaxAgeDays: importHistoryMaxAgeDays ?? 30,
    stagedAutoExpireDays: stagedAutoExpireDays ?? 30,
    streamingAutoLineThreshold: streamingAutoLineThreshold ?? 3000,
    streamingAutoByteThreshold: streamingAutoByteThreshold ?? 500000,
  });

    // Sync from store if external changes occur (e.g., another tab or reset) without causing loops
  useEffect(() => {
    setLocal((prev) => {
      const next: ImportSettingsLocal = {
        importUndoWindowMinutes: importUndoWindowMinutes ?? prev.importUndoWindowMinutes,
        importHistoryMaxEntries: importHistoryMaxEntries ?? prev.importHistoryMaxEntries,
        importHistoryMaxAgeDays: importHistoryMaxAgeDays ?? prev.importHistoryMaxAgeDays,
        stagedAutoExpireDays: stagedAutoExpireDays ?? prev.stagedAutoExpireDays,
        streamingAutoLineThreshold: streamingAutoLineThreshold ?? prev.streamingAutoLineThreshold,
        streamingAutoByteThreshold: streamingAutoByteThreshold ?? prev.streamingAutoByteThreshold,
      };

      const keys: Array<keyof ImportSettingsLocal> = [
        "importUndoWindowMinutes",
        "importHistoryMaxEntries",
        "importHistoryMaxAgeDays",
        "stagedAutoExpireDays",
        "streamingAutoLineThreshold",
        "streamingAutoByteThreshold",
      ];
      const same = keys.every((k) => next[k] === prev[k]);
      return same ? prev : next;
    });
  }, [importUndoWindowMinutes, importHistoryMaxEntries, importHistoryMaxAgeDays, stagedAutoExpireDays, streamingAutoLineThreshold, streamingAutoByteThreshold]);

  const onChange = (field: keyof typeof local, _valueString: string, valueNumber: number) => {
    if (Number.isNaN(valueNumber)) return;
    setLocal(l => ({ ...l, [field]: valueNumber }));
  };

  const save = () => {
    if (!hasChanges) {
      fireToast("info", "No changes to save", "There are no changes to save.");
      return;
    }
    updateImportSettings({ ...local });
    if (importHistoryMaxEntries !== local.importHistoryMaxEntries || importHistoryMaxAgeDays !== local.importHistoryMaxAgeDays) {
      pruneImportHistory();
    }
    if (stagedAutoExpireDays !== local.stagedAutoExpireDays) {
      expireOldStagedTransactions();
    }
    fireToast('success', 'Settings saved', 'Your settings have been saved successfully.');
  };

  const hasChanges = (
    importUndoWindowMinutes !== local.importUndoWindowMinutes ||
    importHistoryMaxEntries !== local.importHistoryMaxEntries ||
    importHistoryMaxAgeDays !== local.importHistoryMaxAgeDays ||
    stagedAutoExpireDays !== local.stagedAutoExpireDays ||
    streamingAutoLineThreshold !== local.streamingAutoLineThreshold ||
    streamingAutoByteThreshold !== local.streamingAutoByteThreshold
  );

  const policySummary = `Keeps up to ${local.importHistoryMaxEntries} sessions for ${local.importHistoryMaxAgeDays} days (whichever is stricter). Staged transactions auto-apply after ${local.stagedAutoExpireDays} day(s). Undo window: ${local.importUndoWindowMinutes} minute(s).`;
  const streamingSummary = `Auto-stream when > ${local.streamingAutoLineThreshold.toLocaleString()} lines or > ${(local.streamingAutoByteThreshold/1024).toFixed(0)} KB.`;

  
  const { loading, error: err, refreshData } = useSettingsPageData();

  const sidebarWidthPreset = useSidebarWidthPreset();
  const setSidebarWidthPreset = useSetSidebarWidthPreset();

  const defaultLandingRoute = useDefaultLandingRoute();
  const setDefaultLandingRoute = useSetDefaultLandingRoute();

  const applyAlwaysExtractVendorName = useApplyAlwaysExtractVendorName();
  const setApplyAlwaysExtractVendorName = useSetApplyAlwaysExtractVendorName();

  const expenseNameOverrides = useExpenseNameOverrides();
  const setExpenseNameOverrides = useSetExpenseNameOverrides();
  const incomeNameOverrides = useIncomeNameOverrides();
  const setIncomeNameOverrides = useSetIncomeNameOverrides();

  const applyActualNameOverrides = useBudgetStore((s) => s.applyActualNameOverrides);

  const [expenseNameOverridesLocal, setExpenseNameOverridesLocal] = useState<NameOverrideRule[]>(() => expenseNameOverrides ?? []);
  const [incomeNameOverridesLocal, setIncomeNameOverridesLocal] = useState<NameOverrideRule[]>(() => incomeNameOverrides ?? []);

  useEffect(() => {
    setExpenseNameOverridesLocal(expenseNameOverrides ?? []);
  }, [expenseNameOverrides]);

  useEffect(() => {
    setIncomeNameOverridesLocal(incomeNameOverrides ?? []);
  }, [incomeNameOverrides]);

  const normalizeRuleList = (rules: NameOverrideRule[]) =>
    (Array.isArray(rules) ? rules : [])
      .map((r) => ({
        match: String(r?.match ?? "").replace(/\s+/g, " ").trim(),
        displayName: String(r?.displayName ?? "").replace(/\s+/g, " ").trim(),
      }))
      .filter((r) => r.match && r.displayName);

  const saveNameOverrides = () => {
    const nextExpense = normalizeRuleList(expenseNameOverridesLocal);
    const nextIncome = normalizeRuleList(incomeNameOverridesLocal);

    setExpenseNameOverrides(nextExpense);
    setIncomeNameOverrides(nextIncome);
    applyActualNameOverrides({ expense: nextExpense, income: nextIncome });
    fireToast('success', 'Name overrides saved', 'Existing tracker items were updated using your override mappings.');
  };

  const { isDemo, isDemoIdentity, isDemoSession, isDemoOptIn } = useDemoMode(true);
  const demoTourDisabled = useDemoTourStore((s) => s.disabled);
  const resetDemoTourDisabled = useDemoTourStore((s) => s.resetDisabled);
  const openDemoTour = useDemoTourStore((s) => s.openTour);

  const [seedOptedOut, setSeedOptedOut] = useState(() => isSeedDemoDisabled());

  const [isClearDemoOpen, setIsClearDemoOpen] = useState(false);
  const [isResetDemoOpen, setIsResetDemoOpen] = useState(false);
  const [demoActionLoading, setDemoActionLoading] = useState<"clear" | "reset" | null>(null);
  const [demoActionError, setDemoActionError] = useState<string | null>(null);

  const [isRemoveSampleOpen, setIsRemoveSampleOpen] = useState(false);
  const [removeSampleChecked, setRemoveSampleChecked] = useState(false);
  const [removeSampleLoading, setRemoveSampleLoading] = useState(false);
  const [removeSampleError, setRemoveSampleError] = useState<string | null>(null);

  useEffect(() => {
    // Keep the UI in sync if some other screen changes the preference.
    setSeedOptedOut(isSeedDemoDisabled());
  }, []);

  if (loading) return <BasicSpinner />;

  return (
    <Box p={6} mb={20}>
      {/*<VStack align="start" gap={2} minH="100%" p={4} bg="white" rounded="md" boxShadow="sm">*/}
      <Box p={4} maxW="80%" mx="auto" borderWidth={1} borderColor="border" borderRadius="lg" boxShadow="md" bg="bg.panel">
        <Heading size="2xl">Settings</Heading>

        <Tip storageKey="tip:settings-local" title="Tip">
          Settings and dismissed tips are stored per user in this browser. If you switch devices or clear storage, you’ll
          see onboarding tips again.
        </Tip>

        {err ? (
          <InlineErrorBanner
            title="Failed to load settings"
            message={err}
            onRetry={() => {
              void refreshData();
            }}
          />
        ) : null}

        <Box pt={6} w="100%"> {/* Navigation */}
          <Heading size="lg">Navigation</Heading>
          <Text color="fg.muted" fontSize="sm">
            Customize your sidebar and default landing page.
          </Text>

          <VStack align="stretch" gap={4} pt={3}>
            <FormSelect
              title="Sidebar width"
              name="sidebarWidthPreset"
              items={[
                { label: "Small", value: "small" },
                { label: "Medium", value: "medium" },
                { label: "Large", value: "large" },
              ]}
              value={sidebarWidthPreset}
              onChange={(v) => setSidebarWidthPreset(v as SidebarWidthPreset)}
              helperText="Controls the fixed width of the left sidebar."
              helperMode="below"
            />

            <FormSelect
              title="Default landing page"
              name="defaultLandingRoute"
              items={[
                { label: "Home", value: "/" },
                { label: "Planner", value: "/planner" },
                { label: "Tracker", value: "/tracker" },
                { label: "Accounts", value: "/accounts" },
                { label: "Imports", value: "/imports" },
                { label: "Profile", value: "/profile" },
                { label: "Settings", value: "/settings" },
              ]}
              value={defaultLandingRoute}
              onChange={(v) => setDefaultLandingRoute(v as DefaultLandingRoute)}
              helperText="Used after signing in when there’s no specific redirect target, and as the signed-in fallback for unknown URLs."
              helperMode="below"
            />
          </VStack>
        </Box>

        <Box pt={6} w="100%"> {/* Apply to Budget */}
          <Heading size="lg">Apply to Budget</Heading>
          <Text color="fg.muted" fontSize="sm">
            Controls how expense names are created when you apply imported transactions into the Tracker.
          </Text>

          <Box pt={3}>
            <HStack justify="space-between" align="center">
              <Box>
                <Text fontWeight={600}>Always extract vendor-like names</Text>
                <Text color="fg.muted" fontSize="sm">
                  When on, Budgeteer tries to extract a vendor-like name from every expense description. When off (default), only known vendors are extracted and everything else uses the raw (sanitized) description.
                </Text>
              </Box>
              <AppSwitch show={applyAlwaysExtractVendorName} setShow={setApplyAlwaysExtractVendorName} />
            </HStack>
          </Box>

          <Box pt={4}>
            <Heading size="sm">Name Overrides (Exact Match)</Heading>
            <Text color="fg.muted" fontSize="sm">
              Map an exact shown name to a preferred display name. First match wins. These apply regardless of the extraction toggle above.
            </Text>

            <Box pt={3}>
              <Heading size="xs" mb={2}>Expenses (includes Savings)</Heading>
              <VStack align="stretch" gap={2}>
                {expenseNameOverridesLocal.length === 0 ? (
                  <Text fontSize="sm" color="fg.muted">No overrides yet.</Text>
                ) : null}
                {expenseNameOverridesLocal.map((rule, idx) => (
                  <HStack key={`exp-ovr-${idx}`}>
                    <Input
                      value={rule.match ?? ""}
                      onChange={(e) =>
                        setExpenseNameOverridesLocal((prev) => {
                          const next = prev.slice();
                          next[idx] = { ...next[idx], match: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Match (exact)"
                      bg="bg.muted"
                    />
                    <Input
                      value={rule.displayName ?? ""}
                      onChange={(e) =>
                        setExpenseNameOverridesLocal((prev) => {
                          const next = prev.slice();
                          next[idx] = { ...next[idx], displayName: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Display name"
                      bg="bg.muted"
                    />
                    <IconButton
                      aria-label="Remove override"
                      size="sm"
                      variant="outline"
                      onClick={() => setExpenseNameOverridesLocal((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <MdDelete />
                    </IconButton>
                  </HStack>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  alignSelf="flex-start"
                  onClick={() => setExpenseNameOverridesLocal((prev) => prev.concat({ match: "", displayName: "" }))}
                >
                  <MdAdd /> Add expense override
                </Button>
              </VStack>
            </Box>

            <Box pt={4}>
              <Heading size="xs" mb={2}>Income</Heading>
              <VStack align="stretch" gap={2}>
                {incomeNameOverridesLocal.length === 0 ? (
                  <Text fontSize="sm" color="fg.muted">No overrides yet.</Text>
                ) : null}
                {incomeNameOverridesLocal.map((rule, idx) => (
                  <HStack key={`inc-ovr-${idx}`}>
                    <Input
                      value={rule.match ?? ""}
                      onChange={(e) =>
                        setIncomeNameOverridesLocal((prev) => {
                          const next = prev.slice();
                          next[idx] = { ...next[idx], match: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Match (exact)"
                      bg="bg.muted"
                    />
                    <Input
                      value={rule.displayName ?? ""}
                      onChange={(e) =>
                        setIncomeNameOverridesLocal((prev) => {
                          const next = prev.slice();
                          next[idx] = { ...next[idx], displayName: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Display name"
                      bg="bg.muted"
                    />
                    <IconButton
                      aria-label="Remove override"
                      size="sm"
                      variant="outline"
                      onClick={() => setIncomeNameOverridesLocal((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <MdDelete />
                    </IconButton>
                  </HStack>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  alignSelf="flex-start"
                  onClick={() => setIncomeNameOverridesLocal((prev) => prev.concat({ match: "", displayName: "" }))}
                >
                  <MdAdd /> Add income override
                </Button>
              </VStack>
            </Box>

            <HStack pt={4}>
              <Button size="sm" colorScheme="teal" onClick={saveNameOverrides}>
                Save overrides
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setExpenseNameOverridesLocal(expenseNameOverrides ?? []);
                  setIncomeNameOverridesLocal(incomeNameOverrides ?? []);
                }}
              >
                Reset
              </Button>
            </HStack>
          </Box>
        </Box>

        <Box pt={6} w="100%"> {/* Demo */}
          <Heading size="lg">{isDemoIdentity ? "Demo Data" : "Sample data"}</Heading>
          <Text color="fg.muted" fontSize="sm">
            {isDemoIdentity
              ? "Manage demo-marked sample data. These actions only affect data marked as demo."
              : "Your account can start with sample data (marked as demo). You can remove it when desired."}
          </Text>

          {!isDemoIdentity ? (
            <Box pt={3}>
              <Heading size="sm">Remove sample data</Heading>
              <Text color="fg.muted" fontSize="sm">
                This deletes demo-marked sample data and permanently disables future sample-data seeding for this account on this device.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                This cannot be undone from within the app. If you want “temporary demo” data later, you can create your own test entries and
                prefix them with something like “Demo:”.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Note: this also hides the Demo Mode onboarding controls (since sample-data seeding is disabled).
              </Text>

              <HStack pt={2} gap={3} align="center" flexWrap="wrap">
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={() => {
                    setRemoveSampleError(null);
                    setRemoveSampleChecked(false);
                    setIsRemoveSampleOpen(true);
                  }}
                  disabled={removeSampleLoading || seedOptedOut}
                >
                  Remove sample data
                </Button>

                {seedOptedOut ? (
                  <Text fontSize="sm" color="fg.muted">
                    Sample-data seeding is disabled for this user.
                  </Text>
                ) : null}
              </HStack>

              <DialogModal
                title="Remove sample data and disable seeding?"
                body={
                  <VStack align="start" gap={3}>
                    <Text>
                      This will delete all demo-marked sample data in your account. It will also disable future sample-data seeding for this user in this browser.
                    </Text>
                    <Checkbox.Root
                      checked={removeSampleChecked}
                      onCheckedChange={(details) => setRemoveSampleChecked(details.checked === true)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>
                        <Text fontSize="sm">I understand this action is not reversible.</Text>
                      </Checkbox.Label>
                    </Checkbox.Root>

                    {removeSampleError ? (
                      <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" rounded="md" w="100%">
                        <Text fontSize="sm" color="red.800">
                          {removeSampleError}
                        </Text>
                      </Box>
                    ) : null}
                  </VStack>
                }
                open={isRemoveSampleOpen}
                setOpen={setIsRemoveSampleOpen}
                initialFocus="cancel"
                enterKeyAction="cancel"
                acceptLabel="Remove"
                acceptColorPalette="red"
                acceptVariant="solid"
                acceptDisabled={!removeSampleChecked}
                loading={removeSampleLoading}
                cancelLabel="Cancel"
                cancelVariant="outline"
                onAccept={async () => {
                  if (removeSampleLoading) return;
                  setRemoveSampleLoading(true);
                  setRemoveSampleError(null);
                  try {
                    await clearDemoDataOnly();
                    setSeedDemoDisabled(true);
                    setSeedOptedOut(true);
                    // If the user has explicitly disabled sample-data seeding, Demo Mode becomes confusing (no data to drive it).
                    // Ensure it's also disabled so the badge/tour controls don't appear in a no-op state.
                    setDemoModeOptIn(false);
                    clearDemoSessionActive();
                    fireToast("success", "Sample data removed", "Demo-marked sample data was deleted and future seeding is disabled.");
                    setIsRemoveSampleOpen(false);
                  } catch (err) {
                    const msg = typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "Failed to remove sample data.";
                    setRemoveSampleError(msg);
                  } finally {
                    setRemoveSampleLoading(false);
                  }
                }}
                onCancel={() => {
                  // no-op
                }}
              />
            </Box>
          ) : null}

          {isDemoIdentity ? (
            <Box pt={3}>
              <Heading size="sm">Demo tour</Heading>
              <Text color="fg.muted" fontSize="sm">
                If you hid the demo tour, you can re-enable it here.
              </Text>
              <HStack pt={2} gap={3} align="center" flexWrap="wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetDemoTourDisabled();
                    fireToast("success", "Demo tour reset", "The demo tour can be opened again from the Demo Mode badge.");
                  }}
                  disabled={demoActionLoading !== null || !demoTourDisabled}
                >
                  Reset demo tour
                </Button>
                {!demoTourDisabled ? (
                  <Text fontSize="sm" color="fg.muted">
                    Demo tour is currently enabled.
                  </Text>
                ) : null}
              </HStack>
            </Box>
          ) : null}

          {isDemoIdentity ? (
            <>
              <HStack pt={3} gap={3} align="center" flexWrap="wrap">
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={() => {
                    setDemoActionError(null);
                    setIsClearDemoOpen(true);
                  }}
                  disabled={demoActionLoading !== null}
                >
                  Clear demo data
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="orange"
                  onClick={() => {
                    setDemoActionError(null);
                    setIsResetDemoOpen(true);
                  }}
                  disabled={demoActionLoading !== null}
                >
                  Reset demo data
                </Button>
              </HStack>

              <Box pt={4}>
                <Heading size="sm">Add more demo data</Heading>
                <Text color="fg.muted" fontSize="sm">
                  These actions only create demo-marked sample data.
                </Text>
              </Box>

              <DialogModal
                title="Clear demo data?"
                body={
                  <VStack align="start" gap={2}>
                    <Text>
                      This deletes demo-marked sample data only. Non-demo data is preserved.
                    </Text>
                    {demoActionError ? (
                      <Text color="red.600" fontSize="sm">
                        {demoActionError}
                      </Text>
                    ) : null}
                  </VStack>
                }
                open={isClearDemoOpen}
                setOpen={setIsClearDemoOpen}
                initialFocus="cancel"
                enterKeyAction="cancel"
                acceptLabel="Clear"
                acceptColorPalette="red"
                acceptVariant="solid"
                cancelLabel="Cancel"
                cancelVariant="outline"
                loading={demoActionLoading === "clear"}
                disableClose={demoActionLoading !== null}
                onAccept={async () => {
                  if (demoActionLoading) return;
                  setDemoActionLoading("clear");
                  setDemoActionError(null);
                  try {
                    // const res = await clearDemoDataOnly();
                    fireToast(
                      "success",
                      "Demo data cleared",
                      `Deleted demo-marked sample data.` // TODO(P4): add counts to this message if we surface them from the API
                    );
                  } catch (err) {
                    const msg =
                      typeof err === "object" && err !== null && "message" in err
                        ? String((err as { message: unknown }).message)
                        : "Failed to clear demo data.";
                    setDemoActionError(msg);
                    fireToast("error", "Clear failed", msg);
                    throw err;
                  } finally {
                    setDemoActionLoading(null);
                  }
                }}
                onCancel={() => {
                  if (demoActionLoading) return;
                  setDemoActionError(null);
                  setIsClearDemoOpen(false);
                }}
              />

              <DialogModal
                title="Reset demo data?"
                body={
                  <VStack align="start" gap={2}>
                    <Text>
                      This clears demo-marked sample data and re-seeds the original demo dataset. Non-demo data is preserved.
                    </Text>
                    {demoActionError ? (
                      <Text color="red.600" fontSize="sm">
                        {demoActionError}
                      </Text>
                    ) : null}
                  </VStack>
                }
                open={isResetDemoOpen}
                setOpen={setIsResetDemoOpen}
                initialFocus="cancel"
                enterKeyAction="cancel"
                acceptLabel="Reset"
                acceptColorPalette="orange"
                acceptVariant="solid"
                cancelLabel="Cancel"
                cancelVariant="outline"
                loading={demoActionLoading === "reset"}
                disableClose={demoActionLoading !== null}
                onAccept={async () => {
                  if (demoActionLoading) return;
                  setDemoActionLoading("reset");
                  setDemoActionError(null);
                  try {
                    // const res = await resetDemoDataPreservingNonDemo();
                    fireToast(
                      "success",
                      "Demo data reset",
                      `Cleared demo-marked data, then re-seeded demo data.` // TODO(P4): add counts to this message if we surface them from the API
                    );
                  } catch (err) {
                    const msg =
                      typeof err === "object" && err !== null && "message" in err
                        ? String((err as { message: unknown }).message)
                        : "Failed to reset demo data.";
                    setDemoActionError(msg);
                    fireToast("error", "Reset failed", msg);
                    throw err;
                  } finally {
                    setDemoActionLoading(null);
                  }
                }}
                onCancel={() => {
                  if (demoActionLoading) return;
                  setDemoActionError(null);
                  setIsResetDemoOpen(false);
                }}
              />
            </>
          ) : null}
        </Box>

        <Box pt={6} w="100%"> {/* Onboarding */}
          <Heading size="lg">Onboarding</Heading>
          <Text color="fg.muted" fontSize="sm">
            Control the welcome modal and (optionally) enable Demo Mode for this account on this device.
          </Text>

          <Box pt={3}>
            <Heading size="sm">Welcome modal</Heading>
            <Text color="fg.muted" fontSize="sm">
              If you previously chose “Never show again”, you can re-enable the welcome modal here.
            </Text>
            <HStack pt={2} gap={3} align="center" flexWrap="wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  requestOpenWelcomeModal();
                }}
              >
                Open welcome now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearWelcomeModalSeenVersion();
                  fireToast("success", "Welcome re-enabled", "The welcome modal will show again on next login.");
                }}
              >
                Show welcome again
              </Button>
            </HStack>
          </Box>

          {!isDemoIdentity && !seedOptedOut ? (
            <Box pt={4}>
              <Heading size="sm">Demo Mode (optional)</Heading>
              <Text color="fg.muted" fontSize="sm">
                {isDemoSession
                  ? "This is a demo session. Sign out to exit demo mode."
                  : isDemoOptIn
                    ? "Demo Mode is enabled for this account on this device."
                    : "Enable Demo Mode to show the Demo Mode badge and allow the guided tour."}
              </Text>

              <HStack pt={2} gap={3} align="center" flexWrap="wrap">
                {!isDemoSession ? (
                  isDemoOptIn ? (
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="gray"
                      onClick={() => {
                        setDemoModeOptIn(false);
                        clearDemoSessionActive();
                        fireToast("success", "Demo Mode disabled", "You’ve exited Demo Mode for this account on this device.");
                      }}
                    >
                      Exit Demo Mode
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="purple"
                      onClick={() => {
                        setDemoModeOptIn(true);
                        fireToast("success", "Demo Mode enabled", "Demo Mode is now enabled for this account on this device.");
                      }}
                    >
                      Enable Demo Mode
                    </Button>
                  )
                ) : null}

                {isDemo ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (demoTourDisabled) {
                          resetDemoTourDisabled();
                        }
                        openDemoTour();
                      }}
                    >
                      Start demo tour
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetDemoTourDisabled();
                        fireToast("success", "Demo tour reset", "The demo tour can be opened again from the Demo Mode badge.");
                      }}
                      disabled={!demoTourDisabled}
                    >
                      Reset demo tour
                    </Button>
                  </>
                ) : null}
              </HStack>
            </Box>
          ) : null}
        </Box>

        <Box pt={6} w="100%"> {/* Tips */}
          <Heading size="lg">Tips</Heading>
          <Text color="fg.muted" fontSize="sm">
            Tips can be dismissed and are remembered per user.
          </Text>

          <HStack pt={3} gap={3} align="center">
            <Text fontWeight={600}>Reset dismissed tips:</Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                clearUserScopedKeysByPrefix("tip:");
              }}
            >
              Reset Tips
            </Button>
          </HStack>
        </Box>
      </Box>
      <Box p={4} maxW="80%" mx="auto" mt={3} borderWidth={1} borderColor="border" borderRadius="lg" boxShadow="md" bg="bg.panel">
        <AppCollapsible title="⚠️ Warning: Experimental Features Below" mb={6} defaultOpen={false}>
          <Box w={"100%"}>
            <Heading size='md' mb={4}>Import & Staging Settings</Heading>
            <Text color="red.600" mb={6}>
              The settings below are for advanced users and may cause issues if used incorrectly.
              Please proceed with caution and consider backing up your data before making changes.
            </Text>

            <Box mb={6} p={3} borderWidth={1} borderColor="border" borderRadius='md' bg='bg.subtle'>
              <Flex wrap='wrap' gap={2} mb={1}>
                <Badge colorScheme='teal'>Undo {local.importUndoWindowMinutes}m</Badge>
                <Badge colorScheme='purple'>History {local.importHistoryMaxEntries} max</Badge>
                <Badge colorScheme='purple'>History {local.importHistoryMaxAgeDays}d age</Badge>
                <Badge colorScheme='orange'>Auto-expire {local.stagedAutoExpireDays}d</Badge>
              </Flex>
              <Text fontSize='xs' color='fg.muted'>{policySummary}</Text>
            </Box>
            <VStack align='stretch' gap={5} separator={<Separator />}>
              <Field.Root>
                <Field.Label>Undo Window (minutes)</Field.Label>
                <NumberInput.Root
                  value={String(local.importUndoWindowMinutes)}
                  onValueChange={(details) =>
                    onChange("importUndoWindowMinutes", details.value, details.valueAsNumber)
                  }
                >
                  <NumberInput.Input min={1} max={720} />
                </NumberInput.Root>
                <Text fontSize='xs' color='fg.muted'>How long after import sessions can be undone.</Text>
              </Field.Root>
              <Field.Root>
                <Field.Label>Streaming Auto Line Threshold</Field.Label>
                  <NumberInput.Root
                    value={String(local.streamingAutoLineThreshold)}
                    onValueChange={(details) =>
                      onChange("streamingAutoLineThreshold", details.value, details.valueAsNumber)
                    }
                  >
                    <NumberInput.Input min={500} max={200000} step={100} />
                  </NumberInput.Root>
                    <Text fontSize='xs' color='fg.muted'>If a CSV exceeds this number of lines, streaming parser auto-enables.</Text>
              </Field.Root>
              <Field.Root>
                <Field.Label>Streaming Auto Size Threshold (KB)</Field.Label>
                  <NumberInput.Root
                    value={String(Math.round(local.streamingAutoByteThreshold / 1024))}
                    onValueChange={(details) =>
                      onChange(
                        "streamingAutoByteThreshold",
                        details.value,
                        details.valueAsNumber * 1024
                      )
                    }
                  >
                    <NumberInput.Input min={50} max={20480} step={50} />
                  </NumberInput.Root>
                    <Text fontSize='xs' color='fg.muted'>If file size exceeds this value, streaming parser auto-enables.</Text>
              </Field.Root>
              <Field.Root>
                <Field.Label>Import History Max Entries</Field.Label>
                  <NumberInput.Root
                    value={String(local.importHistoryMaxEntries)}
                    onValueChange={(details) =>
                      onChange("importHistoryMaxEntries", details.value, details.valueAsNumber)
                    }
                  >
                    <NumberInput.Input min={5} max={500} />
                  </NumberInput.Root>
                  <Text fontSize='xs' color='gray.500'>Newest sessions kept; older pruned beyond this count.</Text>
              </Field.Root>
              <Field.Root>
                <Field.Label>Import History Max Age (days)</Field.Label>
                  <NumberInput.Root
                    value={String(local.importHistoryMaxAgeDays)}
                    onValueChange={(details) =>
                      onChange("importHistoryMaxAgeDays", details.value, details.valueAsNumber)
                    }
                  >
                    <NumberInput.Input min={1} max={365} />
                  </NumberInput.Root>
                  <Text fontSize='xs' color='gray.500'>Sessions older than this may be pruned.</Text>
              </Field.Root>
              <Field.Root>
                <Field.Label>Auto-Expire Staged Sessions (days)</Field.Label>
                  <NumberInput.Root
                    value={String(local.stagedAutoExpireDays)}
                    onValueChange={(details) =>
                      onChange("stagedAutoExpireDays", details.value, details.valueAsNumber)
                    }
                  >
                    <NumberInput.Input min={1} max={120} />
                  </NumberInput.Root>
                  <Text fontSize='xs' color='gray.500'>Staged transactions auto-applied after this age.</Text>
              </Field.Root>
              <HStack gap={3} flexWrap='wrap'>
                <Button colorScheme='teal' onClick={save} disabled={!hasChanges}>Save</Button>
                <Button variant='outline' onClick={()=> setLocal({
                  importUndoWindowMinutes: importUndoWindowMinutes ?? 30,
                  importHistoryMaxEntries: importHistoryMaxEntries ?? 30,
                  importHistoryMaxAgeDays: importHistoryMaxAgeDays ?? 30,
                  stagedAutoExpireDays: stagedAutoExpireDays ?? 30,
                  streamingAutoLineThreshold: streamingAutoLineThreshold ?? 3000,
                  streamingAutoByteThreshold: streamingAutoByteThreshold ?? 500000,
                })}>Reset</Button>
                <Button size='sm' variant='ghost' onClick={() => { pruneImportHistory(); fireToast('success', 'History pruned', 'Import history has been pruned successfully.'); }}>Prune Now</Button>
                <Button size='sm' variant='ghost' onClick={() => { expireOldStagedTransactions(); fireToast('success', 'Expired staged processed', 'Old staged transactions have been expired successfully.'); }}>Force Expire</Button>
              </HStack>
            </VStack>
            <Box mt={6} p={3} borderWidth={1} borderRadius='md' bg='purple.50'>
              <Heading size='sm' mb={2}>Streaming Auto-Toggle</Heading>
              <Text fontSize='xs' color='gray.700'>{streamingSummary}</Text>
            </Box>
            {import.meta.env.DEV && (
              <Box mt={6} p={3} borderWidth={1} borderRadius='md' bg='gray.50'>
                <Heading size='sm' mb={2}>Developer / Debug</Heading>
                <HStack justify='space-between'>
                  <Text fontSize='sm'>Show Ingestion Benchmark Panel</Text>
                  {/* <Switch size='md' isChecked={showIngestionBenchmark} onChange={(e: React.ChangeEvent<HTMLInputElement>)=> setShowIngestionBenchmark(e.target.checked)} /> */}
                  <AppSwitch show={showIngestionBenchmark} setShow={setShowIngestionBenchmark} />
                </HStack>
                <Text fontSize='xs' mt={2} color='gray.500'>Dev-only synthetic ingestion performance harness. Not persisted.</Text>
              </Box>
            )}
          </Box>
        </AppCollapsible>
      </Box>
      {/*</VStack>*/}
    </Box>
  );
}
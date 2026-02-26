import { Box, Button, Checkbox, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "../../hooks/useDemoMode";
import { useDemoTourStore } from "../../store/demoTourStore";
import { DialogModal } from "../ui/DialogModal";

export function DemoTourModal({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate();
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  const { isDemo } = useDemoMode(signedIn);

  const openRequested = useDemoTourStore((s) => s.open);
  const setOpenRequested = useDemoTourStore((s) => s.setOpen);
  const disabled = useDemoTourStore((s) => s.disabled);
  const refreshDisabledFromStorage = useDemoTourStore((s) => s.refreshDisabledFromStorage);
  const setDisabled = useDemoTourStore((s) => s.setDisabled);

  useEffect(() => {
    if (!signedIn) return;
    refreshDisabledFromStorage();
  }, [refreshDisabledFromStorage, signedIn]);

  const shouldOffer = useMemo(() => {
    if (!signedIn) return false;
    if (!isDemo) return false;
    return !disabled;
  }, [disabled, isDemo, signedIn]);

  const open = (shouldOffer && !dismissedThisSession) || (shouldOffer && openRequested);
  const setOpen = (next: boolean) => {
    // Only close from the explicit Accept action.
    // Ignore overlay clicks / escape / close triggers.
    if (!next) return;
    setOpenRequested(true);
  };

  if (!signedIn) return null;
  if (!shouldOffer) return null;

  return (
    <DialogModal
      title="Demo quick tour"
      body={
        <VStack align="start" gap={3}>
          <Text color="gray.700">
            A short walkthrough you can use for a showcase. Budgeteer is planning-first: make a plan, import
            transactions safely, then track plan vs actual.
          </Text>

          <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" rounded="md" p={3} w="100%">
            <Text fontSize="sm" color="orange.900" fontWeight={700}>
              Demo account note
            </Text>
            <Text fontSize="sm" color="orange.900">
              Demo data is meant for temporary evaluation. Use Settings → Demo Data to reset the demo experience back
              to square one anytime.
            </Text>
          </Box>

          <Box bg="gray.50" borderWidth="1px" borderColor="gray.200" rounded="md" p={3} w="100%">
            <VStack align="start" gap={2}>
              <Text fontWeight="700">Recommended steps</Text>

              <VStack align="start" gap={3} w="100%">
                <Box w="100%">
                  <Text fontSize="sm" color="gray.800" fontWeight={700}>
                    1) Planner = build a month plan
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    Start in Planner to model income, expenses, and savings using scenarios. The goal is to create a
                    baseline plan for the selected month.
                  </Text>
                  <Button mt={2} size="sm" variant="outline" onClick={() => navigate("/planner")}>
                    Go to Planner
                  </Button>
                </Box>

                <Box w="100%">
                  <Text fontSize="sm" color="gray.800" fontWeight={700}>
                    2) Accounts + Imports = ingest safely
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    Import a CSV and review the staged results. Budgeteer is designed to be idempotent: re-importing the
                    same file should not create duplicates.
                  </Text>
                  <HStack mt={2} gap={2} flexWrap="wrap">
                    <Button size="sm" variant="outline" onClick={() => navigate("/accounts")}>
                      Go to Accounts
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/imports")}>
                      Go to Import History
                    </Button>
                  </HStack>
                </Box>

                <Box w="100%">
                  <Text fontSize="sm" color="gray.800" fontWeight={700}>
                    3) Apply/Undo = safe experimentation
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    After importing, apply a session to push staged transactions into monthly actuals. If you make a
                    mistake, Undo is time-limited but available (and session-scoped).
                  </Text>
                  <Button mt={2} size="sm" variant="outline" onClick={() => navigate("/imports")}>
                    Go to Import History
                  </Button>
                </Box>

                <Box w="100%">
                  <Text fontSize="sm" color="gray.800" fontWeight={700}>
                    4) Tracker = planned vs actual
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    Open Tracker for the month you planned/imported. The monthly summary is designed to make it obvious
                    whether you’re ahead or behind plan.
                  </Text>
                  <Button mt={2} size="sm" variant="outline" onClick={() => navigate("/tracker")}>
                    Go to Tracker
                  </Button>
                </Box>

                <Box w="100%">
                  <Text fontSize="sm" color="gray.800" fontWeight={700}>
                    5) Settings = demo reset tools
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    Settings includes import policy knobs and demo tools.
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    If you want to start the demo over, use Reset demo data to return to the initial seeded dataset.
                  </Text>
                  <Button mt={2} size="sm" variant="outline" onClick={() => navigate("/settings")}>
                    Go to Settings
                  </Button>
                </Box>
              </VStack>
            </VStack>
          </Box>

          <HStack gap={2} w="100%" justify="space-between" align="center">
            <Checkbox.Root
              checked={dontShowAgainChecked}
              onCheckedChange={(details) => {
                setDontShowAgainChecked(details.checked === true);
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text fontSize="sm">Don’t display again</Text>
              </Checkbox.Label>
            </Checkbox.Root>

            <Text fontSize="xs" color="gray.600">
              You can re-enable this in Settings.
            </Text>
          </HStack>
        </VStack>
      }
      open={open}
      setOpen={setOpen}
      acceptLabel="Close"
      acceptColorPalette="purple"
      acceptVariant="solid"
      hideCancelButton
      hideCloseButton
      disableClose
      onAccept={() => {
        if (dontShowAgainChecked) {
          setDisabled(true);
        }
        setOpenRequested(false);
        setDismissedThisSession(true);
      }}
      onCancel={() => {
        // no-op (modal only closes via Accept)
      }}
      closeOnAccept
    />
  );
}

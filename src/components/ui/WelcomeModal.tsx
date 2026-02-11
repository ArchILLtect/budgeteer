import { Box, Checkbox, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DialogModal } from "./DialogModal";
//import { useDemoMode } from "../../hooks/useDemoMode";
//import { useDemoTourStore } from "../../store/demoTourStore";
import {
  getWelcomeModalSeenVersion,
  onWelcomeModalPrefChange,
  onWelcomeModalOpenRequest,
  setWelcomeModalSeenVersion,
  type WelcomeModalOpenReason,
} from "../../services/welcomeModalPreference";
//import { setDemoModeOptIn } from "../../services/demoModeOptIn";
import {
  getWelcomeModalLastShownAtMs,
  isWelcomeModalReminderDue,
  setWelcomeModalLastShownAtMs,
  WELCOME_MODAL_REMIND_INTERVAL_MS,
} from "../../services/welcomeModalSchedule";

const WELCOME_MODAL_VERSION = 1 as const;

const WHATS_NEW: Array<{ title: string; body: string }> = [
  {
    title: "Sample data vs Demo Mode",
    body: "New accounts can be seeded with sample data without being treated as a demo account.",
  },
  {
    title: "Graduation flow",
    body: "Settings now includes a safe ‘Remove sample data’ action that only deletes demo-marked items and can disable future seeding for this user on this device.",
  },
  {
    title: "Profile improvements",
    body: "Profile now shows your account creation date.",
  },
];

export function WelcomeModal({ signedIn }: { signedIn: boolean }) {
  //const { isDemo, isDemoIdentity } = useDemoMode(signedIn);
  //const openDemoTour = useDemoTourStore((s) => s.openTour);
  //const demoTourDisabled = useDemoTourStore((s) => s.disabled);
  //const resetDemoTourDisabled = useDemoTourStore((s) => s.resetDisabled);

  const [neverShowAgainChecked, setNeverShowAgainChecked] = useState(false);
  const [seenVersion, setSeenVersion] = useState(() => getWelcomeModalSeenVersion());
  const [openRequested, setOpenRequested] = useState(false);
  const [openReason, setOpenReason] = useState<WelcomeModalOpenReason>("manual");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const t = window.setTimeout(() => {
      if (cancelled) return;

      if (!signedIn) {
        setNeverShowAgainChecked(false);
        setSeenVersion(0);
        setOpenRequested(false);
        setOpenReason("manual");
        return;
      }

      setSeenVersion(getWelcomeModalSeenVersion());
    }, 0);

    const unsub = signedIn
      ? onWelcomeModalPrefChange(() => {
          setSeenVersion(getWelcomeModalSeenVersion());
        })
      : () => {};

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      unsub();
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    return onWelcomeModalOpenRequest((reason) => {
      setOpenReason(reason);
      setOpenRequested(true);
    });
  }, [signedIn]);

  const disabledByPreference = useMemo(() => {
    return seenVersion >= WELCOME_MODAL_VERSION;
  }, [seenVersion]);

  const open = useMemo(() => {
    if (!signedIn) return false;

    // Never show again applies to auto-opens (login/reminder), but manual opens should still work.
    if (disabledByPreference && openReason !== "manual") return false;

    return openRequested;
  }, [disabledByPreference, openReason, openRequested, signedIn]);

  // Auto-open reminder: once per 24h while still signed in.
  useEffect(() => {
    if (!signedIn) return;
    if (disabledByPreference) return;

    const lastShownAtMs = getWelcomeModalLastShownAtMs();
    const now = Date.now();
    const nextAt = lastShownAtMs ? lastShownAtMs + WELCOME_MODAL_REMIND_INTERVAL_MS : 0;
    if (!nextAt) return;

    const delay = Math.max(0, nextAt - now);
    const t = window.setTimeout(() => {
      // If the user is still signed in and the reminder is due, request an auto-open.
      if (!isWelcomeModalReminderDue()) return;
      setOpenReason("reminder");
      setOpenRequested(true);
    }, delay);

    return () => {
      window.clearTimeout(t);
    };
  }, [disabledByPreference, open, signedIn]);

  // Mark as "shown" when it transitions to open (so refresh won't re-trigger it).
  useEffect(() => {
    if (!wasOpenRef.current && open) {
      const now = Date.now();
      setWelcomeModalLastShownAtMs(now);
    }
    wasOpenRef.current = open;
  }, [open]);

  /*
  const startDemoTour = () => {
    if (demoTourDisabled) {
      resetDemoTourDisabled();
    }
    openDemoTour();
  };*/

  return (
    <DialogModal
      title="Welcome to Budgeteer"
      body={
        <VStack align="start" gap={4}>
          <Text color="gray.700">
            Welcome! Here’s a quick orientation and a summary of recent changes.
          </Text>

          <Box w="100%" bg="gray.50" borderWidth="1px" borderColor="gray.200" rounded="md" p={3}>
            <Heading size="sm" mb={2}>
              What’s new
            </Heading>
            <VStack align="start" gap={2}>
              {WHATS_NEW.map((item) => (
                <Box key={item.title}>
                  <Text fontSize="sm" fontWeight={700}>
                    {item.title}
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    {item.body}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>

          {/*
          <Box w="100%" bg={isDemo ? "orange.50" : "blue.50"} borderWidth="1px" borderColor={isDemo ? "orange.200" : "blue.200"} rounded="md" p={3}>
            <Heading size="sm" mb={1}>
              Demo tour
            </Heading>

            <Text fontSize="sm" color="gray.700" mb={3}>
              {isDemo
                ? "You can start the guided tour any time."
                : "Want the guided demo tour and demo-mode UI? You can opt in for this account on this device."}
            </Text>

            <HStack gap={2} flexWrap="wrap">
              {!isDemo ? (
                <Button
                  size="sm"
                  colorPalette="purple"
                  onClick={() => {
                    setDemoModeOptIn(true);
                    startDemoTour();
                  }}
                >
                  Enable Demo Mode + Start tour
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={startDemoTour}>
                  Start tour
                </Button>
              )}

              {isDemoIdentity ? (
                <Text fontSize="xs" color="gray.600">
                  Demo identity detected (Cognito group).
                </Text>
              ) : null}
            </HStack>

            {demoTourDisabled ? (
              <Text fontSize="xs" color="gray.600" mt={2}>
                Tour is currently disabled. Starting the tour will re-enable it.
              </Text>
            ) : null}
          </Box>*/}

          <Checkbox.Root
            checked={neverShowAgainChecked}
            onCheckedChange={(details) => setNeverShowAgainChecked(details.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              <Text fontSize="sm">Never show this again</Text>
            </Checkbox.Label>
          </Checkbox.Root>

          <Text fontSize="xs" color="gray.600">
            You can re-enable this later in Settings.
          </Text>
        </VStack>
      }
      open={open}
      setOpen={(next) => {
        // close-only via button
        if (!next) return;
      }}
      hideCancelButton
      hideCloseButton
      disableClose
      acceptLabel="Close"
      acceptColorPalette="blue"
      acceptVariant="solid"
      onAccept={() => {
        if (neverShowAgainChecked) {
          setWelcomeModalSeenVersion(WELCOME_MODAL_VERSION);
        }
        setOpenRequested(false);
        setOpenReason("manual");
      }}
      onCancel={() => {
        // no-op (close is the only action)
      }}
    />
  );
}

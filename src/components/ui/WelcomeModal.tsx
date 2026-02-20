import { Box, Checkbox, Heading, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DialogModal } from "./DialogModal";
import { useDemoMode } from "../../hooks/useDemoMode";
import { useDemoTourStore } from "../../store/demoTourStore";
import {
  getWelcomeModalSeenVersion,
  onWelcomeModalPrefChange,
  onWelcomeModalOpenRequest,
  setWelcomeModalSeenVersion,
  type WelcomeModalOpenReason,
} from "../../services/welcomeModalPreference";
import { shouldShowWelcomeModal, WELCOME_MODAL_VERSION } from "./welcomeModalLogic";
import { setDemoModeOptIn } from "../../services/demoModeOptIn";
import {
  getWelcomeModalLastShownAtMs,
  isWelcomeModalReminderDue,
  setWelcomeModalLastShownAtMs,
  WELCOME_MODAL_REMIND_INTERVAL_MS,
} from "../../services/welcomeModalSchedule";

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

export function WelcomeModal({ signedIn, authLoading }: { signedIn: boolean; authLoading?: boolean }) {
  const { isDemo, isDemoIdentity } = useDemoMode(signedIn);
  const openDemoTour = useDemoTourStore((s) => s.openTour);
  const demoTourDisabled = useDemoTourStore((s) => s.disabled);
  const resetDemoTourDisabled = useDemoTourStore((s) => s.resetDisabled);
  const [neverShowAgainChecked, setNeverShowAgainChecked] = useState(false);
  const [seenVersion, setSeenVersion] = useState(() => getWelcomeModalSeenVersion());
  const [openRequested, setOpenRequested] = useState(false);
  const [openReason, setOpenReason] = useState<WelcomeModalOpenReason>("manual");
  const wasOpenRef = useRef(false);
  const prevSignedInRef = useRef(false);

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

      const nextSeen = getWelcomeModalSeenVersion();
      setSeenVersion(nextSeen);
      // Reflect the persisted preference in the checkbox.
      setNeverShowAgainChecked(nextSeen >= WELCOME_MODAL_VERSION);
    }, 0);

    const unsub = signedIn
      ? onWelcomeModalPrefChange(() => {
          const nextSeen = getWelcomeModalSeenVersion();
          setSeenVersion(nextSeen);
          setNeverShowAgainChecked(nextSeen >= WELCOME_MODAL_VERSION);
        })
      : () => {};

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      unsub();
    };
  }, [signedIn]);

  // Open on login (but not on refresh): detect a signed-out -> signed-in transition.
  useEffect(() => {
    const prevSignedIn = prevSignedInRef.current;
    prevSignedInRef.current = signedIn;

    if (authLoading) return;
    if (!signedIn) return;
    if (prevSignedIn) return;

    // Read from storage immediately so we don't briefly open before state sync.
    const nextSeen = getWelcomeModalSeenVersion();
    setSeenVersion(nextSeen);
    setNeverShowAgainChecked(nextSeen >= WELCOME_MODAL_VERSION);

    if (nextSeen >= WELCOME_MODAL_VERSION) return;

    setOpenReason("login");
    setOpenRequested(true);
  }, [authLoading, signedIn]);

  useEffect(() => {
    // Subscribe even while signed-out/loading so we don't miss the sign-in event.
    // We'll gate actual opening via the `open` computed state.
    return onWelcomeModalOpenRequest((reason) => {
      setOpenReason(reason);
      setOpenRequested(true);
    });
  }, []);

  const disabledByPreference = useMemo(() => {
    return seenVersion >= WELCOME_MODAL_VERSION;
  }, [seenVersion]);

  const open = useMemo(() => {
    return shouldShowWelcomeModal({
      signedIn,
      authLoading,
      disabledByPreference,
      openRequested,
      openReason,
    });
  }, [authLoading, disabledByPreference, openReason, openRequested, signedIn]);

  // Auto-open reminder: once per 24h while still signed in.
  useEffect(() => {
    if (!signedIn) return;
    if (authLoading) return;
    if (disabledByPreference) return;

    const lastShownAtMs = getWelcomeModalLastShownAtMs();
    const now = Date.now();
    const nextAt = lastShownAtMs ? lastShownAtMs + WELCOME_MODAL_REMIND_INTERVAL_MS : 0;
    if (!nextAt) return;

    // Important: don't auto-open immediately on a fresh page load/refresh even if overdue.
    // Only schedule reminders that will become due while the session is still open.
    if (nextAt <= now) return;

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
  }, [authLoading, disabledByPreference, open, signedIn]);

  // Mark as "shown" when it transitions to open (so refresh won't re-trigger it).
  useEffect(() => {
    if (!wasOpenRef.current && open) {
      const now = Date.now();
      setWelcomeModalLastShownAtMs(now);
      // Sync the checkbox to the saved preference when opening.
      setNeverShowAgainChecked(getWelcomeModalSeenVersion() >= WELCOME_MODAL_VERSION);
    }
    wasOpenRef.current = open;
  }, [open]);

  const startDemoTour = () => {
    if (demoTourDisabled) {
      resetDemoTourDisabled();
    }
    openDemoTour();
  };

  return (
    <DialogModal
      title="Welcome to Budgeteer"
      body={
        <VStack align="start" gap={4}>
          <Text color="fg.muted">
            Welcome! Here’s a quick orientation and a summary of recent changes.
          </Text>

          <Box w="100%" bg="bg.subtle" borderWidth="1px" borderColor="border" rounded="md" p={3}>
            <Heading size="sm" mb={2}>
              What’s new
            </Heading>
            <VStack align="start" gap={2}>
              {WHATS_NEW.map((item) => (
                <Box key={item.title}>
                  <Text fontSize="sm" fontWeight={700}>
                    {item.title}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {item.body}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>

          <Box
            w="100%"
            bg={isDemo ? { base: "orange.100", _dark: "orange.900" } : { base: "blue.100", _dark: "blue.900" }}
            borderColor={isDemo ? { base: "orange.200", _dark: "orange.300" } : { base: "blue.200", _dark: "blue.300" }}
            borderWidth="1px"
            rounded="md"
            p={3}
          >
            <Heading size="sm" mb={1} color={isDemo ? { base: "orange.800", _dark: "orange.200" } : { base: "blue.800", _dark: "blue.200" }}>
              Demo tour
            </Heading>

            <Text fontSize="sm" color="fg.muted" mb={3}>
              {isDemo
                ? "You can start the guided tour at your leisure."
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
                <Text fontSize="xs" color="fg.muted">
                  Demo identity detected (Cognito group).
                </Text>
              ) : null}
            </HStack>

            {demoTourDisabled ? (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                Tour is currently disabled. Starting the tour will re-enable it.
              </Text>
            ) : null}
          </Box>

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

          <Text fontSize="xs" color="fg.muted">
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

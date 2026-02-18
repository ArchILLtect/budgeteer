import { useMemo, useState } from "react";
import { Badge, Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router-dom";
import { signIn } from "aws-amplify/auth";
import { createDemoCredentials } from "../services/demoAuthService";
import { clearDemoSessionActive, setDemoSessionActive } from "../services/demoSession";
import { Tip } from "../components/ui/Tip";
import { DemoConfirmDialog } from "../components/ui/DemoConfirmDialog";
import { VisuallyHidden } from "@chakra-ui/react";
import { BudgeteerLogo } from "../components/icons/BudgeteerLogo";
import homeBannerSvg from "../assets/home-banner.svg?raw";
import { SanitizedSvg } from "../components/ui/SanitizedSvg";

function sanitizeRedirect(raw: string | null): string {
  if (!raw) return "/planner";
  if (!raw.startsWith("/")) return "/planner";
  if (raw.startsWith("//")) return "/planner";
  if (raw.includes("://")) return "/planner";
  return raw;
}

export function HomePage({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeRedirect(params.get("redirect"));
  }, [location.search]);

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const onTryDemo = async () => {
    if (demoLoading) return;

    setDemoLoading(true);
    setDemoError(null);

    try {
      const creds = await createDemoCredentials();

      // Gotcha guardrail: do not rely on `cognito:groups` being present on the first token.
      // Treat this session as demo based on the fact it was created through `/auth/demo`.
      setDemoSessionActive();

      await signIn({ username: creds.username, password: creds.password });

      navigate(redirectTarget || "/planner", { replace: true });
    } catch (err) {
      // If something failed after we marked the session as demo, clear it to avoid confusing UX.
      clearDemoSessionActive();
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to create demo account.";
      setDemoError(message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <VStack align="stretch" gap={6} minH="100%" p={4}>
      <Box
        p={8}
        bg="bg.panel"
        rounded="md"
        boxShadow="sm"
        borderWidth="1px"
        borderColor="border"
      >
        <VStack align="start" gap={4}>
          <Box
            w="full"
            h={{ base: "120px", md: "140px" }}
            rounded="lg"
            borderWidth="1px"
            borderColor="border"
            overflow="hidden"
          >
            <SanitizedSvg
              svg={homeBannerSvg}
              w="full"
              h={{ base: "120px", md: "140px" }}
              rounded="lg"
              borderWidth="1px"
              borderColor="border"
              overflow="hidden"
            />
          </Box>

          <HStack gap={3} align="center">
            <Badge colorPalette="purple" variant="solid">
              Portfolio build
            </Badge>
            <Badge variant="outline">Planner-first</Badge>
            <Badge variant="outline">CSV imports</Badge>
            <Badge variant="outline">Stage / Apply / Undo</Badge>
          </HStack>

          <Box aria-hidden="true">
            <BudgeteerLogo />
          </Box>

          <VisuallyHidden>
            <h1>Budgeteer</h1>
          </VisuallyHidden>
          <Heading size={{ base: "lg", md: "xl" }}>
            Plan your month. Import safely. Track honestly.
          </Heading>
          <Tip storageKey="tip:home-imports" title="Tip">
            Imports are previewed and staged first, so you can apply them (or undo them) safely.
          </Tip>
          <Text color="fg.muted" fontSize="lg" maxW="2xl">
            Budgeteer is a privacy-aware budgeting app built around a planning-first workflow and deterministic CSV imports.
            No bank credential linking—just user-controlled data, clear rules, and explainable totals.
          </Text>

          <HStack gap={3} pt={2} flexWrap="wrap">
            {!signedIn ? (
              <Button
                size="lg"
                colorPalette="purple"
                onClick={() => {
                  setDemoError(null);
                  setDemoDialogOpen(true);
                }}
                loading={demoLoading}
                disabled={demoLoading}
              >
                {demoLoading ? "Creating demo account…" : "Try Demo (No Signup)"}
              </Button>
            ) : null}

            <Button
              size="lg"
              colorPalette="purple"
              variant={signedIn ? "solid" : "outline"}
              onClick={() => navigate("/planner")}
            >
              Open Planner
            </Button>

            <Button size="lg" variant="outline" onClick={() => navigate("/accounts")}>
              Import CSV
            </Button>

            {!signedIn ? (
              <Button size="lg" variant="ghost" onClick={() => navigate("/login")}>
                Sign in / Create account
              </Button>
            ) : null}

            <Button size="lg" variant="ghost" onClick={() => navigate("/about")}>
              About
            </Button>
          </HStack>

          {!signedIn ? (
            <Box pt={2} color="fg.muted">
              {demoError ? (
                <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" rounded="md" mb={3}>
                  <Text fontWeight="600" color="red.800">
                    Demo sign-in failed
                  </Text>
                  <Text fontSize="sm" color="red.700">
                    {demoError}
                  </Text>
                </Box>
              ) : null}

              <Text fontSize="sm">
                Demo mode: one click creates a temporary demo account, signs you in, and seeds sample data.
              </Text>
              <Text fontSize="sm">
                No signup. No email. Takes ~5 seconds.
              </Text>
              <Text fontSize="sm">
                Local state is scoped per user to prevent cross-account mixing on shared browsers.
              </Text>
            </Box>
          ) : null}
        </VStack>
      </Box>

      {!signedIn ? (
        <DemoConfirmDialog
          open={demoDialogOpen}
          setOpen={setDemoDialogOpen}
          loading={demoLoading}
          error={demoError}
          onConfirm={async () => {
            await onTryDemo();
          }}
        />
      ) : null}

      <HStack gap={4} align="stretch" flexWrap="wrap">
        <Box flex="1" minW="280px" p={5} bg="bg.panel" rounded="md" boxShadow="sm" borderWidth="1px" borderColor="border">
          <Heading size="md" mb={2}>
            Planning-first
          </Heading>
          <Text color="fg.muted">
            Build scenarios, model income and expenses, and keep the math explainable.
          </Text>
        </Box>

        <Box flex="1" minW="280px" p={5} bg="bg.panel" rounded="md" boxShadow="sm" borderWidth="1px" borderColor="border">
          <Heading size="md" mb={2}>
            Safe imports
          </Heading>
          <Text color="fg.muted">
            Preview first, then stage transactions so apply/undo is deliberate and reversible.
          </Text>
        </Box>

        <Box flex="1" minW="280px" p={5} bg="bg.panel" rounded="md" boxShadow="sm" borderWidth="1px" borderColor="border">
          <Heading size="md" mb={2}>
            Deterministic ingestion
          </Heading>
          <Text color="fg.muted">
            Strong transaction keys make re-imports idempotent and duplicates explainable.
          </Text>
        </Box>

        <Box flex="1" minW="280px" p={5} bg="bg.panel" rounded="md" boxShadow="sm" borderWidth="1px" borderColor="border">
          <Heading size="md" mb={2}>
            Privacy-aware by design
          </Heading>
          <Text color="fg.muted">
            No bank credential scraping. Import only what you control, and keep storage user-scoped.
          </Text>
        </Box>
      </HStack>
    </VStack>
  );
}

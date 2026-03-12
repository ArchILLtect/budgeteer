import { Authenticator, ThemeProvider } from "@aws-amplify/ui-react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signIn } from "aws-amplify/auth";
import { BasicSpinner } from "../components/ui/BasicSpinner";
import { Tip } from "../components/ui/Tip";
import { useDefaultLandingRoute } from "../store/localSettingsStore";
import { sanitizeRedirectPath } from "../routes/redirectUtils";
import { DemoConfirmDialog } from "../components/demo-mode/DemoConfirmDialog";
import { createDemoCredentials } from "../services/demoAuthService";
import { clearDemoSessionActive, setDemoSessionActive } from "../services/demoSession";

export function LoginPage({ signedIn, authLoading }: { signedIn: boolean; authLoading: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultLandingRoute = useDefaultLandingRoute();

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeRedirectPath(params.get("redirect"), defaultLandingRoute, { disallowLogin: true });
  }, [defaultLandingRoute, location.search]);

  useEffect(() => {
    if (!signedIn) return;
    navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget, signedIn]);

  const onTryDemo = async () => {
    if (demoLoading) return;

    setDemoLoading(true);
    setDemoError(null);

    try {
      const creds = await createDemoCredentials();

      // Treat this session as demo based on the fact it was created through `/auth/demo`.
      setDemoSessionActive();

      await signIn({ username: creds.username, password: creds.password });
      navigate(redirectTarget, { replace: true });
    } catch (err) {
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

  if (authLoading) return <BasicSpinner />;

  return (
    <VStack align="start" gap={4} minH="100%" p={4} bg="bg" rounded="md" boxShadow="sm" w="100%">
      <VStack p={4} align="start" bg="bg.panel" borderWidth="1px" borderColor="border" rounded="md" boxShadow="sm" w="100%" h="87.5vh" gap={3}>
        <Heading size="2xl">Login</Heading>

        <Tip storageKey="tip:login-redirect" title="Tip">
          If you were sent here from a shared link, just sign in — you’ll be redirected back to the page you were trying
          to open.
        </Tip>

        {!signedIn ? (
          <Box
            p={3}
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border"
            rounded="md"
            w="100%"
          >
            <Text fontSize="xl" fontWeight="700" mb={3}>Demo Mode (No Signup)</Text>
            <Text fontSize="sm">
              Demo mode creates a temporary demo account, signs you in, and seeds sample data.
            </Text>
            <Text fontSize="sm">
              No signup. No email. Takes ~5 seconds.
            </Text>
            <Text fontSize="sm" mb={3}>
              Local state is scoped per user to prevent cross-account mixing on shared browsers.
            </Text>

            <Button
              size="sm"
              colorPalette="purple"
              onClick={() => setDemoDialogOpen(true)}
              disabled={demoLoading}
            >
              {demoLoading ? "Creating demo account…" : "Try Demo"}
            </Button>

            {demoError ? (
              <Box mt={3} p={3} bg="red.50" borderWidth="1px" borderColor="red.200" rounded="md" w="100%">
                <Text fontWeight="600" color="red.800">
                  Demo sign-in failed
                </Text>
                <Text fontSize="sm" color="red.700">
                  {demoError}
                </Text>
              </Box>
            ) : null}
          </Box>
        ) : null}

        <VStack justifyContent="center" align="center" h="90%" w="100%">
          {signedIn ? (
            <VStack align="start" gap={2} w="100%">
              <Text>You’re already signed in.</Text>
              <Button colorPalette="green" onClick={() => navigate(redirectTarget)}>
                Continue
              </Button>
            </VStack>
          ) : (
            <ThemeProvider>
              <Authenticator />
            </ThemeProvider>
          )}
        </VStack>
      </VStack>

      {!signedIn ? (
        <Box p={3} bg="bg.subtle" borderWidth="1px" borderColor="border" rounded="md" w="100%">
          <Text fontSize="sm" color="fg.muted">
            New here? You can try out the app with a temporary demo account — no signup required.
          </Text>
        </Box>
      ) : null}

      {!signedIn ? (
        <DemoConfirmDialog
          open={demoDialogOpen}
          setOpen={setDemoDialogOpen}
          loading={demoLoading}
          error={demoError}
          onConfirm={onTryDemo}
        />
      ) : null}
    </VStack>
  );
}

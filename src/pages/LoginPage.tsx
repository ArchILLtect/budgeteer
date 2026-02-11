import { Authenticator, ThemeProvider } from "@aws-amplify/ui-react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BasicSpinner } from "../components/ui/BasicSpinner";
import { Tip } from "../components/ui/Tip";
import { useDefaultLandingRoute } from "../store/localSettingsStore";
import { sanitizeRedirectPath } from "../routes/redirectUtils";

export function LoginPage({ signedIn, authLoading }: { signedIn: boolean; authLoading: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultLandingRoute = useDefaultLandingRoute();

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeRedirectPath(params.get("redirect"), defaultLandingRoute, { disallowLogin: true });
  }, [defaultLandingRoute, location.search]);

  const intent = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("intent");
  }, [location.search]);

  useEffect(() => {
    if (!signedIn) return;
    navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget, signedIn]);

  if (authLoading) return <BasicSpinner />;

  return (
    <VStack align="start" gap={4} minH="100%" p={4} bg="white" rounded="md" boxShadow="sm" w="100%">
      <VStack p={4} align="start" bg="gray.50" rounded="md" boxShadow="sm" w="100%" h="87.5vh" gap={3}>
        <Heading size="2xl">Login</Heading>

        <Tip storageKey="tip:login-redirect" title="Tip">
          If you were sent here from a shared link, just sign in — you’ll be redirected back to the page you were trying
          to open.
        </Tip>

        {!signedIn ? (
          <Box
            p={3}
            bg={intent === "demo" ? "purple.50" : "gray.50"}
            borderWidth="1px"
            borderColor={intent === "demo" ? "purple.200" : "gray.200"}
            rounded="md"
            w="100%"
          >
            <Text fontSize="xl" fontWeight="700" mb={3}>Try Demo (No Signup)</Text>
            <Text fontSize="sm">
              Demo mode creates a temporary demo account, signs you in, and seeds sample data.
            </Text>
            <Text fontSize="sm">
              No signup. No email. Takes ~5 seconds.
            </Text>
            <Text fontSize="sm" mb={3}>
              Local state is scoped per user to prevent cross-account mixing on shared browsers.
            </Text>
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
        <Box p={3} bg="yellow.50" borderWidth="1px" borderColor="yellow.200" rounded="md" w="100%">
          <Text fontSize="sm" color="yellow.800">
            New here? You can try out the app with a temporary demo account — no signup required.
          </Text>
        </Box>
      ) : null}
    </VStack>
  );
}

import { useEffect, useState } from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { getCurrentUser } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";


type LogLine = { at: string; msg: string; data?: unknown };

export function GraphQLSmokeTest() {

  const [log, setLog] = useState<LogLine[]>([]);

  const pushLog = (msg: string, data?: unknown) =>
    setLog((prev) => [{ at: new Date().toLocaleTimeString(), msg, data }, ...prev]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        pushLog("Signed in user detected ✅", user);
      } catch (e) {
        pushLog("No signed in user ❌ (sign in first)", e);
      }
    })();
  }, []);

  async function fetchAndLogAuthSession() {
    const s = await fetchAuthSession({ forceRefresh: true });
    console.log(s.tokens?.idToken?.payload);
  }

  return (
    <VStack align="start" gap={4} p={4} bg="bg" rounded="md" boxShadow="sm">
      <Heading size="md">GraphQL Smoke Test</Heading>
      <Button
        variant={"outline"}
        onClick={fetchAndLogAuthSession}
        colorPalette="blue"
      >Check status</Button>
      <Text color="fg.muted">
        Quick end-to-end checks for Cognito + AppSync + @model/@auth(owner).
      </Text>

      <Box w="100%">
        <Heading size="sm" mb={2}>
          Log
        </Heading>
        <VStack align="stretch" gap={2} bg="bg.panel" p={3} rounded="md" borderWidth="1px" borderColor="border">
          {log.map((l, idx) => (
            <Box key={idx} borderWidth="1px" rounded="md" p={2}>
              <Text fontSize="sm" color="fg.muted">
                {l.at}
              </Text>
              <Text fontWeight="600">{l.msg}</Text>
              {l.data !== undefined ? (
                <Box mt={2} maxH="220px" overflow="auto" bg="bg.subtle" p={2} rounded="md">
                  <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(l.data, null, 2)}</pre>
                </Box>
              ) : null}
            </Box>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
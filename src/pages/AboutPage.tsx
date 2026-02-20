import { Badge, Box, Button, Heading, HStack, Text, VStack, Image } from "@chakra-ui/react";

export function AboutPage() {
  return (
    <VStack align="stretch" gap={6} minH="100%" p={4} rounded="md" boxShadow="sm" bg="bg">
      <VStack align="start" gap={2}>
        <Heading size="2xl">About Budgeteer</Heading>
        <Text color="fg.muted">
          Budgeteer is a privacy-aware personal finance app built for planning-first budgeting, safe CSV imports, and
          clear monthly tracking.
        </Text>
      </VStack>

      <Box>
        <Heading size="xl" mb={2}>
          Mission
        </Heading>
        <Text color="fg.muted">
          Make budgeting feel intentional and understandable: plan ahead with scenarios, import transactions safely
          (preview → stage → apply/undo), and keep the math deterministic and explainable.
        </Text>
      </Box>

      <Box>
        <Heading size="xl" mb={2}>
          App features
        </Heading>
        <VStack align="start" gap={2} color="fg.muted">
          <Text>• Planner: scenarios for income, expenses, and savings allocation.</Text>
          <Text>• Tracker: planned vs actual by month, with honest totals and clear comparisons.</Text>
          <Text>• Accounts: CSV import with preview, staging, apply-to-budget, and a time-window undo.</Text>
          <Text>• Deterministic ingestion: a strong transaction key makes re-imports idempotent.</Text>
          <Text>• Local-first by default: persisted client state is scoped per user to prevent cross-account mixing.</Text>
          <Text>• Privacy-aware posture: no bank credential linking; import only what you provide.</Text>
        </VStack>
      </Box>

      <Box>
        <Heading size="xl" mb={3}>
          Tech stack
        </Heading>
        <HStack gap={2} flexWrap="wrap">
          <Badge variant="solid" colorPalette="blue">React 19</Badge>
          <Badge variant="solid" colorPalette="blue">TypeScript 5</Badge>
          <Badge variant="solid" colorPalette="purple">Chakra UI 3</Badge>
          <Badge variant="solid" colorPalette="orange">AWS Amplify (Gen 1)</Badge>
          <Badge variant="solid" colorPalette="orange">Cognito</Badge>
          <Badge variant="solid" colorPalette="orange">AppSync GraphQL</Badge>
          <Badge variant="solid" colorPalette="orange">DynamoDB</Badge>
          <Badge variant="solid" colorPalette="green">Zustand</Badge>
          <Badge variant="outline">React Router v7</Badge>
          <Badge variant="outline">Vite 7</Badge>
          <Badge variant="outline">ESLint</Badge>
        </HStack>

        <Box mt={3} color="fg.muted">
          <Text>
            Advisor tools used during development (for design review, refactors, and debugging guidance):
          </Text>
          <HStack gap={2} mt={2} flexWrap="wrap">
            <Badge colorPalette="teal" variant="subtle">ChatGPT (advisor)</Badge>
            <Badge colorPalette="teal" variant="subtle">GitHub Copilot (advisor)</Badge>
          </HStack>
        </Box>
      </Box>

      <Box>
        <Heading size="xl" mb={2}>
          Spotlight: the creator
        </Heading>

        <HStack gap={6} align="start" flexWrap="wrap">
          <Box
            w="170px"
            h="168px"
            rounded="full"
            border="4px solid gold"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              w="164px"
              h="162px"
              rounded="full"
              border="4px solid black"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w="160px"
                h="160px"
                rounded="full"
                border="3px solid gold"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Image
                  w="100%"
                  h="100%"
                  rounded="full"
                  objectFit="cover"
                  loading="lazy"
                  src="/pics/NickSr-ProfilePic-Formal02.jpg"
                  alt="Photo of Nick Hanson"
                />
              </Box>
            </Box>
          </Box>

          <VStack align="start" gap={2} flex="1" minW="260px">
            <Text>
              <Text as="span" fontWeight="700">
                Created by:
              </Text>{" "}
              Nick Hanson
            </Text>

            <Text>
              <Text as="span" fontWeight="700">
                Email:
              </Text>{" "}
              nick@nickhanson.me
            </Text>

            <Text>
              <Text as="span" fontWeight="700">
                GitHub:
              </Text>{" "}
              @ArchILLtect
            </Text>

            <HStack gap={2} pt={2} flexWrap="wrap">
              <Button asChild variant="outline">
                <a href="mailto:nick@nickhanson.me">Email me</a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://github.com/ArchILLtect" target="_blank" rel="noreferrer">
                  GitHub profile
                </a>
              </Button>
              <Button asChild colorPalette="purple" variant="solid">
                <a href="https://nickhanson.me" target="_blank" rel="noreferrer">
                  Showcase site
                </a>
              </Button>
            </HStack>
          </VStack>
        </HStack>
      </Box>

      <Box>
        <Heading size="xl" mb={2}>
          What’s next
        </Heading>
        <VStack align="start" gap={2} color="fg.muted">
          <Text>
            Near-term work focuses on tightening the product surface (copy/routes/UX correctness), hardening types, and
            polishing Planner + Tracker without changing the core architecture.
          </Text>

          <Text>
            Near-term priorities:
          </Text>

          <Box pl={4}>
            <Text>• Fix remaining UI correctness issues and clean up runtime console warnings/errors.</Text>
            <Text>• Keep the ingestion pipeline fast and explainable, then improve review tooling later.</Text>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
}

import { Box, Heading, Center, Text, VStack, useMediaQuery } from '@chakra-ui/react';
import TrackerHeader from '../components/tracker/TrackerHeader';
import BudgetTracker from '../components/tracker/BudgetTracker';
const preloadMonthlyActualSummary = () => import('../components/tracker/MonthlyActualSummary');
import SavingsGoalsTracker from '../components/tracker/SavingsGoalsTracker';
import { usePerfMilestone } from "../hooks/usePerfMilestone";

export default function BudgetTrackerPage() {

  usePerfMilestone("tracker:mounted");

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  return (
    <Box bg="bg.subtle" p={isPortraitWidth ? 0 : 4} minH="100%">
      <Box
        p={4}
        maxW={isPortraitWidth ? "100%" : "80%"}
        mx={isPortraitWidth ? "none" : "auto"}
        border={isPortraitWidth ? "none" : "1px solid"}
        borderRadius={isPortraitWidth ? "none" : "lg"}
        boxShadow={isPortraitWidth ? "none" : "md"}
        borderColor={"border"}
        bg="bg.panel"
      >
        <Center mb={4}>
          <VStack gap={1}>
            <Heading size="md" fontWeight={700} onMouseEnter={preloadMonthlyActualSummary}>
              Tracker
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              Review actuals, recurring items, and savings progress.
            </Text>
          </VStack>
        </Center>

        <TrackerHeader />

        <BudgetTracker />

        <SavingsGoalsTracker />
      </Box>
    </Box>
  );
}
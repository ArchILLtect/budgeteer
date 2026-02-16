import { Box, Heading, Center, Text, VStack } from '@chakra-ui/react';
import TrackerHeader from '../components/tracker/TrackerHeader';
import BudgetTracker from '../components/tracker/BudgetTracker';
const preloadMonthlyActualSummary = () => import('../components/tracker/MonthlyActualSummary');
import SavingsGoalsTracker from '../components/tracker/SavingsGoalsTracker';

export default function BudgetTrackerPage() {

  return (
    <Box bg="bg.subtle" p={4} minH="100%">
      <Box p={4} maxW="80%" mx="auto" borderWidth={1} borderColor="border" borderRadius="lg" boxShadow="md" bg="bg.panel">
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
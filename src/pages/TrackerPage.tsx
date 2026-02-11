import { Box, Heading, Center, Text, VStack } from '@chakra-ui/react';
import TrackerHeader from '../components/tracker/TrackerHeader';
import BudgetTracker from '../components/tracker/BudgetTracker';
const preloadMonthlyActualSummary = () => import('../components/tracker/MonthlyActualSummary');
import SavingsGoalsTracker from '../components/tracker/SavingsGoalsTracker';

export default function BudgetTrackerPage() {

  return (
    <Box bg="gray.200" py={4} minH='100vh'>
      <Box p={4} maxW="800px" mx="auto" mb={'5vh'} borderWidth={1} borderRadius="lg" boxShadow="md" background={"white"}>
        <Center mb={4}>
          <VStack gap={1}>
            <Heading size="md" fontWeight={700} onMouseEnter={preloadMonthlyActualSummary}>
              Tracker
            </Heading>
            <Text fontSize="sm" color="gray.600">
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
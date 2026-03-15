import { Box, Button, Center, Heading, HStack, Text, VStack, useMediaQuery } from '@chakra-ui/react';
import TrackerHeader from '../components/tracker/TrackerHeader';
import BudgetTracker from '../components/tracker/BudgetTracker';
const preloadMonthlyActualSummary = () => import('../components/tracker/MonthlyActualSummary');
import SavingsGoalsTracker from '../components/tracker/SavingsGoalsTracker';
import { usePerfMilestone } from "../hooks/usePerfMilestone";
import { lazy, Suspense } from 'react';
import { Tip } from '../components/ui/Tip';
import { RouterLink } from '../components/RouterLink';

const ConfirmModal = lazy(() => import('../components/ui/ConfirmModal'));

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
            <Heading size="xl" fontWeight={700} onMouseEnter={preloadMonthlyActualSummary}>
              Tracker
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              Review actuals, recurring items, and savings progress.
            </Text>
          </VStack>
        </Center>

        <Tip
          title="Getting started"
          storageKey="tip:tracker-getting-started:v1"
          action={
            <HStack gap={2} flexWrap="wrap">
              <Button asChild size="sm" variant="outline" colorPalette="teal">
                <RouterLink to="/planner">Edit scenario (Planner)</RouterLink>
              </Button>
              <Button asChild size="sm" variant="outline" colorPalette="gray">
                <RouterLink to="/accounts">Import CSV (Accounts)</RouterLink>
              </Button>
              <Button asChild size="sm" variant="outline" colorPalette="gray">
                <RouterLink to="/imports">Apply / Undo (Import History)</RouterLink>
              </Button>
            </HStack>
          }
        >
          Tracker is where you sanity-check a plan against reality. Pick a month, then click “Set plan” to lock in a
          scenario baseline. After you import and apply transactions, Tracker compares that baseline vs your month’s
          actuals so you can see where you’re ahead/behind — and use what you learn to adjust next month’s scenario.
        </Tip>

        <TrackerHeader />

        <BudgetTracker />

        <SavingsGoalsTracker />

        <Suspense fallback={null}>
          <ConfirmModal />
        </Suspense>
      </Box>
    </Box>
  );
}
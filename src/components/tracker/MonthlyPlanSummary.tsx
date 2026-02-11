import { Box, Heading, Stat, StatGroup, Text, Button, Flex } from "@chakra-ui/react";
import { useBudgetStore } from '../../store/budgetStore';
import dayjs from "dayjs";

export default function MonthlyPlanSummary() {

  const showPlanInputs = useBudgetStore((s: any) => s.showPlanInputs);
  const setShowPlanInputs = useBudgetStore((s: any) => s.setShowPlanInputs);
  const selectedMonth = useBudgetStore((s: any) => s.selectedMonth);
  const monthlyPlans = useBudgetStore((s: any) => s.monthlyPlans);
  const plan = monthlyPlans[selectedMonth];

  return (
    <Box p={4} boxShadow="md" bg='gray.700' borderWidth={2}>
    {plan ? (
      <>
        <Flex justifyContent="space-between" alignItems="center" mb={3}>
          <Heading size="md">Plan Summary</Heading>
          {plan.createdAt && (
            <Text fontSize="xs" color="gray.500">
              Plan Created: {dayjs(plan.createdAt).format('MMM D, YYYY')}
            </Text>
          )}
          <Button size="xs" variant="plain" colorScheme="blue" ml={2} onClick={() => setShowPlanInputs(!showPlanInputs)}>
            {showPlanInputs ? 'Hide All Inputs' : 'Show All Inputs'}
          </Button>
        </Flex>

        <Box px={4} py={3} borderWidth={1} borderRadius="md" bg="gray.50">
          <StatGroup>
            <Stat.Root textAlign={'center'}>
                <Stat.Label>Planned Net Income</Stat.Label>
                <Stat.ValueText color="teal.500">${plan.netIncome?.toLocaleString()}</Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign={'center'}>
                <Stat.Label>Planned Expenses</Stat.Label>
                <Stat.ValueText color="orange.500">${plan.totalExpenses?.toLocaleString()}</Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center">
              <Stat.Label>Planned Savings</Stat.Label>
              <Stat.ValueText color="blue.500">
                {plan.totalSavings > 0 ? `$${plan.totalSavings?.toLocaleString()}` : '--'}
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign={'center'}>
                <Stat.Label>Leftover</Stat.Label>
                <Stat.ValueText color={plan.estLeftover >= 0 ? "green.500" : "red.500"} fontSize="2xl">
                  ${plan.estLeftover?.toLocaleString()}
                </Stat.ValueText>
            </Stat.Root>
          </StatGroup>
        </Box>
      </>
    ) : (
      <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
        No plan set for this month.
      </Text>
    )}
    </Box>
  );
}
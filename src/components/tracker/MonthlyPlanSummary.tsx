import { Box, Heading, Stat, StatGroup, Text, Button, Flex } from "@chakra-ui/react";
import { useBudgetStore } from '../../store/budgetStore';
import { formatCurrency } from '../../utils/formatters';
import { formatLocalIsoDate } from '../../services/dateTime';

export default function MonthlyPlanSummary() {
  const showPlanInputs = useBudgetStore((s) => s.showPlanInputs);
  const setShowPlanInputs = useBudgetStore((s) => s.setShowPlanInputs);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const monthlyPlans = useBudgetStore((s) => s.monthlyPlans);
  const plan = monthlyPlans[selectedMonth];
  const estLeftover = plan?.estLeftover ?? 0;

  return (
    <Box p={4} boxShadow="md" bg="bg.subtle" borderWidth={2} borderColor="border">
    {plan ? (
      <>
        <Flex justifyContent="space-between" alignItems="center" mb={3}>
          <Heading size="md">Plan Summary</Heading>
          {plan.createdAt && (
            <Text fontSize="xs" color="fg.muted">
              Plan Created: {formatLocalIsoDate(plan.createdAt)}
            </Text>
          )}
          <Button size="xs" variant="plain" colorScheme="blue" ml={2} onClick={() => setShowPlanInputs(!showPlanInputs)}>
            {showPlanInputs ? 'Hide All Inputs' : 'Show All Inputs'}
          </Button>
        </Flex>

        <Box px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel">
          <StatGroup>
            <Stat.Root textAlign={'center'}>
                <Stat.Label>Planned Net Income</Stat.Label>
              <Stat.ValueText color="teal.500">{formatCurrency(plan.netIncome)}</Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign={'center'}>
                <Stat.Label>Planned Expenses</Stat.Label>
              <Stat.ValueText color="orange.500">{formatCurrency(plan.totalExpenses)}</Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center">
              <Stat.Label>Planned Savings</Stat.Label>
              <Stat.ValueText color="blue.500">
                {Number(plan.totalSavings) > 0 ? formatCurrency(plan.totalSavings) : '--'}
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign={'center'}>
                <Stat.Label>Planned Leftover</Stat.Label>
                <Stat.ValueText color={estLeftover >= 0 ? "green.500" : "red.500"} fontSize="2xl">
                  {formatCurrency(estLeftover)}
                </Stat.ValueText>
            </Stat.Root>
          </StatGroup>
        </Box>
      </>
    ) : (
      <Text fontSize="sm" color="fg.muted" textAlign="center" py={6}>
        No plan set for this month.
      </Text>
    )}
    </Box>
  );
}
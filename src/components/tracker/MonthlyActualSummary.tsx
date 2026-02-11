import { Box, Text, Heading, Stat, Stack,
  StatGroup, Progress, Flex, Button } from '@chakra-ui/react';
import { useBudgetStore } from '../../store/budgetStore';
import ExpenseTracker from '../planner/ExpenseTracker';
import IncomeCalculator from '../planner/IncomeCalculator';
import dayjs from 'dayjs';
import { config } from '../../config/theme';
import { AppCollapsible } from '../ui/AppCollapsible';

export default function MonthlyActualSummary() {
  const selectedMonth = useBudgetStore((s: any) => s.selectedMonth);
  const showActualInputs = useBudgetStore((s: any) => s.showActualInputs);
  const setShowActualInputs = useBudgetStore((s: any) => s.setShowActualInputs);
  const plan = useBudgetStore((s: any) => s.monthlyPlans[selectedMonth]);
  const actual = useBudgetStore((s: any) => s.monthlyActuals[selectedMonth]);
  const savingsSoFar = useBudgetStore((s: any) => s.getSavingsForMonth(selectedMonth));
  const overiddenIncomeTotal = useBudgetStore((s: any) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal);
  const overiddenExpenseTotal = useBudgetStore((s: any) => s.monthlyActuals[selectedMonth]?.overiddenExpenseTotal);
  const bg = config.theme?.semanticTokens?.colors?.bg.value?.toLocaleString('base'); // use semantic token for background color
  const calculateWithOverride = (overrideValue: number | undefined, fallbackFn: () => number) =>
      overrideValue != null && overrideValue >= 1 ? overrideValue : fallbackFn();
  const netIncome = calculateWithOverride(overiddenIncomeTotal, () =>
      actual?.actualFixedIncomeSources?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0);
  const totalExpenses = calculateWithOverride(overiddenExpenseTotal, () =>
      actual?.actualExpenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0);
  const savings = actual?.actualSavings || savingsSoFar || 0;
  const leftover = netIncome - totalExpenses - savings;
  const rawPercentComplete = plan?.totalSavings ? (Number(savings) / Number(plan.totalSavings)) * 100 : 0;
  const percentComplete = Number.isFinite(rawPercentComplete)
    ? Math.max(0, Math.min(100, rawPercentComplete))
    : 0;
  const actuals = useBudgetStore((s) => s.monthlyActuals);
  const savingsLogs = useBudgetStore((s) => s.savingsLogs);

  const selectedYear = dayjs(selectedMonth).format('YYYY');
  // Get all monthlyActual objects for the selected year
  const actualsThisYear = Object.fromEntries(
    Object.entries(actuals).filter(([key]) => key.startsWith(selectedYear))
  );
  // Get all savingsLogs objects for the selected year
  const savingsLogsThisYear = Object.fromEntries(
    Object.entries(savingsLogs).filter(([key]) => key.startsWith(selectedYear))
  );
  // Get the total actual income for the selected year summed from each month
  const totalNetIncome = Object.values(actualsThisYear)
    .reduce((sum, month) => sum + (month.actualTotalNetIncome || 0), 0);
  // Get the total actual expenses for the selected year summed from each month
  const totalExpensesThisYear = Object.values(actualsThisYear)
    .reduce((sum, month) => {
      const monthTotal = month.actualExpenses?.reduce((mSum, expense) => {
        return mSum + (expense.amount || 0);
      }, 0) || 0;
      return sum + monthTotal;
    }, 0);
  // Get the total actual expenses for the selected year summed from each month
    const totalSavingsThisYear = Object.values(savingsLogsThisYear)
      .reduce((sum: number, month: any) => {
        const monthTotal = month.reduce((mSum: number, log: any) => {
          return mSum + (log.amount || 0);
        }, 0) || 0;
        return sum + monthTotal;
      }, 0);

  return (
    <Box p={4} borderBottomRadius="lg" boxShadow="md" bg={bg} borderWidth={2}>
      {actual &&
      <>
        <Flex justifyContent="space-between" alignItems="center" mb={3}>
          <Heading size="md">This Month's Summary</Heading>
          <Button size="xs" variant="plain" colorScheme="blue" ml={2} onClick={() => setShowActualInputs(!showActualInputs)}>
            {showActualInputs ? 'Hide All Inputs' : 'Show All Inputs'}
          </Button>
        </Flex>

        <Stack gap={3}>
          <AppCollapsible title="Actual Inputs" mb={4} defaultOpen={showActualInputs}>

            <IncomeCalculator origin='Tracker' selectedMonth={selectedMonth} />
            <ExpenseTracker origin='Tracker' selectedMonth={selectedMonth} />
            
            <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
          </AppCollapsible>
        </Stack>
      </>
      }
      <Box px={4} py={3} borderWidth={1} borderRadius="md" bg="gray.50">
        <StatGroup>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>Actual Net Income</Stat.Label>
            <Stat.ValueText color="teal.500">${overiddenIncomeTotal ? overiddenIncomeTotal : netIncome.toLocaleString()}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>Total Expenses</Stat.Label>
            <Stat.ValueText color="orange.500">${overiddenExpenseTotal ? overiddenExpenseTotal : totalExpenses.toLocaleString()}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>Total Saved</Stat.Label>
            <Stat.ValueText color="blue.500">${savings.toLocaleString()}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>Leftover</Stat.Label>
            <Stat.ValueText color={leftover >= 0 ? 'green.500' : 'red.500'}>${leftover.toLocaleString()}</Stat.ValueText>
          </Stat.Root>
        </StatGroup>
      </Box>

      {plan?.totalSavings > 0 ? (
        <Box mt={4}>
          <Text fontSize="sm" color="gray.500">Savings progress toward this month's savings plan:</Text>
          <Progress.Root value={percentComplete} size="sm" colorScheme="green" mt={1} borderRadius="md" />
          <Text fontSize="xs" mt={1}>({savings?.toLocaleString()} of {plan.totalSavings?.toLocaleString()} planned)</Text>
        </Box>
      ) : ('')}
      <Heading size="md" my={3}>{selectedYear} Summary</Heading>
      <Box mb={4} px={4} py={3} borderWidth={1} borderRadius="md" bg="gray.50">
        <StatGroup>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>{selectedYear} Total Income</Stat.Label>
            <Stat.ValueText color="teal.600">${totalNetIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>{selectedYear} Total Expenses</Stat.Label>
            <Stat.ValueText color="teal.600">${totalExpensesThisYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label>{selectedYear} Total Savings</Stat.Label>
            <Stat.ValueText color="teal.600">${totalSavingsThisYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
          </Stat.Root>
        </StatGroup>
      </Box>
    </Box>
  );
}
import { Box, Text, Heading, Stat, Stack,
  StatGroup, Progress, Flex, Badge,
  useMediaQuery, 
} from '@chakra-ui/react';
import { useBudgetStore } from '../../store/budgetStore';
import ExpenseTracker from '../planner/ExpenseTracker';
import IncomeCalculator from '../planner/IncomeCalculator';
import { AppCollapsible } from '../ui/AppCollapsible';
import { formatCurrency } from '../../utils/formatters';
import { formatLocalIsoDate, formatUtcMonthYear, getYearFromMonthKey } from '../../services/dateTime';
import type { PlannerSlice } from '../../store/slices/plannerSlice';

type MonthlyActual = PlannerSlice["monthlyActuals"][string];
type SavingsLogEntry = PlannerSlice["savingsLogs"][string][number];

export default function MonthlyActualSummary() {
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const showActualInputs = useBudgetStore((s) => s.showActualInputs);
  const setShowActualInputs = useBudgetStore((s) => s.setShowActualInputs);
  const plan = useBudgetStore((s) => s.monthlyPlans[selectedMonth]);
  const actual = useBudgetStore((s) => s.monthlyActuals[selectedMonth]);
  const savingsSoFar = useBudgetStore((s) => s.getSavingsForMonth(selectedMonth));
  const overiddenIncomeTotal = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal);
  const overiddenExpenseTotal = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.overiddenExpenseTotal);
  const calculateWithOverride = (overrideValue: number | undefined, fallbackFn: () => number) =>
      overrideValue != null && overrideValue >= 1 ? overrideValue : fallbackFn();
  const netIncome = calculateWithOverride(overiddenIncomeTotal, () =>
    actual?.actualFixedIncomeSources?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0);
  const totalExpenses = calculateWithOverride(overiddenExpenseTotal, () =>
    actual?.actualExpenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0);
  const savings = actual?.actualSavings || savingsSoFar || 0;
  const leftover = netIncome - totalExpenses - savings;
  const rawPercentComplete = plan?.totalSavings ? (Number(savings) / Number(plan.totalSavings)) * 100 : 0;
  const percentComplete = Number.isFinite(rawPercentComplete)
    ? Math.max(0, Math.min(100, rawPercentComplete))
    : 0;
  const actuals = useBudgetStore((s) => s.monthlyActuals);
  const savingsLogs = useBudgetStore((s) => s.savingsLogs);
  const appliedToBudgetAt = useBudgetStore((s) => s.budgetAppliedAtByMonth?.[selectedMonth]);

  const selectedYear = getYearFromMonthKey(selectedMonth) ?? (selectedMonth || '').slice(0, 4);
  const actualEntries = (Object.entries(actuals) as Array<[string, MonthlyActual]>).filter(([key]) =>
    key.startsWith(selectedYear)
  );

  const savingsLogEntries = (Object.entries(savingsLogs) as Array<[string, SavingsLogEntry[]]>).filter(([key]) =>
    key.startsWith(selectedYear)
  );

  const totalNetIncome = actualEntries.reduce((sum, [, month]) => sum + (month.actualTotalNetIncome || 0), 0);

  const totalExpensesThisYear = actualEntries.reduce((sum, [, month]) => {
    const monthTotal = month.actualExpenses?.reduce((mSum, expense) => mSum + (expense.amount || 0), 0) || 0;
    return sum + monthTotal;
  }, 0);

  const totalSavingsThisYear = savingsLogEntries.reduce((sum, [, monthLogs]) => {
    const monthTotal = monthLogs.reduce((mSum, log) => mSum + (log.amount || 0), 0);
    return sum + monthTotal;
  }, 0);

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  return (
    <Box p={4} borderBottomRadius="lg" boxShadow="md" bg="bg" borderWidth={2}>
      {actual &&
        <Box mb={4}>
          <Flex justifyContent="space-between" alignItems="center" mb={isPortraitWidth ? 0 : 3}>
            <Heading size="lg">This Month's Summary</Heading>
            {appliedToBudgetAt && (
              <Badge px={3} py={1} colorPalette="teal" fontSize="xs" borderRadius="4xl">
                <Text fontSize="xs" color="fg.muted" mb={0.5}>
                  Applied to budget on: {formatLocalIsoDate(appliedToBudgetAt)}
                </Text>
              </Badge>
            )}
          </Flex>

          <Stack gap={3}>
            <AppCollapsible
              title="Actual Inputs"
              fontSize={isPortraitWidth ? "md" : "lg"}
              noRight={isPortraitWidth ? true : false}
              pxContent={isPortraitWidth ? 0 : 4}
              mb={6}
              defaultOpen={showActualInputs}
              open={showActualInputs}
              onOpenChange={(open) => setShowActualInputs(open)}
              headerRight={
                <Text fontSize="md" color="fg.info" onClick={() => setShowActualInputs(!showActualInputs)}>
                  {showActualInputs ? '▲ Hide All Inputs ▲' : '▼ Show All Inputs ▼'}
                </Text>
              }
            >
              <IncomeCalculator origin='Tracker' selectedMonth={selectedMonth} />
              <ExpenseTracker origin='Tracker' selectedMonth={selectedMonth} />
            </AppCollapsible>
          </Stack>
        </Box>
      }

      <Heading size="md" my={3}>{formatUtcMonthYear(selectedMonth, { month: 'long' })} Summary</Heading>
      <Box px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel">
        <StatGroup>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>Actual Net Income</Stat.Label>
            <Stat.ValueText color="teal.500" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(netIncome)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>Actual Expenses</Stat.Label>
            <Stat.ValueText color="orange.500" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(totalExpenses)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>Actual Savings</Stat.Label>
            <Stat.ValueText color="blue.500" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(savings)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>Actual Leftover</Stat.Label>
            <Stat.ValueText color={leftover >= 0 ? 'green.500' : 'red.500'} fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(leftover)}</Stat.ValueText>
          </Stat.Root>
        </StatGroup>
      </Box>

      {(plan?.totalSavings ?? 0) > 0 ? (
        <Box mt={4}>
          <Text fontSize="sm" color="fg.muted">Savings progress toward this month's savings plan:</Text>
          <Progress.Root value={percentComplete} size="sm" colorPalette="green" mt={1} borderRadius="md">
            <Progress.Track borderRadius="md">
              <Progress.Range borderRadius="md" />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="xs" mt={1}>({formatCurrency(savings)} of {formatCurrency(plan?.totalSavings ?? 0)} planned)</Text>
        </Box>
      ) : ('')}
      <Heading size="md" my={3}>{selectedYear} Summary</Heading>
      <Box mb={4} px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel">
        <StatGroup>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>{selectedYear} Total Income</Stat.Label>
            <Stat.ValueText color="teal.600" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(totalNetIncome)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>{selectedYear} Total Expenses</Stat.Label>
            <Stat.ValueText color="teal.600" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(totalExpensesThisYear)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root textAlign={'center'}>
            <Stat.Label fontSize={isPortraitWidth ? "xs" : "sm"}>{selectedYear} Total Savings</Stat.Label>
            <Stat.ValueText color="teal.600" fontSize={isPortraitWidth ? "md" : "2xl"}>{formatCurrency(totalSavingsThisYear)}</Stat.ValueText>
          </Stat.Root>
        </StatGroup>
      </Box>
    </Box>
  );
}
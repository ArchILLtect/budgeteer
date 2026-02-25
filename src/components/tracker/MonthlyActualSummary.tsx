import {
  Box,
  Text,
  Heading,
  Stat,
  Stack,
  StatGroup,
  Progress,
  Flex,
  Badge,
  SimpleGrid,
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

  const monthLabel = formatUtcMonthYear(selectedMonth, { month: 'long' });

  const plannedIncome = Number(plan?.netIncome ?? 0) || 0;
  const plannedExpenses = Number(plan?.totalExpenses ?? 0) || 0;
  const plannedSavings = Number(plan?.totalSavings ?? 0) || 0;
  const plannedLeftover =
    Number(plan?.estLeftover ?? (plannedIncome - plannedExpenses - plannedSavings)) || 0;

  const deltaIncome = netIncome - plannedIncome;
  const deltaSpending = plannedExpenses - totalExpenses; // positive = under plan
  const deltaSavings = savings - plannedSavings;
  const deltaLeftover = leftover - plannedLeftover;

  const absMoney = (value: number) => formatCurrency(Math.abs(Number(value) || 0));
  const labelDelta = (value: number, positiveLabel: string, negativeLabel: string) => {
    if (!Number.isFinite(value) || value === 0) return 'On plan';
    return value > 0 ? `${absMoney(value)} ${positiveLabel}` : `${absMoney(value)} ${negativeLabel}`;
  };

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

      <Heading size="md" my={3}>{monthLabel} Summary</Heading>
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

      <Box mt={4} px={4} py={4} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel">
        <Flex justifyContent="space-between" alignItems="center" gap={3} mb={1} wrap="wrap">
          <Heading size="sm">Plan vs Actual Scorecard</Heading>
          {plan ? (
            <Badge colorPalette={deltaLeftover >= 0 ? 'green' : 'red'}>
              {deltaLeftover >= 0 ? 'Ahead of plan' : 'Behind plan'}
            </Badge>
          ) : (
            <Badge colorPalette="gray">No plan set</Badge>
          )}
        </Flex>

        {plan ? (
          <Text fontSize="sm" color="fg.muted">
            This compares your saved month plan{plan?.scenarioName ? ` (from scenario “${plan.scenarioName}”)` : ''} to your
            current actuals for {monthLabel}. Use it to spot where you drifted and what you did well.
          </Text>
        ) : (
          <Text fontSize="sm" color="fg.muted">
            Set a plan for this month (from a scenario) to create a baseline. Then Tracker can show how far you’re over/under
            plan for income, spending, savings, and leftover.
          </Text>
        )}

        {plan && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={4}>
            <Box borderWidth={1} borderColor="border" borderRadius="md" p={3} bg="bg">
              <Flex justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                <Text fontWeight="semibold">Income</Text>
                <Badge colorPalette={deltaIncome >= 0 ? 'green' : 'red'}>
                  {deltaIncome === 0 ? 'On plan' : deltaIncome > 0 ? 'Above plan' : 'Below plan'}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="fg.muted">
                Planned {formatCurrency(plannedIncome)} • Actual {formatCurrency(netIncome)}
              </Text>
              <Text mt={1} fontSize="sm" color={deltaIncome >= 0 ? 'green.500' : 'red.500'}>
                {labelDelta(deltaIncome, 'above plan', 'below plan')}
              </Text>
            </Box>

            <Box borderWidth={1} borderColor="border" borderRadius="md" p={3} bg="bg">
              <Flex justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                <Text fontWeight="semibold">Spending</Text>
                <Badge colorPalette={deltaSpending >= 0 ? 'green' : 'red'}>
                  {deltaSpending === 0 ? 'On plan' : deltaSpending > 0 ? 'Under plan' : 'Over plan'}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="fg.muted">
                Planned {formatCurrency(plannedExpenses)} • Actual {formatCurrency(totalExpenses)}
              </Text>
              <Text mt={1} fontSize="sm" color={deltaSpending >= 0 ? 'green.500' : 'red.500'}>
                {labelDelta(deltaSpending, 'under plan', 'over plan')}
              </Text>
            </Box>

            <Box borderWidth={1} borderColor="border" borderRadius="md" p={3} bg="bg">
              <Flex justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                <Text fontWeight="semibold">Savings</Text>
                <Badge colorPalette={deltaSavings >= 0 ? 'green' : 'red'}>
                  {deltaSavings === 0 ? 'On goal' : deltaSavings > 0 ? 'Ahead' : 'Behind'}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="fg.muted">
                Planned {formatCurrency(plannedSavings)} • Actual {formatCurrency(savings)}
              </Text>
              <Text mt={1} fontSize="sm" color={deltaSavings >= 0 ? 'green.500' : 'red.500'}>
                {labelDelta(deltaSavings, 'ahead of goal', 'behind goal')}
              </Text>
            </Box>

            <Box borderWidth={1} borderColor="border" borderRadius="md" p={3} bg="bg">
              <Flex justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                <Text fontWeight="semibold">Leftover</Text>
                <Badge colorPalette={deltaLeftover >= 0 ? 'green' : 'red'}>
                  {deltaLeftover === 0 ? 'On plan' : deltaLeftover > 0 ? 'Ahead' : 'Behind'}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="fg.muted">
                Planned {formatCurrency(plannedLeftover)} • Actual {formatCurrency(leftover)}
              </Text>
              <Text mt={1} fontSize="sm" color={deltaLeftover >= 0 ? 'green.500' : 'red.500'}>
                {labelDelta(deltaLeftover, 'ahead of plan', 'behind plan')}
              </Text>
            </Box>
          </SimpleGrid>
        )}
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
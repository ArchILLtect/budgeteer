import { useState, useEffect } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import {
  Box, Flex, Heading, Stack, Input, Button, HStack,
  IconButton, Stat, StatGroup, StatLabel, Checkbox,
} from '@chakra-ui/react'
import { MdAdd, MdDelete, MdInfo } from "react-icons/md";
import SavingsPlanner from '../SavingsPlanner.js';
import { AppCollapsible } from '../ui/AppCollapsible.js';
import { Tooltip } from '../ui/Tooltip';

type Expense = {
  id: string;
  name: string;
  amount: number;
  isSavings?: boolean;
}

type ExpenseTrackerProps = {
  origin?: 'Planner' | 'Tracker';
  selectedMonth?: string;
}

// TODO: Use FormErrorMessage for better validation feedback

export default function ExpenseTracker({ origin = 'Planner', selectedMonth: selectedMonthProp }: ExpenseTrackerProps) {
  const { currentScenario,
    saveScenario, showExpenseInputs, setShowExpenseInputs
  } = useBudgetStore();


  const plannerExpenses = useBudgetStore((s) => s.expenses);
  const addExpenseRaw = useBudgetStore((s) => s.addExpense);
  const updateExpenseRaw = useBudgetStore((s) => s.updateExpense);
  const removeExpenseRaw = useBudgetStore((s) => s.removeExpense);
  const addActualExpense = useBudgetStore((s) => s.addActualExpense);
  const removeActualExpense = useBudgetStore((s) => s.removeActualExpense);
  const selectedMonthFromStore = useBudgetStore((s) => s.selectedMonth);
  const selectedMonth = selectedMonthProp ?? selectedMonthFromStore;
  const actualraw = useBudgetStore((s) => s.monthlyActuals[selectedMonth]);
  const updateMonthlyExpenseActuals = useBudgetStore((s) => s.updateMonthlyExpenseActuals);
  const overiddenExpenseTotal = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.overiddenExpenseTotal || 0);
  const setOveriddenExpenseTotal = useBudgetStore((s) => s.setOveriddenExpenseTotal);

  const [overrideEnabled, setOverrideEnabled] = useState(overiddenExpenseTotal >= 1);
  const isTracker = origin === 'Tracker';
  const trackerExpenses = actualraw?.actualExpenses || [];
  const expenses = isTracker ? trackerExpenses : plannerExpenses;
  const addExpense = isTracker
    ? (expense: Omit<Expense, 'id'>) => addActualExpense(selectedMonth, expense)
    : (expense: Omit<Expense, 'id'>) => {
        addExpenseRaw(expense);
        if (currentScenario) saveScenario(currentScenario);
      };
  const updateExpense = isTracker
    ? (id: string, data: Partial<Expense>) => updateMonthlyExpenseActuals(selectedMonth, id, data)
    : (id: string, data: Partial<Expense>) => {
        updateExpenseRaw(id, data);
        if (currentScenario) saveScenario(currentScenario);
      };
  const removeExpense = isTracker
    ? (id: string) => removeActualExpense(selectedMonth, id)
    : (id: string) => {
        removeExpenseRaw(id);
        if (currentScenario) saveScenario(currentScenario);
      };
  const netIncome = useBudgetStore((s) => s.getTotalNetIncome().net);
  const monthlyIncome = netIncome / 12;
  const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0)
  const displayedTotalExpenses =
    overiddenExpenseTotal != null && overiddenExpenseTotal >= 1
      ? overiddenExpenseTotal
      : totalExpenses;
  const savingsValue = expenses.find((e: Expense) => e.id === 'savings')?.amount || 0
  const leftover = monthlyIncome - totalExpenses;

  // Removed autosave effect that caused initial overwrite of defaults
  // useEffect(() => {
  //   if (currentScenario) {
  //     saveScenario(currentScenario);
  //   }
  // }, [expenses, incomeSources, currentScenario, saveScenario]);

  // ✅ SYNC toggle state on load (in case store updates later)
  useEffect(() => {
    setOverrideEnabled(overiddenExpenseTotal >= 1);
  }, [overiddenExpenseTotal]);

  const handleRemove = (id: string) => {
    if (window.confirm('Are you sure you want to remove this expense?')) {
      removeExpense(id)
    }
  }

  const setChecked = (checked: boolean) => {
    setOverrideEnabled(checked);
    if (!checked) {
      setOveriddenExpenseTotal(selectedMonth, 0);
    }
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mt={6}>
      <Flex justifyContent="space-between" alignItems="center" borderWidth={1} p={3} borderRadius="lg">
        <Heading size="md">Expenses (Monthly)</Heading>
        <Heading size="md">${displayedTotalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Heading>
      </Flex>
      <Flex justifyContent={'end'} my={2}>
        <Button size="xs" variant="outline" colorScheme="blue" ml={2} onClick={() => setShowExpenseInputs(!showExpenseInputs)}>
          {showExpenseInputs ? 'Hide Expense Inputs' : 'Show Expense Inputs'}
        </Button>
      </Flex>

      <Stack gap={3}>
        <AppCollapsible
          mb={"4px"}
          defaultOpen={showExpenseInputs}
          title={"Expense Details"}
          ariaLabel="Toggle expense details"
        >
          <Stack gap={3}>
            {expenses.map((expense: Expense) => (
              <HStack key={expense.id}>
                <Input
                  value={expense?.name}
                  aria-invalid={!expense?.name?.trim()}
                  _invalid={{ borderColor: "red.500" }}
                  disabled={expense?.name === "Rent"}
                  onChange={(e) =>
                    updateExpense(expense.id, { name: e.target.value })
                  }
                  placeholder="Expense name"
                />
                <Input
                  type="number"
                  value={expense.amount}
                  aria-invalid={expense.amount <= 0}
                  _invalid={{ borderColor: "red.500" }}
                  onChange={(e) =>
                    updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Amount"
                />
                {expense.id !== 'rent' && !expense.isSavings && (
                  <IconButton
                    aria-label="Remove expense"
                    onClick={() => handleRemove(expense.id)}
                    size="sm"
                    colorScheme="red"
                  >
                    <MdDelete />
                  </IconButton>
                )}
              </HStack>
            ))}

            {!isTracker ? (
              <Box width={'25%'} p={1}>
                <Button
                  onClick={() => addExpense({ name: '', amount: 0 })}
                  size="sm"
                >
                  <MdAdd />
                  Add Expense
                </Button>
              </Box>
            ) : (
            <Flex justifyContent="space-between" alignItems="center">
              <Box width={'25%'} p={1}>
                <Button
                  onClick={() => addExpense({ name: '', amount: 0 })}
                  size="sm"
                >
                  <MdAdd />
                  Add Expense
                </Button>
              </Box>
              <Flex gap={2} alignItems="center" p={2} borderWidth={1} borderColor={'lightpink'}>
                <Flex gap={2} alignItems="center" py={'7px'} px={4} borderWidth={1}
                    borderColor={'gray.200'} borderRadius={'md'}>
                  <Checkbox.Root
                    checked={overrideEnabled}
                    onCheckedChange={(details: any) => setChecked(details.checked === true)}
                  >
                    <Checkbox.Control />
                    <Checkbox.Label whiteSpace={'nowrap'}>
                      Total Override
                    </Checkbox.Label>
                  </Checkbox.Root>
                  <Tooltip content="Use this to override the system-calculated total." placement="top">
                      <MdInfo color="gray.500" />
                  </Tooltip>
                </Flex>
                <Input
                  type="number"
                  value={overrideEnabled ? (overiddenExpenseTotal ?? '') : ''}
                  disabled={!overrideEnabled}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setOveriddenExpenseTotal(selectedMonth, isNaN(value) ? 0 : value);
                  }}
                />
              </Flex>
            </Flex>
            )}
            {!isTracker &&
              <SavingsPlanner />
            }
          </Stack>
        </AppCollapsible>
        {!isTracker &&
          <Box mt={2} px={4} py={3} borderWidth={1} borderRadius="md" bg="gray.50">
            <StatGroup>
              <Stat.Root textAlign={'center'}>
                <StatLabel>Est. Net Income</StatLabel>
                <Stat.ValueText color="teal.600">${monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
              </Stat.Root>

              <Stat.Root textAlign={'center'}>
                <StatLabel>Total Expenses</StatLabel>
                <Stat.ValueText color="teal.600">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
              </Stat.Root>

              {savingsValue > 0 && (
                <Stat.Root textAlign={'center'}>
                  <StatLabel>Total Savings</StatLabel>
                  <Stat.ValueText color="teal.600">${savingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
                </Stat.Root>
              )}

              <Stat.Root textAlign={'center'}>
                <StatLabel>Leftover</StatLabel>
                <Stat.ValueText color={leftover >= 0 ? 'green.600' : 'red.600'} fontSize="2xl">
                  ${leftover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Stat.ValueText>
              </Stat.Root>
            </StatGroup>
          </Box>
        }
      </Stack>
    </Box>
  )
}
import { useEffect, useRef, useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import {
  Box, Flex, Heading, Stack, Input, Button, HStack, Text,
  IconButton, Stat, StatGroup, StatLabel, Checkbox, Icon,
  useMediaQuery,
} from '@chakra-ui/react'
import { MdAdd, MdDelete, MdInfo } from "react-icons/md";
import { MdContentCopy } from "react-icons/md";
import SavingsPlanner from './SavingsPlanner';
import { AppCollapsible } from '../ui/AppCollapsible';
import { Tooltip } from '../ui/Tooltip';
import { fireToast } from '../../hooks/useFireToast';
import { formatCurrency } from '../../utils/formatters';
import { normalizeMoney } from '../../services/inputNormalization';

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
  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);
  const lastSyncedMonthRef = useRef<string>(selectedMonth);
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

  // Sync toggle state when the month changes. Avoid overriding the user's toggle
  // within the same month when the override total is still 0.
  useEffect(() => {
    if (lastSyncedMonthRef.current !== selectedMonth) {
      lastSyncedMonthRef.current = selectedMonth;
      setOverrideEnabled(overiddenExpenseTotal >= 1);
      return;
    }

    if (!overrideEnabled && overiddenExpenseTotal >= 1) {
      setOverrideEnabled(true);
    }
  }, [selectedMonth, overiddenExpenseTotal, overrideEnabled]);

  const handleRemove = (id: string) => {
    if (window.confirm('Remove this expense?')) {
      removeExpense(id)
    }
  }

  const setChecked = (checked: boolean) => {
    setOverrideEnabled(checked);
    if (!checked) {
      setOveriddenExpenseTotal(selectedMonth, 0);
    }
  }

  const handleTempButton = () => {
    // Intentional: temporary feature placeholder
    window.alert('This feature coming soon')
  }

  const copyExpenseName = async (name: string) => {
    const text = String(name ?? '');
    if (!text.trim()) {
      fireToast('info', 'Nothing to copy', 'This expense name is empty.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      fireToast('success', 'Copied', 'Expense name copied to clipboard.');
    } catch {
      fireToast('error', 'Copy failed', 'Could not copy to clipboard.');
    }
  };

  return (
    <Box border={isPortraitWidth ? "none" :"1px solid"} borderWidth="1px" borderRadius="lg" p={isPortraitWidth ? 0 : 4} mt={6} bg="bg.muted" borderColor="border">
      <Flex justifyContent="space-between" alignItems="center" borderWidth={1} p={3} borderRadius="lg" bg="bg.panel" borderColor="border">
        <Heading size="md">Expenses (Monthly)</Heading>
        {!isTracker &&
          <Button variant={'outline'} colorScheme="blue" onClick={() => handleTempButton()}>{isPortraitWidth ? "Fixed" : "Use Fixed Expense Total"}</Button>
        }
        <Heading size="md">{formatCurrency(displayedTotalExpenses)}</Heading>
      </Flex>

      <Box p={4} mt={3} borderWidth={1} borderColor="border" borderRadius={"lg"} bg="bg.panel">
        <Stack gap={3}>
          <AppCollapsible
            mb={"4px"}
            fontSize='md'
            title={"Expense Details"}
            noRight={isPortraitWidth ? true : false}
            pxContent={isPortraitWidth ? 0 : 4}
            ariaLabel="Toggle expense details"
            defaultOpen={showExpenseInputs}
            open={showExpenseInputs}
            onOpenChange={(open) => setShowExpenseInputs(open)}
            headerCenter={
              <Text fontSize="xs" colorScheme="blue" onClick={() => setShowExpenseInputs(!showExpenseInputs)}>
                {showExpenseInputs ? '▲ Hide Expense Inputs ▲' : '▼ Show Expense Inputs ▼'}
              </Text>
            }
          >
            <Stack gap={3}>
              {expenses.length === 0 ? (
                <Text fontSize="sm" color="fg.muted">
                  No expenses yet. Add one to start tracking.
                </Text>
              ) : null}
              {expenses.map((expense: Expense) => (
                <HStack key={expense.id}>
                  <Input
                    value={expense?.name ?? ""}
                    aria-invalid={!expense?.name?.trim()}
                    _invalid={{ borderColor: "red.500" }}
                    disabled={expense?.name === "Rent"}
                    onChange={(e) =>
                      updateExpense(expense.id, { name: e.target.value })
                    }
                    bg="bg.muted"
                    placeholder="Expense name"
                  />
                  <Tooltip content="Copy name" placement="top">
                    <IconButton
                      aria-label="Copy expense name"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyExpenseName(expense?.name)}
                    >
                      <MdContentCopy />
                    </IconButton>
                  </Tooltip>
                  <Input
                    type="number"
                    value={expense.amount}
                    aria-invalid={expense.amount <= 0}
                    _invalid={{ borderColor: "red.500" }}
                    onChange={(e) =>
                      updateExpense(expense.id, { amount: normalizeMoney(e.target.value, { min: 0 }) })
                    }
                    bg={expense.isSavings ? "bg.success" : "bg.subtle"}
                    placeholder="Amount"
                    w={isPortraitWidth ? "170px" : "auto"}
                    justifyItems={isPortraitWidth ? "end" : "unset"}
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
              <Flex justifyContent="space-between" alignItems="center" gap={4}>
                <Box width={'25%'} p={1}>
                  <Button
                    onClick={() => addExpense({ name: '', amount: 0 })}
                    size={isPortraitWidth ? "xs" : "sm"}
                  >
                    <MdAdd />
                    {isPortraitWidth ? "Add" : "Add Expense"}
                  </Button>
                </Box>
                {isPortraitWidth ? (
                  <Flex gap={1}>
                    <Flex alignItems="center" py={'7px'} px={4} borderWidth={1}
                        borderColor="border.error" borderRadius={'md'}>
                      <Checkbox.Root
                        checked={overrideEnabled}
                        onCheckedChange={(details) => setChecked(details.checked === true)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label whiteSpace={'nowrap'}>
                          Override
                        </Checkbox.Label>
                      </Checkbox.Root>
                    </Flex>
                    <Input
                      type="number"
                      value={overrideEnabled ? (overiddenExpenseTotal ?? '') : ''}
                      disabled={!overrideEnabled}
                      onChange={(e) => {
                        setOveriddenExpenseTotal(selectedMonth, normalizeMoney(e.target.value, { min: 0 }));
                      }}
                    />
                  </Flex>
                ) : (
                  <Flex gap={2} alignItems="center" p={2} borderWidth={4} borderColor={'border.error'} borderRadius={'md'}>
                    <Flex gap={2} alignItems="center" py={'7px'} px={4} borderWidth={1}
                        borderColor={'gray.200'} borderRadius={'md'}>
                      <Checkbox.Root
                        checked={overrideEnabled}
                        onCheckedChange={(details) => setChecked(details.checked === true)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label whiteSpace={'nowrap'}>
                          Total Override
                        </Checkbox.Label>
                      </Checkbox.Root>
                      <Tooltip content="Use this to override the system-calculated total." placement="top">
                          <Icon as={MdInfo} color="fg.muted" />
                      </Tooltip>
                    </Flex>
                    <Input
                      type="number"
                      value={overrideEnabled ? (overiddenExpenseTotal ?? '') : ''}
                      disabled={!overrideEnabled}
                      onChange={(e) => {
                        setOveriddenExpenseTotal(selectedMonth, normalizeMoney(e.target.value, { min: 0 }));
                      }}
                    />
                  </Flex>
                )}
              </Flex>
              )}
              {!isTracker &&
                <SavingsPlanner />
              }
            </Stack>
          </AppCollapsible>
          {!isTracker &&
            <Box mt={2} px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.subtle">
              <StatGroup>
                <Stat.Root textAlign={'center'}>
                  <StatLabel>Est. Net Income</StatLabel>
                  <Stat.ValueText color="teal.600">{formatCurrency(monthlyIncome)}</Stat.ValueText>
                </Stat.Root>

                <Stat.Root textAlign={'center'}>
                  <StatLabel>Total Expenses</StatLabel>
                  <Stat.ValueText color="teal.600">{formatCurrency(totalExpenses)}</Stat.ValueText>
                </Stat.Root>

                {savingsValue > 0 && (
                  <Stat.Root textAlign={'center'}>
                    <StatLabel>Total Savings</StatLabel>
                    <Stat.ValueText color="teal.600">{formatCurrency(savingsValue)}</Stat.ValueText>
                  </Stat.Root>
                )}

                <Stat.Root textAlign={'center'}>
                  <StatLabel>Leftover</StatLabel>
                  <Stat.ValueText color={leftover >= 0 ? 'green.600' : 'red.600'} fontSize="2xl">
                    {formatCurrency(leftover)}
                  </Stat.ValueText>
                </Stat.Root>
              </StatGroup>
            </Box>
          }
        </Stack>
      </Box>
    </Box>
  )
}
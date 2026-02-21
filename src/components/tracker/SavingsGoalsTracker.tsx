import {
  Box, Text, Center, Stat, Progress, Input,
  Button, HStack, VStack, Flex, Heading, Card,
  useMediaQuery,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useBudgetStore } from '../../store/budgetStore';
import { MdAdd, MdDelete } from "react-icons/md";
import { fireToast } from '../../hooks/useFireToast';
import { AppCollapsible } from '../ui/AppCollapsible';
import { formatCurrency } from '../../utils/formatters';
import { getYearFromMonthKey } from '../../services/dateTime';
import { normalizeMoney } from '../../services/inputNormalization';

export default function SavingsGoalsTracker() {

  const selectedMonth =  useBudgetStore((s) => s.selectedMonth);
  const selectedYear = getYearFromMonthKey(selectedMonth) ?? (selectedMonth || '').slice(0, 4);
  //const currentMonthKey = dayjs().format('YYYY-MM');
  //const monthlyActuals = useBudgetStore((s) => s.monthlyActuals[currentMonthKey]);
  //const savingsGoal = useBudgetStore((s) => s.savingsGoal);
  const removeSavingsEntriesForGoal = useBudgetStore((s) => s.removeSavingsEntriesForGoal);
  const savingsLogs = useBudgetStore((s) => s.savingsLogs);
  const showGoalInputs = useBudgetStore((s) => s.showGoalInputs);
  const setShowGoalInputs = useBudgetStore((s) => s.setShowGoalInputs);
  const goals = useBudgetStore((s) => s.savingsGoals);
  const addSavingsGoal = useBudgetStore((s) => s.addSavingsGoal);
  const removeSavingsGoal = useBudgetStore((s) => s.removeSavingsGoal);
  const updateSavingsGoal = useBudgetStore((s) => s.updateSavingsGoal);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  const savingsLogsThisYear = Object.entries(savingsLogs)
    .filter(([month]) => String(month).startsWith(selectedYear))
    .flatMap(([, logs]) => (Array.isArray(logs) ? logs : []));

  const handleGoalDelete = (id: string) => {
    const goalName = String(goals.find((g) => g.id === id)?.name || '').trim();
    const message = goalName
      ? `Are you sure you want to delete the savings goal "${goalName}"? This will also remove its saved progress.`
      : 'Are you sure you want to delete this savings goal? This will also remove its saved progress.';

    if (!window.confirm(message)) return;

    // Remove progress logs for this goal across all months
    for (const month of Object.keys(savingsLogs)) {
      removeSavingsEntriesForGoal(month, id);
    }

    removeSavingsGoal(id);
    if (editGoalId === id) setEditGoalId(null);

    fireToast(
      'success',
      'Savings goal deleted',
      goalName ? `Deleted "${goalName}".` : 'Deleted savings goal.'
    );
  };
  const handleGoalAdd = () => {
    addSavingsGoal({ name: 'New Savings', target: 0 })
    fireToast("success", "Savings goal added", "Added a new savings goal.");
  };

  const resetGoal = (goalId: string) => {
    const goalName = String(goals.find((g) => g.id === goalId)?.name || '').trim();
    const totalForGoalThisYear = savingsLogsThisYear
      .filter((e) => ((e?.goalId ?? 'yearly') as string) === goalId)
      .reduce((sum, entry) => sum + (Number(entry?.amount) || 0), 0);

    const confirm = window.confirm(
      `Are you sure you want to reset this goal${goalName ? ` ("${goalName}")` : ''}? This will remove ${formatCurrency(totalForGoalThisYear)} of saved progress from ${selectedYear}.`
    );

    if (!confirm) return;

    for (const month of Object.keys(savingsLogs)) {
      if (String(month).startsWith(selectedYear)) {
        removeSavingsEntriesForGoal(month, goalId);
      }
    }

    fireToast('success', 'Savings goal reset', 'Removed saved progress for this goal.');
  };

  const progressData = goals.map((goal) => {
    const logsForGoal = savingsLogsThisYear.filter((l) => {
      if (goal.id === 'yearly') return l.goalId == null || l.goalId === 'yearly';
      return l.goalId === goal.id;
    });
    const total = logsForGoal.reduce((sum, l) => sum + (Number(l?.amount) || 0), 0);
    const rawProgress = Number(goal.target) > 0 ? (total / Number(goal.target)) * 100 : 0;
    const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;
    return { goal, total, progress };
  });
  

  return (
    <Box mt={4} borderWidth={1} borderColor="border" p={4} borderRadius="lg" bg="bg.panel" boxShadow="md">
      <Flex justify="space-between" align="center">
        <Heading size="md">Savings Goals</Heading>
        <Heading size="md"># of Goals: {goals.length}</Heading>
      </Flex>

      <AppCollapsible
        mb={4}
        defaultOpen={showGoalInputs}
        open={showGoalInputs}
        onOpenChange={(open) => setShowGoalInputs(open)}
        headerCenter={
          <Text fontSize="xs" colorScheme="blue" onClick={() => setShowGoalInputs(!showGoalInputs)}>
            {showGoalInputs ? '▲ Hide All Goals ▲' : '▼ Show/Edit Goals ▼'}
          </Text>
        }
      >
        {progressData.map(({ goal, total, progress }) => (
        <Card.Root p={4} mb={4} borderWidth={1} borderColor="border" bg="bg.subtle" key={String(goal.id)}>
          <Flex justify="space-between" align="center" mb={4}>
            <Button
              size={isPortraitWidth ? "xs" : "sm"}
              colorScheme="blue"
              onClick={() => setEditGoalId(editGoalId === goal.id ? null : goal.id)}
            >
              {editGoalId === goal.id ? 'Close' : 'Edit'}
            </Button>
            <Stat.Root mb={4}>
              <Box justifyContent="center" display="flex" flexDirection="column" alignItems="center">
              <Stat.Label fontSize={isPortraitWidth ? 'sm' : 'lg'}>{goal.name} {goal.id === 'yearly' ? selectedYear : ''}</Stat.Label>
              <Stat.ValueText color="green.500" fontSize={isPortraitWidth ? 'md' : '2xl'}>
                {formatCurrency(total)} / {formatCurrency(goal?.target)}
              </Stat.ValueText>
              </Box>
            </Stat.Root>
            <Button size={isPortraitWidth ? "xs" : "sm"} colorScheme="red" onClick={() => resetGoal(goal.id)}>Reset</Button>
          </Flex>
          <Progress.Root value={progress} size="lg" colorScheme="green" bg="bg.subtle" borderRadius="xl" mb={4}>
            <Progress.Track borderRadius="xl" bg={"bg.panel"}>
              <Progress.Range borderRadius="xl"/>
            </Progress.Track>
          </Progress.Root>
          {editGoalId === goal.id && (
            <Box borderWidth={1} borderColor="border" borderRadius="lg" bg="bg.panel" boxShadow="sm">
              <VStack align="start" gap={2} p={4}>
                {goal.id !== 'yearly' ? (
                  <Flex justify="space-between" width="100%">
                    <Center>
                      <Text fontWeight="bold" flexWrap={'nowrap'}>Goal Name:</Text>
                    </Center>
                    <HStack gap={2}>
                      <Input
                        value={goal.name ?? ''}
                        aria-invalid={goal.name == ''}
                        _invalid={{ borderColor: "red.500" }}
                        bg="bg.panel"
                        borderColor="border"
                        onChange={(e) =>
                          updateSavingsGoal(goal.id, { name: e.target.value })
                        }
                        placeholder="Name"
                      />
                    </HStack>
                  </Flex>
                ) : ("")}
                <Flex justify="space-between" width="100%">
                  <Center>
                    <Text fontWeight="bold">Current Goal:</Text>
                  </Center>
                  <HStack gap={2}>
                    <Input
                      type="number"
                      placeholder="Enter savings goal"
                      value={String(goal.target ?? '')}
                      bg="bg.panel"
                      borderColor="border"
                      onChange={(e) => {
                        updateSavingsGoal(goal.id, { target: normalizeMoney(e.target.value, { min: 0 }) });
                      }}
                    />
                  </HStack>
                </Flex>
                <Text fontSize="sm" color="fg.muted">
                  You have
                  saved {formatCurrency(total)} towards
                  this goal. Your goal is to
                  save {formatCurrency(goal?.target)}.
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Adjust your monthly savings goals to stay on track with your budget.
                </Text>
              </VStack>
            </Box>
          )}
          {goal.id !== 'yearly' && (
            <Center>
              <Button
                mt={4}
                size={isPortraitWidth ? "xs" : "sm"}
                variant={'outline'}
                colorScheme="red"
                onClick={() => handleGoalDelete(goal.id)}
              >
                <MdDelete />
                Delete This Goal
              </Button>
            </Center>
          )}
        </Card.Root>
        ))}
        <Box width={'25%'} p={1}>
          <Button
            onClick={() => handleGoalAdd()}
            size={isPortraitWidth ? "xs" : "sm"}
            colorScheme='green'
          >
            <MdAdd />
            Add Savings Goal
          </Button>
        </Box>
      </AppCollapsible>
    </Box>
  );
}
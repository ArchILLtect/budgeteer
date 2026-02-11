import {
  Box, Text, Center, Stat, Progress, Input,
  Button, HStack, VStack, Flex, Heading, Card,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useBudgetStore } from '../../store/budgetStore';
import { MdAdd, MdDelete } from "react-icons/md";
import { fireToast } from '../../hooks/useFireToast';
import dayjs from 'dayjs';
import { AppCollapsible } from '../ui/AppCollapsible';

export default function SavingsGoalsTracker() {

  const selectedMonth =  useBudgetStore((s: any) => s.selectedMonth);
  const selectedYear = dayjs(selectedMonth).format('YYYY');
  //const currentMonthKey = dayjs().format('YYYY-MM');
  //const monthlyActuals = useBudgetStore((s) => s.monthlyActuals[currentMonthKey]);
  //const savingsGoal = useBudgetStore((s) => s.savingsGoal);
  const removeSavingsEntriesForGoal = useBudgetStore((s: any) => s.removeSavingsEntriesForGoal);
  const savingsLogs = useBudgetStore((s: any) => s.savingsLogs);
  const showGoalInputs = useBudgetStore((s: any) => s.showGoalInputs);
  const setShowGoalInputs = useBudgetStore((s: any) => s.setShowGoalInputs);
  const goals = useBudgetStore((s: any) => s.savingsGoals);
  const addSavingsGoal = useBudgetStore((s: any) => s.addSavingsGoal);
  const removeSavingsGoal = useBudgetStore((s: any) => s.removeSavingsGoal);
  const updateSavingsGoal = useBudgetStore((s: any) => s.updateSavingsGoal);
  const [editGoalId, setEditGoalId] = useState<any>(null);
  const savingsLogsThisYear = Object.entries(savingsLogs)
    .filter(([month]) => String(month).startsWith(selectedYear))
    .flatMap(([, logs]) => (Array.isArray(logs) ? logs : []));

  const handleGoalDelete = (id: any) => {
    const goalName = String(goals.find((g: any) => g.id === id)?.name || '').trim();
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

  const resetGoal = (goalId: any) => {
    const goalName = String(goals.find((g: any) => g.id === goalId)?.name || '').trim();
    const totalForGoalThisYear = savingsLogsThisYear
      .filter((e: any) => (e?.goalId ?? 'yearly') === goalId)
      .reduce((sum: number, entry: any) => sum + (Number(entry?.amount) || 0), 0);

    const confirm = window.confirm(
      `Are you sure you want to reset this goal${goalName ? ` ("${goalName}")` : ''}? This will remove $${totalForGoalThisYear.toLocaleString(undefined, { minimumFractionDigits: 2 })} of saved progress from ${selectedYear}.`
    );

    if (!confirm) return;

    for (const month of Object.keys(savingsLogs)) {
      if (String(month).startsWith(selectedYear)) {
        removeSavingsEntriesForGoal(month, goalId);
      }
    }

    fireToast('success', 'Savings goal reset', 'Removed saved progress for this goal.');
  };

  const progressData = goals.map((goal: any) => {
    const logsForGoal = savingsLogsThisYear.filter((l: any) => {
      if (goal.id === 'yearly') return l.goalId == null || l.goalId === 'yearly';
      return l.goalId === goal.id;
    });
    const total = logsForGoal.reduce((sum: number, l: any) => sum + (Number(l?.amount) || 0), 0);
    const rawProgress = Number(goal.target) > 0 ? (total / Number(goal.target)) * 100 : 0;
    const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;
    return { goal, total, progress };
  });
  

  return (
    <Box mt={4} borderWidth={1} p={4} borderRadius="lg" bg="white" boxShadow="md">
      <Flex justify="space-between" align="center">
        <Heading size="md">Savings Goals</Heading>
        <Heading size="md"># of Goals: {goals.length}</Heading>
      </Flex>

      <Center>
        <Button size="xs" variant="plain" colorScheme="blue" onClick={() => setShowGoalInputs(!showGoalInputs)}>
          {showGoalInputs ? '▲ Hide All Goals ▲' : '▼ Show/Edit Goals ▼'}
        </Button>
      </Center>

      <AppCollapsible title="Savings Goals" mb={4} defaultOpen={showGoalInputs}>
      {progressData.map(({ goal, total, progress }: { goal: any; total: number; progress: number }) => (
        <Card.Root p={4} mb={4} borderWidth={1} borderColor={'gray.100'} bg={'whitesmoke'} key={String(goal.id)}>
          <Flex justify="space-between" align="center" mb={4}>
            <Button
              size="xs"
              colorScheme="blue"
              onClick={() => setEditGoalId(editGoalId === goal.id ? null : goal.id)}
            >
              {editGoalId === goal.id ? 'Close' : 'Edit'}
            </Button>
            <Stat.Root mb={4} textAlign="center">
              <Stat.Label fontSize={'lg'}>{goal.name} {goal.id === 'yearly' ? selectedYear : ''}</Stat.Label>
              <Stat.ValueText color="green.500">
                {/* ${total?.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${goal?.target?.toLocaleString(undefined, { minimumFractionDigits: 2 })} */}
                ${Number.isFinite(total) ? total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "--" } / ${Number.isFinite(goal?.target) ? goal.target.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "--"}
              </Stat.ValueText>
            </Stat.Root>
            <Button size="xs" colorScheme="red" onClick={() => resetGoal(goal.id)}>Reset</Button>
          </Flex>
          <Progress.Root value={progress} size="lg" colorScheme="green" bg={'gray.200'} borderRadius="xl" mb={4} />
          {editGoalId === goal.id && (
            <Box borderWidth={1} borderRadius="lg" bg="gray.50" boxShadow="sm">
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
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        updateSavingsGoal(goal.id, { target: Number.isFinite(next) ? next : 0 });
                      }}
                    />
                  </HStack>
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  You have
                  saved ${Number.isFinite(total) ? total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "--"} towards
                  this goal. Your goal is to
                  save ${goal?.target?.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Adjust your monthly savings goals to stay on track with your budget.
                </Text>
              </VStack>
            </Box>
          )}
          {goal.id !== 'yearly' && (
            <Center>
              <Button
                mt={4}
                size="sm"
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
            size="sm"
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
import { Box, Flex, Center, Heading, Stack, List, Text, Input, Button, VStack } from "@chakra-ui/react";
import { MdDelete } from "react-icons/md";
import { useState } from "react";
import { useBudgetStore } from "../../store/budgetStore";
import dayjs from "dayjs";
import { config } from "../../config/theme";
import { fireToast } from "../../hooks/useFireToast";
import { AppCollapsible } from "../ui/AppCollapsible";
import { AppSelect } from "../ui/AppSelect";

// TODO: Refactor (see other TODO) savings log entry amount input's max prop to use selected goal's total goal amount.

export default function SavingsLog() {
  const showInputs = useBudgetStore((s) => s.showSavingsLogInputs);
  const setShowInputs = useBudgetStore((s) => s.setShowSavingsLogInputs);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const savingsLogs = useBudgetStore((s: any) => s.savingsLogs);
  const addSavingsLog = useBudgetStore((s) => s.addSavingsLog);
  const updateSavingsLog = useBudgetStore((s) => s.updateSavingsLog);
  const deleteSavingsEntry = useBudgetStore((s) => s.deleteSavingsEntry);
  const resetSavingsLog = useBudgetStore((s) => s.resetSavingsLog);
  const logsForMonth = savingsLogs[selectedMonth] || [];
  const [selectedGoal, setSelectedGoal] = useState(savingsGoals[0]?.id || "");
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editGoalId, setEditGoalId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const bg = config.theme?.semanticTokens?.colors?.bg.value?.toLocaleString('base'); // use semantic token for background color
  const totalSavings = logsForMonth.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
  const goal = savingsGoals.find((g) => g.id === selectedGoal);
  const hasSelectedGoal = !!goal;
  const logsForGoal = hasSelectedGoal
    ? Object.values(savingsLogs).flat().filter((log: any) => log.goalId === selectedGoal)
    : [];
  const totalForGoal = hasSelectedGoal ? logsForGoal.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) : 0;
  const rawRemaining = hasSelectedGoal ? (goal?.target ?? 0) - totalForGoal : Infinity;
  const remaining = hasSelectedGoal
    ? Math.max(Number.isFinite(rawRemaining) ? rawRemaining : 0, 0)
    : Infinity;
  const goalComplete = hasSelectedGoal ? remaining <= 0 : false;

  // TODO: Clamp the value here also.
  const handleAdd = () => {
    const value = typeof amount === "number" ? amount : parseFloat(amount);
    if (!value || value <= 0) return;

    addSavingsLog(selectedMonth, {
      goalId: selectedGoal || null, // "" -> null (no goal)
      amount: value,
      date: dayjs().format("YYYY-MM-DD"),
    });
    setAmount("");
  };

  // begin editing a specific row's goal
  const beginEditRow = (entry: any) => {
    setEditingLogId(entry.id);
    setEditGoalId(entry.goalId || ""); // "" sentinel for no goal
  };

  const handleRemove = (month: string, index: number) => {
    deleteSavingsEntry(month, index)
    fireToast("info","Savings log deleted!", "The entry has been removed from your savings log.");
  }

  return (
    <Box p={4} boxShadow="md" borderRadius="lg" mt={6} bg={bg} borderWidth={1}>

      <Flex justifyContent="space-between" alignItems="center">
        <Heading size="md">Savings Logs</Heading>
        <Heading size="md">Total: ${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Heading>
      </Flex>
      <Center>
        <Button size="xs" variant="plain" colorScheme="blue" onClick={() => setShowInputs(!showInputs)}>
          {showInputs ? '▲ Hide All Logs ▲' : '▼ Show/Edit Logs ▼'}
        </Button>
      </Center>

      <AppCollapsible title="Savings Logs" defaultOpen={showInputs}>
        {logsForMonth.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            No savings recorded for this month yet.
          </Text>
        ) : (
          <Box mt={6}>
            <List.Root gap={2}>
              {logsForMonth.map((entry: any, index: number) => (
                <List.Item key={entry.id ?? `${entry.date}-${entry.amount}-${index}`}>
                  <Flex justify="space-between" alignItems="center">
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium">${entry.amount?.toFixed(2)}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {entry.date}
                      </Text>
                    </VStack>
                    {editingLogId === entry.id ? (
                      <Flex gap={2} align="center">
                        <AppSelect
                          width={300}
                          value={editGoalId}
                          onChange={(e) => setEditGoalId(e.target.value)}
                        >
                          <option value="">{'---'}</option>
                          {savingsGoals.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </AppSelect>
                        <Button
                          size="xs"
                          colorScheme="green"
                          onClick={() => {
                            const newGoalId = editGoalId || null; // "" -> null
                            updateSavingsLog(selectedMonth, entry.id, { goalId: newGoalId });
                            fireToast("success", "Entry updated", "The savings entry has been updated successfully.");
                            setEditingLogId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingLogId(null)}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => beginEditRow(entry)}
                      >
                        {savingsGoals.find((g) => g.id === entry.goalId)?.name || '----'}
                        {' '}
                        {savingsGoals.find((g) => g.id === entry.goalId)
                          ? `(${savingsGoals.find((g) => g.id === entry.goalId)?.target ?? '---'})`
                          : ''}
                      </Button>
                    )}
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => handleRemove(selectedMonth, index)}
                    >
                      <MdDelete />
                    </Button>
                  </Flex>
                  <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
                </List.Item>
              ))}
            </List.Root>
            {/* Reset Button */}
            <Center>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={() => resetSavingsLog(selectedMonth)}
                mt={2}
              >
                Reset Log
              </Button>
            </Center>
          </Box>
        )}
        <Stack mt={10} gap={3}>
          <Flex justifyContent="space-between" alignItems="center" mb={3}>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                if (!Number.isFinite(raw)) return setAmount("");
                // Only clamp if a goal is selected
                const clamped = hasSelectedGoal && Number.isFinite(remaining)
                  ? Math.min(raw, remaining)
                  : raw;
                setAmount(Number.isFinite(clamped) ? clamped : "");
              }}
              width={300}
              max={hasSelectedGoal && Number.isFinite(remaining) ? remaining : undefined}
              disabled={hasSelectedGoal ? goalComplete : false}
            />
            <AppSelect
              width={300}
              value={selectedGoal}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGoal(e.target.value)}
            >
              <option value="">{'---'}</option>
              {savingsGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </AppSelect>
            <Button colorScheme="teal" onClick={handleAdd} disabled={goalComplete}>
              Add Entry
            </Button>
          </Flex>
          <Center>
            <Text fontSize="sm" color={hasSelectedGoal ? (goalComplete ? 'green.600' : 'orange.500') : 'gray.500'}>
              {hasSelectedGoal
                ? (goalComplete
                  ? `✅ Goal complete! HINT: You may need to add a new savings goal to continue saving.` //TODO: Make HINT display on new line.
                  : `⚠️ $${(Number.isFinite(remaining) ? remaining : 0).toLocaleString()} remaining to complete "${goal?.name}"`)
                : `No goal selected — this entry won't count toward any goal.`}
            </Text>
          </Center>
          <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
        </Stack>
      </AppCollapsible>
    </Box>
  );
}
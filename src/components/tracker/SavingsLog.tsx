import { Box, Flex, Center, Heading, Stack, List, Text, Input, Button, VStack, useMediaQuery } from "@chakra-ui/react";
import { Tooltip } from "../ui/Tooltip";
import { MdDelete } from "react-icons/md";
import { useState } from "react";
import { useBudgetStore } from "../../store/budgetStore";
import { fireToast } from "../../hooks/useFireToast";
import { AppCollapsible } from "../ui/AppCollapsible";
import { AppSelect } from "../ui/AppSelect";
import { formatCurrency } from "../../utils/formatters";
import { getTodayDateInputValue } from "../../services/dateTime";
import { normalizeMoney } from "../../services/inputNormalization";

// TODO: Refactor (see other TODO) savings log entry amount input's max prop to use selected goal's total goal amount.

export default function SavingsLog() {
  const showInputs = useBudgetStore((s) => s.showSavingsLogInputs);
  const setShowInputs = useBudgetStore((s) => s.setShowSavingsLogInputs);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const savingsLogs = useBudgetStore((s) => s.savingsLogs);
  const addSavingsLog = useBudgetStore((s) => s.addSavingsLog);
  const updateSavingsLog = useBudgetStore((s) => s.updateSavingsLog);
  const deleteSavingsEntry = useBudgetStore((s) => s.deleteSavingsEntry);
  const resetSavingsLog = useBudgetStore((s) => s.resetSavingsLog);
  const logsForMonth = savingsLogs[selectedMonth] || [];
  const [selectedGoal, setSelectedGoal] = useState(savingsGoals[0]?.id || "");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const totalSavings = logsForMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
  const goal = savingsGoals.find((g) => g.id === selectedGoal);
  const hasSelectedGoal = !!goal;
  const logsForGoal = hasSelectedGoal
    ? Object.values(savingsLogs).flat().filter((log) => log.goalId === selectedGoal)
    : [];
  const totalForGoal = hasSelectedGoal ? logsForGoal.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) : 0;
  const rawRemaining = hasSelectedGoal ? (goal?.target ?? 0) - totalForGoal : Infinity;
  const remaining = hasSelectedGoal
    ? Math.max(Number.isFinite(rawRemaining) ? rawRemaining : 0, 0)
    : Infinity;
  const goalComplete = hasSelectedGoal ? remaining <= 0 : false;

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  // TODO: Clamp the value here also.
  const handleAdd = () => {
    const value =
      typeof amount === "number" ? amount : normalizeMoney(amount, { min: 0, fallback: NaN });
    if (!Number.isFinite(value) || value <= 0) return;

    addSavingsLog(selectedMonth, {
      goalId: selectedGoal || null, // "" -> null (no goal)
      amount: value,
      date: getTodayDateInputValue(),
    });
    setAmount("");
  };

  // begin editing a specific row's goal
  const beginEditRow = (entry: (typeof logsForMonth)[number]) => {
    setEditingLogId(entry.id);
    setEditGoalId(entry.goalId || ""); // "" sentinel for no goal
  };

  const handleRemove = (month: string, index: number) => {
    deleteSavingsEntry(month, index)
    fireToast("info","Savings log deleted!", "The entry has been removed from your savings log.");
  }

  return (
    <Box p={4} boxShadow="md" borderRadius="lg" mt={6} bg="bg" borderWidth={1} borderColor="border">

      <Flex justifyContent="space-between" alignItems="center">
        <Heading size="md">Savings Logs</Heading>
        <Heading size="md">Total: {formatCurrency(totalSavings)}</Heading>
      </Flex>

      <AppCollapsible
        mb={4}
        pxContent={0}
        defaultOpen={showInputs}
        open={showInputs}
        onOpenChange={(open) => setShowInputs(open)}
        headerCenter={
          <Text fontSize="xs" colorScheme="blue" onClick={() => setShowInputs(!showInputs)}>
            {showInputs ? '▲ Hide All Logs ▲' : '▼ Show/Edit Logs ▼'}
          </Text>
        }
      >
        {logsForMonth.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            No savings recorded for this month yet.
          </Text>
        ) : (
          <Box mt={6}>
            <List.Root gap={2}>
              {logsForMonth.map((entry, index: number) => (
                <List.Item key={entry.id ?? `${entry.date}-${entry.amount}-${index}`}>
                  <Flex justify="space-between" alignItems="center">
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium" fontSize={isPortraitWidth ? "sm" : "md"}>${entry.amount?.toFixed(2)}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {entry.date}
                      </Text>
                    </VStack>
                    {/* TODO(P4): Needs functionality for editing amount */}
                    {editingLogId === entry.id ? (
                      <Flex gap={2} align="center">
                        <AppSelect
                          width={isPortraitWidth ? 100 : 300}
                          value={editGoalId}
                          onChange={(e) => setEditGoalId(e.target.value)}
                        >
                          <option value="">{'---'}</option>
                          {savingsGoals.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </AppSelect>
                        <Button
                          size={isPortraitWidth ? "2xs" : "xs"}
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
                          size={isPortraitWidth ? "2xs" : "xs"}
                          variant="ghost"
                          onClick={() => setEditingLogId(null)}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    ) : (
                      <Tooltip content="Click to edit this entry">
                        <Button
                          justifyContent={"right"}
                          size={isPortraitWidth ? "2xs" : "xs"}
                          bg={"bg.panel"}
                          variant="outline"
                          onClick={() => beginEditRow(entry)}
                        >
                          <Text truncate maxWidth={isPortraitWidth ? "210px" : "350px"}>
                          {savingsGoals.find((g) => g.id === entry.goalId)?.name || '----'}
                          {' '}
                          {savingsGoals.find((g) => g.id === entry.goalId)
                            ? `(${savingsGoals.find((g) => g.id === entry.goalId)?.target ?? '---'})`
                            : ''}
                          </Text>
                        </Button>
                      </Tooltip>
                    )}
                    <Button
                      size={isPortraitWidth ? "2xs" : "xs"}
                      border={"1px solid"}
                      borderColor={"red.500"}
                      bg={"bg.error"}
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
                size={isPortraitWidth ? "2xs" : "sm"}
                border={"1px solid"}
                borderColor={"red.500"}
                bg={"bg.error"}
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
          <Flex justifyContent="center" alignItems="center" mb={3} gap={isPortraitWidth ? 2 : 15}>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              bg={"bg.panel"}
              onChange={(e) => {
                const raw = normalizeMoney(e.target.value, { min: 0, fallback: NaN });
                if (!Number.isFinite(raw)) return setAmount("");
                // Only clamp if a goal is selected
                const clamped = hasSelectedGoal && Number.isFinite(remaining)
                  ? Math.min(raw, remaining)
                  : raw;
                setAmount(Number.isFinite(clamped) ? clamped : "");
              }}
              width={isPortraitWidth ? 130 : 300}
              max={hasSelectedGoal && Number.isFinite(remaining) ? remaining : undefined}
              disabled={hasSelectedGoal ? goalComplete : false}
            />
            <AppSelect
              width={isPortraitWidth ? 150 : 300}
              value={selectedGoal}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGoal(e.target.value)}
            >
              <option value="">{'---'}</option>
              {savingsGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </AppSelect>
            <Button
              bg="teal.300"
              color="gray.900"
              size={isPortraitWidth ? "2xs" : "xs" }
              onClick={handleAdd}
              disabled={goalComplete}
            >
              Add Entry
            </Button>
          </Flex>
          <Center>
            <Text fontSize="sm" color={hasSelectedGoal ? (goalComplete ? 'green.600' : 'orange.500') : 'gray.500'}>
              {hasSelectedGoal
                ? (goalComplete
                  ? `✅ Goal complete! HINT: You may need to add a new savings goal to continue saving.` //TODO: Make HINT display on new line.
                  : `⚠️ $${(Number.isFinite(remaining) ? remaining : 0).toLocaleString()} remaining to complete "${goal?.name}"`)
                : `No goal selected — this entry won't count towards a goal.`}
            </Text>
          </Center>
          <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
        </Stack>
      </AppCollapsible>
    </Box>
  );
}
import { useState, useEffect } from 'react';
import { Button, VStack, Text, Input, HStack, Box, Checkbox, Flex, Heading, useMediaQuery } from '@chakra-ui/react';
import { useBudgetStore } from '../../store/budgetStore';
import { AppSelect } from './AppSelect';
import { DialogModal } from './DialogModal';
import { Tip } from "./Tip"
import { normalizeMoney } from "../../services/inputNormalization";
import { fireToast } from "../../hooks/useFireToast";

export default function SavingsReviewModal() {
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const addSavingsGoal = useBudgetStore((s) => s.addSavingsGoal);
  const queue = useBudgetStore((s) => s.savingsReviewQueue);
  const addSavingsLog = useBudgetStore((s) => s.addSavingsLog);
  const isOpen = useBudgetStore((s) => s.isSavingsModalOpen);
  const setIsOpen = useBudgetStore((s) => s.setSavingsModalOpen);
  const setConfirm = useBudgetStore((s) => s.setConfirmModalOpen);
  const resolveSavingsLink = useBudgetStore((s) => s.resolveSavingsLink);

  // Track which goal is selected for each entry
  const [selectedGoals, setSelectedGoals] = useState<{ [key: string]: string }>({});
  // Track which entries are creating a new goal
  const [isCreating, setIsCreating] = useState<{ [key: string]: boolean }>({});
  // Determine if an entry is currently in create mode
  const isEntryCreating = Object.values(isCreating).some(Boolean);
  // Track the text input for new goal names
  const [newGoalNames, setNewGoalNames] = useState<Record<string, { name?: string; target?: string }>>({});

  // Batch selection + assignment
  const [selectedEntryIds, setSelectedEntryIds] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selectedEntryIds).filter(Boolean).length;

  const [batchGoalId, setBatchGoalId] = useState<string>('');
  const [batchIsCreating, setBatchIsCreating] = useState(false);
  const [batchNewGoal, setBatchNewGoal] = useState<{ name?: string; target?: string }>({});

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  useEffect(() => {
    setSelectedGoals((prev) => {
      let changed = false;
      const next = { ...prev };
      queue.forEach((entry) => {
        if (next[entry.id] !== undefined) return;
        if (typeof entry?.name !== 'string') return;
        if (!entry.name.toLowerCase().includes('yearly')) return;
        const match = savingsGoals.find((g) =>
          typeof g?.name === 'string' ? g.name.toLowerCase().includes('yearly') : false
        );
        if (match?.id) {
          next[entry.id] = match.id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [queue, savingsGoals]);

  const handleChange = (id: string, goalId: string) => {
    if (goalId === '__newGoal') {
      // Switch to create mode for this entry
      setIsCreating(prev => ({ ...prev, [id]: true }));
      setSelectedGoals(prev => ({ ...prev, [id]: '' }));
    } else {
      // Normal selection
      setIsCreating(prev => ({ ...prev, [id]: false }));
      setSelectedGoals(prev => ({ ...prev, [id]: goalId }));
    }
  };

  const setAllSelected = (next: boolean) => {
    setSelectedEntryIds(() => {
      const mapped: Record<string, boolean> = {};
      for (const entry of queue) mapped[entry.id] = next;
      return mapped;
    });
  };

  const toggleSelected = (entryId: string, next: boolean) => {
    setSelectedEntryIds((prev) => ({ ...prev, [entryId]: next }));
  };

  const applyGoalToSelected = (goalIdToApply: string) => {
    const ids = Object.entries(selectedEntryIds)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
    if (ids.length === 0) return;

    setSelectedGoals((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = goalIdToApply;
      return next;
    });
    setIsCreating((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = false;
      return next;
    });
  };

  const handleBatchGoalChange = (nextGoalId: string) => {
    if (nextGoalId === '__newGoal') {
      setBatchIsCreating(true);
      setBatchGoalId('');
      return;
    }
    setBatchIsCreating(false);
    setBatchNewGoal({});
    setBatchGoalId(nextGoalId);
  };

  const handleBatchApply = () => {
    if (selectedCount === 0) return;

    const resetBatchUi = () => {
      // QOL: after a successful apply, clear selection + reset batch controls.
      setSelectedEntryIds({});
      setBatchIsCreating(false);
      setBatchNewGoal({});
      setBatchGoalId('');
    };

    if (batchIsCreating) {
      const name = batchNewGoal?.name?.trim();
      const target = normalizeMoney(batchNewGoal?.target, { min: 0, fallback: 0 });
      if (!name) return;

      const newGoalId = crypto.randomUUID();
      // Associate the new goal with the import session of the first selected entry (best-effort).
      const firstSelectedEntry = queue.find((e) => selectedEntryIds[e.id]);
      const originSessionId = firstSelectedEntry?.importSessionId;
      addSavingsGoal({ id: newGoalId, name, target, createdFromImportSessionId: originSessionId });

      applyGoalToSelected(newGoalId);
      resetBatchUi();
      return;
    }

    applyGoalToSelected(batchGoalId);
    resetBatchUi();
  };

  const handleSaveGoal = (entryId: string) => {
    const goalData = newGoalNames[entryId];
    const name = goalData?.name?.trim();
    const target = normalizeMoney(goalData?.target, { min: 0, fallback: 0 });
    if (!name) return;
    const newGoalId = crypto.randomUUID();
    const originSessionId = queue.find((e) => e.id === entryId)?.importSessionId;
    addSavingsGoal({ id: newGoalId, name, target, createdFromImportSessionId: originSessionId });
    // Assign the new goal to this entry
    setSelectedGoals(prev => ({ ...prev, [entryId]: newGoalId }));
    // Clear creation state
    setIsCreating(prev => ({ ...prev, [entryId]: false }));
    setNewGoalNames((prev) => ({ ...prev, [entryId]: {} }));
  };

  const closeConfirm = () => {
    setConfirm(true);
  }

  const handleSubmit = () => {
    try {
      queue.forEach((entry) => {
        const goalId = selectedGoals[entry.id] || null; // allow null
        addSavingsLog(entry.month, {
          goalId,
          date: entry.date,
          amount: entry.amount,
          name: entry.name,
          importSessionId: entry.importSessionId,
        });
      });
      // Resolve and cleanup centrally
      resolveSavingsLink(true);

      fireToast(
        "success",
        "Savings transactions linked",
        `Processed ${queue.length.toLocaleString("en-US")} savings transfer(s).`
      );
    } catch (err: unknown) {
      fireToast("error", "Error linking savings transactions", err instanceof Error ? err.message : String(err));
    }
  };

  if (!queue.length) return null;

  return (
    <DialogModal
      title='Review Savings Transfers'
      open={isOpen}
      modalMaxWidth="800px"
      setOpen={setIsOpen}
      onCancel={closeConfirm}
      initialFocus="accept"
      enterKeyAction="accept"
      acceptColorPalette='blue'
      acceptLabel='Confirm'
      onAccept={handleSubmit}
      acceptDisabled={isEntryCreating || batchIsCreating}
      body={
        <VStack align="stretch" gap={4} width={"100%"}>
          <Box>
            <Text color="fg.muted" fontSize="sm">
              These transactions were detected as savings. Assign each one to an existing savings goal, or leave it unassigned.
              You can also select multiple rows and batch-assign them to the same goal.
            </Text>
          </Box>

          <Box p={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel">
            <VStack align="stretch" gap={2}>
              <Heading size="sm">Batch actions</Heading>
              <Flex justify="space-between" flexWrap="wrap" gap={2}>
                <Checkbox.Root
                  checked={queue.length > 0 && selectedCount === queue.length}
                  onCheckedChange={(details) => setAllSelected(details.checked === true)}
                  colorPalette="blue"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control borderColor="fg" />
                  <Checkbox.Label color="fg">
                    Select all ({selectedCount}/{queue.length})
                  </Checkbox.Label>
                </Checkbox.Root>

                <HStack gap={2} flexWrap="wrap" justify="flex-end">
                  <AppSelect
                    placeholder="Batch: select goal"
                    aria-label="Batch select savings goal"
                    value={batchIsCreating ? '__newGoal' : batchGoalId}
                    onChange={(e) => handleBatchGoalChange(e.target.value)}
                  >
                    {savingsGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                    <option value="__newGoal">+ Create new goal…</option>
                  </AppSelect>
                </HStack>
              </Flex>

              {batchIsCreating ? (
              <Box border="1px solid" borderColor="gray.300" p={2} borderRadius="md" bg="bg.emphasized" w="100%">
                <Flex width="100%" wrap="wrap" gap={2} justifyContent="end">
                  <HStack wrap="wrap" justifyContent="space-between" gapX={4}>
                    <Input
                      width="250px"
                      bg="bg.panel"
                      placeholder="New goal name"
                      aria-label="Batch new goal name"
                      value={batchNewGoal?.name || ''}
                      onChange={(e) => setBatchNewGoal((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      width="250px"
                      type="number"
                      bg="bg.panel"
                      placeholder="Target amount"
                      aria-label="Batch new goal target amount"
                      value={batchNewGoal?.target || ''}
                      onChange={(e) => setBatchNewGoal((prev) => ({ ...prev, target: e.target.value }))}
                    />
                  </HStack>
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => {
                      setBatchIsCreating(false);
                      setBatchNewGoal({});
                      setBatchGoalId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Tip size="xs" color="fg.muted">
                    Click “Apply to selected” to create the goal and assign it, once you have entered the name and target amount.
                  </Tip>
                </Flex>
              </Box>
              ) : null}
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="outline"
                    onClick={handleBatchApply}
                    disabled={selectedCount === 0 || (!batchIsCreating && !batchGoalId) || (batchIsCreating && !(batchNewGoal?.name ?? '').trim())}
                  >
                    Apply to selected
                  </Button>
              <Tip size="sm" color="fg.muted">
                Not seeing a goal you expected? Make sure it was created before the transactions were imported, or that it’s associated with the correct import session.
              </Tip>
            </VStack>
          </Box>

          <Flex flexDir={"column"} p={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel" gap={4}>
            <Heading size="sm">Entries to review</Heading>

          {queue.map((entry) => (
            <VStack key={entry.id} p={3} gap={2} borderWidth={1} borderColor="border" borderRadius="md" bg="bg" alignItems="start">
              <Heading size="xs">Transaction ID: {entry.id}</Heading>
              <HStack justify="space-between" width="100%" gap={2}>
                <Checkbox.Root
                  checked={selectedEntryIds[entry.id] === true}
                  onCheckedChange={(details) => toggleSelected(entry.id, details.checked === true)}
                  colorPalette="blue"
                >
                  <Checkbox.HiddenInput/>
                  <Checkbox.Control borderColor="fg" />
                  <Checkbox.Label color="fg">Select</Checkbox.Label>
                </Checkbox.Root>

                {isPortraitWidth ? (
                  <Flex flexDirection={"column"} alignItems={"flex-end"}>
                    <Text fontSize="sm" fontWeight="semibold" color="fg.muted">{entry.date}</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="fg">
                      {entry.amount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="fg.subtle">{entry.name}</Text>
                  </Flex>
                ) : (
                <Text>
                  {entry.date} — ${entry.amount.toFixed(2)} — {entry.name}
                </Text>
                )}
              </HStack>

              <AppSelect
                placeholder="Don't add to goal"
                aria-label="Select savings goal"
                value={selectedGoals[entry.id] || ''}
                onChange={(e) => handleChange(entry.id, e.target.value)}
              >
                {savingsGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
                <option value="__newGoal">+ Create new goal…</option>
              </AppSelect>

              {isCreating[entry.id] && (
                <Box border="1px solid" borderColor="gray.300" p={2} borderRadius="md" bg="bg.emphasized" w="100%">
                  <VStack width="100%" gap={2}>
                    <Flex width="100%" wrap="wrap" justifyContent="space-between">
                      <Input
                        width="350px"
                        bg="bg.panel"
                        placeholder="New goal name"
                        aria-label="New goal name"
                        value={newGoalNames[entry.id]?.name || ''}
                        onChange={(e) =>
                          setNewGoalNames((prev) => ({
                            ...prev,
                            [entry.id]: { ...prev[entry.id], name: e.target.value }
                          }))
                        }
                      />
                      <Input
                        width="350px"
                        bg="bg.panel"
                        placeholder="Target amount"
                        aria-label="New goal target amount"
                        type="number"
                        value={newGoalNames[entry.id]?.target || ''}
                        onChange={(e) =>
                          setNewGoalNames((prev) => ({
                            ...prev,
                            [entry.id]: { ...prev[entry.id], target: e.target.value }
                          }))
                        }
                      />
                    </Flex>
                    <HStack>
                      <Button
                        size="sm"
                        colorPalette="teal"
                        onClick={() => handleSaveGoal(entry.id)}
                      >
                        Create Goal
                      </Button>
                      <Button
                        size="sm"
                        colorPalette="red"
                        variant="outline"
                        onClick={() => {
                          setIsCreating((prev) => ({ ...prev, [entry.id]: false }));
                          setNewGoalNames((prev) => ({ ...prev, [entry.id]: {} }));
                          setSelectedGoals((prev) => ({ ...prev, [entry.id]: '' }));
                        }}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </VStack>
              </Box>
              )}
              <Text fontSize="sm" color="fg.muted">
                Goal: {selectedGoals[entry.id] ? savingsGoals.find((g) => g.id === selectedGoals[entry.id])?.name : "None"}
              </Text>
            </VStack>
          ))}
                    </Flex>
        </VStack>
        }
      />
  );
}
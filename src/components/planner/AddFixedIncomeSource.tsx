import { useEffect, useRef, useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import type { ActualFixedIncomeSource } from '../../store/slices/plannerSlice'
import { Box, Flex, Stack, Input, Button, HStack, IconButton, Checkbox } from '@chakra-ui/react'
import { MdAdd, MdDelete, MdInfo, MdContentCopy } from "react-icons/md";
import { Tooltip } from '../ui/Tooltip';
import { fireToast } from '../../hooks/useFireToast';
import { normalizeMoney } from '../../services/inputNormalization';
import { errorToMessage } from '../../utils/appUtils';

// TODO: Use FormErrorMessage for better validation feedback

type AddFixedIncomeSourceProps = {
  origin?: 'Planner' | 'Tracker';
  selectedMonth: string; // e.g. '2024-08'
}

export default function AddFixedIncomeSource({ origin = 'Planner', selectedMonth }: AddFixedIncomeSourceProps) {

  const isTracker = origin === 'Tracker';

  const overiddenIncomeTotal = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal || 0);
  const setOveriddenIncomeTotal = useBudgetStore((s) => s.setOveriddenIncomeTotal);
  const addActualIncomeSource = useBudgetStore((s) => s.addActualIncomeSource);
  const removeActualIncomeSource = useBudgetStore((s) => s.removeActualIncomeSource);
  const updateMonthlyIncomeActuals = useBudgetStore((s) => s.updateMonthlyIncomeActuals);
  const sources = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.actualFixedIncomeSources ?? []);

  const [overrideEnabled, setOverrideEnabled] = useState(overiddenIncomeTotal >= 1);
  const lastSyncedMonthRef = useRef<string>(selectedMonth);

  const handleRemove = (id: string) => {
    const label = String(sources.find((s) => s.id === id)?.description || '').trim();
    const message = label
      ? `Are you sure you want to remove the income source "${label}"?`
      : 'Are you sure you want to remove this income source?';

    if (window.confirm(message)) {
      try {
        removeActualIncomeSource(selectedMonth, id)
        fireToast('success', 'Income source removed', label ? `Removed "${label}".` : 'Removed income source.')
      } catch (err: unknown) {
        fireToast('error', 'Could not remove income source', errorToMessage(err))
      }
    }
  }

  const setChecked = (checked: boolean) => {
    setOverrideEnabled(checked);
    if (!checked) {
      setOveriddenIncomeTotal(selectedMonth, 0);
    }
  };

  const copyIncomeName = async (value: string) => {
    const text = String(value ?? '');
    if (!text.trim()) {
      fireToast('info', 'Nothing to copy', 'This income name is empty.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      fireToast('success', 'Copied', 'Income name copied to clipboard.');
    } catch {
      fireToast('error', 'Copy failed', 'Could not copy to clipboard.');
    }
  };

  // Sync toggle state when the month changes. Avoid overriding the user's toggle
  // within the same month when the override total is still 0.
  useEffect(() => {
    if (lastSyncedMonthRef.current !== selectedMonth) {
      lastSyncedMonthRef.current = selectedMonth;
      setOverrideEnabled(overiddenIncomeTotal >= 1);
      return;
    }

    if (!overrideEnabled && overiddenIncomeTotal >= 1) {
      setOverrideEnabled(true);
    }
  }, [selectedMonth, overiddenIncomeTotal, overrideEnabled]);

  if (!isTracker) return null;

  return (
    <Box p={2} mt={3}>
        <Stack gap={3}>
        {sources.map((source: ActualFixedIncomeSource) => (
            <HStack key={source.id}>
            <Input
              value={source.description ?? ''}
              aria-invalid={!source?.description?.trim()}
              _invalid={{ borderColor: "red.500" }}
              onChange={(e) =>
                updateMonthlyIncomeActuals(selectedMonth, source.id, { description: e.target.value })
              }
              placeholder="Source name"
            />
            <Tooltip content="Copy name" placement="top">
              <IconButton
                aria-label="Copy income name"
                size="sm"
                variant="outline"
                onClick={() => void copyIncomeName(source.description ?? '')}
              >
                <MdContentCopy />
              </IconButton>
            </Tooltip>
            <Input
              type="number"
              value={String(source.amount ?? '')}
              aria-invalid={source.amount < 0}
              _invalid={{ borderColor: "red.500" }}
              onChange={(e) =>
                updateMonthlyIncomeActuals(selectedMonth, source.id, { amount: normalizeMoney(e.target.value, { min: 0 }) })
              }
              placeholder="Amount"
            />
            {source.id !== 'main' &&
              <IconButton
                aria-label="Remove source"
                onClick={() => handleRemove(source.id)}
                size="sm"
                colorScheme="red"
              >
                <MdDelete />
              </IconButton>
            }
            </HStack>
        ))}

        <Flex justifyContent="space-between" alignItems="center">
            <Box width={'25%'} p={1}>
            <Button
              onClick={() => addActualIncomeSource(selectedMonth, { description: '', amount: 0 })}
              size="sm"
            >
              <MdAdd />
              Add Source
            </Button>
            </Box>
            <Flex gap={2} alignItems="center" p={2} borderWidth={1} borderColor="border.error">
              <Flex gap={2} alignItems="center" py={'7px'} px={4} borderWidth={1}
                  borderColor="border" borderRadius={'md'}>
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
                  <MdInfo />
                </Tooltip>
              </Flex>
              <Input
                  type="number"
                  value={overrideEnabled ? (overiddenIncomeTotal ?? '') : ''}
                  disabled={!overrideEnabled}
                  onChange={(e) => {
                    setOveriddenIncomeTotal(selectedMonth, normalizeMoney(e.target.value, { min: 0 }));
                  }}
              />
            </Flex>
        </Flex>
        </Stack>
    </Box>
  )
}
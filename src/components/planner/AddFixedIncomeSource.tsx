import { useState, useEffect } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { Box, Flex, Stack, Input, Button, HStack, IconButton, Checkbox } from '@chakra-ui/react'
import { MdAdd, MdDelete, MdInfo } from "react-icons/md";
import { Tooltip } from '../ui/Tooltip';
import { fireToast } from '../../hooks/useFireToast';

// TODO: Use FormErrorMessage for better validation feedback

type AddFixedIncomeSourceProps = {
  origin?: 'Planner' | 'Tracker';
  selectedMonth: string; // e.g. '2024-08'
}

export default function AddFixedIncomeSource({ origin = 'Planner', selectedMonth }: AddFixedIncomeSourceProps) {

  const overiddenIncomeTotal = useBudgetStore((s) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal || 0);
  const setOveriddenIncomeTotal = useBudgetStore((s) => s.setOveriddenIncomeTotal);
  const addSourceRaw = useBudgetStore((s) => s.addFixedIncomeSource);
  const updateSourceRaw = useBudgetStore((s) => s.updateFixedIncomeSource);
  const removeSourceRaw = useBudgetStore((s) => s.removeFixedIncomeSource);
  const addActualIncomeSource = useBudgetStore((s) => s.addActualIncomeSource);
  const removeActualIncomeSource = useBudgetStore((s) => s.removeActualIncomeSource);
  const updateMonthlyIncomeActuals = useBudgetStore((s) => s.updateMonthlyIncomeActuals);
  const actualraw = useBudgetStore((s) => s.monthlyActuals[selectedMonth]);
  const actual = actualraw;
  const sources = actual?.actualFixedIncomeSources || [];

  const [overrideEnabled, setOverrideEnabled] = useState(overiddenIncomeTotal >= 1);
  const isTracker = origin === 'Tracker';

  const addSource = isTracker
  ? (entry: Omit<any, 'id'>) => addActualIncomeSource(selectedMonth, entry)
  : addSourceRaw;
  const updateSource = isTracker
    ? (id: string, data: Partial<any>) => updateMonthlyIncomeActuals(selectedMonth, id, data)
    : updateSourceRaw;
  const removeSource = isTracker
    ? (id: string) => removeActualIncomeSource(selectedMonth, id)
    : removeSourceRaw;

  const handleRemove = (id: string) => {
    const label = String(sources.find((s: any) => s.id === id)?.description || '').trim();
    const message = label
      ? `Are you sure you want to remove the income source "${label}"?`
      : 'Are you sure you want to remove this income source?';

    if (window.confirm(message)) {
      try {
        removeSource(id)
        fireToast('success', 'Income source removed', label ? `Removed "${label}".` : 'Removed income source.')
      } catch (err: any) {
        fireToast('error', 'Could not remove income source', err?.message || 'Please try again.')
      }
    }
  }

  const setChecked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = Boolean(e.target.checked);
    setOverrideEnabled(checked);
    if (!checked) {
      setOveriddenIncomeTotal(selectedMonth, 0);
    }
  }

  // ✅ SYNC toggle state on load (in case store updates later)
  useEffect(() => {
    setOverrideEnabled(overiddenIncomeTotal >= 1);
  }, [overiddenIncomeTotal]);

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mt={6}>

        <Stack gap={3}>
        {sources.map((source: any) => (
            <HStack key={source.id}>
            <Input
              value={source.description ?? ''}
              aria-invalid={!source?.description?.trim()}
              _invalid={{ borderColor: "red.500" }}
              onChange={(e) =>
                updateSource(source.id, { description: e.target.value })
              }
              placeholder="Source name"
            />
            <Input
              type="number"
              value={String(source.amount ?? '')}
              aria-invalid={source.amount < 0}
              _invalid={{ borderColor: "red.500" }}
              onChange={(e) =>
                updateSource(source.id, { amount: parseFloat(e.target.value) || 0 })
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

        {!isTracker ? (
            <Box width={'25%'} p={1}>
            <Button
              onClick={() => addSource({ description: '', amount: 0 })}
              size="sm"
            >
              <MdAdd />
              Add Source
            </Button>
            </Box>
        ) : (
        <Flex justifyContent="space-between" alignItems="center">
            <Box width={'25%'} p={1}>
            <Button
              onClick={() => addSource({ description: '', amount: 0 })}
              size="sm"
            >
              <MdAdd />
              Add Source
            </Button>
            </Box>
            <Flex gap={2} alignItems="center" p={2} borderWidth={1} borderColor={'lightpink'}>
              <Flex gap={2} alignItems="center" py={'7px'} px={4} borderWidth={1}
                  borderColor={'gray.200'} borderRadius={'md'}>
                  <Checkbox.Root
                    checked={overrideEnabled}
                    onCheckedChange={(e: any) =>
                      setChecked({
                        target: { checked: e.checked === true },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
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
                    const value = parseFloat(e.target.value);
                    setOveriddenIncomeTotal(selectedMonth, isNaN(value) ? 0 : value);
                  }}
              />
            </Flex>
        </Flex>
        )}
        </Stack>
    </Box>
  )
}
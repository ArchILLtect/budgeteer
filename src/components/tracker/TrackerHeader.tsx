import { Box, Center, Flex, Text, Button, IconButton, useDisclosure } from '@chakra-ui/react';
import { TiArrowLeftThick, TiArrowRightThick } from "react-icons/ti";
import { useBudgetStore } from '../../store/budgetStore';
import { Suspense, lazy, useMemo, useState } from 'react';
import InlineSpinner from '../ui/InlineSpinner';
const ScenarioPlanModal = lazy(() => import('./ScenarioPlanModal'));
import dayjs from 'dayjs';
import { formatUtcMonthKey } from '../../services/dateTime';

// TODO: Create an edit plan modal
// TODO: Switch to using a modal for plan removal confirmation
// TODO: ?Add an undo for plan removal?

export default function TrackerHeader() {
    const selectedMonth = useBudgetStore((s) => s.selectedMonth);
    const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);
    const monthlyPlans = useBudgetStore((s) => s.monthlyPlans);
    const removeMonthlyPlan = useBudgetStore((s) => s.removeMonthlyPlan);
    const accounts = useBudgetStore((s) => s.accounts);
    const { open, onOpen, onClose } = useDisclosure();
    const [planTargetMonths, setPlanTargetMonths] = useState<string[] | undefined>(undefined);

    const plan = monthlyPlans[selectedMonth];
    const formatted = formatUtcMonthKey(selectedMonth, { noneLabel: 'n/a', month: 'long' });

    const appliedMonths = useMemo(() => {
        const set = new Set<string>();
        for (const acct of Object.values(accounts || {})) {
            for (const tx of acct?.transactions || []) {
                if (!tx?.budgetApplied) continue;
                const m = tx?.date?.slice(0, 7);
                if (m) set.add(m);
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [accounts]);

    const eligibleAppliedMonths = useMemo(
        () => appliedMonths.filter((m) => !monthlyPlans[m]),
        [appliedMonths, monthlyPlans]
    );

    const shiftMonth = (direction: number) => {
        const newDate = dayjs(selectedMonth).add(direction, 'month');
        setSelectedMonth(newDate.format('YYYY-MM'));
    };

    const handleRemove = () => {
        const didConfirm = window.confirm(
            `Are you sure you want to remove the plan for ${formatted}?`
        );
        if (didConfirm) {
            removeMonthlyPlan(selectedMonth);
        }
    };

    const handleTempButton = () => {
        window.alert(
            'Coming soon!\n\nFor now, edit the scenario in Planner, then remove and re-set the plan for this month.'
        )
    }

    return (
        <Box p={2} borderTopRadius="lg" boxShadow="md" bg="bg.subtle" borderWidth={2} borderColor="border">
            <Center my={1}>
                <Flex bg="bg.panel" borderWidth={1} borderColor="border" borderRadius="md">
                    <IconButton
                        size="sm"
                        onClick={() => shiftMonth(-1)}
                        aria-label="Previous Month"
                    >
                      <TiArrowLeftThick />
                    </IconButton>

                    <Text fontSize="lg" fontWeight="bold" mx={4} >{formatted}</Text>

                    <IconButton
                        size="sm"
                        onClick={() => shiftMonth(1)}
                        aria-label="Next Month"
                    >
                      <TiArrowRightThick />
                    </IconButton>
                </Flex>

            </Center>

            {!plan ? (
                <Center mt={1}>
                    <Flex gap={2} align="center" wrap="wrap" justify="center">
                        <Button
                            colorScheme="teal"
                            size="xs"
                            onClick={() => {
                                setPlanTargetMonths(undefined);
                                onOpen();
                            }}
                        >
                            Set plan
                        </Button>
                        <Button
                            variant="outline"
                            colorScheme="teal"
                            size="xs"
                            disabled={eligibleAppliedMonths.length === 0}
                            onClick={() => {
                                setPlanTargetMonths(appliedMonths);
                                onOpen();
                            }}
                        >
                            Set plan (applied months)
                        </Button>
                    </Flex>
                </Center>
            ) : (
                <Center alignContent="center" gap={3}>
                    <Text fontSize="sm" color="fg.muted">
                        Plan: {plan.scenarioName || 'Unnamed'}
                    </Text>
                    <Button size="xs" variant="outline" colorPalette="blue" onClick={() => handleTempButton()}>
                        Edit plan/actuals
                    </Button>
                    <Button size="xs" variant="outline" colorPalette="red" onClick={handleRemove}>
                        Remove plan
                    </Button>
                </Center>
            )}
        <Suspense fallback={<InlineSpinner />}>
            <ScenarioPlanModal
                isOpen={open}
                onClose={() => {
                    setPlanTargetMonths(undefined);
                    onClose();
                }}
                targetMonths={planTargetMonths}
            />
        </Suspense>
        </Box>
    );
}

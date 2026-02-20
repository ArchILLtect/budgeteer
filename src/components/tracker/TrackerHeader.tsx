import { Box, Center, Flex, Text, Button, IconButton, useDisclosure } from '@chakra-ui/react';
import { TiArrowLeftThick, TiArrowRightThick } from "react-icons/ti";
import { useBudgetStore } from '../../store/budgetStore';
import { Suspense, lazy } from 'react';
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
    const { open, onOpen, onClose } = useDisclosure();

    const plan = monthlyPlans[selectedMonth];
    const formatted = formatUtcMonthKey(selectedMonth, { noneLabel: 'n/a', month: 'long' });

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
                    <Button colorScheme="teal" size="xs" onClick={onOpen}>
                        Set plan
                    </Button>
                </Center>
            ) : (
                <Center alignContent="center" gap={3}>
                    <Text fontSize="sm" color="fg.muted">
                        Plan: {plan.scenarioName || 'Unnamed'}
                    </Text>
                    <Button size="xs" variant="outline" colorScheme="blue" onClick={() => handleTempButton()}>
                        Edit plan/actuals
                    </Button>
                    <Button size="xs" variant="outline" colorScheme="red" onClick={handleRemove}>
                        Remove plan
                    </Button>
                </Center>
            )}
        <Suspense fallback={<InlineSpinner />}>
            <ScenarioPlanModal isOpen={open} onClose={onClose} />
        </Suspense>
        </Box>
    );
}

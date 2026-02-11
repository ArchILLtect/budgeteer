import { Box, Center, Flex, Text, Button, IconButton, useDisclosure } from '@chakra-ui/react';
import { TiArrowLeftThick, TiArrowRightThick } from "react-icons/ti";
import { useBudgetStore } from '../../store/budgetStore';
import { Suspense, lazy } from 'react';
import InlineSpinner from '../ui/InlineSpinner';
const ScenarioPlanModal = lazy(() => import('./ScenarioPlanModal'));
import dayjs from 'dayjs';

// TODO: Create an edit plan modal
// TODO: Switch to using a modal for plan removal confirmation
// TODO: ?Add an undo for plan removal?

export default function TrackerHeader() {
    const selectedMonth = useBudgetStore((s) => s.selectedMonth);
    const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);
    const monthlyPlans = useBudgetStore((s: any) => s.monthlyPlans);
    const removeMonthlyPlan = useBudgetStore((s) => s.removeMonthlyPlan);
    const { open, onOpen, onClose } = useDisclosure();

    const plan = monthlyPlans[selectedMonth];
    const formatted = dayjs(selectedMonth).format('MMMM YYYY');

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
        window.alert('This feature coming soon!\n\nFor now you must edit the scenario in the Budget Planner and then "Remove Plan" and re-"Set Plan"')
    }

    return (
        <Box p={2} borderTopRadius="lg" boxShadow="md" bg="gray.50" borderWidth={2}>
            <Center my={1}>
                <Flex bg={'white'}>
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
                        Set Plan
                    </Button>
                </Center>
            ) : (
                <Center alignContent="center" gap={3}>
                    <Text fontSize="sm" color="gray.500">
                        Plan: {plan.scenarioName || 'Unnamed'}
                    </Text>
                    <Button size="xs" variant="outline" colorScheme="blue" onClick={() => handleTempButton()}>
                        Edit Plan/Actual
                    </Button>
                    <Button size="xs" variant="outline" colorScheme="red" onClick={handleRemove}>
                        Remove Plan
                    </Button>
                </Center>
            )}
        <Suspense fallback={<InlineSpinner />}>
            <ScenarioPlanModal isOpen={open} onClose={onClose} />
        </Suspense>
        </Box>
    );
}

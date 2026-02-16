import { useState } from 'react'
import { Box, Heading, Center, Text, VStack } from '@chakra-ui/react'
import ScenarioSelector from '../components/planner/ScenarioSelector';
import IncomeCalculator from '../components/planner/IncomeCalculator';
import ExpenseTracker from '../components/planner/ExpenseTracker';
import { Suspense, lazy } from 'react';
import InlineSpinner from '../components/ui/InlineSpinner';
import { useBudgetStore } from '../store/budgetStore';
const ExpensePie = lazy(() => import('../components/ExpensePie'));
const preloadExpensePie = () => import('../components/ExpensePie');

// TODO: Create a toast for when a scenario is created.

function BudgetPlannerPage() {
  const [isOpen, setIsOpen] = useState(false);

  const selectedMonth = useBudgetStore((s) => s.selectedMonth);

  return (
    <Box bg="bg.subtle" p={4} minH="100%">
      <Box p={4} maxW="80%" mx="auto" borderWidth={1} borderColor="border" borderRadius="lg" boxShadow="md" bg="bg.panel">
        <Center mb={4}>
          <VStack gap={1}>
            <Heading size="md" fontWeight={700} onMouseEnter={preloadExpensePie}>
              Planner
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              Build a monthly plan for income, expenses, and savings.
            </Text>
          </VStack>
        </Center>
        <ScenarioSelector isOpen={isOpen} onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)} />
        <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
        <IncomeCalculator selectedMonth={selectedMonth} />
        <ExpenseTracker origin='Planner'/>
        <Suspense fallback={<InlineSpinner />}>
          <ExpensePie />
        </Suspense>
        <Text mt={4} fontSize="sm" color="fg.muted">
          All values are editable. Changes will be reflected in the Tracker.
        </Text>
      </Box>
    </Box>
  )
}

export default BudgetPlannerPage
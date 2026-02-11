import { useState, useEffect, useMemo } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { Box, Flex, Heading, HStack, Tabs, Stack, Text, Stat,
    StatGroup, RadioGroup, Button, Icon, 
    Field} from '@chakra-ui/react'
import AddFixedIncomeSource from '../../components/planner/AddFixedIncomeSource'
import IncomeSourceForm from '../../components/forms/IncomeSourceForm'
import { MdInfo } from "react-icons/md";
import { Tooltip } from "../ui/Tooltip";
import { AppCollapsible } from '../ui/AppCollapsible'

type IncomeCalculatorProps = {
  origin?: 'Planner' | 'Tracker';
  selectedMonth: string;
};

export default function IncomeCalculator({ origin = 'Planner', selectedMonth }: IncomeCalculatorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { scenarios, currentScenario, updateScenario } = useBudgetStore();
  const sources = useBudgetStore((s) => s.incomeSources)
  const showIncomeInputs = useBudgetStore((s) => s.showIncomeInputs)
  const setShowIncomeInputs = useBudgetStore((s) => s.setShowIncomeInputs)
  const selectedId = useBudgetStore((s) => s.selectedSourceId)
  const setSelected = useBudgetStore((s) => s.selectIncomeSource)
  const updateSource = useBudgetStore((s) => s.updateIncomeSource)
  const addSource = useBudgetStore((s) => s.addIncomeSource)
  const setFilingStatus = useBudgetStore((s) => s.setFilingStatus)
  const grossTotal = useBudgetStore.getState().getTotalGrossIncome();
  const monthlyActuals = useBudgetStore((s) => s.monthlyActuals[selectedMonth]);
  const overiddenIncomeTotal = useBudgetStore(
    (s) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal
  );

  const activeSource = useMemo(() => sources.find((s) => s.id === selectedId) || sources[0] || {}, [sources, selectedId])
  const { net, breakdown } = useBudgetStore.getState().getTotalNetIncome();

  const isTracker = origin === 'Tracker';
  // TODO: Connect filing status with tax rate calcs

  const handleAddSource = () => {
    const id = crypto.randomUUID(); // generate a new ID here
    const newSource = {
      id,
      description: `Income ${sources.length + 1}`,
      type: 'hourly',
      hourlyRate: 0,
      hoursPerWeek: 0,
      grossSalary: 0,
      state: 'WI',
    }

    addSource(newSource)     // ✅ uses our updated store logic
    setSelected(id)          // ✅ auto-switch to the new tab
  }

  const handleUpdateFilingStatus = (val: string) => {

    updateScenario(currentScenario, { filingStatus: val })
    setFilingStatus(val)
  }

  const handleTempButton = () => {
    // Intentional: temporary feature placeholder
    window.alert('This feature coming soon')
  }

  // Update the active source's net when total changes, guarded to avoid loops
  const activeSourceId = activeSource?.id
  const activeSourceNetIncome = activeSource?.netIncome
  useEffect(() => {
    if (!activeSourceId) return
    const nextNet = Number(net) || 0
    const currentNet = Number(activeSourceNetIncome) || 0
    if (currentNet !== nextNet) {
      updateSource(activeSourceId, { netIncome: nextNet })
    }
    // IMPORTANT: depend only on the specific fields, not the whole source object/array
  }, [activeSourceId, activeSourceNetIncome, net, updateSource])

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mb={6}>
      <Flex justifyContent="space-between" alignItems="center" borderWidth={1} p={3} borderRadius="lg">
        <Heading size="md">Monthly Income</Heading>
        {!isTracker &&
          <Button variant={'outline'} colorScheme="blue" onClick={() => handleTempButton()}>Use Fixed Income</Button>
        }
        {!isTracker ? (
          <Heading size="md">${(net/12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Heading>
        ) : (
          <Heading size="md">
            {monthlyActuals
              ? `$${(overiddenIncomeTotal != null && overiddenIncomeTotal >= 1
                  ? overiddenIncomeTotal
                  : monthlyActuals.actualTotalNetIncome
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : 'No actual income yet'}
          </Heading>
        )}
      </Flex>
      <Flex justifyContent={'end'} my={2}>
        <Button size="xs" variant="ghost" colorScheme="blue" ml={2} onClick={() => setShowIncomeInputs(!showIncomeInputs)}>
          {showIncomeInputs ? 'Hide Income Inputs' : 'Show Income Inputs'}
        </Button>
      </Flex>

      {/* TODO(P2): Create a new component for this collapsible section--AppCollapsible doesn't support controlled open/close state */}
      <AppCollapsible title="Income Details">
      {isTracker ? (
        <AddFixedIncomeSource origin={origin} selectedMonth={selectedMonth} />
      ) : (
        <>
          <Field.Root mb={4}>
            <Field.Label>Filing Status</Field.Label>
            <RadioGroup.Root
              value={scenarios[currentScenario].filingStatus}
              onChange={handleUpdateFilingStatus as any}
            >
              <HStack gap={4}>
                  <RadioGroup.Item value="single">Single</RadioGroup.Item>
                  <RadioGroup.Item value="headOfHousehold">Head of household</RadioGroup.Item>
                  <RadioGroup.Item value="marriedSeparate">Married filing seperately</RadioGroup.Item>
                  <RadioGroup.Item value="marriedJoint">Married filing jointly</RadioGroup.Item>
              </HStack>
            </RadioGroup.Root>
          </Field.Root>
          
          <Tabs.Root
            value={selectedId ?? sources[0]?.id}
            onValueChange={(details) => {
              const nextId = details.value;
              if (nextId === "__add__") {
                handleAddSource();
                return;
              }
              setSelected(nextId);
            }}
            variant="enclosed"
          >
            <Tabs.List>
              {sources.map((source) => (
                <Tabs.Trigger key={source.id} value={source.id}>
                  {source.description}
                </Tabs.Trigger>
              ))}

              <Tabs.Trigger value="__add__">+ Add</Tabs.Trigger>
            </Tabs.List>

            {sources.map((source) => (
              <Tabs.Content key={source.id} value={source.id}>
                <IncomeSourceForm source={source} onUpdate={updateSource} />
              </Tabs.Content>
            ))}
          </Tabs.Root>
          </>
      )}
      </AppCollapsible>

      {/* Estimated Income Output */}
      {grossTotal > 0 && !isTracker ? (
        <Box mt={2} px={4} py={3} borderWidth={1} borderRadius="md" bg="gray.50">
          <StatGroup>
            <Stat.Root textAlign={'center'}>
              <Stat.Label>Est. Gross Salary</Stat.Label>
              <Stat.ValueText color="teal.600">${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Stat.ValueText>
              <Stat.HelpText mb={0}>Before taxes</Stat.HelpText>
            </Stat.Root>

            <Stat.Root textAlign={'center'}>
              <Stat.Label>
                💰 Est. Net Salary
                <Tooltip content="Includes federal, state, SS, and Medicare taxes" placement="right">
                  <Icon as={MdInfo} color="gray.500" ml={1} />
                </Tooltip>
              </Stat.Label>
              <Stat.ValueText color="green.600">
                ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Stat.ValueText>
              <Stat.HelpText mb={0}>
                <Stack gap={0}>
                  <Text>After taxes</Text>
                  <Button size="xs" variant="ghost" colorScheme="blue" ml={2} onClick={() => setShowDetails(!showDetails)}>
                    {showDetails ? 'Hide Breakdown' : 'Show Breakdown'}
                  </Button>
                </Stack>

                <AppCollapsible title="Tax Breakdown">
                  <Stack mt={3} gap={2}>
                    <Box bg="gray.100" p={3} borderRadius="md">
                      <Text fontWeight="semibold">Estimated Federal Tax:</Text>
                      <Text>${breakdown.federalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Box>
                    <Box bg="gray.100" p={3} borderRadius="md">
                      <Text fontWeight="semibold">State Tax (WI):</Text>
                      <Text>${breakdown.stateTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Box>
                    <Box bg="gray.100" p={3} borderRadius="md">
                      <Text fontWeight="semibold">Social Security:</Text>
                      <Text>${breakdown.ssTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Box>
                    <Box bg="gray.100" p={3} borderRadius="md">
                      <Text fontWeight="semibold">Medicare:</Text>
                      <Text>${breakdown.medicareTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Box>
                  </Stack>
                </AppCollapsible>
              </Stat.HelpText>
            </Stat.Root>
          </StatGroup>
        </Box>
      ) : (null) }
    </Box>
  )
}
import { useState, useMemo } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { Box, Flex, Heading, HStack, Tabs, Stack, Text, Stat,
    StatGroup, RadioGroup, Button, Icon, 
    Field} from '@chakra-ui/react'
import AddFixedIncomeSource from '../../components/planner/AddFixedIncomeSource'
import IncomeSourceForm from '../../components/forms/IncomeSourceForm'
import { MdInfo } from "react-icons/md";
import { Tooltip } from "../ui/Tooltip";
import { AppCollapsible } from '../ui/AppCollapsible'
import { calculateTotalTaxes } from '../../utils/calcUtils'
import { formatCurrency } from '../../utils/formatters'

type IncomeCalculatorProps = {
  origin?: 'Planner' | 'Tracker';
  selectedMonth: string;
};

type FilingStatus = "single" | "head" | "separate" | "joint";

const FilingStatusOptions = [
    { value: "single", label: "Single" },
    { value: "head", label: "Head of Household" },
    { value: "separate", label: "Married Filing Separately" },
    { value: "joint", label: "Married Filing Jointly" },
  ];

export default function IncomeCalculator({ origin = 'Planner', selectedMonth }: IncomeCalculatorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const scenarios = useBudgetStore((s: any) => s.scenarios)
  const currentScenario = useBudgetStore((s: any) => s.currentScenario)
  const updateScenario = useBudgetStore((s: any) => s.updateScenario)
  const sources = useBudgetStore((s) => s.incomeSources)
  const showIncomeInputs = useBudgetStore((s) => s.showIncomeInputs)
  const setShowIncomeInputs = useBudgetStore((s) => s.setShowIncomeInputs)
  const selectedId = useBudgetStore((s) => s.selectedSourceId)
  const setSelected = useBudgetStore((s) => s.selectIncomeSource)
  const updateSource = useBudgetStore((s) => s.updateIncomeSource)
  const addSource = useBudgetStore((s) => s.addIncomeSource)
  const setFilingStatus = useBudgetStore((s) => s.setFilingStatus)
  const grossTotal = useBudgetStore((s) => s.getTotalGrossIncome());
  const monthlyActuals = useBudgetStore((s) => s.monthlyActuals[selectedMonth]);
  const trackerIncomeTotal = useBudgetStore((s: any) => {
    const actualSources = s.monthlyActuals[selectedMonth]?.actualFixedIncomeSources;
    if (!Array.isArray(actualSources)) return 0;
    return actualSources.reduce((sum: number, src: any) => sum + (Number(src?.amount) || 0), 0);
  });
  const overiddenIncomeTotal = useBudgetStore(
    (s) => s.monthlyActuals[selectedMonth]?.overiddenIncomeTotal
  );

  // Avoid selecting an object from Zustand (unstable snapshot -> infinite loop warnings).
  // Compute derived totals from primitives instead.
  const effectiveFilingStatus = scenarios?.[currentScenario]?.filingStatus ?? 'single'
  const breakdown = useMemo(
    () => calculateTotalTaxes(grossTotal, effectiveFilingStatus),
    [grossTotal, effectiveFilingStatus]
  )
  const net = useMemo(() => grossTotal - breakdown.total, [grossTotal, breakdown.total])

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
      weeklySalary: 0,
      biWeeklySalary: 0,
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

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mb={6} bg="bg.muted" borderColor="border">
      <Flex justifyContent="space-between" alignItems="center" borderWidth={1} p={3} borderRadius="lg" bg="bg.panel" borderColor="border">
        <Heading size="md">Income (Monthly)</Heading>
        {!isTracker &&
          <Button variant={'outline'} colorScheme="blue" bg="bg.emphasized" onClick={() => handleTempButton()}>Use Fixed Income</Button>
        }
        {!isTracker ? (
          <Heading size="md">{formatCurrency(net / 12)}</Heading>
        ) : (
          <Heading size="md">
            {monthlyActuals
              ? formatCurrency(
                  overiddenIncomeTotal != null && overiddenIncomeTotal >= 1
                    ? overiddenIncomeTotal
                    : trackerIncomeTotal
                )
              : 'No actual income yet'}
          </Heading>
        )}
      </Flex>

      <Box border={"1px solid"} borderColor="border" borderRadius={"lg"} my={3} p={2} bg="bg.panel">
      <AppCollapsible
        mt={0}
        mb={"4px"}
        fontSize='md'
        title="Income Details"
        ariaLabel="Toggle income details"
        defaultOpen={showIncomeInputs}
        open={showIncomeInputs}
        onOpenChange={(open) => setShowIncomeInputs(open)}
        headerCenter={
          <Text fontSize="xs" colorScheme="blue" onClick={() => setShowIncomeInputs(!showIncomeInputs)}>
            {showIncomeInputs ? '▲ Hide Income Inputs ▲' : '▼ Show Income Inputs ▼'}
          </Text>
        }
      >
      {isTracker ? (
        /* TODO(P4) For Tracker, introduce a modal that allows user to either add fixed amount or calculate similar to Budget Planner */
        <AddFixedIncomeSource origin={origin} selectedMonth={selectedMonth} />
      ) : (
        <>
          <Field.Root mb={4}>
            <Field.Label>Filing Status</Field.Label>
            <RadioGroup.Root
              value={effectiveFilingStatus}
              onValueChange={(details) => {
                const next = details.value as FilingStatus;
                if (!currentScenario) return;
                if (next === effectiveFilingStatus) return;
                
                handleUpdateFilingStatus(next);
              }}
            >
              <HStack gap={4} wrap={'wrap'}>
                {FilingStatusOptions.map((opt) => (
                  <RadioGroup.Item key={opt.value} value={opt.value as FilingStatus}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl>
                      <RadioGroup.ItemIndicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </HStack>
            </RadioGroup.Root>
          </Field.Root>
          
          {sources.length === 0 ? (
            <Stack gap={2}>
              <Text fontSize="sm" color="fg.muted">
                No income sources yet. Add one to estimate gross/net monthly income.
              </Text>
              <Button size="sm" variant="outline" alignSelf="flex-start" onClick={handleAddSource}>
                + Add income source
              </Button>
            </Stack>
          ) : (
            <Tabs.Root
              value={selectedId ?? sources[0].id}
              borderTopRadius="lg"
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
              <Tabs.List borderTopRadius="lg" borderBottomRadius={"none"} borderX={"1px solid"} borderTop={"1px solid"} borderColor="border" bg={"bg.emphasized"}>
                {sources.map((source) => (
                  <Tabs.Trigger key={source.id} value={source.id}>
                    {source.description}
                  </Tabs.Trigger>
                ))}

                <Tabs.Trigger value="__add__">+ Add</Tabs.Trigger>
              </Tabs.List>
              <Box p={4} borderWidth={1} borderColor="border" borderBottomRadius="lg" borderTopRightRadius={"lg"} bg="bg.subtle">
                {sources.map((source) => (
                  <Tabs.Content key={source.id} value={source.id} pt={0}>
                    <IncomeSourceForm source={source} onUpdate={updateSource} />
                  </Tabs.Content>
                ))}
              </Box>
            </Tabs.Root>
          )}
          </>
      )}
      </AppCollapsible>
      </Box>

      {/* Estimated Income Output */}
      {grossTotal > 0 && !isTracker ? (
        <Box mt={2} px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.subtle">
          <StatGroup>
            <Stat.Root>
              <Flex justifyContent={'center'} flexDirection={'column'} alignItems={'center'} gap={1}>
                <Stat.Label>Est. Gross Salary</Stat.Label>
                <Stat.ValueText color="teal.600">{formatCurrency(grossTotal)}</Stat.ValueText>
                <Stat.HelpText mb={0}>Before taxes</Stat.HelpText>
              </Flex>
            </Stat.Root>

            <Stat.Root>
              <Flex justifyContent={'center'} flexDirection={'column'} alignItems={'center'} gap={1}>
                <Stat.Label>
                  💰 Est. Net Salary
                  <Tooltip content="Includes federal, state, SS, and Medicare taxes" placement="right">
                    <Icon as={MdInfo} color="fg.muted" ml={1} />
                  </Tooltip>
                </Stat.Label>
                <Stat.ValueText color="green.600">
                  {formatCurrency(net)}
                </Stat.ValueText>
                <Stat.HelpText mb={2}>
                  <Text fontSize={'xs'} textAlign={'center'}>After taxes</Text>

                  <Box mt={2} width={'100%'} borderWidth={1} borderColor="border" borderRadius={'md'} p={0}>
                    <AppCollapsible
                      title="Tax Breakdown"
                      fontSize='sm'
                      mt={0}
                      mb={0}
                      defaultOpen={showDetails}
                      open={showDetails}
                      onOpenChange={(open) => setShowDetails(open)}
                      headerRight={
                        <Text fontSize="xs" colorScheme="blue" onClick={() => setShowDetails(!showDetails)} minW={"150px"}>
                          {showDetails ? '▲ Hide Breakdown ▲' : '▼ Show Breakdown ▼'}
                        </Text>
                      }
                    >
                      <Stack mt={3} gap={1}>
                        <Flex bg="bg.emphasized" p={3} borderRadius="md" justifyContent="space-between" alignItems="center" flexDirection={"row"}>
                          <Text fontWeight="semibold">Estimated Federal Tax:</Text>
                          <Text>{formatCurrency(breakdown.federalTax)}</Text>
                        </Flex>
                        <Flex bg="bg.muted" p={3} borderRadius="md" justifyContent="space-between" alignItems="center" flexDirection={"row"}>
                          <Text fontWeight="semibold">State Tax (WI):</Text>
                          <Text>{formatCurrency(breakdown.stateTax)}</Text>
                        </Flex>
                        <Flex bg="bg.emphasized" p={3} borderRadius="md" justifyContent="space-between" alignItems="center" flexDirection={"row"}>
                          <Text fontWeight="semibold">Social Security:</Text>
                          <Text>{formatCurrency(breakdown.ssTax)}</Text>
                        </Flex>
                        <Flex bg="bg.muted" p={3} borderRadius="md" justifyContent="space-between" alignItems="center" flexDirection={"row"}>
                          <Text fontWeight="semibold">Medicare:</Text>
                          <Text>{formatCurrency(breakdown.medicareTax)}</Text>
                        </Flex>
                      </Stack>
                    </AppCollapsible>
                  </Box>
                </Stat.HelpText>
              </Flex>
            </Stat.Root>
          </StatGroup>
        </Box>
      ) : (null) }
    </Box>
  )
}
import { useBudgetStore } from '../../store/budgetStore'
import { Input, Stack, RadioGroup, Field, HStack, Button, Center, NativeSelect,
    Flex, Box, useMediaQuery, type RadioGroupValueChangeDetails } from '@chakra-ui/react'
import { normalizeMoney, parseFiniteNumber } from "../../services/inputNormalization";

type IncomeSourceFormProps = {
  source: {
    id: string,
    type: 'hourly' | 'weekly' | 'bi-weekly' | 'salary',
    description?: string,
    hourlyRate?: number,
    hoursPerWeek?: number,
    grossSalary?: number,
    weeklySalary?: number,
    biWeeklySalary?: number,
    state: string,
  },
  onUpdate: (id: string, updates: Partial<IncomeSourceFormProps['source']>) => void
}

type IncomeType = "hourly" | "weekly" | "bi-weekly" | "salary";

const IncomeTypeOptions = [
    { value: "hourly", label: "Hourly" },
    { value: "weekly", label: "Weekly" },
    { value: "bi-weekly", label: "Bi-Weekly" },
    { value: "salary", label: "Salary" },
  ];

export default function IncomeSourceForm({ source, onUpdate }: IncomeSourceFormProps) {

  const removeIncomeSource = useBudgetStore((s) => s.removeIncomeSource)
  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove this income source?')) {
      removeIncomeSource(source.id)
    }
  }

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);
  
  return (
    <Box w={isPortraitWidth ? "55vw" : "100%"}>
      {/* Income Type Toggle */}
      <Field.Root mb={4}>
        <Field.Label>Income Type</Field.Label>
        <RadioGroup.Root
          value={source.type}
          onValueChange={(details: RadioGroupValueChangeDetails) =>
            onUpdate(source.id, { type: details.value as 'hourly' | 'weekly' | 'bi-weekly' | 'salary' })
          }
        >
          <HStack gap={4}>
            {isPortraitWidth ? (
              <Flex flexDirection={'column'} gap={2} justifyContent={"flex-start"}>
                {IncomeTypeOptions.map((opt) => (
                  <RadioGroup.Item key={opt.value} value={opt.value as IncomeType}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl>
                      <RadioGroup.ItemIndicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </Flex>
            ) : (
              <>
                {IncomeTypeOptions.map((opt) => (
                  <RadioGroup.Item key={opt.value} value={opt.value as IncomeType}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl>
                      <RadioGroup.ItemIndicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </>
            )}
          </HStack>
        </RadioGroup.Root>
      </Field.Root>

      {/* Hourly Inputs */}
      {source.type === 'hourly' && (
        <Stack gap={3}>
          <Field.Root>
            <Field.Label>Hourly Rate ($/hr)</Field.Label>
            <Input
              type="number"
              placeholder="Enter your hourly rate"
              value={source.hourlyRate ?? 0}
              onChange={(e) =>
                onUpdate(source.id, { hourlyRate: normalizeMoney(e.target.value, { min: 0 }) })
              }
              bg="bg.panel"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Hours/Week</Field.Label>
            <Input
              type="number"
              placeholder="Enter hours per week"
              value={source.hoursPerWeek ?? 0}
              onChange={(e) =>
                onUpdate(source.id, { hoursPerWeek: parseFiniteNumber(e.target.value, { min: 0 }) })
              }
              bg="bg.panel"
            />
          </Field.Root>
        </Stack>
      )}

      {/* Weekly Inputs */}
      {source.type === 'weekly' && (
        <Stack gap={3}>
        <Field.Root>
          <Field.Label>Weekly Gross Salary</Field.Label>
          <Input
            type="number"
            placeholder="Enter your weekly gross salary"
            min="0"
            step="1"
            max="1000000"
            value={source.weeklySalary ?? 0}
            onChange={(e) =>
                onUpdate(source.id, { weeklySalary: normalizeMoney(e.target.value, { min: 0 }) })
            }
            bg="bg.panel"
          />
        </Field.Root>
        </Stack>
      )}

      {/* Bi-Weekly Inputs */}
      {source.type === 'bi-weekly' && (
        <Stack gap={3}>
          <Field.Root>
            <Field.Label>Bi-Weekly Gross Salary</Field.Label>
            <Input
              type="number"
              placeholder="Enter your bi-weekly gross salary"
              min="0"
              step="1"
              max="1000000"
              value={source.biWeeklySalary ?? 0}
              onChange={(e) =>
                  onUpdate(source.id, { biWeeklySalary: normalizeMoney(e.target.value, { min: 0 }) })
              }
              bg="bg.panel"
            />
          </Field.Root>
        </Stack>
      )}

      {/* Salary Input */}
      {source.type === 'salary' && (
        <Field.Root>
          <Field.Label>Annual Gross Salary</Field.Label>
          <Input
            type="number"
            placeholder="Enter your annual gross salary"
            min="0"
            step="1"
            max="1000000"
            value={source.grossSalary ?? 0}
            onChange={(e) =>
                onUpdate(source.id, { grossSalary: normalizeMoney(e.target.value, { min: 0 }) })
            }
            bg="bg.panel"
          />
        </Field.Root>
      )}

      {/* State Selector */}
      <Field.Root mt={5} mb={1}>
        <Field.Label>Select State (for tax estimate)</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            placeholder="Select option"
            value={source.state}
            onChange={(e) =>
                onUpdate(source.id, { state: e.target.value })
              }
            bg="bg.panel"
          >
            <option value="WI">Wisconsin</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      {source.id !== 'primary' && (
        <Center>
          <Button
            mt={4}
            size="sm"
            colorScheme="red"
            onClick={() => handleRemove()}
          >
            Delete This Source
          </Button>
        </Center>
      )}
    </Box>
  )
}
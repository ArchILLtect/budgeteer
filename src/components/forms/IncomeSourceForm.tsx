import { useBudgetStore } from '../../store/budgetStore'
import { Input, Stack, RadioGroup, Field, HStack, Button, Center, NativeSelect,
    type RadioGroupValueChangeDetails } from '@chakra-ui/react'

type IncomeSourceFormProps = {
  source: {
    id: string,
    type: 'hourly' | 'salary',
    description?: string,
    hourlyRate?: number,
    hoursPerWeek?: number,
    grossSalary?: number,
    state: string,
  },
  onUpdate: (id: string, updates: Partial<IncomeSourceFormProps['source']>) => void
}

export default function IncomeSourceForm({ source, onUpdate }: IncomeSourceFormProps) {

  const removeIncomeSource = useBudgetStore((s) => s.removeIncomeSource)
  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove this income source?')) {
      removeIncomeSource(source.id)
    }
  }
  
  return (
    <>
      {/* Income Type Toggle */}
      <Field.Root mb={4}>
        <Field.Label>Income Type</Field.Label>
        <RadioGroup.Root
          value={source.type}
          onValueChange={(details: RadioGroupValueChangeDetails) =>
            onUpdate(source.id, { type: details.value as 'hourly' | 'salary' })
          }
        >
          <HStack gap={4}>
              <RadioGroup.Item value="hourly">Hourly</RadioGroup.Item>
              <RadioGroup.Item value="salary">Salary</RadioGroup.Item>
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
              value={source.hourlyRate}
              onChange={(e) =>
                onUpdate(source.id, { hourlyRate: parseFloat(e.target.value) || 0 })
              }
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Hours/Week</Field.Label>
            <Input
              type="number"
              placeholder="Enter hours per week"
              value={source.hoursPerWeek}
              onChange={(e) =>
                onUpdate(source.id, { hoursPerWeek: parseFloat(e.target.value) || 0 })
              }
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
            value={source.grossSalary}
            onChange={(e) =>
              onUpdate(source.id, { grossSalary: parseFloat(e.target.value) || 0 })
            }
          />
        </Field.Root>
      )}

      {/* State Selector */}
      <Field.Root mt={5} mb={4}>
        <Field.Label>Select State (for tax estimate)</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            placeholder="Select option"
            value={source.state}
            onChange={(e) =>
                onUpdate(source.id, { state: e.target.value })
              }
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
    </>
  )
}
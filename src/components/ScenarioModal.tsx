import { Button, Input, RadioGroup, VStack, Box,
  Flex, type RadioGroupValueChangeDetails } from '@chakra-ui/react';
import { useState } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { DialogModal } from './ui/DialogModal';

type ScenarioModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScenarioModal({ isOpen, onClose }: ScenarioModalProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('copy'); // 'copy' or 'blank'

  const saveScenario = useBudgetStore((s) => s.saveScenario);
  const reset = useBudgetStore((s) => s.resetScenario);

  const handleSave = () => {
    if (!name) return;
    if (mode === 'blank') reset(); // optional: clear form
    saveScenario(name);
    onClose();
    setName('');
    setMode('copy');
  };

  return (
    <DialogModal
      open={isOpen}
      setOpen={onClose}
      onAccept={handleSave}
      onCancel={onClose}
      title="Create New Scenario"
      body={
        <VStack align="start" gap={2} width={"100%"}>
          <Input
            placeholder="Scenario Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            mb={4}
          />

          {/* controlled is usually simplest */}
          <RadioGroup.Root
            aria-label="Scenario creation mode"
            width={"100%"}
            value={mode}
            onValueChange={(details: RadioGroupValueChangeDetails) =>
              setMode(details.value as "copy" | "blank")
            }
          >
            <Box
              px={2}
              py={4}
              fontWeight="bold"
              fontSize="sm"
              color="gray.600"
              border={"1px solid"}
              borderColor="gray.200"
              borderRadius="md"
            >
              <RadioGroup.Label>Start Preference</RadioGroup.Label>
              <Flex direction="row" gap={2} wrap="wrap" justifyContent={"space-around"} mt={4}>
                <RadioGroup.Item value="copy">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Copy current scenario</RadioGroup.ItemText>
                </RadioGroup.Item>

                <RadioGroup.Item value="blank">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Start blank</RadioGroup.ItemText>
                </RadioGroup.Item>
              </Flex>
            </Box>
          </RadioGroup.Root>

          <Button onClick={handleSave} colorScheme="teal" mt={4}>
            Create
          </Button>
        </VStack>
      }
    />
  );
}
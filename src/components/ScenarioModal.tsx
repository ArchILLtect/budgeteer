import { Button, Input, RadioGroup, VStack, type RadioGroupValueChangeDetails } from '@chakra-ui/react';
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
        <VStack align="start" gap={2}>
          <Input
            placeholder="Scenario Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            mb={4}
          />

          {/* controlled is usually simplest */}
          <RadioGroup.Root
            value={mode}
            onValueChange={(details: RadioGroupValueChangeDetails) =>
              setMode(details.value as "copy" | "blank")
            }
          >
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
          </RadioGroup.Root>

          <Button onClick={handleSave} colorScheme="teal" mt={4}>
            Create
          </Button>
        </VStack>
      }
    />
  );
}
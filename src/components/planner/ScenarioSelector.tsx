import { Flex, Button, HStack, Heading, Field, NativeSelect } from "@chakra-ui/react";
import { useBudgetStore } from "../../store/budgetStore";
import ScenarioModal from "../ScenarioModal";

type ScenarioSelectorProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export default function ScenarioSelector({ isOpen, onOpen, onClose }: ScenarioSelectorProps) {
  const { scenarios, currentScenario, deleteScenario } = useBudgetStore();
  const loadScenario = useBudgetStore((s) => s.loadScenario);

  const scenarioNames = Object.keys(scenarios);
  const selectedScenario = currentScenario || scenarioNames[0] || "Main";

  return (
    <Flex mb={4}>
      <Field.Root>
        <Field.Label>
          <Heading size="md" fontWeight={700}>Scenario</Heading>
        </Field.Label>

        <HStack gap={4} alignItems="center" width={"100%"} justifyContent={"space-between"}>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={selectedScenario}
              onChange={(e) => loadScenario(e.target.value)}
            >
              {scenarioNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>

          {/* Delete */}
          {selectedScenario !== "Main" && (
            <Button
              colorScheme="red"
              onClick={() => {
                if (confirm(`Delete scenario "${selectedScenario}"? This cannot be undone.`)) {
                  deleteScenario(selectedScenario);
                }
              }}
            >
              Delete scenario
            </Button>
          )}

          {/* Add */}
          <Button alignContent="top" onClick={onOpen} bg={"green.300"} aria-label="Add scenario">
            <Flex as="kbd" fontWeight={900} bgSize="cover" fontSize={"4xl"} alignContent="center" mb={1} color={"black"}>+</Flex>
          </Button>

          <ScenarioModal isOpen={isOpen} onClose={onClose} />
        </HStack>
      </Field.Root>
    </Flex>
  );
}

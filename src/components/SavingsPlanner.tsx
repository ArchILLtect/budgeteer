import {
  Input,
  RadioGroup,
  Field,
  Heading,
  HStack,
} from "@chakra-ui/react";
import { useBudgetStore } from "../store/budgetStore";

type SavingsMode = "none" | "10" | "20" | "custom";

const savingsOptions = [
    { value: "none", label: "None" },
    { value: "10", label: "10%" },
    { value: "20", label: "20%" },
    { value: "custom", label: "Custom" },
  ];

export default function SavingsPlanner() {
  const { currentScenario, expenses, updateExpense, addExpense, removeExpense, saveScenario } =
    useBudgetStore();

  const savingsMode = useBudgetStore((s) => (s.savingsMode ?? "none") as SavingsMode);
  const customSavings = useBudgetStore((s) => s.customSavings ?? 0);
  const setSavingsMode = useBudgetStore((s) => s.setSavingsMode);
  const setCustomSavings = useBudgetStore((s) => s.setCustomSavings);

  const netIncome = useBudgetStore((s) => s.getTotalNetIncome().net);

  const applySavings = (nextMode: SavingsMode, nextCustom: number) => {
    const monthlyIncome = (Number(netIncome) || 0) / 12;

    let pct = 0;
    if (nextMode === "10") pct = 0.1;
    else if (nextMode === "20") pct = 0.2;
    else if (nextMode === "custom") pct = (Number(nextCustom) || 0) / 100;

    const amount = +(monthlyIncome * pct).toFixed(2);
    const existing = expenses.find((e) => e.id === "savings");

    if (pct <= 0) {
      if (existing) removeExpense("savings");
      return;
    }

    if (existing) {
      if (existing.amount !== amount) updateExpense("savings", { amount });
    } else {
      addExpense({ id: "savings", name: "Savings", amount, isSavings: true });
    }
  };

  const persist = () => {
    if (currentScenario) saveScenario(currentScenario);
  };

  return (
    <Field.Root mb={4}>
      <Field.Label>
        <Heading size="md" fontWeight={700}>
          Include Savings?
        </Heading>
      </Field.Label>

      <RadioGroup.Root
        value={savingsMode}
        onValueChange={(details) => {
          const next = details.value as SavingsMode;
          if (next === savingsMode) return;

          setSavingsMode(next);

          // reset custom if leaving custom
          const nextCustom = next === "custom" ? customSavings : 0;
          if (next !== "custom" && customSavings !== 0) setCustomSavings(0);

          applySavings(next, nextCustom);
          persist();
        }}
      >
        <HStack gap={6} wrap="wrap">
          {savingsOptions.map((opt) => (
            <RadioGroup.Item key={opt.value} value={opt.value as SavingsMode}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </HStack>
      </RadioGroup.Root>

      {savingsMode === "custom" && (
        <Input
          mt={2}
          type="number"
          max={100}
          min={0}
          value={customSavings}
          placeholder="Enter custom %"
          onChange={(e) => {
            const raw = Number(e.target.value);
            const val = Number.isFinite(raw) ? raw : 0;
            const clamped = Math.max(0, Math.min(100, val));

            if (clamped === customSavings) return;

            if (savingsMode !== "custom") setSavingsMode("custom");
            setCustomSavings(clamped);

            applySavings("custom", clamped);
            persist();
          }}
        />
      )}
    </Field.Root>
  );
}

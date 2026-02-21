import { useState } from "react";
import { useBudgetStore } from "../../store/budgetStore";
import { calculateTotalTaxes, calculateNetIncome } from "../../utils/calcUtils";
import { fireToast } from "../../hooks/useFireToast";
import { DialogModal } from "../ui/DialogModal";
import { AppSelect } from "../ui/AppSelect";

type ScenarioPlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetMonths?: string[];
};

export default function ScenarioPlanModal({ isOpen, onClose, targetMonths }: ScenarioPlanModalProps) {
  const scenarios = useBudgetStore((s) => s.scenarios);
  const saveMonthlyPlan = useBudgetStore((s) => s.saveMonthlyPlan);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const monthlyActuals = useBudgetStore((s) => s.monthlyActuals);
  const monthlyPlans = useBudgetStore((s) => s.monthlyPlans);
  const currentActuals = monthlyActuals[selectedMonth];

  // const [applyAsActuals, setApplyAsActuals] = useState(false); // planned feature
  const [selectedScenario, setSelectedScenario] = useState(Object.keys(scenarios)[0] || "");

  const handleSave = () => {
    const scenario = scenarios[selectedScenario];
    if (!scenario) return;

    const grossIncome = calculateNetIncome(scenario.incomeSources);
    const totalTaxes = calculateTotalTaxes(grossIncome, scenario.filingStatus);
    const netIncome = (grossIncome - totalTaxes.total) / 12;

    const savingsPercent =
      scenario.savingsMode === "10"
        ? 0.1
        : scenario.savingsMode === "20"
        ? 0.2
        : scenario.savingsMode === "custom"
        ? (scenario.customSavings || 0) / 100
        : 0;

    const estSavings = +(netIncome * savingsPercent).toFixed(2);
    const totalExpenses = scenario.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const estLeftover = netIncome - totalExpenses;

    const planPayload = {
      scenarioName: selectedScenario,
      incomeSources: JSON.parse(JSON.stringify(scenario.incomeSources)),
      expenses: JSON.parse(JSON.stringify(scenario.expenses)),
      savingsMode: scenario.savingsMode,
      customSavings: scenario.customSavings,
      netIncome: netIncome,
      savingsPercent: savingsPercent,
      totalSavings: estSavings,
      totalExpenses: totalExpenses,
      estLeftover: estLeftover,
    };

    const uniqueTargetMonths = Array.isArray(targetMonths) && targetMonths.length
      ? Array.from(new Set(targetMonths.filter(Boolean))).sort((a, b) => a.localeCompare(b))
      : null;

    if (uniqueTargetMonths) {
      let applied = 0;
      let skipped = 0;
      for (const m of uniqueTargetMonths) {
        if (monthlyPlans[m]) {
          skipped++;
          continue;
        }
        saveMonthlyPlan(m, planPayload);
        applied++;
      }

      if (applied > 0) {
        const skipSuffix = skipped > 0 ? ` (skipped ${skipped} w/ existing plan)` : "";
        fireToast("success", "Plans Saved", `Applied to ${applied} month(s)${skipSuffix}.`);
      } else {
        fireToast("info", "No Changes", `All target months already have a plan.`);
      }
      onClose();
      return;
    }

    saveMonthlyPlan(selectedMonth, planPayload);

    /* TODO: Apply to actuals if selected
    if (applyAsActuals && !currentActuals) {
      // updateMonthlyActuals(selectedMonth, {
        actualFixedIncomeSources: JSON.parse(JSON.stringify(scenario.incomeSources)),
        actualExpenses: JSON.parse(JSON.stringify(scenario.expenses)),
        actualTotalNetIncome: netIncome,
        savingsMode: scenario.savingsMode,
        customSavings: scenario.customSavings,
      // });
    }*/

    if (currentActuals) {
      fireToast("info", "Plan Saved", "Actuals already exist and were not changed.");
    } else {
      fireToast("success", "Plan & Actuals Saved", "Plan and actuals have been saved successfully.");
    }

    onClose();
  };

  return (
    <DialogModal
      title="Select a Scenario"
      body={
        <AppSelect
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
        >
          {Object.keys(scenarios).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </AppSelect>
      }
      open={isOpen}
      setOpen={() => !isOpen && setSelectedScenario(Object.keys(scenarios)[0] || "")}
      onAccept={handleSave}
      onCancel={onClose}
      acceptColorPalette="teal"
      acceptLabel="Use Scenario"
      cancelLabel="Cancel"
      >
        {/* TODO: Add scenario checkbox for applying to actuals
        <Checkbox
          isChecked={applyAsActuals}
          onChange={(e) => setApplyAsActuals(e.target.checked)}
          colorScheme="teal"
          mt={4}
        >
          Also apply this scenario to actuals
        </Checkbox>*/}
    </DialogModal>
  );
}
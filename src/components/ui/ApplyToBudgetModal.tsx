import { RadioGroup, Stack, Text, Input, Checkbox } from "@chakra-ui/react";
import { useState } from "react";
import { applyOneMonth } from "../../utils/accountUtils";
import { useBudgetStore } from "../../store/budgetStore";
import dayjs from "dayjs";
import { waitForIdleAndPaint } from "../../utils/appUtils";
import { startTransition } from 'react';
import { fireToast } from "../../hooks/useFireToast";
import { DialogModal } from "./DialogModal";

type ApplyToBudgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  acct: any; // should be typed to the account shape
  months: string[]; // list of all months with transactions for this account, in "YYYY-MM" format
};

export default function ApplyToBudgetModal({ isOpen, onClose, acct, months }: ApplyToBudgetModalProps) {
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState("month");
  const [ignoreBeforeEnabled, setIgnoreBeforeEnabled] = useState<boolean>(false);
  const [ignoreBeforeDate, setIgnoreBeforeDate] = useState(() =>
    dayjs().format("YYYY-MM-DD") // defaults to today
  );
  const setIsLoading = useBudgetStore(s => s.setIsLoading);
  const openLoading = useBudgetStore(s => s.openLoading);
  const closeLoading = useBudgetStore(s => s.closeLoading);
  const selectedMonth = useBudgetStore(s => s.selectedMonth);
  const selectedYearFromStore = dayjs(selectedMonth).year().toString();
  const yearFromSelected = (selectedMonth || '').slice(0, 4);
  const transactionsThisMonth = acct.transactions.filter((tx: any) => tx.date?.startsWith(selectedMonth));
  const transactionsThisYear = acct.transactions.filter((tx: any) => tx.date?.startsWith(selectedYearFromStore));
  const monthsForYear = months?.filter(m => m.startsWith(yearFromSelected)) || [];
  const openProgress = useBudgetStore(s => s.openProgress);
  const updateProgress = useBudgetStore(s => s.updateProgress);
  const closeProgress = useBudgetStore(s => s.closeProgress);
  const markTransactionsBudgetApplied = useBudgetStore(s => s.markTransactionsBudgetApplied);
  const processPendingSavingsForAccount = useBudgetStore(s => s.processPendingSavingsForAccount);

  const runScopedApply = async () => {
    setLoading(true);
    setIsLoading(true);
    openLoading('Finalizing changes...');
    // give the browser a chance to paint the modal
    await new Promise(requestAnimationFrame);
    
    let targets: string[] = [];
    const total = { e: 0, i: 0, s: 0 };

    try {
      if (scope === 'month' && selectedMonth) { targets = [selectedMonth] }
      else if (scope === 'year') { targets = monthsForYear }
      else if (scope === 'all') { targets = months || [] }

      openProgress('Applying Transactions', targets.length);
      let processed = 0;

      const ignoreBeforeDateForThisRun = ignoreBeforeEnabled && ignoreBeforeDate ? ignoreBeforeDate : null;

      for (const m of targets) {
        const counts = await applyOneMonth(
          useBudgetStore,
          m,
          acct,
          false,
          ignoreBeforeDateForThisRun as any
        );
        total.e += counts.e;
        total.i += counts.i;
        total.s += counts.s;

        processed++;
        updateProgress(processed);
        await new Promise(requestAnimationFrame);
      }

      // Mark staged transactions as applied for selected scope
      const monthsApplied = targets;
      markTransactionsBudgetApplied(acct.accountNumber || acct.account || acct.label, monthsApplied);
      // Move any pending savings for these months into review queue
      processPendingSavingsForAccount(acct.accountNumber || acct.account || acct.label, monthsApplied);
    } catch (err: any) {
      fireToast("error", "Error applying to budget", err.message || "An error occurred while applying transactions to the budget.");
    }
    finally {
      
      setLoading(false);
      closeProgress();
      onClose();
      // ⬇️ keep the page-level spinner up until the heavy post-render work finishes
      await waitForIdleAndPaint();
      startTransition(() => {
        setIsLoading(false);
        fireToast("success", "Budget updated", `Applied ${targets.length} month(s): ${total.e} expenses, ${total.i} income, ${total.s} savings.`);
        closeLoading();
      });
    }
  };

  return (
    <DialogModal
      title="Apply to Budget"
      open={isOpen}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      acceptColorPalette="teal"
      onAccept={runScopedApply}
      onCancel={onClose}
      acceptLabel="Apply"
      cancelLabel="Cancel"

      loading={loading}
      body={
        <>
          <RadioGroup.Root value={scope} onValueChange={(value) => setScope(value as any)}>
            <Text color={'GrayText'} fontSize={'sm'}>Make sure you have selected desired month or year before proceeding</Text>
            <Stack gap={3}>
              <RadioGroup.Item value="month" disabled={!selectedMonth || transactionsThisMonth?.length <= 0}>Current Month ({dayjs(selectedMonth).format("MMMM YYYY") || 'n/a'}) = ({transactionsThisMonth?.length.toLocaleString('en-US')})</RadioGroup.Item>
              <RadioGroup.Item value="year" disabled={!selectedYearFromStore || transactionsThisYear.length <= 0}>Current Year ({selectedYearFromStore || 'year not set'}) = ({transactionsThisYear?.length.toLocaleString('en-US') || 0})</RadioGroup.Item>                
              <RadioGroup.Item value="all" disabled={!months || months?.length <= 0}>All Transactions ({acct?.transactions?.length.toLocaleString('en-US') || 0})</RadioGroup.Item>
            </Stack>
          </RadioGroup.Root>
          <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
          <Checkbox.Root
            checked={ignoreBeforeEnabled}
            onCheckedChange={(details) => setIgnoreBeforeEnabled(details.checked as boolean)}
          >
            Ignore all savings goal linking before this date
          </Checkbox.Root>

          {ignoreBeforeEnabled && (
            <Input
              type="date"
              value={ignoreBeforeDate}
              onChange={(e) => setIgnoreBeforeDate(e.target.value)}
              mt={2}
            />
          )}
        </>
      }
    />
  );
}
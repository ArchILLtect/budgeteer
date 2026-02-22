import { RadioGroup, Stack, Text, Input, Checkbox } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { applyOneMonth } from "../../utils/accountUtils";
import { useBudgetStore } from "../../store/budgetStore";
import { errorToMessage, waitForIdleAndPaint } from "../../utils/appUtils";
import { startTransition } from 'react';
import { fireToast } from "../../hooks/useFireToast";
import { DialogModal } from "./DialogModal";
import { useApplyAlwaysExtractVendorName, useExpenseNameOverrides, useIncomeNameOverrides } from "../../store/localSettingsStore";
import { formatUtcMonthKey, getTodayDateInputValue, getYearFromMonthKey } from "../../services/dateTime";

type ApplyToBudgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  acct: AccountLike;
  months: string[]; // list of all months with transactions for this account, in "YYYY-MM" format
};

type ApplyTransaction = Parameters<typeof applyOneMonth>[2]["transactions"][number];
type ApplyOneMonthCounts = Awaited<ReturnType<typeof applyOneMonth>>;

type AccountLike = {
  accountNumber?: string;
  account?: string;
  label?: string;
  transactions: ApplyTransaction[];
};

type ApplyScope = "month" | "year" | "all";

const formatElapsed = (ms: number) => {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

export default function ApplyToBudgetModal({ isOpen, onClose, acct, months }: ApplyToBudgetModalProps) {
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const applyStartMsRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const applyAlwaysExtractVendorName = useApplyAlwaysExtractVendorName();
  const expenseNameOverrides = useExpenseNameOverrides();
  const incomeNameOverrides = useIncomeNameOverrides();
  const [scope, setScope] = useState<ApplyScope>("month");
  const [ignoreBeforeEnabled, setIgnoreBeforeEnabled] = useState<boolean>(false);
  const [ignoreBeforeDate, setIgnoreBeforeDate] = useState(() => getTodayDateInputValue());
  const setIsLoading = useBudgetStore(s => s.setIsLoading);
  const openLoading = useBudgetStore(s => s.openLoading);
  const closeLoading = useBudgetStore(s => s.closeLoading);
  const selectedMonth = useBudgetStore(s => s.selectedMonth);
  const selectedYearFromStore = getYearFromMonthKey(selectedMonth) ?? '';
  const yearFromSelected = (selectedMonth || '').slice(0, 4);
  const transactionsThisMonth = acct.transactions.filter((tx) => tx.date?.startsWith(selectedMonth));
  const transactionsThisYear = acct.transactions.filter((tx) => tx.date?.startsWith(selectedYearFromStore));
  const monthsForYear = months?.filter(m => m.startsWith(yearFromSelected)) || [];
  const openProgress = useBudgetStore(s => s.openProgress);
  const updateProgress = useBudgetStore(s => s.updateProgress);
  const closeProgress = useBudgetStore(s => s.closeProgress);
  const markTransactionsBudgetApplied = useBudgetStore(s => s.markTransactionsBudgetApplied);
  const recordBudgetAppliedAt = useBudgetStore(s => s.recordBudgetAppliedAt);
  const clearPendingSavingsForAccountMonths = useBudgetStore(s => s.clearPendingSavingsForAccountMonths);
  const awaitSavingsLink = useBudgetStore(s => s.awaitSavingsLink);
  const isSavingsModalOpen = useBudgetStore(s => s.isSavingsModalOpen);

  useEffect(() => {
    return () => {
      if (timerIdRef.current != null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, []);

  const applyTimelineOptions = [
    { value: "month", label: `Current Month ${formatUtcMonthKey(selectedMonth, { noneLabel: 'n/a', month: 'long' })} = (${transactionsThisMonth?.length.toLocaleString('en-US')})`, disabled: !selectedMonth || transactionsThisMonth?.length <= 0 },
    { value: "year", label: `Current Year (${selectedYearFromStore || 'year not set'}) = (${transactionsThisYear?.length.toLocaleString('en-US') || 0})`, disabled: !selectedYearFromStore || transactionsThisYear.length <= 0 },
    { value: "all", label: `All Transactions (${acct?.transactions?.length.toLocaleString('en-US') || 0})`, disabled: !months || months?.length <= 0 },
  ];

  const runScopedApply = async () => {
    setLoading(true);
    setIsLoading(true);
    openLoading('Finalizing changes...');
    const start = performance.now();
    applyStartMsRef.current = start;
    setElapsedMs(0);

    if (timerIdRef.current != null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    timerIdRef.current = window.setInterval(() => {
      const s = applyStartMsRef.current;
      if (s == null) return;
      setElapsedMs(performance.now() - s);
    }, 250);

    // give the browser a chance to paint the modal
    await new Promise(requestAnimationFrame);
    
    let targets: string[] = [];
    const total = { e: 0, i: 0, s: 0 };
    const savingsReviewEntriesAll: NonNullable<ApplyOneMonthCounts["reviewEntries"]> = [];
    let didSucceed = false;

    try {
      const resolvedAccountNumber = acct.accountNumber || acct.account || acct.label;
      if (!resolvedAccountNumber) {
        throw new Error("Missing account number for this account.");
      }

      if (scope === 'month' && selectedMonth) { targets = [selectedMonth] }
      else if (scope === 'year') { targets = monthsForYear }
      else if (scope === 'all') { targets = months || [] }

      const txCountByMonth = new Map<string, number>();
      for (const tx of acct.transactions) {
        const month = tx.date?.slice(0, 7);
        if (!month) continue;
        txCountByMonth.set(month, (txCountByMonth.get(month) ?? 0) + 1);
      }

      const totalRows = targets.reduce((sum, m) => sum + (txCountByMonth.get(m) ?? 0), 0);
      // progress units are roughly: scan rows + write rows
      const totalUnits = Math.max(1, totalRows * 2);

      openProgress('Applying Transactions', totalUnits);
      let processedUnits = 0;
      const advanceProgress = (delta: number) => {
        const d = Number.isFinite(delta) ? Math.max(0, Math.floor(delta)) : 0;
        if (d <= 0) return;
        processedUnits = Math.min(totalUnits, processedUnits + d);
        updateProgress(processedUnits);
      };

      const ignoreBeforeDateForThisRun: string | null =
        ignoreBeforeEnabled && ignoreBeforeDate ? ignoreBeforeDate : null;

      for (const m of targets) {
        const counts = await applyOneMonth(
          useBudgetStore,
          m,
          { accountNumber: resolvedAccountNumber, transactions: acct.transactions },
          false,
          ignoreBeforeDateForThisRun,
          {
            alwaysExtractVendorName: applyAlwaysExtractVendorName,
            expenseNameOverrides,
            incomeNameOverrides,
          },
          { advance: advanceProgress }
        );
        total.e += counts.e;
        total.i += counts.i;
        total.s += counts.s;

        if (Array.isArray(counts.reviewEntries) && counts.reviewEntries.length > 0) {
          savingsReviewEntriesAll.push(...counts.reviewEntries);
        }
      }

      // Mark staged transactions as applied for selected scope
      const monthsApplied = targets;
      markTransactionsBudgetApplied(resolvedAccountNumber, monthsApplied);
      recordBudgetAppliedAt(monthsApplied);
      // Savings linking is handled once at the end (single aggregated modal).
      // Clear pending import savings entries for these months so they can't be processed a second time.
      clearPendingSavingsForAccountMonths?.(resolvedAccountNumber, monthsApplied);

      if (savingsReviewEntriesAll.length > 0) {
        await awaitSavingsLink(savingsReviewEntriesAll);
      }

      didSucceed = true;
    } catch (err: unknown) {
      fireToast("error", "Error applying to budget", errorToMessage(err));
    }
    finally {
      if (timerIdRef.current != null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      const elapsed = applyStartMsRef.current != null ? performance.now() - applyStartMsRef.current : 0;
      applyStartMsRef.current = null;
      setElapsedMs(elapsed);

      setLoading(false);
      closeProgress();
      onClose();
      // ⬇️ keep the page-level spinner up until the heavy post-render work finishes
      await waitForIdleAndPaint();
      startTransition(() => {
        setIsLoading(false);
        if (didSucceed) {
          fireToast(
            "success",
            "Budget updated",
            `Applied ${targets.length} month(s): ${total.e} expenses, ${total.i} income, ${total.s} savings (in ${formatElapsed(elapsed)}).`
          );
        }
        closeLoading();
      });
    }
  };

  return (
    <DialogModal
      title="Apply to Budget"
      open={isOpen && !isSavingsModalOpen}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      initialFocus="accept"
      enterKeyAction="accept"
      acceptColorPalette="teal"
      onAccept={runScopedApply}
      onCancel={onClose}
      acceptLabel="Apply"
      cancelLabel="Cancel"

      loading={loading}
      body={
        <>
          <RadioGroup.Root
            value={scope}
            onValueChange={(details) => setScope(((details.value ?? "month") as ApplyScope))}
          >
            <Text color={'GrayText'} fontSize={'sm'} mb={2}>Make sure you have selected desired month or year before proceeding</Text>
            <Stack gap={3}>
              {applyTimelineOptions.map((opt) => (
                <RadioGroup.Item key={opt.value} value={opt.value as ApplyScope} disabled={opt.disabled}>
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl>
                    <RadioGroup.ItemIndicator />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
                </RadioGroup.Item>
              ))}
            </Stack>
          </RadioGroup.Root>
          <hr style={{marginTop: 15 + "px", marginBottom: 15 + "px"}}/>
          <Checkbox.Root
            checked={ignoreBeforeEnabled}
            onCheckedChange={(details) => setIgnoreBeforeEnabled(details.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              <Text fontSize="sm">Ignore all savings goal linking before this date</Text>
            </Checkbox.Label>
          </Checkbox.Root>

          {ignoreBeforeEnabled && (
            <Input
              type="date"
              value={ignoreBeforeDate}
              onChange={(e) => setIgnoreBeforeDate(e.target.value)}
              mt={2}
            />
          )}

          {loading && (
            <Text fontSize="xs" color="fg.muted" mt={3}>
              Elapsed: {formatElapsed(elapsedMs)}
            </Text>
          )}
        </>
      }
    />
  );
}
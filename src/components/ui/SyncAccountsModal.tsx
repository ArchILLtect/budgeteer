import { Button, RadioGroup, Stack, Input, Text, Box, Stat, SimpleGrid, Tag, Dialog, Checkbox, HStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { useBudgetStore } from "../../store/budgetStore";
import { analyzeImport } from "../../ingest/analyzeImport";
import { useTxStrongKeyOverridesByKey } from "../../store/txStrongKeyOverridesStore";
import IngestionMetricsPanel from "../accounts/IngestionMetricsPanel";
import { fireToast } from "../../hooks/useFireToast";
import { recordGenericTiming } from "../../services/perfLogger";
import type { ImportPlan } from "../../ingest/importPlan";
import type { AccountMapping, Transaction } from "../../types";
import { AppSelect } from "./AppSelect";

// Migration Notes:
// This modal now leverages the ingestion pipeline (analyzeImport + commitImportPlan) for each account present in the CSV.
// Workflow:
// 1) Parse CSV (Papa) -> group rows by AccountNumber.
// 2) For each account group: pass parsedRows directly to analyzeImport to avoid re-stringifying; adapt row keys to expected normalizeRow fields.
// 3) Collect ImportPlans (staged transactions + stats) and aggregate telemetry.
// 4) User confirms -> commit plans sequentially via commitImportPlan; show telemetry summary.
// 5) Undo & staging semantics then handled by existing store logic.

type SyncAccountsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type syncFileTypeMode = "csv" | "ofx" | "plaid";

type Step = "select" | "mapping" | "accounts" | "transactions";

type CsvRow = Record<string, unknown>;

function normalizeHeader(header: string | undefined): string {
  const h = (header ?? '').trim();
  return h.replace(/^\uFEFF/, '');
}

function pickValue(row: CsvRow, keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  // Fallback: case/whitespace-insensitive match (and BOM-safe)
  const wantedSet = new Set(keys.map((k) => k.replace(/^\uFEFF/, '').trim().toLowerCase()));
  for (const actual of Object.keys(row)) {
    const normalized = actual.replace(/^\uFEFF/, '').trim().toLowerCase();
    if (wantedSet.has(normalized)) return row[actual];
  }
  return undefined;
}

type IngestionResult = { accountNumber: string; plan: ImportPlan };

type AggregateTelemetry = {
  accounts: number;
  rows: number;
  newCount: number;
  dupesExisting: number;
  dupesIntraFile: number;
  savings: number;
};

type AccountInput = Partial<AccountMapping>;

const syncFileTypeOptions = [
    { value: "csv", label: "CSV File" },
    { value: "ofx", label: "OFX File (Coming Soon)" },
    { value: "plaid", label: "Bank Account via Plaid (Coming Soon)" },
  ];

export default function SyncAccountsModal({ isOpen, onClose }: SyncAccountsModalProps) {
  const accountMappings = useBudgetStore((s) => s.accountMappings);
  const accounts = useBudgetStore((s) => s.accounts);
  const setAccountMapping = useBudgetStore((s) => s.setAccountMapping);
  const addOrUpdateAccount = useBudgetStore((s) => s.addOrUpdateAccount);
  const commitImportPlan = useBudgetStore((s) => s.commitImportPlan);
  const streamingAutoByteThreshold = useBudgetStore((s) => s.streamingAutoByteThreshold);
  const importManifests = useBudgetStore((s) => s.importManifests || {});

  const txStrongKeyOverridesByKey = useTxStrongKeyOverridesByKey();

  const [sourceType, setSourceType] = useState<syncFileTypeMode>("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [ofxFile, setOfxFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [pendingMappings, setPendingMappings] = useState<string[]>([]);
  const [pendingData, setPendingData] = useState<CsvRow[]>([]); // original parsed rows awaiting mapping
  const [foundAccounts, setFoundAccounts] = useState<string[]>([]);
  const [accountInputs, setAccountInputs] = useState<Record<string, AccountInput>>({});
  const [ingesting, setIngesting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseRows, setParseRows] = useState(0);
  const [parseBytes, setParseBytes] = useState<number | null>(null);
  const [parseFinished, setParseFinished] = useState(false);
  const [parseAborted, setParseAborted] = useState(false);
  const [ingestionResults, setIngestionResults] = useState<IngestionResult[]>([]); // [{ accountNumber, plan }]
  const [telemetry, setTelemetry] = useState<AggregateTelemetry | null>(null); // aggregate
  const [metricsAccount, setMetricsAccount] = useState('');
  const setLastIngestionTelemetry = useBudgetStore(s => s.setLastIngestionTelemetry);
  const setLastIngestionBenchmark = useBudgetStore(s => s.setLastIngestionBenchmark);
  const [dryRunStarted, setDryRunStarted] = useState(false);
  const [autoApplyExplicitDirectives, setAutoApplyExplicitDirectives] = useState(true);
  const autoApplyExplicitDirectivesRef = useRef(autoApplyExplicitDirectives);

  const [showErrors, setShowErrors] = useState(false);
  const [errorFilter, setErrorFilter] = useState<'all' | 'parse' | 'normalize' | 'duplicate'>('all');
  const exportLockRef = useRef(false);

  const csvParserRef = useRef<Papa.Parser | null>(null);
  const parseAbortedRef = useRef(false);

  const primaryActionButtonRef = useRef<HTMLButtonElement | null>(null);

  const fileTypes: syncFileTypeMode[] = ["csv", "ofx"];
  const isDemo = useBudgetStore((s) => s.isDemoUser);

  // Keep latest store values available to async callbacks without reach-through reads.
  const accountMappingsRef = useRef(accountMappings);
  const accountsRef = useRef(accounts);
  const addOrUpdateAccountRef = useRef(addOrUpdateAccount);

  useEffect(() => {
    accountMappingsRef.current = accountMappings;
  }, [accountMappings]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    addOrUpdateAccountRef.current = addOrUpdateAccount;
  }, [addOrUpdateAccount]);

  const resetState = () => {
    setSourceType("csv");
    setCsvFile(null);
    setOfxFile(null);
    setStep('select');
    setPendingMappings([]);
    setPendingData([]);
    setFoundAccounts([]);
    setAccountInputs({});
    setIngestionResults([]);
    setTelemetry(null);
    setMetricsAccount('');
    setDryRunStarted(false);
    setAutoApplyExplicitDirectives(true);

    setParsing(false);
    setParseRows(0);
    setParseBytes(null);
    setParseFinished(false);
    setParseAborted(false);
    parseAbortedRef.current = false;
    csvParserRef.current = null;

    setShowErrors(false);
    setErrorFilter('all');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (sourceType === "csv") {
      setCsvFile(e.target.files?.[0] ?? null);
      setOfxFile(null);
    } else if (sourceType === "ofx") {
      setOfxFile(e.target.files?.[0] ?? null);
      setCsvFile(null);
    }
  };

  const handleStartAccounts = () => {
    if (!csvFile && !ofxFile) {
      fireToast("warning", "File Required" , `Please select a ${sourceType.toUpperCase()} file before importing.`);
      return;
    }

    if (sourceType === "csv") {
      if (!csvFile) {
        fireToast("warning", "CSV Required", "Please select a CSV file before importing.");
        return;
      }

      setParsing(true);
      setParseRows(0);
      setParseBytes(null);
      setParseFinished(false);
      setParseAborted(false);
      parseAbortedRef.current = false;
      csvParserRef.current = null;

      const collected: CsvRow[] = [];
      let rowsCount = 0;

      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        worker: (csvFile?.size || 0) > 500_000,
        transformHeader: normalizeHeader,
        chunkSize: 1024 * 256,
        chunk: (results: Papa.ParseResult<CsvRow>, parser: Papa.Parser) => {
          csvParserRef.current = parser;
          if (parseAbortedRef.current) {
            try { parser.abort(); } catch { /* noop */ }
            return;
          }

          const chunkRows = Array.isArray(results.data) ? results.data : [];
          if (chunkRows.length) {
            collected.push(...chunkRows);
            rowsCount += chunkRows.length;
            setParseRows(rowsCount);
          }

          const bytes = typeof results.meta?.cursor === 'number' ? results.meta.cursor : null;
          if (bytes !== null) setParseBytes(bytes);
        },
        complete: (results: Papa.ParseResult<CsvRow>) => {
          setParseFinished(true);
          setParsing(false);
          if (parseAbortedRef.current) return;

          // When chunk mode is enabled, we use the collected array.
          const data = collected.length ? collected : results.data;

          if (!Array.isArray(data) || data.length === 0) {
            fireToast('warning', 'No rows found', 'The CSV appears to be empty.');
            return;
          }

          const accountNumbers = new Set(
            data
              .map((row) => {
                const v = row?.AccountNumber ?? row?.accountNumber;
                const s = typeof v === 'string' ? v : String(v ?? '');
                return s.trim();
              })
              .filter(Boolean)
          );

          const accountsList = Array.from(accountNumbers);
          setFoundAccounts(accountsList);
          setPendingData(data);

          const unmapped = Array.from(accountNumbers).filter(
            (num) => !accountMappingsRef.current?.[num]
          );

          if (unmapped.length > 0) {
            setPendingMappings(unmapped);
            setStep("mapping"); // switch view instead of opening new modal
            return;
          }

          // All accounts already mapped -> create/update accounts only, then proceed to transactions step.
          createOrUpdateAccounts(accountsList);
          setStep('accounts');
        },
        error: (err) => {
          setParsing(false);
          fireToast("error", "CSV Parse Failed", err.message || "An error occurred while parsing the CSV file.");
        },
        },
      );
    } else if (sourceType === "ofx") {
      if (!ofxFile) {
        fireToast("warning", "OFX Required", "Please select an OFX file before importing.");
        return;
      }
      fireToast("warning", "OFX File Import Coming Soon", "Please use CSV for now.");
    }
  };

  const abortCsvParse = () => {
    parseAbortedRef.current = true;
    setParseAborted(true);
    try { csvParserRef.current?.abort(); } catch { /* noop */ }
    setParsing(false);
    fireToast('warning', 'Parse aborted', 'CSV parsing was aborted.');
  };

  const createOrUpdateAccounts = (accountNumbers: string[]) => {
    const now = new Date().toISOString();
    for (const accountNumber of accountNumbers) {
      const mapping = accountMappingsRef.current?.[accountNumber] as AccountMapping | undefined;
      const existingId = accountsRef.current?.[accountNumber]?.id;
      addOrUpdateAccountRef.current(accountNumber, {
        accountNumber,
        id: existingId || crypto.randomUUID(),
        label: mapping?.label || accountNumber,
        institution: mapping?.institution || 'Unknown',
        lastSync: now,
      });
    }
  };

  const beginTransactionsStep = () => {
    setStep('transactions');
  };

  const runDryRun = async () => {
    if (!pendingData.length) {
      fireToast('warning', 'No data loaded', 'Please select a CSV first.');
      return;
    }
    if (ingesting) return;
    setDryRunStarted(true);
    await importCsvData(pendingData);
  };

  const isLargeFile = (csvFile?.size || 0) > (streamingAutoByteThreshold || 500_000);
  const shouldAutoRunDryRun = !isLargeFile;

  const enableEnterToProceed = step === "select" || step === "accounts" || step === "transactions";

  useEffect(() => {
    if (!isOpen) return;
    if (!enableEnterToProceed) return;
    const el = primaryActionButtonRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      try {
        el.focus();
      } catch {
        // noop
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, enableEnterToProceed, step, ingesting, dryRunStarted, ingestionResults.length]);

  const onDialogKeyDown: React.KeyboardEventHandler = (e) => {
    if (!enableEnterToProceed) return;
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const inFormControl = target.closest('input, textarea, select, [contenteditable="true"]');
    if (inFormControl) return;
    const onInteractive = target.closest('button, a, [role="button"], [role="link"]');
    if (onInteractive) return;

    e.preventDefault();

    if (step === "select") {
      handleStartAccounts();
      return;
    }
    if (step === "accounts") {
      beginTransactionsStep();
      return;
    }

    // transactions
    if (!dryRunStarted || ingestionResults.length === 0) {
      void runDryRun();
      return;
    }
    if (!ingesting) {
      void applyAllPlans();
    }
  };

  useEffect(() => {
    if (step !== 'transactions') return;
    if (dryRunStarted) return;
    if (!shouldAutoRunDryRun) return;
    // Auto-run dry run for small files; large files require explicit click.
    void runDryRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dryRunStarted, shouldAutoRunDryRun]);

  useEffect(() => {
    if (autoApplyExplicitDirectivesRef.current === autoApplyExplicitDirectives) return;
    autoApplyExplicitDirectivesRef.current = autoApplyExplicitDirectives;

    // If the user changes directive auto-apply behavior after a dry-run,
    // auto re-run so Apply All always matches the latest toggle.
    if (step !== 'transactions') return;
    if (!dryRunStarted) return;
    if (!pendingData.length) return;
    if (ingesting) return;

    void runDryRun();
  }, [autoApplyExplicitDirectives, step, dryRunStarted, pendingData.length, ingesting]);

  // Ingestion migration implementation
  const importCsvData = async (data: CsvRow[]) => {
    setIngesting(true);
    setIngestionResults([]);
    setTelemetry(null);
    try {
      // Group raw rows by AccountNumber
      const groups = data.reduce<Record<string, CsvRow[]>>((acc, row) => {
        const v = row?.AccountNumber ?? row?.accountNumber;
        const acct = (typeof v === 'string' ? v : String(v ?? '')).trim();
        if (!acct) return acc;
        if (!acc[acct]) acc[acct] = [];
        acc[acct].push(row);
        return acc;
      }, {});

      const results: IngestionResult[] = [];
      const aggregate: AggregateTelemetry = {
        accounts: 0,
        rows: 0,
        newCount: 0,
        dupesExisting: 0,
        dupesIntraFile: 0,
        savings: 0,
      };

      for (const acctNumber of Object.keys(groups)) {
        const rows = groups[acctNumber];
        aggregate.accounts++;
        aggregate.rows += rows.length;
        // Build a parsedRows structure that analyzeImport understands: each row mapped to expected normalizeRow fields
        const adaptedRows = rows.map((r, idx) => {
          const note = pickValue(r, ["Note", "note", "Notes", "notes", "Memo", "memo"]);

          return {
            date: pickValue(r, ["Posted Date", "Date", "date"]),
            Description: pickValue(r, ["Description", "description", "Memo", "memo"]),
            Amount: pickValue(r, ["Amount", "amount", "Amt", "amt"]),
            Category: pickValue(r, ["Category", "category", "CATEGORY"]),

            // Preserve original note-ish fields so note directives can be parsed.
            Note: note,
            Memo: note,

            __line: idx + 1,
          };
        });
        const existing = (accountsRef.current?.[acctNumber]?.transactions ?? []) as Transaction[];

        const plan = await analyzeImport({
          parsedRows: { rows: adaptedRows, errors: [] },
          accountNumber: acctNumber,
          existingTxns: existing,
          txStrongKeyOverridesByKey,
          autoApplyExplicitDirectives,
        });

        results.push({ accountNumber: acctNumber, plan });
        aggregate.newCount += plan.stats.newCount;
        aggregate.dupesExisting += plan.stats.dupesExisting;
        aggregate.dupesIntraFile += plan.stats.dupesIntraFile;
        aggregate.savings += plan.savingsQueue?.length || 0;
      }
      setIngestionResults(results);
      if (results.length && !metricsAccount) setMetricsAccount(results[0].accountNumber);
      setTelemetry(aggregate);
      fireToast("info", "Dry run complete", `Accounts: ${aggregate.accounts} New: ${aggregate.newCount} DupEx: ${aggregate.dupesExisting} DupIntra: ${aggregate.dupesIntraFile}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      fireToast("error", "Ingestion failed", msg);
    } finally {
      setIngesting(false);
    }
  };

  const applyAllPlans = () => {
    if (!ingestionResults.length) return;
    const perfStartedAt = performance.now();
    try {

      // Capture a representative benchmark snapshot for the top-of-screen dev panel.
      try {
        const chosen = ingestionResults.find((r) => r.accountNumber === metricsAccount) || ingestionResults[0];
        const s = chosen?.plan?.stats;
        if (s) {
          setLastIngestionBenchmark(
            {
              ingestMs: s.ingestMs,
              parseMs: 0,
              processMs: s.processMs,
              totalMs: s.ingestMs,
              rowsProcessed: s.rowsProcessed,
              rowsPerSec: s.rowsPerSec,
              duplicatesRatio: s.duplicatesRatio,
              stageTimings: s.stageTimings,
              earlyShortCircuits: {
                total: s.earlyShortCircuits.total,
                byStage: {
                  existing: s.earlyShortCircuits.existing,
                  intraFile: s.earlyShortCircuits.intraFile,
                },
              },
            },
            s.importSessionId
          );
        }
      } catch {/* noop */}

      ingestionResults.forEach(({ accountNumber, plan }) => {
        if (!plan) return;
        commitImportPlan(plan);

        // Update account metadata (label/institution) if newly mapped
        const mapping = accountMappingsRef.current?.[accountNumber] as AccountMapping | undefined;
        if (mapping) {
          const existingId = accountsRef.current?.[accountNumber]?.id;
          addOrUpdateAccountRef.current(accountNumber, {
            accountNumber,
            id: existingId || crypto.randomUUID(),
            label: mapping.label || accountNumber,
            institution: mapping.institution || 'Unknown',
            lastSync: new Date().toISOString(),
          });
        }
        // Per-account undo toast (quick action) - require plumbing
        // const sessionId = plan.stats.importSessionId;
        fireToast("info", "Import Applied (Staged)", `Account ${accountNumber}: ${plan.stats.newCount} new transactions.`)

        /* TODO(P3): Re-enable per-account undo to staged state; requires plumbing undoStagedImport to
        // accept an accountNumber + sessionId and revert just that slice of the patch, leaving all other
        // accounts' transactions intact. For now, users can apply all then undo from the history tab if needed. 
          render: ({ onClose }) => (
            <Box p={3} bg='gray.800' color='white' borderRadius='md' boxShadow='md'>
              <Text fontSize='sm' mb={1}>Imported {plan.stats.newCount} new transactions in {accountNumber}</Text>
              <Button size='xs' colorPalette='red' variant='outline'>Undo</Button>
            </Box>
          )*/
      });
      if (telemetry) {
        setLastIngestionTelemetry({
          at: new Date().toISOString(),
          accountNumber: telemetry.accounts > 1 ? `${telemetry.accounts} accounts` : (ingestionResults[0]?.accountNumber || ''),
          newCount: telemetry.newCount,
          dupesExisting: telemetry.dupesExisting,
          dupesIntraFile: telemetry.dupesIntraFile,
          categorySources: undefined,
        });
      }
      fireToast("success", "Import applied (staged)", "Transactions are staged until you Apply to Budget.");

      recordGenericTiming({
        kind: "import",
        name: "import:staged-batch",
        durationMs: performance.now() - perfStartedAt,
        ok: true,
        data: {
          accounts: ingestionResults.length,
          totalNewCount: telemetry?.newCount ?? null,
          totalDupesExisting: telemetry?.dupesExisting ?? null,
          totalDupesIntraFile: telemetry?.dupesIntraFile ?? null,
          totalSavingsDeferred: telemetry?.savings ?? null,
        },
      });
      onClose();
      resetState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      fireToast("error", "Apply failed", msg);

      recordGenericTiming({
        kind: "import",
        name: "import:staged-batch",
        durationMs: performance.now() - perfStartedAt,
        ok: false,
        message: msg,
        data: { accounts: ingestionResults.length },
      });
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
          resetState();
        }
      }}
      size="lg"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content onKeyDown={onDialogKeyDown}>
          <Dialog.Header>
            {step === 'select'
              ? 'Step 1: Select CSV'
              : step === 'mapping'
                ? 'Step 1: Map Account Numbers'
                : step === 'accounts'
                  ? 'Step 1 Complete: Accounts Ready'
                  : 'Step 2: Import Transactions'}
          </Dialog.Header>
          <Dialog.Body>
            {step === 'select' && (
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  First we’ll detect accounts and collect labels/institutions. Then we’ll import transactions from the same CSV.
                </Text>
                {isDemo && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      // 1) synthesize rows in-memory
                      const sample = [
                        { AccountNumber:'1234', AccountType:'Checking', 'Posted Date':'2025-08-03', Description:'Woodmans Grocery', Category:'groceries', Amount:'-89.12' },
                        { AccountNumber:'1234', AccountType:'Checking', 'Posted Date':'2025-08-05', Description:'Direct Deposit',   Category:'income',    Amount:'1200.00' },
                        { AccountNumber:'1234', AccountType:'Checking', 'Posted Date':'2025-08-09', Description:'Web Branch:TFR TO SV 457397801', Category:'transfer', Amount:'-100.00' },
                      ];
                      // 2) use current mapping state; if unmapped, jump to mapping step
                      const accountNumbers = [...new Set(sample.map(r => r.AccountNumber?.trim()).filter(Boolean))];
                      const mappings = accountMappingsRef.current;
                      const unmapped = accountNumbers.filter(n => !mappings[n]);
                      setFoundAccounts(accountNumbers);
                      setPendingData(sample);
                      if (unmapped.length) {
                        setPendingMappings(unmapped);
                        setStep("mapping");
                      } else {
                        createOrUpdateAccounts(accountNumbers);
                        setStep('accounts');
                      }
                    }}>
                      Load Sample CSV (Demo)
                    </Button>
                    <Text fontSize="sm" color="fg.muted" alignContent={'center'}>-- OR --</Text>
                  </>
                )}
                <RadioGroup.Root
                  value={sourceType}
                  onValueChange={(details) => {
                    if (!details.value) return;
                    if (details.value === 'csv' || details.value === 'ofx' || details.value === 'plaid') {
                      setSourceType(details.value);
                    }
                    setCsvFile(null);
                    setOfxFile(null);
                  }}
                >
                  <Stack direction="column">
                    {syncFileTypeOptions.map((opt) => (
                      <RadioGroup.Item key={opt.value} value={opt.value as syncFileTypeMode}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemControl>
                          <RadioGroup.ItemIndicator />
                        </RadioGroup.ItemControl>
                        <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </Stack>
                </RadioGroup.Root>

                {fileTypes.includes(sourceType) && (
                  <>
                    <Input type="file" accept={`.${sourceType}`} onChange={handleFileChange} />
                    {((sourceType === "csv" && csvFile) || (sourceType === "ofx" && ofxFile)) && (
                      <Text fontSize="sm" color="fg.muted">
                        Selected: {(sourceType === "csv" ? csvFile?.name : ofxFile?.name)}
                      </Text>
                    )}

                    {sourceType === 'csv' && parsing && csvFile && (
                      <Box borderWidth='1px' borderRadius='md' p={3} bg='bg.subtle'>
                        <HStack justify='space-between' align='center' wrap='wrap' gap={2}>
                          <Text fontSize='sm'>Parsing CSV…</Text>
                          <HStack gap={2} wrap='wrap'>
                            <Tag.Root size='sm'>{parseRows.toLocaleString()} rows</Tag.Root>
                            {typeof parseBytes === 'number' && csvFile.size > 0 && (
                              <Tag.Root size='sm'>
                                {Math.min(100, (parseBytes / csvFile.size) * 100).toFixed(1)}%
                              </Tag.Root>
                            )}
                            {!parseFinished && !parseAborted && (
                              <Button size='xs' variant='outline' colorPalette='red' onClick={abortCsvParse}>Abort</Button>
                            )}
                          </HStack>
                        </HStack>
                        <Box mt={2} h='4px' bg='gray.200' borderRadius='sm' overflow='hidden'>
                          {(() => {
                            let pct = 10;
                            if (typeof parseBytes === 'number' && csvFile.size > 0) {
                              pct = Math.min(100, (parseBytes / csvFile.size) * 100);
                            }
                            if (parseFinished || parseAborted) pct = 100;
                            return <Box h='100%' width={`${pct}%`} bg={parseAborted ? 'red.400' : 'purple.400'} transition='width 0.2s ease' />;
                          })()}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            )}

            {step === 'mapping' && (
              <Stack gap={4}>
                <Text mb={2}>We found account numbers that aren't yet mapped. Please assign a label and institution.</Text>
                {pendingMappings.map((num) => (
                  <Stack key={num} gap={2}>
                    <Text fontWeight="bold">Account #: {num}</Text>
                    <Input
                      placeholder="Label (e.g., Jr's Checking)"
                      onChange={(e) =>
                        setAccountInputs((prev: Record<string, { label?: string; institution?: string }>) => ({
                          ...prev,
                          [num]: { ...prev[num], label: e.target.value },
                        }))
                      }
                    />
                    <Input
                      placeholder="Institution (e.g., UWCU)"
                      onChange={(e) =>
                        setAccountInputs((prev: Record<string, { label?: string; institution?: string }>) => ({
                          ...prev,
                          [num]: { ...prev[num], institution: e.target.value },
                        }))
                      }
                    />
                  </Stack>
                ))}
              </Stack>
            )}

            {step === 'accounts' && (
              <Stack gap={3}>
                <Text fontSize="sm" color="fg.muted">
                  Accounts are set up. Next we’ll analyze and import transactions from the same CSV.
                </Text>
                <Box maxH='160px' overflow='auto' borderWidth='1px' borderRadius='md' p={2} fontSize='sm'>
                  {foundAccounts.map((acctNum) => {
                    const mapping = accountMappingsRef.current?.[acctNum] as AccountMapping | undefined;
                    return (
                      <Box key={acctNum} mb={2}>
                        <Text fontWeight='bold'>{acctNum}</Text>
                        <Text color='fg.muted'>
                          {mapping?.label || acctNum} • {mapping?.institution || 'Unknown'}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              </Stack>
            )}

            {step === 'transactions' && (
              <Stack gap={3}>
                <Checkbox.Root
                  checked={autoApplyExplicitDirectives}
                  onCheckedChange={(details) => {
                    const next = details.checked === true;
                    if (next === autoApplyExplicitDirectives) return;
                    setAutoApplyExplicitDirectives(next);

                    // Invalidate any previous dry-run immediately to avoid applying stale plans.
                    if (dryRunStarted) {
                      setIngestionResults([]);
                      setTelemetry(null);
                    }
                  }}
                  disabled={ingesting}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <Text fontSize="sm">Auto-apply `budgeteer:*` directives</Text>
                  </Checkbox.Label>
                </Checkbox.Root>

                {isLargeFile && !dryRunStarted && (
                  <Box borderWidth='1px' borderRadius='md' p={3}>
                    <Text fontSize='sm' fontWeight='bold'>Large import detected</Text>
                    <Text fontSize='sm' color='fg.muted'>
                      This file looks large, so analysis won’t start until you click “Run Dry Run”.
                    </Text>
                  </Box>
                )}
              </Stack>
            )}
          </Dialog.Body>
          <Dialog.CloseTrigger asChild>
            <Button position="absolute" top={2} right={2} size="sm" variant="ghost">X</Button>
          </Dialog.CloseTrigger>
          <Dialog.Footer>
            {step === 'select' ? (
              <>
                <Button onClick={() => { onClose(); resetState(); }} variant="ghost" mr={3}>
                  Cancel
                </Button>
                <Button
                  ref={primaryActionButtonRef}
                  onClick={handleStartAccounts}
                  colorPalette="teal"
                  loading={ingesting}
                  disabled={!fileTypes.includes(sourceType)}
                >
                  Continue
                </Button>
              </>
            ) : step === 'mapping' ? (
              <Button
                colorPalette="teal"
                onClick={() => {
                // Save new mappings
                const additions: Record<string, { label: string; institution: string }> = {};
                pendingMappings.forEach((num) => {
                  const info = accountInputs[num] || {};
                  additions[num] = {
                    label: info.label || num,
                    institution: info.institution || "Unknown",
                  };
                  setAccountMapping(num, additions[num]);
                });

                // Continue using a locally-computed next mapping snapshot for this import pass.
                // (Avoids store reach-through reads while keeping behavior equivalent.)
                accountMappingsRef.current = { ...accountMappingsRef.current, ...additions };

                createOrUpdateAccounts(foundAccounts);
                setStep('accounts');
              }}
              >
                Save & Continue
              </Button>
            ) : step === 'accounts' ? (
              <>
                <Button onClick={() => { onClose(); resetState(); }} variant="ghost" mr={3}>
                  Cancel Import
                </Button>
                <Button ref={primaryActionButtonRef} colorPalette='teal' onClick={beginTransactionsStep}>
                  Continue to Transactions
                </Button>
              </>
            ) : (
              <>
                <Button
                  ref={(!dryRunStarted || ingestionResults.length === 0) ? primaryActionButtonRef : undefined}
                  colorPalette='teal'
                  onClick={runDryRun}
                  loading={ingesting}
                  disabled={ingesting || (!pendingData.length)}
                >
                  {dryRunStarted ? 'Re-Run Dry Run' : 'Run Dry Run'}
                </Button>
                {ingestionResults.length > 0 && !ingesting && (
                  <Button ref={(dryRunStarted && ingestionResults.length > 0) ? primaryActionButtonRef : undefined} ml={3} colorPalette='purple' onClick={applyAllPlans}>
                    Apply All ({telemetry?.newCount || 0} new)
                  </Button>
                )}
              </>
            )}
          </Dialog.Footer>
          {step === 'transactions' && ingestionResults.length > 0 && (
            <Box px={6} pb={4}>
              <Text fontSize='sm' fontWeight='bold' mb={2}>Dry Run Summary</Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={3} fontSize='xs'>
                <Stat.Root><Stat.Label>Accounts</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.accounts}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Rows</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.rows}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>New</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.newCount}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>DupEx</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.dupesExisting}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>DupIntra</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.dupesIntraFile}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Savings</Stat.Label><Stat.ValueText fontSize='md'>{telemetry?.savings}</Stat.ValueText></Stat.Root>
              </SimpleGrid>
              <Box maxH='140px' overflow='auto' borderWidth='1px' borderRadius='md' p={2} fontSize='11px'>
                {ingestionResults.map(({ accountNumber, plan }) => (
                  <Box key={accountNumber} mb={2}>
                    <Text fontWeight='bold'>{accountNumber}</Text>
                    <Text>New: {plan.stats.newCount} | DupEx: {plan.stats.dupesExisting} | DupIntra: {plan.stats.dupesIntraFile} | EarlySC: {plan.stats.earlyShortCircuits?.total}</Text>
                  </Box>
                ))}
              </Box>
              {/* Metrics panel (select account) */}
              <Box mt={4}>
                <Stack direction='row' align='center' mb={2} gap={2}>
                  <Text fontSize='sm'>Metrics:</Text>
                  <AppSelect value={metricsAccount} onChange={e=>setMetricsAccount(e.target.value)} size="xs" fontSize='0.75rem' width='120px' placeholder="Select account">
                    {ingestionResults.map(ir => <option key={ir.accountNumber} value={ir.accountNumber}>{ir.accountNumber}</option>)}
                  </AppSelect>
                  {metricsAccount && <Tag.Root size='sm'>{metricsAccount.slice(0,12)}</Tag.Root>}
                </Stack>
                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const s = sel.plan.stats;
                  const metrics = {
                    ingestMs: s.ingestMs,
                    parseMs: 0,
                    processMs: s.processMs,
                    totalMs: s.ingestMs,
                    rowsProcessed: s.rowsProcessed,
                    rowsPerSec: s.rowsPerSec,
                    duplicatesRatio: s.duplicatesRatio,
                    stageTimings: s.stageTimings,
                    earlyShortCircuits: {
                      total: s.earlyShortCircuits.total,
                      byStage: {
                        existing: s.earlyShortCircuits.existing,
                        intraFile: s.earlyShortCircuits.intraFile,
                      },
                    },
                  };
                  return <IngestionMetricsPanel metrics={metrics} sessionId={s.importSessionId} />;
                })()}

                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const plan = sel.plan;
                  const manifest = importManifests?.[plan.stats.hash];
                  const seen = manifest?.accounts?.[sel.accountNumber];
                  if (!manifest || !seen) return null;
                  return (
                    <Box mt={3} borderWidth='1px' borderRadius='md' p={3} bg='yellow.50'>
                      <Text fontSize='sm' fontWeight='bold' color={"gray.900"}>Previously Imported</Text>
                      <Text fontSize='xs' color={"gray.900"}>This file hash was imported for this account at {seen.importedAt}. Re-importing may be redundant.</Text>
                    </Box>
                  );
                })()}

                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const sources = sel.plan.stats.categorySources;
                  if (!sources) return null;
                  const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
                  const entries = Object.entries(sources) as [string, number][];

                  return (
                    <Box mt={3} borderWidth='1px' borderRadius='md' p={3} bg='bg.subtle'>
                      <Text fontSize='sm' fontWeight='bold' mb={2}>Category Inference Sources</Text>
                      <Stack direction='row' gap={2} wrap='wrap'>
                        {entries.map(([k, v]) => {
                          const pct = ((v / total) * 100).toFixed(1);
                          return <Tag.Root key={k} size='sm'>{k}: {v} ({pct}%)</Tag.Root>;
                        })}
                      </Stack>
                    </Box>
                  );
                })()}

                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const plan = sel.plan;
                  const errs = plan.errors || [];
                  if (errs.length === 0) return null;

                  const counts = {
                    all: errs.length,
                    parse: errs.filter((e) => e.type === 'parse').length,
                    normalize: errs.filter((e) => e.type === 'normalize').length,
                    duplicate: errs.filter((e) => e.type === 'duplicate').length,
                  };

                  const filtered = errs.filter((e) => errorFilter === 'all' || e.type === errorFilter);

                  return (
                    <Box mt={3} borderWidth='1px' borderRadius='md' p={3} bg='bg.subtle'>
                      <HStack justify='space-between' align='center' wrap='wrap' gap={2}>
                        <Box>
                          <Text fontSize='sm' fontWeight='bold'>Row Warnings / Errors</Text>
                          <Text fontSize='xs' color='fg.muted'>{errs.length} rows skipped.</Text>
                        </Box>
                        <HStack gap={2} wrap='wrap'>
                          <Button size='xs' variant={errorFilter==='all'?'solid':'outline'} onClick={()=>setErrorFilter('all')}>All ({counts.all})</Button>
                          <Button size='xs' variant={errorFilter==='parse'?'solid':'outline'} onClick={()=>setErrorFilter('parse')}>Parse ({counts.parse})</Button>
                          <Button size='xs' variant={errorFilter==='normalize'?'solid':'outline'} onClick={()=>setErrorFilter('normalize')}>Normalize ({counts.normalize})</Button>
                          <Button size='xs' variant={errorFilter==='duplicate'?'solid':'outline'} onClick={()=>setErrorFilter('duplicate')}>Duplicate ({counts.duplicate})</Button>
                          <Button size='xs' onClick={()=>setShowErrors(s=>!s)}>{showErrors? 'Hide':'Show'}</Button>
                          <Button
                            size='xs'
                            variant='ghost'
                            title='Download errors as CSV'
                            onClick={() => {
                              if (exportLockRef.current) return;
                              exportLockRef.current = true;
                              setTimeout(()=>{ exportLockRef.current = false; }, 1500);
                              try {
                                const header = 'line,type,reason,message';
                                const rows = errs.map((e) => [
                                  e.line,
                                  e.type,
                                  e.type === 'duplicate' ? e.reason || '' : '',
                                  (e.message || '').replace(/"/g, '""'),
                                ]);
                                const csv = [header, ...rows.map((r) => r.map((f) => `"${(f ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `ingestion-errors-${plan.stats.hash}-${sel.accountNumber}.csv`;
                                (document.body ?? document.documentElement)?.appendChild(a);
                                a.click();
                                setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
                              } catch {
                                /* ignore */
                              }
                            }}
                          >
                            Download CSV
                          </Button>
                        </HStack>
                      </HStack>

                      {showErrors && (
                        <Box mt={2} maxH='160px' overflowY='auto' borderWidth='1px' borderRadius='md' p={2} bg='gray.900' color='red.200' fontFamily='mono' fontSize='10px'>
                          {filtered.slice(0, 200).map((err, idx) => (
                            <Text key={idx}>L{err.line || '?'} [{err.type}] {err.message}</Text>
                          ))}
                          {filtered.length > 200 && (
                            <Text mt={1} color='gray.400'>Showing first 200 of {filtered.length}. Use Download CSV for full list.</Text>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })()}

                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const report = sel.plan.directivesReport;
                  const total = report?.total ?? 0;
                  const byKind = report?.byKind ?? { rename: 0, category: 0, goal: 0, apply: 0 };
                  const items = report?.items ?? [];

                  return (
                    <Box mt={3} borderWidth='1px' borderRadius='md' p={3} bg='bg.subtle'>
                      <Stack gap={2}>
                        <Text fontSize='sm' fontWeight='bold'>Directives Found in Notes</Text>
                        <Stack direction='row' gap={2} wrap='wrap'>
                          <Tag.Root size='sm'>total: {total}</Tag.Root>
                          {byKind.rename > 0 && <Tag.Root size='sm'>rename: {byKind.rename}</Tag.Root>}
                          {byKind.category > 0 && <Tag.Root size='sm'>category: {byKind.category}</Tag.Root>}
                          {byKind.goal > 0 && <Tag.Root size='sm'>goal: {byKind.goal}</Tag.Root>}
                          {byKind.apply > 0 && <Tag.Root size='sm'>apply: {byKind.apply}</Tag.Root>}
                          {!!report?.truncated && <Tag.Root size='sm'>truncated</Tag.Root>}
                        </Stack>

                        {total === 0 ? (
                          <Text fontSize='xs' color='fg.muted'>No directives found.</Text>
                        ) : (
                          <Box maxH='180px' overflowY='auto' borderWidth='1px' borderRadius='md' p={2} fontFamily='mono' fontSize='10px' bg='gray.900' color='green.200'>
                            {items.slice(0, 200).map((d, idx) => (
                              <Text key={`${d.line ?? '?'}-${d.kind}-${idx}`}>
                                L{d.line ?? '?'} | {d.date ?? ''} | {d.kind}={d.value} | {(d.description ?? '').slice(0, 60)}
                              </Text>
                            ))}
                            {items.length > 200 && (
                              <Text mt={1} color='gray.400'>Showing first 200 of {items.length}. (Counts include all.)</Text>
                            )}
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  );
                })()}
              </Box>
            </Box>
          )}
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

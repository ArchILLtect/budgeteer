import { Button, RadioGroup, Stack, Input, Text, Box, Stat, SimpleGrid, Tag, Dialog } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { useBudgetStore } from "../../store/budgetStore";
import { analyzeImport } from "../../ingest/analyzeImport";
import IngestionMetricsPanel from "../accounts/IngestionMetricsPanel";
import { fireToast } from "../../hooks/useFireToast";
import type { ImportPlan } from "../../ingest/importPlan";

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

export default function SyncAccountsModal({ isOpen, onClose }: SyncAccountsModalProps) {
  const accountMappings = useBudgetStore((s: any) => s.accountMappings);
  const accounts = useBudgetStore((s: any) => s.accounts);
  const setAccountMapping = useBudgetStore((s: any) => s.setAccountMapping);
  const addOrUpdateAccount = useBudgetStore((s: any) => s.addOrUpdateAccount);
  const commitImportPlan = useBudgetStore((s: any) => s.commitImportPlan);
  const streamingAutoByteThreshold = useBudgetStore((s: any) => s.streamingAutoByteThreshold);

  const [sourceType, setSourceType] = useState("csv");
  const [csvFile, setCsvFile] = useState<any>(null);
  const [ofxFile, setOfxFile] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'mapping' | 'accounts' | 'transactions'>('select');
  const [pendingMappings, setPendingMappings] = useState<string[]>([]);
  const [pendingData, setPendingData] = useState<any[]>([]); // original parsed rows awaiting mapping
  const [foundAccounts, setFoundAccounts] = useState<string[]>([]);
  const [accountInputs, setAccountInputs] = useState<any>({});
  const [ingesting, setIngesting] = useState(false);
  const [ingestionResults, setIngestionResults] = useState<Array<{ accountNumber: string; plan: ImportPlan }>>([]); // [{ accountNumber, plan }]
  const [telemetry, setTelemetry] = useState<any>(null); // aggregate
  const [metricsAccount, setMetricsAccount] = useState('');
  const setLastIngestionTelemetry = useBudgetStore(s => s.setLastIngestionTelemetry);
  const [dryRunStarted, setDryRunStarted] = useState(false);

  const fileTypes = ["csv", "ofx"];
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (sourceType === "csv") {
      setCsvFile(e.target.files?.[0]);
      setOfxFile(null);
    } else if (sourceType === "ofx") {
      setOfxFile(e.target.files?.[0]);
      setCsvFile(null);
    }
  };

  const handleStartAccounts = () => {
    if (!csvFile && !ofxFile) {
      fireToast("warning", "File Required" , `Please select a ${sourceType.toUpperCase()} file before importing.`);
      return;
    }

    if (sourceType === "csv") {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        worker: (csvFile?.size || 0) > 500_000,
        complete: (results) => {
          const data = results.data;

          if (!Array.isArray(data) || data.length === 0) {
            fireToast('warning', 'No rows found', 'The CSV appears to be empty.');
            return;
          }

          const accountNumbers = new Set(
            data.map((row: any) => row.AccountNumber?.trim()).filter(Boolean)
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
          fireToast("error", "CSV Parse Failed", err.message || "An error occurred while parsing the CSV file.");
        },
        },
      );
    } else if (sourceType === "ofx") {
      fireToast("warning", "OFX File Import Coming Soon", "Please use CSV for now.");
    }
  };

  const createOrUpdateAccounts = (accountNumbers: string[]) => {
    const now = new Date().toISOString();
    for (const accountNumber of accountNumbers) {
      const mapping: any = accountMappingsRef.current?.[accountNumber];
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
    setDryRunStarted(true);
    await importCsvData(pendingData);
  };

  const isLargeFile = (csvFile?.size || 0) > (streamingAutoByteThreshold || 500_000);
  const shouldAutoRunDryRun = !isLargeFile;

  useEffect(() => {
    if (step !== 'transactions') return;
    if (dryRunStarted) return;
    if (!shouldAutoRunDryRun) return;
    // Auto-run dry run for small files; large files require explicit click.
    void runDryRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dryRunStarted, shouldAutoRunDryRun]);

  // Ingestion migration implementation
  const importCsvData: any = async (data: any[]) => {
    setIngesting(true);
    setIngestionResults([]);
    setTelemetry(null);
    try {
      // Group raw rows by AccountNumber
      const groups = data.reduce((acc, row) => {
        const acct = (row.AccountNumber || row.accountNumber || '').trim();
        if (!acct) return acc;
        if (!acc[acct]) acc[acct] = [];
        acc[acct].push(row);
        return acc;
      }, {} as Record<string, any[]>);

      const results: any = [];
      const aggregate: any = {
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
        const adaptedRows = rows.map((r: any, idx: number) => ({
          date: r['Posted Date'] || r['Date'] || r.date,
          Description: r.Description || r.description || r.Memo,
          Amount: r.Amount ?? r.amount ?? r.Amt ?? r.amt,
          Category: r.Category || r.category,
          __line: idx + 1,
        }));
        const existing: any[] = accountsRef.current?.[acctNumber]?.transactions || [];

        const plan = await analyzeImport({
          parsedRows: { rows: adaptedRows, errors: [] },
          accountNumber: acctNumber,
          existingTxns: existing,
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
    } catch (e: any) {
      fireToast("error", "Ingestion failed", e.message);
    } finally {
      setIngesting(false);
    }
  };

  const applyAllPlans = () => {
    if (!ingestionResults.length) return;
    try {

      ingestionResults.forEach(({ accountNumber, plan }) => {
        if (!plan) return;
        commitImportPlan(plan);

        // Update account metadata (label/institution) if newly mapped
        const mapping: any = accountMappingsRef.current?.[accountNumber];
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
        // accept an accountNumber + sessionId and revert just that slice of the patch, leaving any other
        // accounts' transactions intact. For now, users can apply all then undo from the history tab if needed. 
          render: ({ onClose }) => (
            <Box p={3} bg='gray.800' color='white' borderRadius='md' boxShadow='md'>
              <Text fontSize='sm' mb={1}>Imported {plan.stats.newCount} new transactions in {accountNumber}</Text>
              <Button size='xs' colorScheme='red' variant='outline'>Undo</Button>
            </Box>
          )*/
      });
      if (telemetry) {
        setLastIngestionTelemetry({
          at: new Date().toISOString(),
          accountNumber: telemetry.accounts > 1 ? `${telemetry.accounts} accounts` : ingestionResults[0]?.accountNumber,
          newCount: telemetry.newCount,
          dupesExisting: telemetry.dupesExisting,
          dupesIntraFile: telemetry.dupesIntraFile,
          categorySources: null,
        });
      }
      fireToast("success", "Import applied (staged)", "Transactions are staged until you Apply to Budget.");
      onClose();
      resetState();
    } catch (e: any) {
      fireToast("error", "Apply failed", e.message);
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
        <Dialog.Content>
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
                <Text fontSize="sm" color="gray.600">
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
                    <Text fontSize="sm" color="gray.500" alignContent={'center'}>-- OR --</Text>
                  </>
                )}
                <RadioGroup.Root
                  value={sourceType}
                  onValueChange={(details) => {
                    if (!details.value) return;
                    setSourceType(details.value);
                    setCsvFile(null);
                    setOfxFile(null);
                  }}
                >
                  <Stack direction="column">
                    <RadioGroup.Item value="csv">CSV File</RadioGroup.Item>
                    <RadioGroup.Item value="ofx">OFX File (Coming Soon)</RadioGroup.Item>
                    <RadioGroup.Item value="plaid" disabled>Bank Account (Coming Soon)</RadioGroup.Item>
                  </Stack>
                </RadioGroup.Root>

                {fileTypes.includes(sourceType) && (
                  <>
                    <Input type="file" accept={`.${sourceType}`} onChange={handleFileChange} />
                    {((sourceType === "csv" && csvFile) || (sourceType === "ofx" && ofxFile)) && (
                      <Text fontSize="sm" color="gray.500">
                        Selected: {(sourceType === "csv" ? csvFile?.name : ofxFile?.name)}
                      </Text>
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
                <Text fontSize="sm" color="gray.600">
                  Accounts are set up. Next we’ll analyze and import transactions from the same CSV.
                </Text>
                <Box maxH='160px' overflow='auto' borderWidth='1px' borderRadius='md' p={2} fontSize='sm'>
                  {foundAccounts.map((acctNum) => {
                    const mapping: any = accountMappingsRef.current?.[acctNum];
                    return (
                      <Box key={acctNum} mb={2}>
                        <Text fontWeight='bold'>{acctNum}</Text>
                        <Text color='gray.600'>
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
                {isLargeFile && !dryRunStarted && (
                  <Box borderWidth='1px' borderRadius='md' p={3}>
                    <Text fontSize='sm' fontWeight='bold'>Large import detected</Text>
                    <Text fontSize='sm' color='gray.600'>
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
                <Button onClick={handleStartAccounts} colorScheme="teal" loading={ingesting} disabled={!fileTypes.includes(sourceType)}>
                  Continue
                </Button>
              </>
            ) : step === 'mapping' ? (
              <Button
                colorScheme="teal"
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
                <Button colorScheme='teal' onClick={beginTransactionsStep}>
                  Continue to Transactions
                </Button>
              </>
            ) : (
              <>
                <Button
                  colorScheme='teal'
                  onClick={runDryRun}
                  loading={ingesting}
                  disabled={ingesting || (!pendingData.length)}
                >
                  {dryRunStarted ? 'Re-Run Dry Run' : 'Run Dry Run'}
                </Button>
                {ingestionResults.length > 0 && !ingesting && (
                  <Button ml={3} colorScheme='purple' onClick={applyAllPlans}>
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
                {ingestionResults.map(({ accountNumber, plan }: any) => (
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
                  <select value={metricsAccount} onChange={e=>setMetricsAccount(e.target.value)} style={{ fontSize:'0.75rem' }}>
                    {ingestionResults.map(ir => <option key={ir.accountNumber} value={ir.accountNumber}>{ir.accountNumber}</option>)}
                  </select>
                  {metricsAccount && <Tag.Root size='sm'>{metricsAccount.slice(0,12)}</Tag.Root>}
                </Stack>
                {(() => {
                  const sel = ingestionResults.find(r => r.accountNumber === metricsAccount) || ingestionResults[0];
                  if (!sel) return null;
                  const s = sel.plan.stats;
                  const metrics = {
                    ingestMs: s.ingestMs,
                    parseMs: null,
                    processMs: s.processMs,
                    totalMs: s.ingestMs,
                    rowsProcessed: s.rowsProcessed,
                    rowsPerSec: s.rowsPerSec,
                    duplicatesRatio: s.duplicatesRatio,
                    stageTimings: s.stageTimings,
                    earlyShortCircuits: s.earlyShortCircuits,
                  };
                  return <IngestionMetricsPanel metrics={metrics as any} sessionId={s.importSessionId} />;
                })()}
              </Box>
            </Box>
          )}
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

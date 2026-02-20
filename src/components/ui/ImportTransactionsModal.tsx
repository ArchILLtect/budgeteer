import { useState, useCallback, useRef } from 'react';
import { Button, Box, VStack, HStack, Input, Text, Stat, Alert, Badge, Dialog, Separator, Field } from '@chakra-ui/react';
import { useBudgetStore } from '../../store/budgetStore';
import { analyzeImport } from '../../ingest/analyzeImport';
import { parseCsv } from '../../ingest/parseCsv';
import { streamParseCsv } from '../../ingest/parseCsvStreaming';
import IngestionMetricsPanel from '../accounts/IngestionMetricsPanel';
import { fireToast } from '../../hooks/useFireToast';
import { AppSelect } from './AppSelect';
import type { ImportPlan } from '../../ingest/importPlan';
import type { Transaction } from '../../types';
import type {
  AcceptedTxnPreview,
  DuplicateSample,
  IngestionError,
  IngestionStats,
  SavingsQueueEntry,
} from '../../ingest/importPlan';

type ImportDryRunResult = {
  plan: ImportPlan;
  stats: IngestionStats;
  errors: IngestionError[];
  duplicatesSample: DuplicateSample[];
  acceptedTxns: AcceptedTxnPreview[];
  savingsQueue: SavingsQueueEntry[];
  importSessionId: string;
};

type Timing = {
  parseMs: number | null;
  ingestMs: number | null;
  totalMs: number | null;
};

type ParsedRowsContainer = {
  rows: unknown[];
  errors: unknown[];
};

function errorToMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  if (typeof err === 'string') return err;
  return 'Unknown error';
}


type ImportTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Phase 3: Production Import Preview Modal
 * Provides dry-run ingestion, duplicate breakdown, manifest warning, preview & patch apply.
 */
export default function ImportTransactionsModal({ isOpen, onClose }: ImportTransactionsModalProps) {
  const accounts = useBudgetStore((s) => s.accounts);
  const importManifests = useBudgetStore((s) => s.importManifests || {});
  const registerImportManifest = useBudgetStore((s) => s.registerImportManifest);
  const setLastIngestionTelemetry = useBudgetStore((s) => s.setLastIngestionTelemetry);
  const lastIngestionTelemetry = useBudgetStore((s) => s.lastIngestionTelemetry);
  const streamingAutoLineThreshold = useBudgetStore((s) => s.streamingAutoLineThreshold);
  const streamingAutoByteThreshold = useBudgetStore((s) => s.streamingAutoByteThreshold);
  const commitImportPlan = useBudgetStore((s) => s.commitImportPlan);

  const [fileName, setFileName] = useState('');
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fileText, setFileText] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [detectedAccounts, setDetectedAccounts] = useState<string[]>([]);
  const [autoDetected, setAutoDetected] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [useStreaming, setUseStreaming] = useState(false);
  const [streamRows, setStreamRows] = useState(0);
  const [streamBytes, setStreamBytes] = useState<number | null>(null);
  const [streamFinished, setStreamFinished] = useState(false);
  const [autoStreaming, setAutoStreaming] = useState(false);
  const [autoStreamingReason, setAutoStreamingReason] = useState('');
  const [streamAborted, setStreamAborted] = useState(false);
  const [streamController, setStreamController] = useState<ReturnType<typeof streamParseCsv> | null>(null);
  const [result, setResult] = useState<ImportDryRunResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [totalLines, setTotalLines] = useState<number | null>(null); // for progress % estimation
  const [showErrors, setShowErrors] = useState(false);
  const [errorFilter, setErrorFilter] = useState('all'); // all | parse | normalize | duplicate
  const [timing, setTiming] = useState<Timing>({ parseMs: null, ingestMs: null, totalMs: null });
  const exportLockRef = useRef(false);

  const resetState = () => {
    setFileName('');
    setFileObj(null);
    setFileText('');
    setAccountNumber('');
    setDetectedAccounts([]);
    setAutoDetected(false);
    setIngesting(false);
    setResult(null);
    setApplied(false);
    setStreaming(false);
    setUseStreaming(false);
    setStreamRows(0);
    setStreamBytes(null);
    setStreamFinished(false);
    setAutoStreaming(false);
    setAutoStreamingReason('');
    setStreamAborted(false);
    setStreamController(null);
  };

  const existingTxns = (accounts[accountNumber]?.transactions || []) as Transaction[];

  const detectAccountNumbers = useCallback((csvText: string): string[] => {
    try {
      const parsed = parseCsv(csvText);
      const rows = Array.isArray(parsed) ? parsed : parsed.rows; // backward compatibility
      if (!rows.length) return [];
      const setVals = new Set<string>();
      for (let i = 0; i < rows.length && i < 800; i++) {
        const r = rows[i];
        const val = (r.AccountNumber || r.accountNumber || '').toString().trim();
        if (val) setVals.add(val);
      }
      return [...setVals];
    } catch {
      return [];
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileObj(file);
    setResult(null);
    setApplied(false);
    setDetectedAccounts([]);
    setAutoDetected(false);
    setUseStreaming(false);
    setAutoStreaming(false);
    setAutoStreamingReason('');

    const byteThresh = streamingAutoByteThreshold || 500_000;
    const fileIsLarge = (file.size || 0) > byteThresh;
    if (fileIsLarge) {
      setUseStreaming(true);
      setAutoStreaming(true);
      setAutoStreamingReason(`Large file: ${(file.size / 1024).toFixed(1)} KB`);
      setTotalLines(null);
      setFileText('');

      // Read a small slice for account detection without loading full file into memory.
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text: string = (evt.target?.result as string) || '';
        const accountsFound = detectAccountNumbers(text);
        if (accountsFound.length === 1) {
          setAccountNumber((prev) => prev || accountsFound[0]);
          setAutoDetected(true);
        } else if (accountsFound.length > 1) {
          setDetectedAccounts(accountsFound);
        }
      };
      reader.readAsText(file.slice(0, 256_000));
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text: string = (evt.target?.result as string) || '';
      setFileText(text);
      try { setTotalLines(((text.match(/\n/g) || []).length + 1) || null); } catch { setTotalLines(null); }
      const accountsFound = detectAccountNumbers(text);
      // Adaptive streaming heuristic (line-based only when we have full text)
      try {
        const lineCount = (text.match(/\n/g) || []).length + 1;
        const lineThresh = streamingAutoLineThreshold || 3000;
        if (!useStreaming && lineCount > lineThresh) {
          setUseStreaming(true);
          setAutoStreaming(true);
          setAutoStreamingReason(`Large file: ${lineCount.toLocaleString()} lines`);
        }
      } catch {/* heuristic failure ignored */}
      if (accountsFound.length === 1) {
        setAccountNumber((prev) => prev || accountsFound[0]);
        setAutoDetected(true);
      } else if (accountsFound.length > 1) {
        setDetectedAccounts(accountsFound);
      }
    };
    reader.readAsText(file);
  };

  // Run dry-run ingestion pipeline (sync or streaming path)
  const runPipeline = async () => {
    if (!useStreaming && !fileText) {
      fireToast("warning", "No file selected", "Please select a CSV file to import.");
      return;
    }
    if (useStreaming && !fileObj) {
      fireToast("warning", "No file selected", "Please select a CSV file to import.");
      return;
    }
    if (!accountNumber) {
      fireToast("warning", "Account number required", "Please select an account number.");
      return;
    }
    setIngesting(true);
    setStreaming(false);
    try {
      const wallStart = (performance && performance.now) ? performance.now() : Date.now();
      let ingestionInput: { fileText?: string; parsedRows?: ParsedRowsContainer } = { fileText };
      // Streaming path: parse rows first, then hand to ingestion (skip internal parse)
      if (useStreaming) {
        setStreaming(true);
        setStreamRows(0);
        setStreamBytes(null);
        setStreamFinished(false);
        setStreamAborted(false);
        const parseStart = (performance && performance.now) ? performance.now() : Date.now();
        const parsedRowsContainer = await new Promise<ParsedRowsContainer>((resolve, reject) => {
          try {
            const controller = streamParseCsv(fileObj as File, {
              onRow: () => true,
              worker: 'auto',
              onProgress: ({ rows, bytes, finished }) => {
                setStreamRows(rows);
                if (typeof bytes === 'number') setStreamBytes(bytes);
                if (finished) setStreamFinished(true);
              },
              onComplete: ({ rows, meta, error }) => {
                setStreamController(null);
                if (error) reject(error); else {
                  if (streamAborted) resolve({ rows: [], errors: meta?.parseErrors || [] });
                  else resolve({ rows, errors: meta?.parseErrors || [] });
                }
              },
            });
            setStreamController(controller);
          } catch (err) { reject(err); }
        });
        const parseEnd = (performance && performance.now) ? performance.now() : Date.now();
        if (streamAborted) {
          fireToast("warning", "Streaming aborted", `${streamRows} rows parsed (ignored).`);
          setIngesting(false);
          return; // do not proceed to ingestion
        }
        ingestionInput = { parsedRows: parsedRowsContainer };
        setTiming((t) => ({ ...t, parseMs: +(parseEnd - parseStart).toFixed(2) }));
      }

      const plan = await analyzeImport({
        fileText: ingestionInput.fileText,
        parsedRows: ingestionInput.parsedRows,
        accountNumber,
        existingTxns,
        yieldEvery: useStreaming ? 500 : undefined,
      });

      // Preserve previous behavior: record hash/account association at dry-run time
      // so users get a "previously imported" warning.
      try {
        registerImportManifest(plan.stats.hash, accountNumber, {
          size: fileText.length,
          sampleName: fileName,
          newCount: plan.stats.newCount,
          dupes: plan.stats.dupes,
        });
      } catch {/* noop */}

      const r: ImportDryRunResult = {
        plan,
        stats: plan.stats,
        errors: plan.errors,
        duplicatesSample: plan.duplicatesSample,
        acceptedTxns: plan.acceptedPreview,
        savingsQueue: plan.savingsQueue,
        importSessionId: plan.session.sessionId,
      };

      setResult(r);
      setApplied(false);
      // Persist telemetry
      try {
        setLastIngestionTelemetry({
          at: new Date().toISOString(),
          accountNumber,
          hash: r.stats.hash,
          newCount: r.stats.newCount,
          dupesExisting: r.stats.dupesExisting,
          dupesIntraFile: r.stats.dupesIntraFile,
          categorySources: r.stats.categorySources,
        });
      } catch {/* noop */}
      const wallEnd = (performance && performance.now) ? performance.now() : Date.now();
      setTiming((t) => ({ ...t, ingestMs: r.stats.ingestMs, totalMs: +(wallEnd - wallStart).toFixed(2) }));
      fireToast("info", "Dry run complete", `New: ${r.stats.newCount} | DupEx: ${r.stats.dupesExisting} | DupIntra: ${r.stats.dupesIntraFile} | Ingest: ${r.stats.ingestMs}ms` + (timing.parseMs ? ` | Parse: ${timing.parseMs}ms` : ''));
    } catch (e: unknown) {
      fireToast("error", "Ingestion failed", errorToMessage(e));
    } finally {
      setIngesting(false);
    }
  };

  const cancelStreaming = () => {
    if (streamController) {
      setStreamAborted(true);
      try { streamController.abort(); } catch {/* ignore */}
    }
  };
  
  const applyPatch = () => {
    if (!result?.plan) return;
    try {
      commitImportPlan(result.plan);
      setApplied(true);
      setShowConfirm(false);
      fireToast("success", "Import applied (staged)", "Transactions are staged until you Apply to Budget.");
      if (result.savingsQueue && result.savingsQueue.length) {
        fireToast("info", "Savings deferred", `${result.savingsQueue.length} potential savings transactions will be reviewed after budget apply.`);
      }
    } catch (e: unknown) {
      fireToast("error", "Apply failed", errorToMessage(e));
    }
  };

  const closeAndReset = () => {
    onClose();
    setTimeout(resetState, 200); // allow modal exit animation
  };

  const manifestWarning = result ? (() => {
    const manifest = importManifests[result.stats.hash];
    const seen = manifest?.accounts?.[accountNumber];
    if (!manifest || !seen) return null;
    return (
      <Alert.Root status="warning" borderRadius="md" mb={3}>
        <Alert.Indicator />
        <Alert.Title fontSize="sm" mr={2}>Previously Imported</Alert.Title>
        <Alert.Description fontSize="xs">This file hash was imported for this account at {seen.importedAt}. Re-importing may be redundant.</Alert.Description>
      </Alert.Root>
    );
  })() : null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={closeAndReset} size="xl" scrollBehavior="inside">
      <Dialog.Backdrop />
      <Dialog.Content>
        <Dialog.Header>Import Transactions</Dialog.Header>
        <Dialog.Body>
          <VStack align="stretch" gap={4}>
            <Field.Root>
              <Field.Label fontSize="sm">CSV File</Field.Label>
              <Input type="file" size="sm" accept=".csv,text/csv" onChange={handleFile} />
              {fileName && <Text fontSize="xs" mt={1}>{fileName}</Text>}
            </Field.Root>

            {detectedAccounts.length > 1 && (
              <Field.Root>
                <Field.Label fontSize="sm">Detected Accounts</Field.Label>
                <AppSelect size="sm" value={accountNumber} placeholder="Select account" onChange={(e) => setAccountNumber(e.target.value)}>
                  {detectedAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                </AppSelect>
                <Text fontSize="xs" mt={1}>Multiple AccountNumber values found in file.</Text>
              </Field.Root>
            )}

            {detectedAccounts.length === 0 && (
              <Field.Root>
                <Field.Label fontSize="sm">Account Number {autoDetected && '(Auto-detected)'}</Field.Label>
                <Input size="sm" value={accountNumber} placeholder="Enter or auto-detected" disabled={autoDetected} onChange={(e) => { setAccountNumber(e.target.value); setAutoDetected(false); }} />
                {autoDetected && <Text fontSize="xs" mt={1}>Derived from AccountNumber column.</Text>}
              </Field.Root>
            )}

            <HStack>
              <Button size="sm" colorScheme="teal" onClick={runPipeline} loading={ingesting} disabled={!fileText}>Run Dry Run</Button>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant={useStreaming ? 'solid' : 'outline'}
                  colorScheme={useStreaming ? 'purple' : 'gray'}
                  onClick={() => setUseStreaming(s => {
                    const next = !s;
                    if (!next) { setAutoStreaming(false); setAutoStreamingReason(''); }
                    else { /* user manually enabled overrides auto flag */ setAutoStreaming(false); }
                    return next;
                  })}
                  disabled={ingesting}
                  title={autoStreaming ? `Auto-enabled: ${autoStreamingReason}` : 'Toggle streaming parser'}
                >
                  {useStreaming ? (autoStreaming ? 'Streaming AUTO' : 'Streaming ON') : 'Streaming OFF'}
                </Button>
                {autoStreaming && (
                  <Badge colorScheme="purple" variant="subtle" fontSize="0.6rem">auto</Badge>
                )}
              </HStack>
              {!showConfirm && (
                <Button size="sm" variant="outline" onClick={() => setShowConfirm(true)} disabled={!result?.plan || applied}>Review & Apply</Button>
              )}
              {showConfirm && (
                <Button size="sm" colorScheme="green" onClick={applyPatch} disabled={applied}>Confirm Apply</Button>
              )}
              {showConfirm && (
                <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)} disabled={applied}>Cancel</Button>
              )}
              {applied && <Badge colorScheme="green">Applied</Badge>}
              {ingesting && streaming && !streamFinished && !streamAborted && (
                <Button size="sm" colorScheme="red" variant="outline" onClick={cancelStreaming}>Abort</Button>
              )}
            </HStack>

            {ingesting && useStreaming && (
              <Box w="100%" borderWidth={1} borderRadius="md" p={2} bg="gray.50">
                <HStack justify="space-between" fontSize="xs">
                  <Text>Streaming parse...</Text>
                  <HStack gap={3}>
                    <Text>{streamRows} rows{totalLines ? ` / ${totalLines.toLocaleString()}` : ''}</Text>
                    {totalLines && (
                      <Badge colorScheme={streamAborted ? 'red' : (streamFinished ? 'green' : 'purple')}>
                        {Math.min(100, ((streamRows / totalLines) * 100) || 0).toFixed(1)}%
                      </Badge>
                    )}
                    {streamAborted && <Badge colorScheme='red'>aborted</Badge>}
                  </HStack>
                </HStack>
                <Box mt={1} h="4px" bg="gray.200" borderRadius="sm" overflow="hidden">
                  {(() => {
                    let pct = 0;
                    if (totalLines && totalLines > 0) pct = Math.min(100, (streamRows / totalLines) * 100);
                    else if (streamFinished) pct = 100; else pct = 10 + Math.min(50, streamRows / 50); // fallback heuristic
                    return (
                      <Box h="100%" width={`${streamFinished || streamAborted ? 100 : pct}%`} transition="width 0.4s ease" bg={streamAborted ? 'red.400' : (streamFinished ? 'green.400' : 'purple.400')}></Box>
                    );
                  })()}
                </Box>
              </Box>
            )}
            {autoStreaming && !ingesting && !result && (
              <Text fontSize="10px" color="purple.600">Streaming auto-enabled ({autoStreamingReason}). You can toggle it off.</Text>
            )}

            {result && (
              <Box borderWidth={1} borderRadius="md" p={3} bg="gray.50">
                <HStack gap={6} flexWrap="wrap">
                  <Stat.Root minW="90px"><Stat.Label>New</Stat.Label><Stat.ValueText>{result.stats.newCount}</Stat.ValueText></Stat.Root>
                  <Stat.Root minW="120px"><Stat.Label>Total Dupes</Stat.Label><Stat.ValueText>{result.stats.dupesExisting + result.stats.dupesIntraFile}</Stat.ValueText></Stat.Root>
                  <Stat.Root minW="90px"><Stat.Label>Existing</Stat.Label><Stat.ValueText>{result.stats.dupesExisting}</Stat.ValueText></Stat.Root>
                  <Stat.Root minW="90px"><Stat.Label>Intra-file</Stat.Label><Stat.ValueText>{result.stats.dupesIntraFile}</Stat.ValueText></Stat.Root>
                  <Stat.Root minW="90px"><Stat.Label>Errors</Stat.Label><Stat.ValueText>{result.errors.length}</Stat.ValueText></Stat.Root>
                  <Stat.Root minW="160px"><Stat.Label>Hash</Stat.Label><Stat.ValueText fontSize="sm">{result.stats.hash}</Stat.ValueText></Stat.Root>
                </HStack>
                <Separator my={3} />
                {/* Ingestion metrics panel */}
                <IngestionMetricsPanel
                  metrics={(() => {
                    if (!result?.stats) return undefined;
                    return {
                      ingestMs: result.stats.ingestMs,
                      parseMs: timing.parseMs ?? 0,
                      processMs: result.stats.processMs,
                      totalMs: timing.totalMs ?? 0,
                      rowsProcessed: result.stats.rowsProcessed,
                      rowsPerSec: result.stats.rowsPerSec,
                      duplicatesRatio: result.stats.duplicatesRatio,
                      stageTimings: result.stats.stageTimings,
                      earlyShortCircuits: {
                        total: result.stats.earlyShortCircuits.total,
                        byStage: {
                          existing: result.stats.earlyShortCircuits.existing,
                          intraFile: result.stats.earlyShortCircuits.intraFile,
                        },
                      },
                    };
                  })()}
                  sessionId={result?.stats?.importSessionId}
                />
                <Separator my={3} />
                {showConfirm && (
                  <Box mb={3} p={3} borderWidth={1} borderRadius="md" bg="yellow.50">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Confirmation Summary</Text>
                    <Text fontSize="xs" mb={1}>You are about to apply <strong>{result.stats.newCount}</strong> new transactions to account <strong>{accountNumber}</strong>.</Text>
                    <Text fontSize="xs" mb={1}>Existing duplicates skipped: {result.stats.dupesExisting} | Intra-file skipped: {result.stats.dupesIntraFile}</Text>
                    {result.stats.categorySources && (
                      <Box mt={2} mb={2}>
                        <Text fontSize="xs" fontWeight="semibold">Category Inference Sources</Text>
                        {(() => {
                          const total = Object.values(result.stats.categorySources).reduce((a, b) => a + b, 0) || 1;
                          const tooltipMap: Record<string, string> = {
                            provided: 'Category supplied in CSV (non-uncategorized).',
                            keyword: 'Matched a configured keyword substring.',
                            regex: 'Matched a regex rule pattern.',
                            consensus: 'Assigned via vendor consensus (dominant category among labeled samples).',
                            none: 'No category inferred (remains unlabeled).'
                          };
                          const entries = Object.entries(result.stats.categorySources) as [string, number][];
                          return (
                            <HStack gap={3} mt={1} wrap="wrap">
                              {entries.map(([k, v]) => {
                                const pct = ((v / total) * 100).toFixed(1);
                                return (
                                  <Badge key={k} title={tooltipMap[k] || k} colorScheme={k === 'none' ? 'gray' : (k === 'consensus' ? 'purple' : 'blue')} fontSize="0.6rem">
                                    {k}: {v} ({pct}%)
                                  </Badge>
                                );
                              })}
                            </HStack>
                          );
                        })()}
                      </Box>
                    )}
                    <Text fontSize="xs" mb={2}>First 5 new transactions:</Text>
                    <Box fontFamily="mono" fontSize="10px" maxH="120px" overflowY="auto" bg="gray.800" color="green.200" p={2} borderRadius="sm">
                      {result.acceptedTxns.slice(0, 5).map((t) => {
                        const amount = t.rawAmount ?? t.amount;
                        const amountNum = typeof amount === 'number' ? amount : Number(amount);
                        const amountText = Number.isFinite(amountNum) ? amountNum.toFixed(2) : '0.00';
                        return (
                          <Text key={t.id}>
                            {t.date ?? ''} | {amountText} | {t.type ?? ''} | {t.category || '—'} | {(t.description ?? '').slice(0, 60)}
                          </Text>
                        );
                      })}
                    </Box>
                  </Box>
                )}
                {manifestWarning}
                {result.errors.length > 0 && (
                  <Box mb={2}>
                    <Alert.Root status="warning" borderRadius="md" mb={2}>
                      <Alert.Indicator />
                      <Alert.Title fontSize="sm" mr={2}>Row Errors</Alert.Title>
                      <Alert.Description fontSize="xs">{result.errors.length} rows skipped.</Alert.Description>
                    </Alert.Root>
                    {(() => {
                      const counts = {
                        all: result.errors.length,
                        parse: result.errors.filter((e) => e.type === 'parse').length,
                        normalize: result.errors.filter((e) => e.type === 'normalize').length,
                        duplicate: result.errors.filter((e) => e.type === 'duplicate').length,
                      };
                      return (
                        <HStack gap={2} mb={1} wrap='wrap'>
                          <Button size='xs' variant={errorFilter==='all'?'solid':'outline'} onClick={()=>setErrorFilter('all')}>All ({counts.all})</Button>
                          <Button size='xs' variant={errorFilter==='parse'?'solid':'outline'} onClick={()=>setErrorFilter('parse')}>Parse ({counts.parse})</Button>
                          <Button size='xs' variant={errorFilter==='normalize'?'solid':'outline'} onClick={()=>setErrorFilter('normalize')}>Normalize ({counts.normalize})</Button>
                          <Button size='xs' variant={errorFilter==='duplicate'?'solid':'outline'} onClick={()=>setErrorFilter('duplicate')}>Duplicate ({counts.duplicate})</Button>
                          <Button size='xs' onClick={()=>setShowErrors(s=>!s)}>{showErrors? 'Hide':'Show'}</Button>
                          <Button size='xs' variant='ghost' title='Download errors as CSV' onClick={() => {
                            if (exportLockRef.current) return; // simple debounce to avoid rapid double clicks
                            exportLockRef.current = true;
                            setTimeout(()=>{ exportLockRef.current = false; }, 1500);
                            try {
                              const header = 'line,type,reason,message';
                              const rows = result.errors.map((e) => [
                                e.line,
                                e.type,
                                e.type === 'duplicate' ? e.reason || '' : '',
                                (e.message || '').replace(/"/g, '""'),
                              ]);
                              const csv = [header, ...rows.map((r) => r.map((f) => `"${(f ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
                              // Light safeguard: large files warn
                              if (csv.length > 2_000_000) {
                                fireToast("info", 'Large CSV', 'Generating large error export...');
                              }
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `ingestion-errors-${result.stats.hash}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
                            } catch {/* ignore */}
                          }}>Download CSV</Button>
                          <Button size='xs' variant='ghost' title='Legend: duplicate=yellow, normalize=red, parse=orange' disabled>Legend</Button>
                        </HStack>
                      );
                    })()}
                    {showErrors && (
                      <Box maxH='160px' overflowY='auto' borderWidth={1} borderRadius='md' p={2} bg='gray.900' color='red.200' fontFamily='mono' fontSize='10px'>
                        {(() => {
                          const filtered = result.errors.filter((e) => errorFilter === 'all' || e.type === errorFilter);
                          return filtered.slice(0, 200).map((err, idx: number) => {
                            let color;
                            if (err.type === 'duplicate') color = 'yellow.300';
                            else if (err.type === 'normalize') color = 'red.200';
                            else if (err.type === 'parse') color = 'orange.300';
                            else color = 'red.200';
                            return (
                              <Text key={idx} color={color}>L{err.line || '?'} [{err.type || 'unknown'}] {err.message}</Text>
                            );
                          });
                        })()}
                        {(() => {
                          const filtered = result.errors.filter((e) => errorFilter === 'all' || e.type === errorFilter);
                          if (filtered.length <= 200) return null;
                          return (
                            <Text mt={1} color='gray.400'>Showing first 200 of {filtered.length}. Use Download CSV for full list.</Text>
                          );
                        })()}
                      </Box>
                    )}
                  </Box>
                )}
                {/* Legacy brief error preview removed in favor of panel */}
                <Separator my={3} />
                {!!lastIngestionTelemetry && !showConfirm && (
                  <Box mb={3} p={2} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.subtle">
                    <Text fontSize="xs" fontWeight="semibold" mb={1}>Last Import Telemetry</Text>
                    <Text fontSize="10px" mb={1}>At: {lastIngestionTelemetry.at} | Account: {lastIngestionTelemetry.accountNumber} | New: {lastIngestionTelemetry.newCount} | DupEx: {lastIngestionTelemetry.dupesExisting} | DupIntra: {lastIngestionTelemetry.dupesIntraFile}</Text>
                    {lastIngestionTelemetry.categorySources && (
                      <HStack gap={2} wrap="wrap">
                        {(() => {
                          const categorySources = lastIngestionTelemetry.categorySources!;
                          const totalPrev = Object.values(categorySources).reduce((a, b) => a + b, 0) || 1;
                          const entries = Object.entries(categorySources) as [string, number][];
                          return entries.map(([k, v]) => {
                            const pctPrev = ((v / totalPrev) * 100).toFixed(1);
                            return (
                              <Badge key={k} fontSize="0.55rem" colorScheme={k === 'none' ? 'gray' : (k === 'consensus' ? 'purple' : 'blue')}>
                                {k}:{v} ({pctPrev}%)
                              </Badge>
                            );
                          });
                        })()}
                      </HStack>
                    )}
                  </Box>
                )}
                <Text fontSize="xs" color="fg.muted">Preview of accepted (first 10)</Text>
                <Box mt={1} maxH="180px" overflowY="auto" fontFamily="mono" fontSize="xs" p={2} borderWidth={1} borderRadius="md" bg="gray.800" color="green.200">
                  {(() => {
                    const accepted = result?.plan?.accepted ?? [];
                    const merged: Transaction[] = [...existingTxns, ...accepted].sort((a, b) =>
                      String(a.date ?? "").localeCompare(String(b.date ?? ""))
                    );

                    return merged.slice(0, 10).map((t, idx) => {
                      const raw = t.rawAmount ?? t.amount;
                      const amtText =
                        typeof raw === "number"
                          ? raw.toFixed(2)
                          : typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))
                            ? Number(raw).toFixed(2)
                            : "";

                      return (
                        <Text key={t.id ?? `${t.date ?? "tx"}-${idx}`}>
                          {t.date} | {amtText} | {t.type} | {t.category || '—'} | {String(t.description ?? '').slice(0, 50)}
                        </Text>
                      );
                    });
                  })()}
                </Box>
              </Box>
            )}
            {result && useStreaming && !ingesting && (
              <Badge colorScheme={streamAborted ? 'red' : 'purple'} alignSelf='flex-start'>
                {(() => {
                  if (streamAborted) return `Aborted after ${streamRows}`;
                  const bytes = typeof streamBytes === 'number' ? streamBytes : null;
                  const total = fileObj?.size || 0;
                  if (bytes !== null && total > 0) {
                    const pct = Math.min(100, (bytes / total) * 100);
                    return `Streamed ${streamRows} rows (${pct.toFixed(1)}%)`;
                  }
                  return `Streamed ${streamRows} rows`;
                })()}
              </Badge>
            )}
          </VStack>
        </Dialog.Body>
        <Dialog.CloseTrigger asChild>
          <Button position="absolute" top={2} right={2} size="sm" variant="ghost">X</Button>
        </Dialog.CloseTrigger>
        <Dialog.Footer>
          <Button mr={3} onClick={closeAndReset}>Close</Button>
          {!showConfirm && <Button colorScheme="blue" onClick={() => setShowConfirm(true)} disabled={!result?.plan || applied}>Review & Apply</Button>}
          {showConfirm && <Button colorScheme="green" onClick={applyPatch} disabled={applied}>Confirm Apply</Button>}
          {showConfirm && <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={applied}>Cancel</Button>}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

import { useMemo, useState, useEffect, lazy } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { Box, Heading, Table, HStack, Text, Button, Checkbox, Flex, IconButton, Spacer } from '@chakra-ui/react';
import { fireToast } from "../hooks/useFireToast";
import { TiArrowRepeat, TiDownloadOutline } from "react-icons/ti";
import { FiTrash2 } from "react-icons/fi";
import { AppSelect } from '../components/ui/AppSelect';
import { Tooltip } from '../components/ui/Tooltip';
import { StatusBadge } from '../components/ui/StatusBadge';
import { maskAccountNumber } from '../utils/maskAccountNumber';
import { DialogModal } from '../components/ui/DialogModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type {
  ImportHistoryEntry,
  ImportSessionRuntime,
} from "../store/slices/importLogic";
dayjs.extend(relativeTime);
// Runtime computation centralized in store (getImportSessionRuntime)

const SavingsReviewModal = lazy(() => import('../components/ui/SavingsReviewModal'));
const ConfirmModal = lazy(() => import('../components/ui/ConfirmModal'));

type Status = ImportSessionRuntime["status"] | "?";

type ImportHistoryRow = {
  entry: ImportHistoryEntry;
  runtime:
    | ImportSessionRuntime
    | {
        stagedNow: number;
        appliedCount: number;
        removed: number;
        expiresAt: number | null;
        status: "?";
        canUndo: false;
      };
};

type event = React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>;

export default function ImportHistoryPage() {
  const importHistory = useBudgetStore(s => s.importHistory);
  type Tx = { date: string; importSessionId?: string; staged?: boolean };
  const accounts = useBudgetStore((s) => s.accounts as Record<string, { transactions?: Tx[] }>);
  // undo window minutes available if needed, but not directly used here
  const getImportSessionRuntime = useBudgetStore(s => s.getImportSessionRuntime);
  const undoStagedImport = useBudgetStore(s => s.undoStagedImport);
  const markImportSessionBudgetApplied = useBudgetStore((s) => s.markImportSessionBudgetApplied as (accountNumber: string, sessionId: string, months: string[]) => void);
  const processPendingSavingsForImportSession = useBudgetStore((s) => s.processPendingSavingsForImportSession as (accountNumber: string, sessionId: string, months: string[]) => void);
  const clearImportSessionEverywhere = useBudgetStore((s) => s.clearImportSessionEverywhere as (accountNumber: string, sessionId: string) => void);

  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [selected, setSelected] = useState<{ [sessionId: string]: boolean }>({}); // sessionId -> bool
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [clearTarget, setClearTarget] = useState<{ accountNumber: string; sessionId: string } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // We intentionally include nowTick to force a periodic refresh (every minute) of runtime-derived fields
  // like status (active -> expired) without extra logic; it's used as a time invalidation key.
  const rows = useMemo(() => {
    return importHistory.map((entry) => {
      const runtime =
        getImportSessionRuntime(entry.accountNumber, entry.sessionId) ||
        { stagedNow: 0, appliedCount: 0, removed: 0, expiresAt: null, status: '?', canUndo: false };
      return { entry, runtime };
    }).filter(r => {
      if (filterAccount && r.entry.accountNumber !== filterAccount) return false;
      if (filterStatus && r.runtime.status !== filterStatus) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- nowTick is a deliberate time invalidation key
  }, [importHistory, accounts, filterAccount, filterStatus, nowTick, getImportSessionRuntime]) as ImportHistoryRow[];

  const anySelected = Object.values(selected).some(v => v);
  const selectedEntries = rows.filter(r => selected[r.entry.sessionId]);

  const selectByStatus = (status: Status) => {
    const next = { ...selected };
    rows.forEach(r => { if (r.runtime.status === status) next[r.entry.sessionId] = true; });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const toggleAllVisible = (checked: boolean) => {
    const next = { ...selected };
    rows.forEach(r => { next[r.entry.sessionId] = checked; });
    setSelected(next);
  };

  const doUndoSelected = () => {
    const undone = [];
    selectedEntries.forEach(({ entry, runtime }) => {
      if (runtime.canUndo) {
        undoStagedImport(entry.accountNumber, entry.sessionId);
        undone.push(entry.sessionId);
      }
    });
    fireToast("info", 'Undo complete', `${undone.length} session(s) undone`);
  };

  const doApplySelected = () => {
    let appliedSessions = 0;
    selectedEntries.forEach(({ entry, runtime }) => {
      if (runtime.status === 'active' && runtime.stagedNow > 0) {
        const acct = accounts[entry.accountNumber];
        if (!acct?.transactions) return;
        const months = new Set<string>();
        acct.transactions.forEach((tx: Tx) => {
          if (tx.importSessionId === entry.sessionId && tx.staged) {
            months.add(tx.date.slice(0,7));
          }
        });
        if (months.size) {
          markImportSessionBudgetApplied(entry.accountNumber, entry.sessionId, [...months]);
          processPendingSavingsForImportSession(entry.accountNumber, entry.sessionId, [...months]);
          appliedSessions++;
        }
      }
    });
    if (appliedSessions > 0) {
      fireToast("success", 'Apply complete', `${appliedSessions} session(s) applied`);
    } else {
      fireToast("info", 'Nothing to apply', 'No selected sessions had staged transactions to apply.');
    }
  };

  const exportSelected = () => {
    const lines = ['sessionId,account,newCount,staged,applied,removed,savingsCount,importedAt'];
    selectedEntries.forEach(({ entry, runtime }) => {
      lines.push([entry.sessionId, entry.accountNumber, entry.newCount, runtime.stagedNow, runtime.appliedCount, runtime.removed||0, entry.savingsCount||0, entry.importedAt].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const accountsList = useMemo(() => Object.keys(accounts), [accounts]);

  return (
    <Box p={6}>
      <Flex mb={4} align="center" gap={4} wrap="wrap">
        <Heading size='md'>Import History</Heading>
        <Text fontSize="sm" color="fg.muted">
          Review recent import sessions, apply staged transactions, and undo within the undo window.
        </Text>
        <Spacer />
        <HStack>
          <AppSelect size='sm' placeholder='Account' value={filterAccount} onChange={(e: event) => setFilterAccount(e.target.value)}>
            {accountsList.map((acc) => (
              <option key={acc} value={acc}>
                {maskAccountNumber(acc)}
              </option>
            ))}
          </AppSelect>

          <AppSelect size='sm' placeholder='Status' value={filterStatus} onChange={(e: event) => setFilterStatus(e.target.value as Status | '')}>
            <option value='active'>Active</option>
            <option value='expired'>Expired</option>
            <option value='applied'>Applied</option>
            <option value='partial-applied'>Partial Applied</option>
            <option value='undone'>Undone</option>
            <option value='partial-undone'>Partial Undone</option>
          </AppSelect>
          <IconButton size='sm' aria-label='Refresh' onClick={() => setNowTick(Date.now())}>
            <TiArrowRepeat />
          </IconButton>
        </HStack>
      </Flex>

      <Flex mb={3} gap={2} wrap='wrap' align='center'>
        {anySelected ? (
          <>
            <Text fontSize='sm'>{selectedEntries.length} selected</Text>
            <Button size='xs' onClick={doUndoSelected} colorScheme='red' variant='outline'>Undo</Button>
            <Button size='xs' onClick={doApplySelected} colorScheme='teal' variant='outline'>Apply</Button>
            <Button size='xs' onClick={() => { doUndoSelected(); doApplySelected(); }} variant='outline'>Resolve (Undo + Apply)</Button>
            <Button size='xs' onClick={exportSelected} variant='outline'>
              <TiDownloadOutline  />
              Export CSV
            </Button>
            <Button size='xs' onClick={clearSelection}>Clear</Button>
          </>
        ) : (
          <HStack gap={2}>
            <Text fontSize='xs' color='fg.muted'>Quick Select:</Text>
            <Button size='xs' variant='ghost' onClick={() => selectByStatus('active')}>Active</Button>
            <Button size='xs' variant='ghost' onClick={() => selectByStatus('expired')}>Expired</Button>
            <Button size='xs' variant='ghost' onClick={() => selectByStatus('undone')}>Undone</Button>
            <Button size='xs' variant='ghost' onClick={() => selectByStatus('partial-applied')}>Partial Applied</Button>
            <Button size='xs' variant='ghost' onClick={() => selectByStatus('partial-undone')}>Partial Undone</Button>
          </HStack>
        )}
      </Flex>

      {rows.length === 0 ? (
        <Box borderWidth={1} borderRadius='md' p={4}>
          <Text fontSize='sm' color='gray.600'>
            No import sessions yet. Import transactions from the Accounts page to see history here.
          </Text>
        </Box>
      ) : null}

      <Box borderWidth={1} borderRadius='md' overflowX='auto'>
        <Table.Root size="sm" variant="line" striped>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                <Checkbox.Root
                  checked={rows.length > 0 && rows.every(r => !!selected[r.entry.sessionId])}
                  onCheckedChange={(details) => toggleAllVisible(!!details.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>

              <Table.ColumnHeader>Session</Table.ColumnHeader>
              <Table.ColumnHeader>Account</Table.ColumnHeader>
              <Table.ColumnHeader>Imported</Table.ColumnHeader>
              <Table.ColumnHeader>New</Table.ColumnHeader>
              <Table.ColumnHeader>Staged</Table.ColumnHeader>
              <Table.ColumnHeader>Applied</Table.ColumnHeader>
              <Table.ColumnHeader>Removed</Table.ColumnHeader>
              <Table.ColumnHeader>Savings</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Undo In</Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {rows.map(({ entry, runtime }) => {
              const minutesLeft = runtime.expiresAt
                ? Math.max(0, Math.ceil((runtime.expiresAt - Date.now()) / 60000))
                : 0;

              return (
                <Table.Row key={entry.sessionId}>
                  <Table.Cell>
                    <Checkbox.Root
                      checked={!!selected[entry.sessionId]}
                      onCheckedChange={(details) =>
                        setSelected((s) => ({ ...s, [entry.sessionId]: !!details.checked }))
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>

                  <Table.Cell title={entry.hash}>{entry.sessionId.slice(0, 8)}</Table.Cell>
                  <Table.Cell>{maskAccountNumber(entry.accountNumber)}</Table.Cell>

                  <Table.Cell>
                    <Tooltip content={entry.importedAt} disabled={!entry.importedAt}>
                      <Text as="span">
                        {entry.importedAt
                          ? dayjs(entry.importedAt).fromNow?.() || dayjs(entry.importedAt).format("MMM D HH:mm")
                          : "-"}
                      </Text>
                    </Tooltip>
                  </Table.Cell>

                  <Table.Cell>{entry.newCount}</Table.Cell>
                  <Table.Cell>{runtime.stagedNow}</Table.Cell>
                  <Table.Cell>{runtime.appliedCount}</Table.Cell>
                  <Table.Cell>{runtime.removed || 0}</Table.Cell>
                  <Table.Cell>{entry.savingsCount || 0}</Table.Cell>
                  <Table.Cell><StatusBadge status={runtime.status} /></Table.Cell>
                  <Table.Cell>{runtime.status === "active" ? `${minutesLeft}m` : "-"}</Table.Cell>

                  <Table.Cell>
                    <HStack gap={1}>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!runtime.canUndo}
                        onClick={() => {
                          if (runtime.canUndo) {
                            undoStagedImport(entry.accountNumber, entry.sessionId);
                            fireToast("info", "Session undone", `Import session ${entry.sessionId.slice(0,8)} has been undone.`);
                          }
                        }}
                      >
                        Undo
                      </Button>

                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!(runtime.status === "active" && runtime.stagedNow > 0)}
                        onClick={() => {
                          const acct = accounts[entry.accountNumber];
                          if (!acct?.transactions) {
                            fireToast("error", "Apply failed", "No transactions found for this account.");
                            return;
                          }

                          const months = new Set<string>();
                          acct.transactions.forEach((tx: Tx) => {
                            if (tx.importSessionId === entry.sessionId && tx.staged) {
                              months.add(tx.date.slice(0, 7));
                            }
                          });

                          const monthList = [...months];
                          if (monthList.length === 0) {
                            fireToast("info", "Nothing to apply", "No staged transactions found for this session.");
                            return;
                          }
                          markImportSessionBudgetApplied(entry.accountNumber, entry.sessionId, monthList);
                          processPendingSavingsForImportSession(entry.accountNumber, entry.sessionId, monthList);
                          fireToast(
                            "success",
                            "Session applied",
                            `Applied ${monthList.length} month(s) from session ${entry.sessionId.slice(0, 8)}.`
                          );
                        }}
                      >
                        Apply
                      </Button>

                      <IconButton
                        aria-label="Clear import session"
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() =>
                          setClearTarget({
                            accountNumber: entry.accountNumber,
                            sessionId: entry.sessionId,
                          })
                        }
                      >
                        <FiTrash2 />
                      </IconButton>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              );
            })}

            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={12}>
                  <Text fontSize="sm" color="fg.muted" textAlign="center" py={6}>
                    No import sessions match filters.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <SavingsReviewModal />
      <ConfirmModal />

      <DialogModal
        title="Clear this import session?"
        open={!!clearTarget}
        setOpen={(open) => {
          if (!open) setClearTarget(null);
        }}
        initialFocus="cancel"
        enterKeyAction="cancel"
        acceptLabel="Clear"
        acceptColorPalette="red"
        cancelLabel="Cancel"
        onCancel={() => setClearTarget(null)}
        onAccept={() => {
          if (!clearTarget) return;
          try {
            clearImportSessionEverywhere(clearTarget.accountNumber, clearTarget.sessionId);
            fireToast(
              "success",
              "Import cleared",
              `Cleared session ${clearTarget.sessionId.slice(0, 8)} from account ${maskAccountNumber(clearTarget.accountNumber)}.`
            );
          } finally {
            setClearTarget(null);
          }
        }}
        body={
          <Text fontSize="sm">
            This permanently deletes all transactions imported in this session and removes any Tracker actuals/savings logs created when you applied them.
            <br />
            This action is not reversible.
          </Text>
        }
      />
    </Box>
  );
}

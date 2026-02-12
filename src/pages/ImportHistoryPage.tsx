import { useMemo, useState, useEffect } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { Box, Heading, Table, HStack, Text, Button, Checkbox, Flex, IconButton, Spacer } from '@chakra-ui/react';
import { fireToast } from "../hooks/useFireToast";
import { TiArrowRepeat, TiDownloadOutline } from "react-icons/ti";
import { AppSelect } from '../components/ui/AppSelect';
import { Tooltip } from '../components/ui/Tooltip';
import { StatusBadge } from '../components/ui/StatusBadge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type {
  ImportHistoryEntry,
  ImportSessionRuntime,
} from "../store/slices/importLogic";
dayjs.extend(relativeTime);
// Runtime computation centralized in store (getImportSessionRuntime)

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
  const accounts = useBudgetStore((s: any) => s.accounts);
  // undo window minutes available if needed, but not directly used here
  const getImportSessionRuntime = useBudgetStore(s => s.getImportSessionRuntime);
  const undoStagedImport = useBudgetStore(s => s.undoStagedImport);
  const markTransactionsBudgetApplied = useBudgetStore((s: any) => s.markTransactionsBudgetApplied);
  const processPendingSavingsForAccount = useBudgetStore((s: any) => s.processPendingSavingsForAccount);

  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [selected, setSelected] = useState<{ [sessionId: string]: boolean }>({}); // sessionId -> bool
  const [nowTick, setNowTick] = useState<number>(Date.now());

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
  }, [importHistory, filterAccount, filterStatus, nowTick, getImportSessionRuntime]) as ImportHistoryRow[];

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
        type Tx = { date: string; importSessionId?: string; staged?: boolean };
        const acct = accounts[entry.accountNumber];
        if (!acct?.transactions) return;
        const months = new Set();
        acct.transactions.forEach((tx: Tx) => {
          if (tx.importSessionId === entry.sessionId && tx.staged) {
            months.add(tx.date.slice(0,7));
          }
        });
        if (months.size) {
          markTransactionsBudgetApplied(entry.accountNumber, [...months]);
          processPendingSavingsForAccount(entry.accountNumber, [...months]);
          appliedSessions++;
        }
      }
    });
    fireToast("success", 'Apply complete', `${appliedSessions} session(s) applied`);
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
        <Text fontSize="sm" color="gray.600">
          Review recent import sessions, apply staged transactions, and undo within the undo window.
        </Text>
        <Spacer />
        <HStack>
          <AppSelect size='sm' placeholder='Account' value={filterAccount} onChange={(e: event) => setFilterAccount(e.target.value)}>
            {accountsList.map(acc => <option key={acc} value={acc}>{acc}</option>)}
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
            <Text fontSize='xs' color='gray.500'>Quick Select:</Text>
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
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>

                  <Table.Cell title={entry.hash}>{entry.sessionId.slice(0, 8)}</Table.Cell>
                  <Table.Cell>{entry.accountNumber}</Table.Cell>

                  <Table.Cell>
                    <Tooltip content={entry.importedAt}>
                      {dayjs(entry.importedAt).fromNow?.() || dayjs(entry.importedAt).format("MMM D HH:mm")}
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
                          if (!acct?.transactions) return;

                          const months = new Set<string>();
                          acct.transactions.forEach((tx: any) => {
                            if (tx.importSessionId === entry.sessionId && tx.staged) {
                              months.add(tx.date.slice(0, 7));
                            }
                          });

                          const monthList = [...months];
                          markTransactionsBudgetApplied(entry.accountNumber, monthList);
                          processPendingSavingsForAccount(entry.accountNumber, monthList);
                          fireToast("success", "Session applied", `Import session ${entry.sessionId.slice(0,8)} has been applied.`);
                        }}
                      >
                        Apply
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              );
            })}

            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={12}>
                  <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
                    No import sessions match filters.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}

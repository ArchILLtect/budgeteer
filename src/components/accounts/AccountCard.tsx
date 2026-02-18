import {
  Box, Tabs, Text, Flex, HStack, VStack, Tag, Button, Table,
  Center, ButtonGroup, useDisclosure, Menu, Badge
} from "@chakra-ui/react";
import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import InlineSpinner from '../ui/InlineSpinner';
import { Tooltip } from "../ui/Tooltip";
import {
  formatLocalIsoDateAtTime,
  formatLocalIsoMonthDayTime24,
  formatUtcDayKeyMonthDay,
  formatUtcMonthKey,
  getYearFromMonthKey,
} from '../../services/dateTime';
import { getUniqueOrigins } from "../../utils/accountUtils";
import { getMonthlyTotals, getAvailableMonths } from '../../utils/storeHelpers';
import { maskAccountNumber } from "../../utils/maskAccountNumber";
import { useBudgetStore } from "../../store/budgetStore";
import type { Account, Transaction, BudgetMonthKey } from "../../types";
import { parseFiniteNumber } from "../../services/inputNormalization";
// Used for DEV only:
// import { findRecurringTransactions } from "../utils/analysisUtils";
// import { assessRecurring } from "../dev/analysisDevTools";
const ApplyToBudgetModal = lazy(() => import('../ui/ApplyToBudgetModal'));
const SavingsReviewModal = lazy(() => import('../ui/SavingsReviewModal'));
const ConfirmModal = lazy(() => import('../ui/ConfirmModal'));
import { YearPill } from "./YearPill";
import { FiChevronDown } from "react-icons/fi";

type AccountCardProps = {
  acct: Account & { importedAt?: string };
  acctNumber: string;
};

type OriginColorMap = Record<string, string>;

type StagedSessionEntry = {
  sessionId: string;
  count: number;
  stagedNow?: number;
  appliedCount?: number;
  newCount?: number;
  removed?: number;
  canUndo?: boolean;
  expired?: boolean;
  status?: string;
  expiresAt?: number | null;
  importedAt?: string;
  savingsCount?: number;
  hash?: string;
};

type BudgetStoreAccountState = {
  ORIGIN_COLOR_MAP: OriginColorMap;
  accounts: Record<string, Account>;
  removeAccount: (acctNumber: string) => void;
  selectedMonth: BudgetMonthKey;
  setSelectedMonth: (month: BudgetMonthKey) => void;
  getAccountStagedSessionSummaries: (accountNumber: string) => StagedSessionEntry[];
  undoStagedImport: (accountNumber: string, sessionId: string) => void;
};

export default function AccountCard({ acct, acctNumber }: AccountCardProps) {
  const ORIGIN_COLOR_MAP = useBudgetStore((s) => (s as BudgetStoreAccountState).ORIGIN_COLOR_MAP);
  const accounts = useBudgetStore((s) => (s as BudgetStoreAccountState).accounts);
  const removeAccount = useBudgetStore((s) => (s as BudgetStoreAccountState).removeAccount);
  const selectedMonth = useBudgetStore((s) => (s as BudgetStoreAccountState).selectedMonth);
  const setSelectedMonth = useBudgetStore((s) => (s as BudgetStoreAccountState).setSelectedMonth);
  const currentAccount = accounts[acctNumber];
  const currentTransactions = useMemo(
    () => (currentAccount?.transactions ?? []) as Transaction[],
    [currentAccount?.transactions]
  );
  const getAccountStagedSessionSummaries = useBudgetStore(
    (s) => (s as BudgetStoreAccountState).getAccountStagedSessionSummaries
  );
  const undoStagedImport = useBudgetStore((s) => (s as BudgetStoreAccountState).undoStagedImport);
  const resolvedAccountNumber = acct.accountNumber || acctNumber;
  const sessionEntries = getAccountStagedSessionSummaries(resolvedAccountNumber);
  const stagedCount = sessionEntries.reduce(
    (sum: number, entry) => sum + (entry.stagedNow ?? entry.count ?? 0),
    0
  );
  const institution = acct.institution || "Institution Unknown";

  const { open, onOpen, onClose } = useDisclosure();

  // Keep countdown-style UI deterministic during render.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Add safe fallbacks where label is read.
  const account = currentAccount;
  const displayLabel = account?.label || (account?.accountNumber ? maskAccountNumber(account.accountNumber) : 'Account');

  // All available months for THIS account: ["2025-07","2025-06",...]
  const months = useMemo(
    () => getAvailableMonths({ ...acct, transactions: currentTransactions }) as string[],
    [acct, currentTransactions]
  );
  // Years present in this account’s data (ascending for nice left→right buttons)
  const years = useMemo(
    () => Array.from(new Set(months.map((m) => m.slice(0, 4)))).sort(),
    [months]
  );

  // The year that should be visible is whatever year the global selectedMonth is in.
  // If the account doesn’t have that year, fallback to the most recent account year.
  const selectedYearFromStore =
    getYearFromMonthKey(String(selectedMonth)) ?? String(selectedMonth || '').slice(0, 4);
  const hasYear = years.includes(selectedYearFromStore);
  const currentYear = hasYear ? selectedYearFromStore : (years.at(-1) ?? selectedYearFromStore);

  // Months just for currentYear, oldest→newest for tabs (or reverse if you prefer)
  const monthsForYear = useMemo(
    () => months.filter((m) => m.startsWith(currentYear)).sort(),
    [months, currentYear]
  );

  const activeMonth =
    monthsForYear.includes(selectedMonth)
      ? selectedMonth
      : (monthsForYear.at(-1) as BudgetMonthKey | undefined) ?? selectedMonth;

  useEffect(() => {
    if (activeMonth && activeMonth !== selectedMonth && monthsForYear.includes(activeMonth)) {
      setSelectedMonth(activeMonth);
    }
  }, [activeMonth, monthsForYear, selectedMonth, setSelectedMonth]);

  return (
    <>
      <Flex key={acct.id} justifyContent="space-between" alignItems="center" mb={3}>
        <VStack align="start" gap={0}>
          <Text fontWeight="bold">{displayLabel}</Text>
          <Text fontSize="sm" color="fg.muted">
            {institution}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Imported {formatLocalIsoDateAtTime(acct.importedAt)}
          </Text>
        </VStack>
        <Flex alignItems="center" gap={3}>
          <HStack gap={1}>
            {getUniqueOrigins(currentTransactions).map((origin) => (
              <Tooltip key={origin} content={`Imported via ${origin}`}>
                <Tag.Root size="sm" colorScheme={ORIGIN_COLOR_MAP[origin.toLowerCase()] || 'gray'}>
                  {origin?.toUpperCase() || 'manual'}
                </Tag.Root>
              </Tooltip>
            ))}
            {stagedCount > 0 && (
              <Menu.Root closeOnSelect={false}>
                <Tooltip content={`${stagedCount} staged (click for details / undo)`}>
                  <Menu.Trigger as={Button} colorScheme="yellow" fontSize="xs">
                    <FiChevronDown />
                    {stagedCount} STAGED <FiChevronDown />
                  </Menu.Trigger>
                </Tooltip>
                <Menu.Content fontSize="xs" maxW="320px">
                  {sessionEntries.map((se) => {
                    const minutesLeft: number | null =
                      se.status === 'active' && se.expiresAt && nowMs
                        ? Math.max(0, Math.ceil((se.expiresAt - nowMs) / 60000))
                        : null;
                    const statusColorMap: Record<string, string> = {
                      active: 'yellow',
                      expired: 'gray',
                      applied: 'teal',
                      'partial-applied': 'purple',
                      undone: 'red',
                      'partial-undone': 'orange'
                    };
                    const statusColor = statusColorMap[se.status ?? ""] || 'blue';
                    const progressPct = se.newCount ? Math.round(((se.appliedCount || 0) / se.newCount) * 100) : 0;
                    return (
                      <Menu.Content
                        key={se.sessionId}
                        //closeOnSelect={false}
                        _focus={{ outline: 'none', bg: 'transparent' }}
                        _hover={{ bg: 'bg.subtle' }}
                      >
                        <Flex direction="column" w="100%" gap={1}>
                          <Flex justify="space-between" align="center" gap={2}>
                            <HStack gap={1} align="center">
                              <Text fontSize="xs" fontWeight="bold" truncate title={se.sessionId}>{se.sessionId.slice(0,8)}</Text>
                              <Badge colorScheme={statusColor} fontSize="0.55rem" px={1}>{se.status?.replace('-', ' ') || '—'}</Badge>
                              {se.status && se.status.startsWith('partial') && (
                                <Badge colorScheme='pink' fontSize='0.5rem'>{progressPct}%</Badge>
                              )}
                            </HStack>
                            <HStack gap={1}>
                              {minutesLeft !== null && <Text fontSize="8px" color="orange.600">{minutesLeft}m</Text>}
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="red"
                                disabled={!se.canUndo}
                                onClick={() => se.canUndo && undoStagedImport(resolvedAccountNumber, se.sessionId)}
                              >
                                Undo
                              </Button>
                            </HStack>
                          </Flex>
                          <Text fontSize="9px" color="fg.muted">Staged: {se.stagedNow || se.count} / New: {se.newCount ?? '—'}{se.removed ? ` | Removed: ${se.removed}` : ''}</Text>
                          {se.status === 'partial-applied' && (
                            <Box h='4px' bg='purple.100' borderRadius='sm'>
                              <Box h='100%' w={`${progressPct}%`} bg='purple.400' borderRadius='sm'></Box>
                            </Box>
                          )}
                          {se.status === 'partial-undone' && (
                            <Box h='4px' bg='orange.100' borderRadius='sm'>
                              <Box h='100%' w={`${progressPct}%`} bg='orange.400' borderRadius='sm'></Box>
                            </Box>
                          )}
                          {se.savingsCount !== undefined && (
                            <Text fontSize="9px" color="fg.muted">Savings: {se.savingsCount} | Hash: {se.hash?.slice(0,8)}</Text>
                          )}
                          {se.importedAt && (
                            <Text fontSize="8px" color="fg.muted">{formatLocalIsoMonthDayTime24(se.importedAt)} • {se.status}</Text>
                          )}
                        </Flex>
                      </Menu.Content>
                    );
                  })}
                  {sessionEntries.length === 0 && <Menu.Item value="Session" disabled>No staged sessions</Menu.Item>}
                </Menu.Content>
              </Menu.Root>
            )}
          </HStack>
          <Button size="xs" colorScheme="red" onClick={() => removeAccount(acctNumber)}>
              Remove
          </Button>
        </Flex>
      </Flex>

      <ButtonGroup attached={false} gap={2}>
          <YearPill months={months} />
      </ButtonGroup>

      {/* Monthly Tabbed View */}
      <Tabs.Root
        variant="enclosed"
        mt={4}
        value={activeMonth}
        onValueChange={(details) => setSelectedMonth(details.value as BudgetMonthKey)}
      >
        <Tabs.List gap={0} bg={"bg.emphasized"} mb={2}>
          {monthsForYear.map((m) => (
            <Tabs.Trigger key={m} value={m} minWidth={1} fontWeight="bold" fontSize={22}>
              {formatUtcMonthKey(m, { month: 'short' })}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {monthsForYear.map((monthRaw) => {
          const monthRows = currentTransactions.filter((tx) => tx.date?.startsWith(monthRaw));
          const totals = getMonthlyTotals({ ...acct, transactions: currentTransactions }, monthRaw as BudgetMonthKey);

          return (
            <Tabs.Content value={monthRaw} key={monthRaw} p={0} m={2}>
              <Box maxHeight={'md'} overflowY={'scroll'}>
                <Table.Root size="sm" striped bg="bg.panel" borderWidth={1} borderColor="border" borderRadius="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Date</Table.ColumnHeader>
                      <Table.ColumnHeader>Description</Table.ColumnHeader>
                      <Table.ColumnHeader>Amount</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Category</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {monthRows.map((tx, idx) => {
                      const appliedFromSession = tx.importSessionId && !tx.staged && tx.budgetApplied;
                      const signedAmount =
                        typeof tx.rawAmount === "number"
                          ? tx.rawAmount
                          : typeof tx.amount === "number"
                            ? tx.amount
                            : typeof tx.amount === "string"
                              ? parseFiniteNumber(tx.amount, { fallback: 0 })
                              : 0;

                      const stripedBg =
                        idx % 2 === 1
                          ? ({ base: "gray.50", _dark: "gray.800" } as const)
                          : undefined;

                      const rowBg = tx.staged
                        ? ({ base: "yellow.50", _dark: "yellow.900" } as const)
                        : appliedFromSession
                          ? ({ base: "teal.50", _dark: "teal.900" } as const)
                          : stripedBg;

                      return (
                        <Table.Row
                          key={tx.id}
                          bg={rowBg}
                          opacity={tx.staged ? 0.85 : 1}
                        >
                          <Table.Cell whiteSpace={'nowrap'}>{formatUtcDayKeyMonthDay(tx.date ?? "")}</Table.Cell>
                          <Table.Cell>{tx.description}</Table.Cell>
                          <Table.Cell color={signedAmount < 0 ? "red.500" : "green.600"}>
                            ${Math.abs(signedAmount).toFixed(2)}
                          </Table.Cell>
                          <Table.Cell>
                            <Tag.Root
                              size="sm"
                              colorScheme={
                                tx.type === "income"
                                  ? "green"
                                  : tx.type === "savings"
                                    ? "blue"
                                    : "orange"
                              }
                            >
                              {tx.type}{tx.staged ? '*' : ''}
                            </Tag.Root>
                          </Table.Cell>
                          <Table.Cell>{tx.category || "—"}</Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>

              <Box my={6} px={4} py={2} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.subtle">
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                  <Text fontWeight="medium">Income: <span style={{ color: 'green' }}>${totals.income.toFixed(2)}</span></Text>
                  <Text fontWeight="medium">Expenses: <span style={{ color: 'orange' }}>${totals.expenses.toFixed(2)}</span></Text>
                  <Text fontWeight="medium">Savings: <span style={{ color: 'blue' }}>${totals.savings.toFixed(2)}</span></Text>
                  <Text fontWeight="medium">
                    Net:{" "}
                    <span style={{ color: totals.net >= 0 ? 'green' : 'red' }}>
                      ${totals.net.toFixed(2)}
                    </span>
                  </Text>
                </Flex>
              </Box>
              <Center>
                <Button size="sm" colorScheme="teal" onClick={onOpen}>
                  ✅ Apply to Budget
                </Button>
              </Center>
              <Suspense fallback={<InlineSpinner />}>
                <ApplyToBudgetModal
                  isOpen={open}
                  onClose={onClose}
                  acct={{ ...acct, transactions: currentTransactions }}
                  months={months}
                />
                <SavingsReviewModal />
                <ConfirmModal />
              </Suspense>
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </>
  );
}
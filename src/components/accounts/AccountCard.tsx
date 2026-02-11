import {
  Box, Tabs, Text, Flex, HStack, VStack, Tag, Button, Table,
  Center, ButtonGroup, useDisclosure, Menu, Badge
} from "@chakra-ui/react";
import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import InlineSpinner from '../ui/InlineSpinner';
import { Tooltip } from "../ui/Tooltip";
import dayjs from "dayjs";
import { formatDate, getUniqueOrigins } from "../../utils/accountUtils";
import { getMonthlyTotals, getAvailableMonths } from '../../utils/storeHelpers';
import { useBudgetStore } from "../../store/budgetStore";
// Used for DEV only:
// import { findRecurringTransactions } from "../utils/analysisUtils";
// import { assessRecurring } from "../dev/analysisDevTools";
const ApplyToBudgetModal = lazy(() => import('../ui/ApplyToBudgetModal'));
const SavingsReviewModal = lazy(() => import('../ui/SavingsReviewModal'));
const ConfirmModal = lazy(() => import('../ui/ConfirmModal'));
import { YearPill } from "./YearPill";
import { FiChevronDown } from "react-icons/fi";

type AccountCardProps = {
  acct: any; // Replace with actual account type
  acctNumber: string;
};

export default function AccountCard({ acct, acctNumber }: AccountCardProps) {
  const ORIGIN_COLOR_MAP = useBudgetStore((s: any) => s.ORIGIN_COLOR_MAP);
  const accounts = useBudgetStore((s: any) => s.accounts);
  const removeAccount = useBudgetStore((s: any) => s.removeAccount); 
  const selectedMonth = useBudgetStore((s: any) => s.selectedMonth);
  //const setSelectedMonth = useBudgetStore((s: any) => s.setSelectedMonth);
  const currentAccount = accounts[acctNumber];
  const currentTransactions = currentAccount.transactions;
  const getAccountStagedSessionSummaries = useBudgetStore((s: any) => s.getAccountStagedSessionSummaries);
  const undoStagedImport = useBudgetStore((s: any) => s.undoStagedImport);
  const sessionEntries = getAccountStagedSessionSummaries(acct.accountNumber);
  const stagedCount = sessionEntries.reduce((sum: any, s: any) => sum + (s.stagedNow || s.count || 0), 0);
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
  const displayLabel = account?.label || account?.accountNumber || 'Account';

  // All available months for THIS account: ["2025-07","2025-06",...]
  const months: any = useMemo(() => getAvailableMonths(acct), [acct]);
  // Years present in this account’s data (ascending for nice left→right buttons)
  const years = useMemo(
    () => Array.from(new Set(months.map((m: any) => m.slice(0,4)))).sort(),
    [months]
  );

  // The year that should be visible is whatever year the global selectedMonth is in.
  // If the account doesn’t have that year, fallback to the most recent account year.
  const selectedYearFromStore = dayjs(selectedMonth).year().toString();
  const hasYear = years.includes(selectedYearFromStore);
  const currentYear = hasYear ? selectedYearFromStore : years.at(-1);

  // Months just for currentYear, oldest→newest for tabs (or reverse if you prefer)
  const monthsForYear: any = useMemo(
    () => months.filter((m: any) => m.startsWith(currentYear)).sort(),
    [months, currentYear]
  );

  return (
    <>
      <Flex key={acct.id} justifyContent="space-between" alignItems="center" mb={3}>
        <VStack align="start" gap={0}>
          <Text fontWeight="bold">{displayLabel}</Text>
          <Text fontSize="sm" color="gray.500">
            {institution}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Imported {dayjs(acct.importedAt).format("MMM D, YYYY @ h:mm A")}
          </Text>
        </VStack>
        <Flex alignItems="center" gap={3}>
          <HStack gap={1}>
            {getUniqueOrigins(currentTransactions).map((origin: any) => (
              <Tooltip content={`Imported via ${origin}`}>
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
                  {sessionEntries.map((se: any) => {
                    const minutesLeft: number | null =
                      se.status === 'active' && se.expiresAt && nowMs
                        ? Math.max(0, Math.ceil((se.expiresAt - nowMs) / 60000))
                        : null;
                    type StatusColorMap = {
                      [key: string]: string;
                    };
                    const statusColorMap: StatusColorMap = {
                      active: 'yellow',
                      expired: 'gray',
                      applied: 'teal',
                      'partial-applied': 'purple',
                      undone: 'red',
                      'partial-undone': 'orange'
                    };
                    const statusColor = statusColorMap[se.status] || 'blue';
                    const progressPct = se.newCount ? Math.round(((se.appliedCount || 0) / se.newCount) * 100) : 0;
                    return (
                      <Menu.Content
                        key={se.sessionId}
                        //closeOnSelect={false}
                        _focus={{ outline: 'none', bg: 'transparent' }}
                        _hover={{ bg: 'gray.50' }}
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
                              <Button size="xs" variant="outline" colorScheme="red" disabled={!se.canUndo} onClick={() => se.canUndo && undoStagedImport(acct.accountNumber, se.sessionId)}>Undo</Button>
                            </HStack>
                          </Flex>
                          <Text fontSize="9px" color="gray.600">Staged: {se.stagedNow || se.count} / New: {se.newCount ?? '—'}{se.removed ? ` | Removed: ${se.removed}` : ''}</Text>
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
                            <Text fontSize="9px" color="gray.600">Savings: {se.savingsCount} | Hash: {se.hash?.slice(0,8)}</Text>
                          )}
                          {se.importedAt && (
                            <Text fontSize="8px" color="gray.500">{dayjs(se.importedAt).format('MMM D HH:mm')} • {se.status}</Text>
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

      {/* ✅ Monthly Tabbed View Here */}
      <Tabs.Root
        variant="enclosed"
        colorScheme="teal"
        mt={4}
        //index={Math.max(0, monthsForYear.indexOf(selectedMonth))}
        /*onChange={(i) => {
          const target = monthsForYear[i];
          if (target) setSelectedMonth(target);
        }}*/
      >
        <Tabs.List>
          {monthsForYear.map((m: any) => (
            <Tabs.Content value="Months" key={m} minWidth={1} fontWeight="bold" fontSize={22}>
              {dayjs(m).format('MMM')}
            </Tabs.Content>
          ))}
        </Tabs.List>

        <Tabs.Content value="Months">
          {monthsForYear.map((monthRaw: any) => {
            const monthRows = acct.transactions.filter((tx: any) => tx.date?.startsWith(monthRaw));
            const totals = getMonthlyTotals(acct, monthRaw);

            return (
              <>
                <Tabs.Content value={monthRaw} key={monthRaw} p={0} m={2}>
                  <Box maxHeight={'md'} overflowY={'scroll'}>
                    <Table.Root size="sm" striped>
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
                        {monthRows.map((tx: any) => {
                          const appliedFromSession = tx.importSessionId && !tx.staged && tx.budgetApplied;
                          return (
                          <Table.Row key={tx.id} bg={tx.staged ? 'yellow.50' : (appliedFromSession ? 'teal.50' : undefined)} opacity={tx.staged ? 0.85 : 1}>
                            <Table.Cell whiteSpace={'nowrap'}>{formatDate(tx.date)}</Table.Cell>
                            <Table.Cell>{tx.description}</Table.Cell>
                            <Table.Cell color={(tx.rawAmount ?? 0) < 0 ? "red.500" : "green.600"}>
                              ${Math.abs(tx.rawAmount ?? tx.amount).toFixed(2)}
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
                                {tx.type}{tx.staged ? '*' : (appliedFromSession ? '' : '')}
                              </Tag.Root>
                            </Table.Cell>
                            <Table.Cell>{tx.category || "—"}</Table.Cell>
                          </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  </Box>

                  <Box my={6} px={4} py={2} borderWidth={1} borderRadius="md" bg="gray.100">
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
                      acct={acct}
                      months={months}
                    />
                    <SavingsReviewModal />
                    <ConfirmModal />
                  </Suspense>
                </Tabs.Content>
              </>
            );
          })}
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}